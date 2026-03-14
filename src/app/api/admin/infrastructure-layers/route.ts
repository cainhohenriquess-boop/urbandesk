import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { getAccessBlockMessage, getAccessBlockReason } from "@/lib/auth-shared";
import { extractRequestContextFromHeaders, writeAuditLog } from "@/lib/audit";
import {
  InfrastructureLayerImportError,
  importInfrastructureLayerFromZip,
  inspectInfrastructureLayerArchive,
  type InfrastructureLayerArchiveInspection,
} from "@/lib/infrastructure-layer-import";
import {
  INFRASTRUCTURE_LAYER_LABELS,
  isInfrastructureLayerCode,
  type InfrastructureLayerCodeId,
} from "@/lib/infrastructure-layer-config";
import { prisma } from "@/lib/prisma";
import { enforceRequestRateLimit } from "@/lib/rate-limit";
import {
  getStorageDriverName,
  getStorageProvider,
  type StoredUploadFile,
} from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_ARCHIVE_SIZE = 50 * 1024 * 1024;
const tenantIdSchema = z.string().cuid();

const layerListInclude = {
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
} satisfies Prisma.InfrastructureLayerInclude;

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

class InfrastructureLayerUploadRequestError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>,
    public readonly status = 400
  ) {
    super(message);
    this.name = "InfrastructureLayerUploadRequestError";
  }
}

function requestError(
  code: string,
  message: string,
  details?: Record<string, unknown>,
  status = 400
) {
  return new InfrastructureLayerUploadRequestError(message, code, details, status);
}

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
    throw requestError(
      "INVALID_AUTHORIZED_TENANT",
      "Existe prefeitura inválida na autorização da camada.",
      { invalidTenantIds: invalid }
    );
  }

  return unique;
}

function normalizeOwnerTenantId(formData: FormData, tenantIds: string[]) {
  const rawValue = formData.get("ownerTenantId");
  if (typeof rawValue !== "string" || rawValue.trim().length === 0) {
    return tenantIds.length === 1 ? tenantIds[0] : null;
  }

  const ownerTenantId = rawValue.trim();
  if (!tenantIdSchema.safeParse(ownerTenantId).success) {
    throw requestError(
      "INVALID_OWNER_TENANT",
      "O município dono do dado é inválido."
    );
  }

  if (!tenantIds.includes(ownerTenantId)) {
    throw requestError(
      "OWNER_TENANT_NOT_AUTHORIZED",
      "O município dono do dado também precisa estar na lista de prefeituras autorizadas.",
      { ownerTenantId }
    );
  }

  return ownerTenantId;
}

function normalizeRequestedCode(value: FormDataEntryValue | null) {
  if (value === null) return null;
  if (typeof value !== "string") {
    throw requestError(
      "INVALID_LAYER_CODE",
      "Código de camada inválido. Use PONNOT ou PONT_ILUM."
    );
  }

  const normalized = value.trim();
  if (normalized.length === 0) return null;
  if (!isInfrastructureLayerCode(normalized)) {
    throw requestError(
      "INVALID_LAYER_CODE",
      "Código de camada inválido. Use PONNOT ou PONT_ILUM.",
      { receivedCode: normalized }
    );
  }

  return normalized;
}

function inferZipMimeType(file: File) {
  if (file.type && file.type.trim().length > 0) return file.type;
  return "application/zip";
}

function toInputJsonValue(value: unknown) {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}

function ensureZipFile(file: File) {
  if (!file || file.size <= 0) {
    throw requestError(
      "MISSING_ARCHIVE",
      "Envie um arquivo ZIP de shapefile."
    );
  }

  if (file.size > MAX_ARCHIVE_SIZE) {
    throw requestError(
      "ARCHIVE_TOO_LARGE",
      "O arquivo ZIP excede o limite de 50 MB.",
      { maxSizeBytes: MAX_ARCHIVE_SIZE }
    );
  }

  const lowerName = file.name.trim().toLowerCase();
  if (!lowerName.endsWith(".zip")) {
    throw requestError(
      "INVALID_ARCHIVE_EXTENSION",
      "Envie o shapefile compactado em um arquivo .zip."
    );
  }
}

