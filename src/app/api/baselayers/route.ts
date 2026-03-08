import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ─────────────────────────────────────────────
// GET /api/baselayers — Busca os Shapefiles (GeoJSON) da prefeitura
// ─────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const user = session.user as any;
    const tenantId = user.tenantId;

    // Garante que o SuperAdmin possa ler os Shapefiles do Tenant que ele está inspecionando
    const targetTenantId = user.role === "SUPERADMIN" 
      ? (req.nextUrl.searchParams.get("tenantId") ?? tenantId) 
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