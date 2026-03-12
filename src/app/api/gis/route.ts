import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { getAccessBlockMessage, getAccessBlockReason } from "@/lib/auth-shared";
import { Prisma } from "@prisma/client";

const ALLOWED_ASSET_TYPES = ["PONTO", "TRECHO", "AREA"] as const;
type AllowedAssetType = (typeof ALLOWED_ASSET_TYPES)[number];

function isAllowedAssetType(value: string): value is AllowedAssetType {
  return (ALLOWED_ASSET_TYPES as readonly string[]).includes(value);
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

// GET /api/gis - Fetch GIS assets (supports superadmin impersonation)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const cookieStore = await cookies();

    if (!session) {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
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
      return NextResponse.json({ error: "Tenant nao identificado" }, { status: 400 });
    }

    const { searchParams } = req.nextUrl;
    const type = searchParams.get("type");
    const limit = Math.min(2000, Number(searchParams.get("limit") ?? 1000));

    const where: Record<string, unknown> = { tenantId: targetTenantId };
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

    const geojson = {
      type: "FeatureCollection",
      features: assets.map((asset) => ({
        type: "Feature",
        geometry: null,
        properties: {
          id: asset.id,
          name: asset.name,
          type: asset.type,
          geomWkt: asset.geomWkt,
          projectId: asset.projectId,
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
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
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
      return NextResponse.json({ error: "Tenant nao identificado" }, { status: 400 });
    }

    const body = await req.json();

    const name = sanitizeOptionalString(body?.name);
    const normalizedTypeRaw =
      typeof body?.type === "string" ? body.type.toUpperCase().trim() : "";

    if (!name || !normalizedTypeRaw) {
      return NextResponse.json(
        { error: "name e type sao obrigatorios" },
        { status: 400 }
      );
    }

    if (!isAllowedAssetType(normalizedTypeRaw)) {
      return NextResponse.json(
        { error: "type invalido. Use PONTO, TRECHO ou AREA." },
        { status: 400 }
      );
    }

    const normalizedType: AllowedAssetType = normalizedTypeRaw;
    const geomWkt = sanitizeOptionalString(body?.geomWkt);
    const projectId = sanitizeOptionalString(body?.projectId);
    const descriptionFromBody = sanitizeOptionalString(body?.description);

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
    if (!normalizedAttributes.source) normalizedAttributes.source = "campo";
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
              error: "Conflito de sincronizacao para este item offline.",
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

    return NextResponse.json({ data: asset }, { status: 201 });
  } catch (error) {
    console.error("[GIS_POST_ERROR]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// DELETE /api/gis - Remove GIS asset (supports superadmin impersonation)
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const cookieStore = await cookies();

    if (!session) {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
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
      return NextResponse.json({ error: "ID e obrigatorio" }, { status: 400 });
    }

    const asset = await prisma.asset.findUnique({ where: { id } });
    if (!asset) {
      return NextResponse.json({ error: "Ativo nao encontrado" }, { status: 404 });
    }

    if (
      user.role !== "SUPERADMIN" &&
      (!currentTenantId || asset.tenantId !== currentTenantId)
    ) {
      return NextResponse.json(
        { error: "Nao autorizado a remover ativos de outra prefeitura" },
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

