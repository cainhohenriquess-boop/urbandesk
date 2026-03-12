import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { getAccessBlockMessage, getAccessBlockReason } from "@/lib/auth-shared";

export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────
// GET /api/baselayers — Busca os Shapefiles (GeoJSON) da prefeitura
// ─────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
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
    const targetTenantId = user.role === "SUPERADMIN"
      ? (cookieStore.get("impersonate_tenant")?.value ?? req.nextUrl.searchParams.get("tenantId") ?? tenantId)
      : tenantId;

    if (!targetTenantId) {
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