function serializeUploadMetadata(input: {
  file: File;
  requestedCode: InfrastructureLayerCodeId | null;
  ownerTenantId: string | null;
  tenantIds: string[];
  inspection?: InfrastructureLayerArchiveInspection | null;
  storedArchive?: StoredUploadFile | null;
}) {
  return toInputJsonValue({
    originalFileName: input.file.name,
    archiveSizeBytes: input.file.size,
    requestedCode: input.requestedCode,
    ownerTenantId: input.ownerTenantId,
    authorizedTenantIds: input.tenantIds,
    inspection: input.inspection
      ? {
          code: input.inspection.code,
          detectedCode: input.inspection.detectedCode,
          datasetName: input.inspection.datasetName,
          entryNames: input.inspection.entryNames,
          requiredFiles: input.inspection.requiredFiles,
          optionalFiles: input.inspection.optionalFiles,
          hasCpg: input.inspection.hasCpg,
        }
      : null,
    storage: input.storedArchive
      ? {
          provider: input.storedArchive.provider,
          key: input.storedArchive.key,
          url: input.storedArchive.url,
          secureUrl: input.storedArchive.secureUrl,
          secureUrlExpiresAt: input.storedArchive.secureUrlExpiresAt,
        }
      : null,
  });
}

function serializeProcessingResult(input: {
  inspection?: InfrastructureLayerArchiveInspection | null;
  code: InfrastructureLayerCodeId | null;
  featureCount?: number;
  geometryType?: string | null;
  bbox?: unknown;
  storedArchive?: StoredUploadFile | null;
  status: "PROCESSED" | "FAILED";
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown> | null;
  } | null;
}) {
  return toInputJsonValue({
    status: input.status,
    code: input.code,
    datasetName: input.inspection?.datasetName ?? null,
    detectedCode: input.inspection?.detectedCode ?? null,
    featureCount: input.featureCount ?? null,
    geometryType: input.geometryType ?? null,
    bbox: input.bbox ?? null,
    archiveEntries: input.inspection?.entryNames ?? [],
    storageProvider: input.storedArchive?.provider ?? null,
    archiveKey: input.storedArchive?.key ?? null,
    error: input.error ?? null,
  });
}

function buildUploadFileRecords(input: {
  uploadId: string;
  file: File;
  inspection: InfrastructureLayerArchiveInspection;
  storedArchive: StoredUploadFile;
}) {
  const archiveExpiresAt = input.storedArchive.secureUrlExpiresAt
    ? new Date(input.storedArchive.secureUrlExpiresAt)
    : null;

  return [
    {
      uploadId: input.uploadId,
      role: "ZIP_ARCHIVE" as const,
      originalName: input.file.name,
      archiveEntryName: null,
      storageKey: input.storedArchive.key,
      storageUrl: input.storedArchive.url,
      secureUrl: input.storedArchive.secureUrl,
      secureUrlExpiresAt: archiveExpiresAt,
      contentType: input.storedArchive.contentType,
      fileSize: input.storedArchive.size,
      metadata: toInputJsonValue({
        provider: input.storedArchive.provider,
        moduleName: input.storedArchive.moduleName,
      }),
    },
    ...input.inspection.archiveFiles.map((archiveFile) => ({
      uploadId: input.uploadId,
      role: archiveFile.role,
      originalName: archiveFile.originalName,
      archiveEntryName: archiveFile.archiveEntryName,
      storageKey: input.storedArchive.key,
      storageUrl: input.storedArchive.url,
      secureUrl: input.storedArchive.secureUrl,
      secureUrlExpiresAt: archiveExpiresAt,
      contentType: input.storedArchive.contentType,
      fileSize: null,
      metadata: toInputJsonValue({
        provider: input.storedArchive.provider,
        datasetName: input.inspection.datasetName,
        sourceArchiveName: input.file.name,
      }),
    })),
  ];
}

function serializeErrorPayload(error: unknown) {
  if (error instanceof InfrastructureLayerUploadRequestError) {
    return {
      status: error.status,
      payload: {
        error: error.message,
        code: error.code,
        details: error.details ?? null,
      },
    };
  }

  if (error instanceof InfrastructureLayerImportError) {
    return {
      status: error.status,
      payload: {
        error: error.message,
        code: error.code,
        details: error.details ?? null,
      },
    };
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return {
      status: 500,
      payload: {
        error: "Falha ao persistir o upload de infraestrutura elétrica.",
        code: "DATABASE_ERROR",
        details: { prismaCode: error.code },
      },
    };
  }

  if (error instanceof Error) {
    return {
      status: 500,
      payload: {
        error: error.message || "Falha ao processar o shapefile elétrico.",
        code: "INFRASTRUCTURE_UPLOAD_ERROR",
        details: null,
      },
    };
  }

  return {
    status: 500,
    payload: {
      error: "Falha ao processar o shapefile elétrico.",
      code: "INFRASTRUCTURE_UPLOAD_ERROR",
      details: null,
    },
  };
}

