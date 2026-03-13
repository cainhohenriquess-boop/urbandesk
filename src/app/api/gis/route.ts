import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { getAccessBlockMessage, getAccessBlockReason } from "@/lib/auth-shared";
import { Prisma } from "@prisma/client";
import { AUDIT_ACTIONS, extractRequestContext, writeAuditLog } from "@/lib/audit";

const ALLOWED_ASSET_TYPES = ["PONTO", "TRECHO", "AREA"] as const;
type AllowedAssetType = (typeof ALLOWED_ASSET_TYPES)[number];

function isAllowedAssetType(value: string): value is AllowedAssetType {
  return (ALLOWED_ASSET_TYPES as readonly string[]).includes(value);
}

function parseBoundedInt(raw: string | null, fallback: number, max: number): number {
  const parsed = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(max, parsed);
}

function toPlainObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return { ...(value as Record<string, unknown>) };
}

function sanitizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function sanitizePhotoArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function normalizeClientRef(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 120);
}

function sanitizeRequiredString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseCoordPair(rawPair: string): [number, number] | null {
  const [lngRaw, latRaw] = rawPair.trim().split(/\s+/);
  const lng = Number(lngRaw);
  const lat = Number(latRaw);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  return [lng, lat];
}

function parseCoordList(raw: string): [number, number][] {
  return raw
    .split(",")
    .map((pair) => parseCoordPair(pair))
    .filter((pair): pair is [number, number] => pair !== null);
}

function parseWktGeometry(wkt: string | null): Record<string, unknown> | null {
  if (!wkt || typeof wkt !== "string") return null;
  const normalized = wkt.trim();

  const pointMatch = normalized.match(/^POINT\s*\((.+)\)$/i);
  if (pointMatch) {
    const point = parseCoordPair(pointMatch[1]);
    return point ? { type: "Point", coordinates: point } : null;
  }

  const lineMatch = normalized.match(/^LINESTRING\s*\((.+)\)$/i);
  if (lineMatch) {
    const coordinates = parseCoordList(lineMatch[1]);
    return coordinates.length >= 2 ? { type: "LineString", coordinates } : null;
  }

  const polygonMatch = normalized.match(/^POLYGON\s*\(\((.+)\)\)$/i);
  if (polygonMatch) {
    const firstRingRaw = polygonMatch[1].split(/\)\s*,\s*\(/)[0];
    const ring = parseCoordList(firstRingRaw);
    return ring.length >= 3 ? { type: "Polygon", coordinates: [ring] } : null;
  }

  return null;
}

