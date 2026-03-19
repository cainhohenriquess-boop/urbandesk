import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveCampoRequestContext } from "@/lib/campo-api";
import {
  CAMPO_INSPECTION_STATUS_VALUES,
  CAMPO_ISSUE_STATUS_VALUES,
  CAMPO_RECORD_TYPE_VALUES,
  resolveCampoAssetTechnicalContext,
  type CampoInspectionStatus,
  type CampoIssueStatus,
} from "@/lib/campo-project-links";
import { AUDIT_ACTIONS, extractRequestContext, writeAuditLog } from "@/lib/audit";
import { enforceRequestRateLimit } from "@/lib/rate-limit";
import { requireJsonContentType } from "@/lib/request-guards";
import {
  PRISMA_PROJECT_TECHNICAL_AREAS,
  isTechnicalObjectType,
} from "@/lib/project-disciplines";

const nullableCuidSchema = z.preprocess(
  (value) => (value === "" || value === undefined || value === null ? null : value),
  z.string().cuid().nullable()
);

const nullableStringSchema = z.preprocess(
  (value) => {
    if (value === "" || value === undefined || value === null) return null;
    return typeof value === "string" ? value.trim() : value;
  },
  z.string().max(4000).nullable()
);

const nullableNumberSchema = z.preprocess(
  (value) => (value === "" || value === undefined || value === null ? null : value),
  z.coerce.number().finite().nullable()
);

const campoRecordSchema = z
  .object({
    recordType: z.enum(CAMPO_RECORD_TYPE_VALUES),
    name: z.string().trim().min(3).max(160),
    note: nullableStringSchema.optional(),
    lat: nullableNumberSchema.optional(),
    lng: nullableNumberSchema.optional(),
    photos: z.array(z.string().trim().min(1).max(2048)).max(20).optional().default([]),
    projectId: z.string().cuid(),
    phaseId: nullableCuidSchema.optional(),
    relatedAssetId: nullableCuidSchema.optional(),
    technicalArea: z.enum(PRISMA_PROJECT_TECHNICAL_AREAS).nullable().optional(),
    technicalObjectType: z.preprocess(
      (value) => (value === "" || value === undefined || value === null ? null : value),
      z.string().trim().max(120).nullable()
    ).optional(),
    inspectionStatus: z.enum(CAMPO_INSPECTION_STATUS_VALUES).optional(),
    issueStatus: z.enum(CAMPO_ISSUE_STATUS_VALUES).optional(),
    clientRef: z.preprocess(
      (value) => (value === "" || value === undefined || value === null ? null : value),
      z.string().trim().min(1).max(120).nullable()
    ).optional(),
  })
  .strict();

function sanitizePhotoArray(value: string[]) {
  return value.map((item) => item.trim()).filter((item) => item.length > 0);
}

function buildLocationLabel(input: {
  lat: number | null;
  lng: number | null;
  assetName: string | null;
  projectNeighborhood: string | null;
}) {
  if (input.assetName) return input.assetName;
  if (input.lat != null && input.lng != null) {
    return `GPS ${input.lat.toFixed(6)}, ${input.lng.toFixed(6)}`;
  }
  return input.projectNeighborhood || "Projeto";
}

function resolveInspectionStatus(value: CampoInspectionStatus | undefined) {
  return value ?? "REALIZADA";
}

function resolveIssueStatus(value: CampoIssueStatus | undefined) {
  return value ?? "ABERTA";
}

function buildFieldMetadata(input: {
  clientRef: string | null;
  note: string | null;
  lat: number | null;
  lng: number | null;
  photos: string[];
  recordType: "VISTORIA" | "OCORRENCIA";
}) {
  return {
    source: "campo",
    offlineQueue: Boolean(input.clientRef),
    clientRef: input.clientRef,
    note: input.note,
    lat: input.lat,
    lng: input.lng,
    photos: input.photos,
    capturedAt: new Date().toISOString(),
    fieldRecordType: input.recordType,
  } satisfies Record<string, unknown>;
}