async function createProcessingUpload(input: {
  code: InfrastructureLayerCodeId;
  ownerTenantId: string | null;
  tenantIds: string[];
  uploadedById: string;
  file: File;
  requestedCode: InfrastructureLayerCodeId | null;
}) {
  return prisma.infrastructureLayerUpload.create({
    data: {
      code: input.code,
      status: "PROCESSING",
      ownerTenantId: input.ownerTenantId,
      uploadedById: input.uploadedById,
      uploadMetadata: serializeUploadMetadata({
        file: input.file,
        requestedCode: input.requestedCode,
        ownerTenantId: input.ownerTenantId,
        tenantIds: input.tenantIds,
      }),
      authorizedTenants: {
        createMany: {
          data: input.tenantIds.map((tenantId) => ({ tenantId })),
        },
      },
    },
  });
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
      include: layerListInclude,
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
  let uploadId: string | null = null;
  let resolvedCode: InfrastructureLayerCodeId | null = null;
  let inspection: InfrastructureLayerArchiveInspection | null = null;
  let storedArchive: StoredUploadFile | null = null;

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
    const requestedCode = normalizeRequestedCode(formData.get("code"));
    const file = formData.get("file");
    const rawName = formData.get("name");
    const rawDescription = formData.get("description");

    if (!(file instanceof File)) {
      throw requestError(
        "MISSING_ARCHIVE",
        "Arquivo ZIP não encontrado no envio."
      );
    }

    ensureZipFile(file);

    const tenantIds = normalizeTenantIds(formData);
    if (tenantIds.length === 0) {
      throw requestError(
        "MISSING_AUTHORIZED_TENANT",
        "Selecione pelo menos uma prefeitura autorizada."
      );
    }

    const ownerTenantId = normalizeOwnerTenantId(formData, tenantIds);
    const tenantIdsToValidate = Array.from(
      new Set(ownerTenantId ? [...tenantIds, ownerTenantId] : tenantIds)
    );
    const existingTenants = await prisma.tenant.findMany({
      where: {
        id: {
          in: tenantIdsToValidate,
        },
      },
      select: {
        id: true,
      },
    });

    if (existingTenants.length !== tenantIdsToValidate.length) {
      const foundTenantIds = new Set(existingTenants.map((tenant) => tenant.id));
      const missingTenantIds = tenantIdsToValidate.filter(
        (tenantId) => !foundTenantIds.has(tenantId)
      );
      throw requestError(
        "TENANT_NOT_FOUND",
        "Uma ou mais prefeituras selecionadas não existem mais.",
        { missingTenantIds }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    if (requestedCode) {
      resolvedCode = requestedCode;
      const provisionalUpload = await createProcessingUpload({
        code: requestedCode,
        ownerTenantId,
        tenantIds,
        uploadedById: sessionUser.id,
        file,
        requestedCode,
      });
      uploadId = provisionalUpload.id;
    }

    inspection = inspectInfrastructureLayerArchive({
      buffer,
      expectedCode: requestedCode,
    });
    resolvedCode = inspection.code;

    if (!uploadId) {
      const provisionalUpload = await createProcessingUpload({
        code: inspection.code,
        ownerTenantId,
        tenantIds,
        uploadedById: sessionUser.id,
        file,
        requestedCode,
      });
      uploadId = provisionalUpload.id;
    }

    const storage = getStorageProvider();
    storedArchive = await storage.upload({
      buffer,
      contentLength: file.size,
      contentType: inferZipMimeType(file),
      extension: "zip",
      moduleName: `infra-${inspection.code.toLowerCase()}`,
      originalName: file.name,
      tenantId: ownerTenantId ?? "shared",
    });

    await prisma.infrastructureLayerUpload.update({
      where: { id: uploadId },
      data: {
        ownerTenantId,
        uploadMetadata: serializeUploadMetadata({
          file,
          requestedCode,
          ownerTenantId,
          tenantIds,
          inspection,
          storedArchive,
        }),
      },
    });

    await prisma.infrastructureLayerUploadFile.createMany({
      data: buildUploadFileRecords({
        uploadId,
        file,
        inspection,
        storedArchive,
      }),
    });

    const imported = await importInfrastructureLayerFromZip({
      buffer,
      expectedCode: inspection.code,
      inspection,
    });

    const layerName =
      typeof rawName === "string" && rawName.trim().length > 0
        ? rawName.trim()
        : INFRASTRUCTURE_LAYER_LABELS[inspection.code];
    const description =
      typeof rawDescription === "string" && rawDescription.trim().length > 0
        ? rawDescription.trim()
        : null;

    const created = await prisma.$transaction(async (tx) => {
      const layer = await tx.infrastructureLayer.create({
        data: {
          code: inspection!.code,
          name: layerName,
          description,
          status: "READY",
          ownerTenantId,
          sourceArchiveName: file.name,
          sourceArchiveKey: storedArchive!.key,
          sourceArchiveUrl: storedArchive!.url,
          sourceArchiveSecureUrl: storedArchive!.secureUrl,
          sourceArchiveExpiresAt: storedArchive!.secureUrlExpiresAt
            ? new Date(storedArchive!.secureUrlExpiresAt)
            : null,
          sourceArchiveContentType: storedArchive!.contentType,
          sourceDatasetName: imported.datasetName,
          originalCrs: imported.originalCrs,
          geometryType: imported.geometryType,
          featureCount: imported.featureCount,
          bbox: (imported.bbox ?? undefined) as Prisma.InputJsonValue | undefined,
          geoJsonData: imported.geoJsonData as Prisma.InputJsonValue,
          metadata: toInputJsonValue({
            ...imported.metadata,
            uploadId,
            storageProvider: storedArchive!.provider,
            archiveUrl: storedArchive!.url,
            ownerTenantId,
          }),
          uploadedById: sessionUser.id,
          authorizedTenants: {
            createMany: {
              data: tenantIds.map((tenantId) => ({ tenantId })),
            },
          },
        },
      });

      await tx.infrastructureLayerUpload.update({
        where: { id: uploadId! },
        data: {
          status: "PROCESSED",
          processedAt: new Date(),
          finalLayerId: layer.id,
          processingError: null,
          processingResult: serializeProcessingResult({
            inspection,
            code: inspection!.code,
            featureCount: imported.featureCount,
            geometryType: imported.geometryType,
            bbox: imported.bbox,
            storedArchive,
            status: "PROCESSED",
          }),
        },
      });

      return tx.infrastructureLayer.findUniqueOrThrow({
        where: { id: layer.id },
        include: layerListInclude,
      });
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
        uploadId,
        code: created.code,
        name: created.name,
        ownerTenantId,
        featureCount: created.featureCount,
        geometryType: created.geometryType,
        authorizedTenantIds: tenantIds,
        storageProvider: getStorageDriverName(),
      },
    });

    return NextResponse.json({
      success: true,
      data: created,
      upload: {
        id: uploadId,
        status: "PROCESSED",
      },
    });
  } catch (error) {
    console.error("[INFRASTRUCTURE_LAYER_UPLOAD_ERROR]", error);

    const errorResponse = serializeErrorPayload(error);

    if (uploadId) {
      try {
        await prisma.infrastructureLayerUpload.update({
          where: { id: uploadId },
          data: {
            status: "FAILED",
            processedAt: new Date(),
            processingError: errorResponse.payload.error,
            processingResult: serializeProcessingResult({
              inspection,
              code: resolvedCode,
              storedArchive,
              status: "FAILED",
              error: {
                code: errorResponse.payload.code,
                message: errorResponse.payload.error,
                details:
                  errorResponse.payload.details &&
                  typeof errorResponse.payload.details === "object"
                    ? (errorResponse.payload.details as Record<string, unknown>)
                    : null,
              },
            }),
          },
        });
      } catch (updateError) {
        console.error("[INFRASTRUCTURE_LAYER_UPLOAD_FAILURE_UPDATE_ERROR]", updateError);
      }
    }

    return NextResponse.json(errorResponse.payload, {
      status: errorResponse.status,
    });
  }
}