// GET /api/gis - Fetch GIS assets (supports superadmin impersonation)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const cookieStore = await cookies();

    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const reason = getAccessBlockReason(session.user);
    if (reason) {
      return NextResponse.json(
        { error: getAccessBlockMessage(reason), code: reason },
        { status: 403 }
      );
    }

    const user = session.user;
    let targetTenantId = user.tenantId;

    if (user.role === "SUPERADMIN") {
      const impersonatedId = cookieStore.get("impersonate_tenant")?.value;
      if (impersonatedId) {
        targetTenantId = impersonatedId;
      } else {
        const paramId = req.nextUrl.searchParams.get("tenantId");
        if (paramId) targetTenantId = paramId;
      }
    }

    if (!targetTenantId) {
      return NextResponse.json({ error: "Tenant não identificado" }, { status: 400 });
    }

    const { searchParams } = req.nextUrl;
    const type = sanitizeOptionalString(searchParams.get("type"));
    const projectId = sanitizeOptionalString(searchParams.get("projectId"));
    const subType = sanitizeOptionalString(searchParams.get("subType"));
    const limit = parseBoundedInt(searchParams.get("limit"), 1000, 2000);

    const where: Prisma.AssetWhereInput = { tenantId: targetTenantId };
    if (type && isAllowedAssetType(type)) where.type = type;
    if (projectId) where.projectId = projectId;
    if (subType) {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : []),
        {
          attributes: {
            path: ["subType"],
            equals: subType,
          },
        },
      ];
    }

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
        project: { select: { name: true } },
      },
    });

    const geojson = {
      type: "FeatureCollection",
      features: assets.map((asset) => ({
        type: "Feature",
        geometry: parseWktGeometry(asset.geomWkt),
        properties: {
          id: asset.id,
          name: asset.name,
          type: asset.type,
          geomWkt: asset.geomWkt,
          projectId: asset.projectId,
          projectName: asset.project?.name ?? null,
          ...((asset.attributes as object) ?? {}),
        },
      })),
    };

    return NextResponse.json({ data: geojson, count: assets.length });
  } catch (error) {
    console.error("[GIS_GET_ERROR]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// POST /api/gis - Create GIS asset with offline idempotency
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const cookieStore = await cookies();

    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const reason = getAccessBlockReason(session.user);
    if (reason) {
      return NextResponse.json(
        { error: getAccessBlockMessage(reason), code: reason },
        { status: 403 }
      );
    }

    const user = session.user;
    let targetTenantId = user.tenantId;

    if (user.role === "SUPERADMIN") {
      const impersonatedId = cookieStore.get("impersonate_tenant")?.value;
      if (impersonatedId) targetTenantId = impersonatedId;
    }

    if (!targetTenantId) {
      return NextResponse.json({ error: "Tenant não identificado" }, { status: 400 });
    }

    const body = await req.json();

    const name = sanitizeOptionalString(body?.name);
    const normalizedTypeRaw =
      typeof body?.type === "string" ? body.type.toUpperCase().trim() : "";

    if (!name || !normalizedTypeRaw) {
      return NextResponse.json(
        { error: "name e type são obrigatórios" },
        { status: 400 }
      );
    }

    if (!isAllowedAssetType(normalizedTypeRaw)) {
      return NextResponse.json(
        { error: "type inválido. Use PONTO, TRECHO ou AREA." },
        { status: 400 }
      );
    }

    const normalizedType: AllowedAssetType = normalizedTypeRaw;
    const geomWkt = sanitizeOptionalString(body?.geomWkt);
    const projectId = sanitizeOptionalString(body?.projectId);
    const descriptionFromBody = sanitizeOptionalString(body?.description);

    if (projectId) {
      const project = await prisma.project.findFirst({
        where: { id: projectId, tenantId: targetTenantId },
        select: { id: true, status: true },
      });

      if (!project) {
        return NextResponse.json(
          { error: "Projeto informado não pertence ao tenant autenticado." },
          { status: 400 }
        );
      }

      if (project.status === "CANCELADO") {
        return NextResponse.json(
          { error: "Não é permitido vincular ativos a projeto cancelado." },
          { status: 409 }
        );
      }
    }

    const rawAttributes = toPlainObject(body?.attributes);
    const requestPhotos = sanitizePhotoArray(body?.photos);
    const attributePhotos = sanitizePhotoArray(rawAttributes.photos);
    const photos = requestPhotos.length > 0 ? requestPhotos : attributePhotos;

    const headerClientRef = normalizeClientRef(req.headers.get("x-offline-client-ref"));
    const attributeClientRef = normalizeClientRef(rawAttributes.clientRef);
    const bodyClientRef = normalizeClientRef(body?.clientRef);
    const clientRef = headerClientRef ?? attributeClientRef ?? bodyClientRef;

    const normalizedAttributes: Record<string, unknown> = { ...rawAttributes };
    if (clientRef) normalizedAttributes.clientRef = clientRef;
    if (clientRef && !normalizedAttributes.source) normalizedAttributes.source = "campo";
    if (photos.length > 0) normalizedAttributes.photos = photos;

    const description =
      descriptionFromBody ?? sanitizeOptionalString(normalizedAttributes.note);

    if (clientRef) {
      const existing = await prisma.asset.findFirst({
        where: {
          tenantId: targetTenantId,
          attributes: {
            path: ["clientRef"],
            equals: clientRef,
          },
        },
        select: {
          id: true,
          name: true,
          type: true,
          geomWkt: true,
          description: true,
        },
      });

      if (existing) {
        const incomingComparable = JSON.stringify({
          name,
          type: normalizedType,
          geomWkt,
          description,
        });

        const existingComparable = JSON.stringify({
          name: existing.name,
          type: existing.type,
          geomWkt: existing.geomWkt,
          description: existing.description,
        });

        if (incomingComparable !== existingComparable) {
          return NextResponse.json(
            {
              error: "Conflito de sincronização para este item offline.",
              code: "conflict",
              data: { id: existing.id },
            },
            { status: 409 }
          );
        }

        return NextResponse.json({ data: existing, deduplicated: true }, { status: 200 });
      }
    }

    const asset = await prisma.asset.create({
      data: {
        name,
        type: normalizedType,
        geomWkt: geomWkt ?? null,
        description: description ?? null,
        photos,
        attributes: normalizedAttributes as Prisma.InputJsonValue,
        tenantId: targetTenantId,
        projectId: projectId ?? null,
      },
    });

    await writeAuditLog({
      action: AUDIT_ACTIONS.GIS_ASSET_CREATE,
      entityType: "asset",
      entityId: asset.id,
      actor: {
        userId: session.user.id ?? null,
        userName: session.user.name ?? null,
        userEmail: session.user.email ?? null,
        userRole: session.user.role ?? null,
        tenantId: targetTenantId,
      },
      requestContext: extractRequestContext(req),
      metadata: {
        type: asset.type,
        projectId: asset.projectId,
      },
    });

    return NextResponse.json({ data: asset }, { status: 201 });
  } catch (error) {
    console.error("[GIS_POST_ERROR]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// PATCH /api/gis - Update GIS asset
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const cookieStore = await cookies();

    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const reason = getAccessBlockReason(session.user);
    if (reason) {
      return NextResponse.json(
        { error: getAccessBlockMessage(reason), code: reason },
        { status: 403 }
      );
    }

    const user = session.user;
    let targetTenantId = user.tenantId;

    if (user.role === "SUPERADMIN") {
      const impersonatedId = cookieStore.get("impersonate_tenant")?.value;
      if (impersonatedId) targetTenantId = impersonatedId;
    }

    if (!targetTenantId) {
      return NextResponse.json({ error: "Tenant não identificado" }, { status: 400 });
    }

    const body = await req.json();
    const id = sanitizeRequiredString(body?.id);
    if (!id) {
      return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 });
    }

    const existing = await prisma.asset.findFirst({
      where: { id, tenantId: targetTenantId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Ativo não encontrado" }, { status: 404 });
    }

    const updateData: Prisma.AssetUpdateInput = {};
    const changedFields: string[] = [];

    if (body?.name !== undefined) {
      const name = sanitizeRequiredString(body.name);
      if (!name) {
        return NextResponse.json({ error: "name inválido" }, { status: 400 });
      }
      updateData.name = name;
      changedFields.push("name");
    }

    if (body?.type !== undefined) {
      const typeRaw =
        typeof body.type === "string" ? body.type.toUpperCase().trim() : "";
      if (!isAllowedAssetType(typeRaw)) {
        return NextResponse.json(
          { error: "type inválido. Use PONTO, TRECHO ou AREA." },
          { status: 400 }
        );
      }
      updateData.type = typeRaw;
      changedFields.push("type");
    }

    if (body?.geomWkt !== undefined) {
      updateData.geomWkt = sanitizeOptionalString(body.geomWkt);
      changedFields.push("geomWkt");
    }

    if (body?.description !== undefined) {
      updateData.description = sanitizeOptionalString(body.description);
      changedFields.push("description");
    }

    if (body?.projectId !== undefined) {
      const projectId = sanitizeOptionalString(body.projectId);

      if (projectId) {
        const project = await prisma.project.findFirst({
          where: { id: projectId, tenantId: targetTenantId },
          select: { id: true, status: true },
        });

        if (!project) {
          return NextResponse.json(
            { error: "Projeto informado não pertence ao tenant autenticado." },
            { status: 400 }
          );
        }

        if (project.status === "CANCELADO") {
          return NextResponse.json(
            { error: "Não é permitido vincular ativos a projeto cancelado." },
            { status: 409 }
          );
        }
      }

      updateData.project = projectId ? { connect: { id: projectId } } : { disconnect: true };
      changedFields.push("projectId");
    }

    if (body?.attributes !== undefined) {
      const attrs = toPlainObject(body.attributes);
      updateData.attributes = attrs as Prisma.InputJsonValue;
      changedFields.push("attributes");
    }

    if (body?.photos !== undefined) {
      const photos = sanitizePhotoArray(body.photos);
      updateData.photos = photos;
      changedFields.push("photos");
    }

    if (changedFields.length === 0) {
      return NextResponse.json(
        { error: "Informe ao menos um campo para atualizar." },
        { status: 400 }
      );
    }

    const updated = await prisma.asset.update({
      where: { id: existing.id },
      data: updateData,
    });

    await writeAuditLog({
      action: AUDIT_ACTIONS.GIS_ASSET_UPDATE,
      entityType: "asset",
      entityId: updated.id,
      actor: {
        userId: session.user.id ?? null,
        userName: session.user.name ?? null,
        userEmail: session.user.email ?? null,
        userRole: session.user.role ?? null,
        tenantId: targetTenantId,
      },
      requestContext: extractRequestContext(req),
      metadata: {
        changedFields,
        previousType: existing.type,
        nextType: updated.type,
        previousProjectId: existing.projectId,
        nextProjectId: updated.projectId,
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("[GIS_PATCH_ERROR]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// DELETE /api/gis - Remove GIS asset (supports superadmin impersonation)
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const cookieStore = await cookies();

    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const reason = getAccessBlockReason(session.user);
    if (reason) {
      return NextResponse.json(
        { error: getAccessBlockMessage(reason), code: reason },
        { status: 403 }
      );
    }

    const user = session.user;
    let currentTenantId = user.tenantId;

    if (user.role === "SUPERADMIN") {
      const impersonatedId = cookieStore.get("impersonate_tenant")?.value;
      if (impersonatedId) currentTenantId = impersonatedId;
    }

    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 });
    }

    const asset = await prisma.asset.findUnique({ where: { id } });
    if (!asset) {
      return NextResponse.json({ error: "Ativo não encontrado" }, { status: 404 });
    }

    if (
      user.role !== "SUPERADMIN" &&
      (!currentTenantId || asset.tenantId !== currentTenantId)
    ) {
      return NextResponse.json(
        { error: "Não autorizado a remover ativos de outra prefeitura" },
        { status: 403 }
      );
    }

    await prisma.asset.delete({ where: { id } });
    return NextResponse.json({ message: "Ativo removido com sucesso" });
  } catch (error) {
    console.error("[GIS_DELETE_ERROR]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

