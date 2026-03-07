import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ─────────────────────────────────────────────
// GET /api/gis — Busca ativos GIS do tenant
// Suporta bbox (bounding box) para queries espaciais
// ─────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const user     = session.user as any;
  const tenantId = user.tenantId;

  // SuperAdmin pode ver qualquer tenant via query param
  const targetTenantId =
    user.role === "SUPERADMIN"
      ? (req.nextUrl.searchParams.get("tenantId") ?? tenantId)
      : tenantId;

  if (!targetTenantId) {
    return NextResponse.json({ error: "Tenant não identificado" }, { status: 400 });
  }

  const { searchParams } = req.nextUrl;
  const type      = searchParams.get("type");       // PONTO | TRECHO | AREA
  const projectId = searchParams.get("projectId");
  const bbox      = searchParams.get("bbox");       // "minLng,minLat,maxLng,maxLat"
  const limit     = Math.min(500, Number(searchParams.get("limit") ?? 200));

  // ── Filtragem básica via Prisma ──
  const where: any = { tenantId: targetTenantId };
  if (type)      where.type      = type;
  if (projectId) where.projectId = projectId;

  // ── Filtro espacial com bbox via PostGIS $queryRaw ──
  if (bbox) {
    const [minLng, minLat, maxLng, maxLat] = bbox.split(",").map(Number);

    if ([minLng, minLat, maxLng, maxLat].some(isNaN)) {
      return NextResponse.json({ error: "BBOX inválido" }, { status: 400 });
    }

    // Query raw para aproveitar índice PostGIS
    const assets = await prisma.$queryRaw`
      SELECT id, name, type, lat, lng, "geomWkt", attributes, "projectId", "createdAt"
      FROM assets
      WHERE "tenantId" = ${targetTenantId}
        AND lat BETWEEN ${minLat} AND ${maxLat}
        AND lng BETWEEN ${minLng} AND ${maxLng}
        ${type      ? prisma.$queryRaw`AND type = ${type}::text`      : prisma.$queryRaw``}
        ${projectId ? prisma.$queryRaw`AND "projectId" = ${projectId}` : prisma.$queryRaw``}
      ORDER BY "createdAt" DESC
      LIMIT ${limit}
    `;

    return NextResponse.json({ data: assets });
  }

  // ── Busca normal (sem bbox) ──
  const assets = await prisma.asset.findMany({
    where,
    take:    limit,
    orderBy: { createdAt: "desc" },
    select: {
      id:         true,
      name:       true,
      type:       true,
      lat:        true,
      lng:        true,
      geomWkt:    true,
      attributes: true,
      projectId:  true,
      createdAt:  true,
    },
  });

  // Converte para GeoJSON FeatureCollection
  const geojson = {
    type: "FeatureCollection",
    features: assets.map((a) => ({
      type: "Feature",
      geometry: a.lat && a.lng
        ? { type: "Point", coordinates: [a.lng, a.lat] }
        : null,
      properties: {
        id:        a.id,
        name:      a.name,
        type:      a.type,
        projectId: a.projectId,
        ...((a.attributes as object) ?? {}),
      },
    })),
  };

  return NextResponse.json({ data: geojson, count: assets.length });
}

// ─────────────────────────────────────────────
// POST /api/gis — Salva novo ativo GIS
// ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const user     = session.user as any;
  const tenantId = user.tenantId;

  if (!tenantId && user.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Tenant não identificado" }, { status: 400 });
  }

  const body = await req.json();
  const { name, type, lat, lng, geomWkt, attributes, projectId, description } = body;

  if (!name || !type) {
    return NextResponse.json({ error: "name e type são obrigatórios" }, { status: 400 });
  }

  const asset = await prisma.asset.create({
    data: {
      name,
      type,
      description,
      lat:        lat    ?? null,
      lng:        lng    ?? null,
      geomWkt:    geomWkt ?? (lat && lng ? `POINT(${lng} ${lat})` : null),
      attributes: attributes ?? {},
      tenantId:   body.tenantId ?? tenantId,
      projectId:  projectId ?? null,
    },
  });

  return NextResponse.json({ data: asset }, { status: 201 });
}

// ─────────────────────────────────────────────
// DELETE /api/gis — Remove ativo GIS
// ─────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const user     = session.user as any;
  const tenantId = user.tenantId;

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 });

  // Garante que só o tenant dono pode deletar (exceto SUPERADMIN)
  const asset = await prisma.asset.findUnique({ where: { id } });
  if (!asset) return NextResponse.json({ error: "Ativo não encontrado" }, { status: 404 });
  if (user.role !== "SUPERADMIN" && asset.tenantId !== tenantId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  await prisma.asset.delete({ where: { id } });
  return NextResponse.json({ message: "Ativo removido com sucesso" });
}
