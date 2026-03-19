import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import {
  AUDIT_ACTIONS,
  extractRequestContext,
  writeAuditLog,
} from "@/lib/audit";
import {
  projectIssueInputSchema,
} from "@/lib/project-governance";
import { loadProjectGovernanceData } from "@/lib/project-governance-data";
import { resolveProjectGovernanceContext } from "@/lib/project-governance-api";
import { prisma } from "@/lib/prisma";
import { enforceRequestRateLimit } from "@/lib/rate-limit";
import { requireJsonContentType } from "@/lib/request-guards";

export const runtime = "nodejs";

type ProjectIssueRouteParams = {
  params: Promise<{ id: string }>;
};

async function resolveProjectId(context: ProjectIssueRouteParams) {
  const params = await context.params;
  return typeof params.id === "string" ? params.id : "";
}

function readAssetTechnicalContext(attributes: unknown) {
  if (!attributes || typeof attributes !== "object" || Array.isArray(attributes)) {
    return { technicalArea: null, technicalObjectType: null };
  }

  const next = attributes as { technicalArea?: unknown; technicalObjectType?: unknown };
  return {
    technicalArea: typeof next.technicalArea === "string" ? next.technicalArea : null,
    technicalObjectType:
      typeof next.technicalObjectType === "string" ? next.technicalObjectType : null,
  };
}

export async function POST(req: NextRequest, context: ProjectIssueRouteParams) {
  try {
    const rateLimitResponse = enforceRequestRateLimit(req, {
      namespace: "api:projects:issues:post",
      limit: 50,
      windowMs: 60_000,
    });
    if (rateLimitResponse) return rateLimitResponse;

    const contentTypeError = requireJsonContentType(req);
    if (contentTypeError) return contentTypeError;

    const projectId = await resolveProjectId(context);
    const routeContext = await resolveProjectGovernanceContext(req, projectId, "write");
    if ("response" in routeContext) return routeContext.response;

    const payload = projectIssueInputSchema.parse(await req.json());

    const [phase, inspection, asset, assignedTo] = await Promise.all([
      payload.phaseId
        ? prisma.projectPhase.findFirst({
            where: {
              id: payload.phaseId,
              tenantId: routeContext.tenantId,
              projectId: routeContext.project.id,
            },
            select: {
              id: true,
              technicalArea: true,
            },
          })
        : Promise.resolve(null),
      payload.inspectionId
        ? prisma.projectInspection.findFirst({
            where: {
              id: payload.inspectionId,
              tenantId: routeContext.tenantId,
              projectId: routeContext.project.id,
            },
            select: {
              id: true,
              technicalArea: true,
              technicalObjectType: true,
              phaseId: true,
            },
          })
        : Promise.resolve(null),
      payload.assetId
        ? prisma.asset.findFirst({
            where: {
              id: payload.assetId,
              tenantId: routeContext.tenantId,
              projectId: routeContext.project.id,
            },
            select: {
              id: true,
              attributes: true,
            },
          })
        : Promise.resolve(null),
      payload.assignedToId
        ? prisma.user.findFirst({
            where: {
              id: payload.assignedToId,
              tenantId: routeContext.tenantId,
              isActive: true,
            },
            select: { id: true },
          })
        : Promise.resolve(null),
    ]);

    if (payload.phaseId && !phase) {
      return NextResponse.json({ error: "Etapa não encontrada no projeto." }, { status: 404 });
    }

    if (payload.inspectionId && !inspection) {
      return NextResponse.json(
        { error: "Fiscalização vinculada não encontrada no projeto." },
        { status: 404 }
      );
    }

    if (payload.assetId && !asset) {
      return NextResponse.json(
        { error: "Objeto técnico relacionado não encontrado no projeto." },
        { status: 404 }
      );
    }

    if (payload.assignedToId && !assignedTo) {
      return NextResponse.json({ error: "Responsável não encontrado no tenant." }, { status: 404 });
    }

    const assetContext = readAssetTechnicalContext(asset?.attributes);
    const technicalArea =
      payload.technicalArea ??
      phase?.technicalArea ??
      inspection?.technicalArea ??
      (assetContext.technicalArea as typeof payload.technicalArea) ??
      null;
    const technicalObjectType =
      payload.technicalObjectType ??
      inspection?.technicalObjectType ??
      assetContext.technicalObjectType ??
      null;

    if (
      technicalArea &&
      routeContext.project.technicalAreas.length > 0 &&
      !routeContext.project.technicalAreas.includes(technicalArea)
    ) {
      return NextResponse.json(
        { error: "A área técnica informada não está vinculada a este projeto." },
        { status: 400 }
      );
    }

    if (phase?.technicalArea && technicalArea && phase.technicalArea !== technicalArea) {
      return NextResponse.json(
        { error: "A etapa selecionada pertence a uma área técnica diferente da pendência." },
        { status: 400 }
      );
    }

    const now = new Date();
    const issue = await prisma.projectIssue.create({
      data: {
        title: payload.title,
        description: payload.description,
        issueType: payload.issueType,
        status: payload.status,
        priority: payload.priority,
        severity: payload.severity,
        dueDate: payload.dueDate,
        resolvedAt:
          payload.status === "RESOLVIDA" || payload.status === "FECHADA" ? now : null,
        resolutionNotes: payload.resolutionNotes,
        tenantId: routeContext.tenantId,
        projectId: routeContext.project.id,
        phaseId: payload.phaseId ?? inspection?.phaseId ?? null,
        inspectionId: payload.inspectionId,
        assetId: payload.assetId,
        technicalArea,
        technicalObjectType,
        reportedById: routeContext.userId,
        assignedToId: payload.assignedToId,
        metadata: {
          source: "projeto",
          createdVia: "pendencias-riscos",
        } satisfies Prisma.InputJsonValue,
      },
      select: { id: true },
    });

    await writeAuditLog({
      action: AUDIT_ACTIONS.PROJECT_ISSUE_CREATE,
      entityType: "project_issue",
      entityId: issue.id,
      actor: {
        userId: routeContext.userId,
        userName: routeContext.userName,
        userEmail: routeContext.userEmail,
        userRole: routeContext.role,
        tenantId: routeContext.tenantId,
      },
      metadata: {
        projectId: routeContext.project.id,
        issueId: issue.id,
        phaseId: payload.phaseId ?? inspection?.phaseId ?? null,
        inspectionId: payload.inspectionId,
        assetId: payload.assetId,
        technicalArea,
        technicalObjectType,
        status: payload.status,
        severity: payload.severity,
        priority: payload.priority,
      },
      requestContext: extractRequestContext(req),
    });

    const refreshed = await loadProjectGovernanceData({
      tenantId: routeContext.tenantId,
      projectId: routeContext.project.id,
      projectTechnicalAreas: routeContext.project.technicalAreas,
      compatibility: routeContext.compatibility,
    });

    return NextResponse.json({
      ...refreshed,
      message: "Pendência registrada com sucesso.",
    });
  } catch (error) {
    console.error("[PROJECT_ISSUE_POST_ERROR]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Prisma.PrismaClientKnownRequestError
            ? "Falha ao persistir a pendência do projeto."
            : error instanceof Error
              ? error.message
              : "Erro ao registrar pendência.",
      },
      { status: 500 }
    );
  }
}
