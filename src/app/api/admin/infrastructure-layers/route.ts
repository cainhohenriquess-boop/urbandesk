import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { getAccessBlockMessage, getAccessBlockReason } from "@/lib/auth-shared";
import {
  extractRequestContextFromHeaders,
  writeAuditLog,
} from "@/lib/audit";
import {
  importInfrastructureLayerFromZip,
} from "@/lib/infrastructure-layer-import";
import {
  INFRASTRUCTURE_LAYER_LABELS,
  isInfrastructureLayerCode,
} from "@/lib/infrastructure-layer-config";
import { prisma } from "@/lib/prisma";
import { enforceRequestRateLimit } from "@/lib/rate-limit";
import { getStorageDriverName, getStorageProvider } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_ARCHIVE_SIZE = 50 * 1024 * 1024;
const tenantIdSchema = z.string().cuid();

type SessionLike = {
  user: {
    id: string;
    role?: string | null;
    name?: string | null;
    email?: string | null;
    isActive?: boolean | null;
    tenantId?: string | null;
    tenantStatus?: string | null;
    trialEndsAt?: string | Date | null;
  };
} | null;

function ensureSuperadmin(session: SessionLike) {
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const reason = getAccessBlockReason(session.user);
  if (reason) {
    return NextResponse.json(
      { error: getAccessBlockMessage(reason), code: reason },
      { status: 403 }
    );
  }

  if (session.user.role !== "SUPERADMIN") {
    return NextResponse.json(
      { error: "Somente superadmin pode publicar camadas elétricas." },
      { status: 403 }
    );
  }

  return null;
}

function normalizeTenantIds(formData: FormData) {
  const rawValues = formData.getAll("tenantIds");
  const values = rawValues
    .filter((entry): entry is string => typeof entry === "string")
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  const unique = Array.from(new Set(values));
  const invalid = unique.filter(
    (value) => !tenantIdSchema.safeParse(value).success
  );

  if (invalid.length > 0) {
    throw new Error("Existe prefeitura inválida na autorização da camada.");
  }

  return unique;
}

function inferZipMimeType(file: File) {
  if (file.type && file.type.trim().length > 0) return file.type;
  return "application/zip";
}

function ensureZipFile(file: File) {
  if (!file || file.size <= 0) {
    throw new Error("Envie um arquivo ZIP de shapefile.");
  }

  if (file.size > MAX_ARCHIVE_SIZE) {
    throw new Error("O arquivo ZIP excede o limite de 50 MB.");
  }

  const lowerName = file.name.trim().toLowerCase();
  if (!lowerName.endsWith(".zip")) {
    throw new Error("Envie o shapefile compactado em um arquivo .zip.");
  }
}

