import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

// ─────────────────────────────────────────────
// GET /api/gis — Busca ativos GIS da nuvem (Respeitando Modo Fantasma)
// ─────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const cookieStore = await cookies();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const user = session.user as any;
    let targetTenantId = user.tenantId;

    // 🚀 LÓGICA DO MODO FANTASMA: Se for SuperAdmin, verifica o Cookie
    if (user.role === "SUPERADMIN") {
      const impersonatedId = cookieStore.get("impersonate_tenant")?.value;
      if (impersonatedId) {
        targetTenantId = impersonatedId;
      } else {
        // Fallback para URL caso necessário
        const paramId = req.nextUrl.searchParams.get("tenantId");
        if (paramId) targetTenantId = paramId;
      }
    }

    if (!targetTenantId) {
      return NextResponse.json({ error: "Tenant não identificado" }, { status: 400 });
    }

    const { searchParams } = req.nextUrl;
    const type = searchParams.get("type");
    const limit = Math.min(2000, Number(searchParams.get("limit") ?? 1000)); // Limite de segurança

    const where: any = { tenantId: targetTenantId };
    if (type) where.type = type;

    const assets = await prisma.asset.findMany({
      where,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        type: true,
        geomWkt: true,
        attributes: true,
        projectId: true,
      },
    });

    // Transformação para GeoJSON puro
    const geojson = {
      type: "FeatureCollection",
      features: assets.map((a) => {
        return {
          type: "Feature",
          geometry: null, // A geometria será montada no front-end via WKT
          properties: {
            id: a.id,
            name: a.name,
            type: a.type,
            geomWkt: a.geomWkt, // Enviando o WKT puro para o motor gráfico
            projectId: a.projectId,
            ...((a.attributes as object) ?? {}),
          },
        };
      }),
    };

    return NextResponse.json({ data: geojson, count: assets.length });
  } catch (error) {
    console.error("[GIS_GET_ERROR]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────
// POST /api/gis — Salva novo ativo GIS (Respeitando Modo Fantasma)
// ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const cookieStore = await cookies();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const user = session.user as any;
    let targetTenantId = user.tenantId;

    // 🚀 LÓGICA DO MODO FANTASMA
    if (user.role === "SUPERADMIN") {
      const impersonatedId = cookieStore.get("impersonate_tenant")?.value;
      if (impersonatedId) targetTenantId = impersonatedId;
    }

    if (!targetTenantId && user.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Tenant não identificado" }, { status: 400 });
    }

    const body = await req.json();
    const { name, type, geomWkt, attributes, projectId } = body;

    if (!name || !type) {
      return NextResponse.json({ error: "name e type são obrigatórios" }, { status: 400 });
    }

    const asset = await prisma.asset.create({
      data: {
        name,
        type, // PONTO, TRECHO ou AREA
        geomWkt: geomWkt ?? null,
        attributes: attributes ?? {},
        tenantId: targetTenantId, // Salva na prefeitura correta
        projectId: projectId ?? null,
      },
    });

    return NextResponse.json({ data: asset }, { status: 201 });
  } catch (error) {
    console.error("[GIS_POST_ERROR]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────
// DELETE /api/gis — Remove ativo GIS (Respeitando Modo Fantasma)
// ─────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const cookieStore = await cookies();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const user = session.user as any;
    let currentTenantId = user.tenantId;

    // 🚀 LÓGICA DO MODO FANTASMA
    if (user.role === "SUPERADMIN") {
      const impersonatedId = cookieStore.get("impersonate_tenant")?.value;
      if (impersonatedId) currentTenantId = impersonatedId;
    }

    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 });

    const asset = await prisma.asset.findUnique({ where: { id } });
    if (!asset) return NextResponse.json({ error: "Ativo não encontrado" }, { status: 404 });
    
    // Validação de Segurança
    if (user.role !== "SUPERADMIN" && asset.tenantId !== currentTenantId) {
      return NextResponse.json({ error: "Não autorizado a remover ativos de outra prefeitura" }, { status: 403 });
    }

    await prisma.asset.delete({ where: { id } });
    return NextResponse.json({ message: "Ativo removido com sucesso" });
  } catch (error) {
    console.error("[GIS_DELETE_ERROR]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