export async function POST(req: NextRequest) {
  try {
    const rateLimitResponse = enforceRequestRateLimit(req, {
      namespace: "api:campo:records:post",
      limit: 90,
      windowMs: 60_000,
    });
    if (rateLimitResponse) return rateLimitResponse;

    const contentTypeError = requireJsonContentType(req);
    if (contentTypeError) return contentTypeError;

    const access = await resolveCampoRequestContext(req);
    if ("response" in access) return access.response;

    const { session, tenantId } = access;
    const body = campoRecordSchema.parse(await req.json());
    const photos = sanitizePhotoArray(body.photos);
    const note = body.note ?? null;
    const clientRef = body.clientRef ?? null;

    const project = await prisma.project.findFirst({
      where: { id: body.projectId, tenantId },
      select: {
        id: true,
        name: true,
        code: true,
        neighborhood: true,
        technicalAreas: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Projeto informado n\u00e3o pertence ao tenant autenticado." }, { status: 400 });
    }

    const phase = body.phaseId
      ? await prisma.projectPhase.findFirst({
          where: {
            id: body.phaseId,
            tenantId,
            projectId: project.id,
          },
          select: {
            id: true,
            name: true,
            sequence: true,
            technicalArea: true,
          },
        })
      : null;

    if (body.phaseId && !phase) {
      return NextResponse.json({ error: "Fase inv\u00e1lida para o projeto selecionado." }, { status: 400 });
    }

    const asset = body.relatedAssetId
      ? await prisma.asset.findFirst({
          where: {
            id: body.relatedAssetId,
            tenantId,
            projectId: project.id,
          },
          select: {
            id: true,
            name: true,
            type: true,
            attributes: true,
          },
        })
      : null;

    if (body.relatedAssetId && !asset) {
      return NextResponse.json(
        { error: "Objeto t\u00e9cnico relacionado n\u00e3o pertence ao projeto selecionado." },
        { status: 400 }
      );
    }

    if (body.technicalObjectType && !isTechnicalObjectType(body.technicalObjectType)) {
      return NextResponse.json({ error: "Tipo de objeto t\u00e9cnico inv\u00e1lido." }, { status: 400 });
    }

    const assetContext = asset ? resolveCampoAssetTechnicalContext(asset) : null;
    const assetTechnicalArea =
      assetContext?.technicalArea &&
      PRISMA_PROJECT_TECHNICAL_AREAS.includes(
        assetContext.technicalArea as (typeof PRISMA_PROJECT_TECHNICAL_AREAS)[number]
      )
        ? (assetContext.technicalArea as (typeof PRISMA_PROJECT_TECHNICAL_AREAS)[number])
        : null;
    const technicalArea =
      assetTechnicalArea ??
      (body.technicalArea as (typeof PRISMA_PROJECT_TECHNICAL_AREAS)[number] | null) ??
      null;
    const technicalObjectType = assetContext?.technicalObjectType ?? body.technicalObjectType ?? null;

    if (!technicalArea) {
      return NextResponse.json({ error: "Selecione a \u00e1rea t\u00e9cnica da vistoria ou ocorr\u00eancia." }, { status: 400 });
    }

    if (!technicalObjectType) {
      return NextResponse.json(
        { error: "Selecione o objeto t\u00e9cnico relacionado ou vincule um item t\u00e9cnico do projeto." },
        { status: 400 }
      );
    }

    if (!project.technicalAreas.includes(technicalArea) && technicalArea !== "FISCALIZACAO") {
      return NextResponse.json(
        { error: "A \u00e1rea t\u00e9cnica informada n\u00e3o est\u00e1 habilitada neste projeto." },
        { status: 400 }
      );
    }

    if (phase?.technicalArea && phase.technicalArea !== technicalArea) {
      return NextResponse.json(
        { error: "A fase selecionada pertence a outra \u00e1rea t\u00e9cnica do projeto." },
        { status: 400 }
      );
    }

    if (clientRef) {
      const duplicate =
        body.recordType === "VISTORIA"
          ? await prisma.projectInspection.findFirst({
              where: {
                tenantId,
                metadata: {
                  path: ["clientRef"],
                  equals: clientRef,
                },
              },
              select: { id: true },
            })
          : await prisma.projectIssue.findFirst({
              where: {
                tenantId,
                metadata: {
                  path: ["clientRef"],
                  equals: clientRef,
                },
              },
              select: { id: true },
            });

      if (duplicate) {
        return NextResponse.json({ data: duplicate, deduplicated: true }, { status: 200 });
      }
    }

    const metadata = buildFieldMetadata({
      clientRef,
      note,
      lat: body.lat ?? null,
      lng: body.lng ?? null,
      photos,
      recordType: body.recordType,
    });

    if (body.recordType === "VISTORIA") {
      const inspection = await prisma.projectInspection.create({
        data: {
          tenantId,
          projectId: project.id,
          phaseId: phase?.id ?? null,
          assetId: asset?.id ?? null,
          inspectorId: session.user.id ?? null,
          inspectionType: "ROTINA",
          status: resolveInspectionStatus(body.inspectionStatus),
          occurredAt: new Date(),
          location: buildLocationLabel({
            lat: body.lat ?? null,
            lng: body.lng ?? null,
            assetName: asset?.name ?? null,
            projectNeighborhood: project.neighborhood,
          }),
          summary: body.name,
          findings: note,
          metadata: metadata as Prisma.InputJsonValue,
          technicalArea,
          technicalObjectType,
        },
      });

      await writeAuditLog({
        action: AUDIT_ACTIONS.FIELD_INSPECTION_CREATE,
        entityType: "project_inspection",
        entityId: inspection.id,
        actor: {
          userId: session.user.id ?? null,
          userName: session.user.name ?? null,
          userEmail: session.user.email ?? null,
          userRole: session.user.role ?? null,
          tenantId,
        },
        requestContext: extractRequestContext(req),
        metadata: {
          projectId: project.id,
          technicalArea,
          technicalObjectType,
          phaseId: phase?.id ?? null,
          assetId: asset?.id ?? null,
          source: "campo",
        },
      });

      return NextResponse.json({ data: inspection }, { status: 201 });
    }

    const issue = await prisma.projectIssue.create({
      data: {
        tenantId,
        projectId: project.id,
        phaseId: phase?.id ?? null,
        assetId: asset?.id ?? null,
        reportedById: session.user.id ?? null,
        title: body.name,
        description: note,
        issueType: "TECNICO",
        status: resolveIssueStatus(body.issueStatus),
        priority: "MEDIA",
        metadata: metadata as Prisma.InputJsonValue,
        technicalArea,
        technicalObjectType,
      },
    });

    await writeAuditLog({
      action: AUDIT_ACTIONS.FIELD_ISSUE_CREATE,
      entityType: "project_issue",
      entityId: issue.id,
      actor: {
        userId: session.user.id ?? null,
        userName: session.user.name ?? null,
        userEmail: session.user.email ?? null,
        userRole: session.user.role ?? null,
        tenantId,
      },
      requestContext: extractRequestContext(req),
      metadata: {
        projectId: project.id,
        technicalArea,
        technicalObjectType,
        phaseId: phase?.id ?? null,
        assetId: asset?.id ?? null,
        source: "campo",
      },
    });

    return NextResponse.json({ data: issue }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Payload inv\u00e1lido.", details: error.issues }, { status: 400 });
    }

    console.error("[CAMPO_RECORD_POST_ERROR]", error);
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 });
  }
}

