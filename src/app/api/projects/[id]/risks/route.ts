import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import {
  AUDIT_ACTIONS,
  extractRequestContext,
  writeAuditLog,
} from "@/lib/audit";
import { projectRiskInputSchema } from "@/lib/project-governance";
import { loadProjectGovernanceData } from "@/lib/project-governance-data";
import { resolveProjectGovernanceContext } from "@/lib/project-governance-api";
import { prisma } from "@/lib/prisma";
import { enforceRequestRateLimit } from "@/lib/rate-limit";
import { requireJsonContentType } from "@/lib/request-guards";

export const runtime = "nodejs";

type ProjectRiskRouteParams = {
  params: Promise<{ id: string }>;
};

async function resolveProjectId(context: ProjectRiskRouteParams) {
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

export async function POST(req: NextRequest, context: ProjectRiskRouteParams) {
  try {
    const rateLimitResponse = enforceRequestRateLimit(req, {
      namespace: "api:projects:risks:post",
      limit: 40,
      windowMs: 60_000,
    });
    if (rateLimitResponse) return rateLimitResponse;

    const contentTypeError = requireJsonContentType(req);
    if (contentTypeError) return contentTypeError;

    const projectId = await resolveProjectId(context);
    const routeContext = await resolveProjectGovernanceContext(req, projectId, "write");
    if ("response" in routeContext) return routeContext.response;

    const payload = projectRiskInputSchema.parse(await req.json());

    const [phase, asset, owner] = await Promise.all([
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
      payload.ownerId
        ? prisma.user.findFirst({
            where: {
              id: payload.ownerId,
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

    if (payload.assetId && !asset) {
      return NextResponse.json(
        { error: "Objeto técnico relacionado não encontrado no projeto." },
        { status: 404 }
      );
    }

    if (payload.ownerId && !owner) {
      return NextResponse.json({ error: "Responsável pelo risco não encontrado." }, { status: 404 });
    }

    const assetContext = readAssetTechnicalContext(asset?.attributes);
    const technicalArea =
      payload.technicalArea ??
      phase?.technicalArea ??
      (assetContext.technicalArea as typeof payload.technicalArea) ??
      null;
    const technicalObjectType =
      payload.technicalObjectType ?? assetContext.technicalObjectType ?? null;

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
        { error: "A etapa selecionada pertence a uma área técnica diferente do risco." },
        { status: 400 }
      );
    }

    const risk = await prisma.projectRisk.create({
      data: {
        title: payload.title,
        description: payload.description,
        category: payload.category,
        status: payload.status,
        probability: payload.probability,
        impact: payload.impact,
        mitigationPlan: payload.mitigationPlan,
        contingencyPlan: payload.contingencyPlan,
        reviewDate: payload.reviewDate,
        tenantId: routeContext.tenantId,
        projectId: routeContext.project.id,
        phaseId: payload.phaseId,
        assetId: payload.assetId,
        technicalArea,
        technicalObjectType,
        ownerId: payload.ownerId,
        metadata: {
          source: "projeto",
          createdVia: "pendencias-riscos",
        } satisfies Prisma.InputJsonValue,
      },
      select: { id: true },
    });

    await writeAuditLog({
      action: AUDIT_ACTIONS.PROJECT_RISK_CREATE,
      entityType: "project_risk",
      entityId: risk.id,
      actor: {
        userId: routeContext.userId,
        userName: routeContext.userName,
        userEmail: routeContext.userEmail,
        userRole: routeContext.role,
        tenantId: routeContext.tenantId,
      },
      metadata: {
        projectId: routeContext.project.id,
        riskId: risk.id,
        phaseId: payload.phaseId,
        assetId: payload.assetId,
        technicalArea,
        technicalObjectType,
        status: payload.status,
        impact: payload.impact,
        probability: payload.probability,
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
      message: "Risco registrado com sucesso.",
    });
  } catch (error) {
    console.error("[PROJECT_RISK_POST_ERROR]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Prisma.PrismaClientKnownRequestError
            ? "Falha ao persistir o risco do projeto."
            : error instanceof Error
              ? error.message
              : "Erro ao registrar risco.",
      },
      { status: 500 }
    );
  }
}
