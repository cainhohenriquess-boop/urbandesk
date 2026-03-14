import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { getAccessBlockMessage, getAccessBlockReason } from "@/lib/auth-shared";
import { prisma } from "@/lib/prisma";
import { AUDIT_ACTIONS, extractRequestContext, writeAuditLog } from "@/lib/audit";
import { enforceRequestRateLimit } from "@/lib/rate-limit";
import { requireJsonContentType } from "@/lib/request-guards";

const tenantIdSchema = z.string().cuid();
const assetLogSchema = z
  .object({
    note: z.string().trim().min(1).max(4000),
    photos: z.array(z.string().trim().min(1).max(2048)).max(10).optional(),
    lat: z.number().finite().optional().nullable(),
    lng: z.number().finite().optional().nullable(),
  })
  .strict();

function sanitizePhotos(value: string[] | undefined) {
  if (!value) return [];
  return value.map((entry) => entry.trim()).filter((entry) => entry.length > 0);
}

async function resolveTenantId(sessionTenantId: string | undefined, role: string | undefined) {
  if (role !== "SUPERADMIN") return sessionTenantId ?? null;
  const cookieStore = await cookies();
  return cookieStore.get("impersonate_tenant")?.value ?? sessionTenantId ?? null;
}

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const rateLimitResponse = enforceRequestRateLimit(req, {
      namespace: "api:gis:logs:post",
      limit: 60,
      windowMs: 60_000,
    });
    if (rateLimitResponse) return rateLimitResponse;

    const contentTypeError = requireJsonContentType(req);
    if (contentTypeError) return contentTypeError;

    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    if (!session.user.id) {
      return NextResponse.json({ error: "Sessão inválida" }, { status: 401 });
    }

    const reason = getAccessBlockReason(session.user);
    if (reason) {
      return NextResponse.json(
        { error: getAccessBlockMessage(reason), code: reason },
        { status: 403 }
      );
    }

    const tenantId = await resolveTenantId(session.user.tenantId, session.user.role);
    if (!tenantId || !tenantIdSchema.safeParse(tenantId).success) {
      return NextResponse.json({ error: "Tenant não identificado" }, { status: 400 });
    }

    const { id } = await context.params;
    if (!tenantIdSchema.safeParse(id).success) {
      return NextResponse.json({ error: "Ativo inválido." }, { status: 400 });
    }

    const asset = await prisma.asset.findFirst({
      where: { id, tenantId },
      select: { id: true, name: true, tenantId: true },
    });

    if (!asset) {
      return NextResponse.json({ error: "Ativo não encontrado." }, { status: 404 });
    }

    const payload = assetLogSchema.parse(await req.json());
    const log = await prisma.assetLog.create({
      data: {
        assetId: asset.id,
        userId: session.user.id,
        note: payload.note,
        photos: sanitizePhotos(payload.photos),
        lat: payload.lat ?? null,
        lng: payload.lng ?? null,
      },
      select: {
        id: true,
        note: true,
        photos: true,
        lat: true,
        lng: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    await writeAuditLog({
      action: AUDIT_ACTIONS.GIS_ASSET_COMMENT,
      entityType: "asset_log",
      entityId: log.id,
      actor: {
        userId: session.user.id ?? null,
        userName: session.user.name ?? null,
        userEmail: session.user.email ?? null,
        userRole: session.user.role ?? null,
        tenantId,
      },
      requestContext: extractRequestContext(req),
      metadata: {
        assetId: asset.id,
        assetName: asset.name,
        photosCount: log.photos.length,
        sourceAction: AUDIT_ACTIONS.GIS_ASSET_UPDATE,
      },
    });

    return NextResponse.json({ data: log }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Payload inválido", details: error.issues },
        { status: 400 }
      );
    }
    console.error("[GIS_LOG_POST_ERROR]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
