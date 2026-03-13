import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { getAccessBlockMessage, getAccessBlockReason } from "@/lib/auth-shared";
import { enforceRequestRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

export const dynamic = "force-dynamic";
const tenantIdSchema = z.string().cuid();

// ─────────────────────────────────────────────
// GET /api/baselayers — Busca os Shapefiles (GeoJSON) da prefeitura
// ─────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const rateLimitResponse = enforceRequestRateLimit(req, {
      namespace: "api:baselayers:get",
      limit: 120,
      windowMs: 60_000,
    });
    if (rateLimitResponse) return rateLimitResponse;

    const cookieStore = await cookies();
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const reason = getAccessBlockReason(session.user);
    if (reason) {
      return NextResponse.json({ error: getAccessBlockMessage(reason), code: reason }, { status: 403 });
    }

    const user = session.user;
    const tenantId = user.tenantId;

    // Garante que o SuperAdmin possa ler os Shapefiles do Tenant que ele está inspecionando
    const cookieTenantIdRaw = cookieStore.get("impersonate_tenant")?.value ?? null;
    const queryTenantIdRaw = req.nextUrl.searchParams.get("tenantId");
    const cookieTenantId = cookieTenantIdRaw
      ? tenantIdSchema.safeParse(cookieTenantIdRaw).data ?? null
      : null;
    const queryTenantId = queryTenantIdRaw
      ? tenantIdSchema.safeParse(queryTenantIdRaw).data ?? null
      : null;

    if ((cookieTenantIdRaw && !cookieTenantId) || (queryTenantIdRaw && !queryTenantId)) {
      return NextResponse.json({ error: "Tenant inválido" }, { status: 400 });
    }

    const targetTenantId = user.role === "SUPERADMIN"
      ? (cookieTenantId ?? queryTenantId ?? tenantId)
      : tenantId;

    if (!targetTenantId || !tenantIdSchema.safeParse(targetTenantId).success) {
      return NextResponse.json({ error: "Tenant não identificado" }, { status: 400 });
    }

    const baseLayers = await prisma.baseLayer.findMany({
      where: { tenantId: targetTenantId },
      select: {
        id: true,
        name: true,
        type: true,
        geoJsonData: true,
      },
      orderBy: { createdAt: "asc" }
    });

    return NextResponse.json({ data: baseLayers });
  } catch (error) {
    console.error("[BASELAYERS_GET_ERROR]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