export async function GET(request: Request) {
  try {
    const rateLimitResponse = enforceRequestRateLimit(request, {
      namespace: "api:admin:infrastructure-layers:get",
      limit: 60,
      windowMs: 60_000,
    });
    if (rateLimitResponse) return rateLimitResponse;

    const session = await getServerSession(authOptions);
    const guardResponse = ensureSuperadmin(session);
    if (guardResponse) return guardResponse;

    const layers = await prisma.infrastructureLayer.findMany({
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        authorizedTenants: {
          include: {
            tenant: {
              select: {
                id: true,
                name: true,
                slug: true,
                state: true,
                status: true,
              },
            },
          },
          orderBy: {
            tenant: {
              name: "asc",
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ data: layers });
  } catch (error) {
    console.error("[INFRASTRUCTURE_LAYER_LIST_ERROR]", error);
    return NextResponse.json(
      { error: "Falha ao listar camadas publicadas." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const rateLimitResponse = enforceRequestRateLimit(request, {
      namespace: "api:admin:infrastructure-layers:post",
      limit: 10,
      windowMs: 60_000,
    });
    if (rateLimitResponse) return rateLimitResponse;

    const session = await getServerSession(authOptions);
    const guardResponse = ensureSuperadmin(session);
    if (guardResponse) return guardResponse;
    const sessionUser = session!.user;

    const formData = await request.formData();
    const codeRaw = formData.get("code");
    const file = formData.get("file");
    const rawName = formData.get("name");
    const rawDescription = formData.get("description");

    if (!isInfrastructureLayerCode(codeRaw)) {
      return NextResponse.json(
        { error: "Código de camada inválido. Use PONNOT ou PONT_ILUM." },
        { status: 400 }
      );
    }

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Arquivo ZIP não encontrado no envio." },
        { status: 400 }
      );
    }

    ensureZipFile(file);

    const tenantIds = normalizeTenantIds(formData);
    if (tenantIds.length === 0) {
      return NextResponse.json(
        { error: "Selecione pelo menos uma prefeitura autorizada." },
        { status: 400 }
      );
    }

    const authorizedTenantCount = await prisma.tenant.count({
      where: {
        id: {
          in: tenantIds,
        },
      },
    });

    if (authorizedTenantCount !== tenantIds.length) {
      return NextResponse.json(
        { error: "Uma ou mais prefeituras selecionadas não existem mais." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const imported = await importInfrastructureLayerFromZip({
      code: codeRaw,
      buffer,
    });

    const storage = getStorageProvider();
    const storedArchive = await storage.upload({
      buffer,
      contentLength: file.size,
      contentType: inferZipMimeType(file),
      extension: "zip",
      moduleName: `infra-${codeRaw.toLowerCase()}`,
      originalName: file.name,
      tenantId: "shared",
    });

    const layerName =
      typeof rawName === "string" && rawName.trim().length > 0
        ? rawName.trim()
        : INFRASTRUCTURE_LAYER_LABELS[codeRaw];
    const description =
      typeof rawDescription === "string" && rawDescription.trim().length > 0
        ? rawDescription.trim()
        : null;

    const created = await prisma.infrastructureLayer.create({
      data: {
        code: codeRaw,
        name: layerName,
        description,
        status: "READY",
        sourceArchiveName: file.name,
        sourceArchiveKey: storedArchive.key,
        sourceArchiveUrl: storedArchive.url,
        sourceArchiveSecureUrl: storedArchive.secureUrl,
        sourceArchiveExpiresAt: storedArchive.secureUrlExpiresAt
          ? new Date(storedArchive.secureUrlExpiresAt)
          : null,
        sourceArchiveContentType: storedArchive.contentType,
        sourceDatasetName: imported.datasetName,
        originalCrs: imported.originalCrs,
        geometryType: imported.geometryType,
        featureCount: imported.featureCount,
        bbox: (imported.bbox ?? undefined) as Prisma.InputJsonValue | undefined,
        geoJsonData: imported.geoJsonData as Prisma.InputJsonValue,
        metadata: {
          ...imported.metadata,
          storageProvider: storedArchive.provider,
          archiveUrl: storedArchive.url,
        } as Prisma.InputJsonValue,
        uploadedById: sessionUser.id,
        authorizedTenants: {
          createMany: {
            data: tenantIds.map((tenantId) => ({ tenantId })),
          },
        },
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        authorizedTenants: {
          include: {
            tenant: {
              select: {
                id: true,
                name: true,
                slug: true,
                state: true,
                status: true,
              },
            },
          },
        },
      },
    });

    await writeAuditLog({
      action: "INFRASTRUCTURE_LAYER_UPLOAD",
      entityType: "infrastructure_layer",
      entityId: created.id,
      actor: {
        userId: sessionUser.id,
        userName: sessionUser.name ?? null,
        userEmail: sessionUser.email ?? null,
        userRole: sessionUser.role,
        tenantId: null,
      },
      requestContext: extractRequestContextFromHeaders(request.headers),
      metadata: {
        code: created.code,
        name: created.name,
        featureCount: created.featureCount,
        geometryType: created.geometryType,
        authorizedTenantIds: tenantIds,
        storageProvider: getStorageDriverName(),
      },
    });

    return NextResponse.json({
      success: true,
      data: created,
    });
  } catch (error) {
    console.error("[INFRASTRUCTURE_LAYER_UPLOAD_ERROR]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Falha ao processar o shapefile elétrico.",
      },
      { status: 400 }
    );
  }
}
