import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import {
  AUDIT_ACTIONS,
  extractRequestContext,
  writeAuditLog,
} from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { enforceRequestRateLimit } from "@/lib/rate-limit";
import { requireJsonContentType } from "@/lib/request-guards";
import { resolveProjectMeasurementContext } from "@/lib/project-measurement-api";
import {
  buildProjectMeasurementIndicators,
  projectMeasurementInputSchema,
  resolveMeasurementBaseContractedAmount,
  resolveMeasurementFinancialProgressPct,
  serializeProjectMeasurements,
} from "@/lib/project-measurements";

export const runtime = "nodejs";

type ProjectMeasurementItemRouteContext = {
  params: Promise<{ id: string; measurementId: string }>;
};

const cuidSchema = z.string().cuid();

async function resolveRouteParams(context: ProjectMeasurementItemRouteContext) {
  const params = await context.params;
  return {
    projectId: typeof params.id === "string" ? params.id : "",
    measurementId: typeof params.measurementId === "string" ? params.measurementId : "",
  };
}

async function loadMeasurementRows(tenantId: string, projectId: string) {
  return prisma.projectMeasurement.findMany({
    where: { tenantId, projectId },
    orderBy: [{ measurementNumber: "desc" }],
    include: {
      phase: {
        select: {
          id: true,
          name: true,
          sequence: true,
          technicalArea: true,
        },
      },
      contract: {
        select: {
          id: true,
          title: true,
          contractNumber: true,
          contractedAmount: true,
        },
      },
      measuredBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      approvedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      documents: {
        orderBy: [{ createdAt: "desc" }],
        select: {
          id: true,
          title: true,
          fileName: true,
          fileUrl: true,
          mimeType: true,
          fileSize: true,
          documentDate: true,
          isPublic: true,
          uploadedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });
}

async function buildMeasurementsResponse(tenantId: string, projectId: string, technicalAreas: string[]) {
  const [measurements, phases, contracts] = await Promise.all([
    loadMeasurementRows(tenantId, projectId),
    prisma.projectPhase.findMany({
      where: { tenantId, projectId },
      orderBy: [{ sequence: "asc" }],
      select: {
        id: true,
        name: true,
        sequence: true,
        technicalArea: true,
        status: true,
      },
    }),
    prisma.projectContract.findMany({
      where: { tenantId, projectId },
      orderBy: [{ updatedAt: "desc" }],
      select: {
        id: true,
        title: true,
        contractNumber: true,
        status: true,
        contractedAmount: true,
      },
    }),
  ]);

  const serializedMeasurements = serializeProjectMeasurements(measurements);

  return {
    data: serializedMeasurements,
    indicators: buildProjectMeasurementIndicators(serializedMeasurements),
    options: {
      technicalAreas,
      phases,
      contracts: contracts.map((contract) => ({
        ...contract,
        contractedAmount: contract.contractedAmount ? Number(contract.contractedAmount) : null,
      })),
    },
  };
}

export async function PATCH(req: NextRequest, context: ProjectMeasurementItemRouteContext) {
  try {
    const rateLimitResponse = enforceRequestRateLimit(req, {
      namespace: "api:projects:measurements:id:patch",
      limit: 40,
      windowMs: 60_000,
    });
    if (rateLimitResponse) return rateLimitResponse;

    const contentTypeError = requireJsonContentType(req);
    if (contentTypeError) return contentTypeError;

    const { projectId, measurementId } = await resolveRouteParams(context);
    if (!cuidSchema.safeParse(measurementId).success) {
      return NextResponse.json({ error: "Medição inválida." }, { status: 400 });
    }

    const routeContext = await resolveProjectMeasurementContext(req, projectId);
    if ("response" in routeContext) return routeContext.response;

    const existing = await prisma.projectMeasurement.findFirst({
      where: {
        id: measurementId,
        tenantId: routeContext.tenantId,
        projectId: routeContext.project.id,
      },
      select: {
        id: true,
        status: true,
        measuredById: true,
        approvedById: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Medição não encontrada." }, { status: 404 });
    }

    const payload = projectMeasurementInputSchema.parse(await req.json());

    const [phase, contract, totalsAggregate] = await Promise.all([
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
      payload.contractId
        ? prisma.projectContract.findFirst({
            where: {
              id: payload.contractId,
              tenantId: routeContext.tenantId,
              projectId: routeContext.project.id,
            },
            select: {
              id: true,
              contractedAmount: true,
            },
          })
        : Promise.resolve(null),
      prisma.projectMeasurement.aggregate({
        where: {
          tenantId: routeContext.tenantId,
          projectId: routeContext.project.id,
          id: { not: existing.id },
        },
        _sum: {
          measuredAmount: true,
          approvedAmount: true,
          paidAmount: true,
        },
      }),
    ]);

    if (payload.phaseId && !phase) {
      return NextResponse.json({ error: "Etapa não encontrada no projeto." }, { status: 404 });
    }

    if (payload.contractId && !contract) {
      return NextResponse.json({ error: "Contrato não encontrado no projeto." }, { status: 404 });
    }

    if (phase?.technicalArea && payload.technicalArea && payload.technicalArea !== phase.technicalArea) {
      return NextResponse.json(
        { error: "A etapa selecionada pertence a uma área técnica diferente da informada." },
        { status: 400 }
      );
    }

    const technicalArea = payload.technicalArea ?? phase?.technicalArea ?? null;
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

    const accumulatedMeasuredAmount =
      Number(totalsAggregate._sum.measuredAmount ?? 0) + payload.measuredAmount;
    const accumulatedApprovedAmount =
      Number(totalsAggregate._sum.approvedAmount ?? 0) + (payload.approvedAmount ?? 0);
    const accumulatedPaidAmount =
      Number(totalsAggregate._sum.paidAmount ?? 0) + (payload.paidAmount ?? 0);

    const contractedAmount = resolveMeasurementBaseContractedAmount({
      contractAmount: contract?.contractedAmount ? Number(contract.contractedAmount) : null,
      projectContractedAmount: routeContext.project.contractedBudget
        ? Number(routeContext.project.contractedBudget)
        : null,
      projectEstimatedBudget: routeContext.project.estimatedBudget
        ? Number(routeContext.project.estimatedBudget)
        : null,
      projectBudget: routeContext.project.budget ? Number(routeContext.project.budget) : null,
    });

    await prisma.projectMeasurement.update({
      where: { id: existing.id },
      data: {
        referenceMonth: payload.referenceMonth,
        periodStart: payload.periodStart,
        periodEnd: payload.periodEnd,
        status: payload.status,
        technicalArea,
        physicalProgressPct: payload.physicalProgressPct,
        financialProgressPct: resolveMeasurementFinancialProgressPct({
          contractedAmount,
          status: payload.status,
          accumulatedMeasuredAmount,
          accumulatedApprovedAmount,
          accumulatedPaidAmount,
        }),
        measuredAmount: new Prisma.Decimal(payload.measuredAmount),
        approvedAmount:
          payload.approvedAmount === null ? null : new Prisma.Decimal(payload.approvedAmount),
        paidAmount: payload.paidAmount === null ? null : new Prisma.Decimal(payload.paidAmount),
        notes: payload.notes,
        phaseId: phase?.id ?? null,
        contractId: contract?.id ?? null,
        measuredById: existing.measuredById ?? routeContext.userId,
        approvedById:
          payload.status === "APROVADA" || payload.status === "PAGA"
            ? existing.approvedById ?? routeContext.userId
            : null,
      },
    });

    await writeAuditLog({
      action: AUDIT_ACTIONS.PROJECT_MEASUREMENT_UPDATE,
      entityType: "project_measurement",
      entityId: existing.id,
      actor: {
        userId: routeContext.userId,
        userName: routeContext.userName,
        userEmail: routeContext.userEmail,
        userRole: routeContext.role,
        tenantId: routeContext.tenantId,
      },
      requestContext: extractRequestContext(req),
      metadata: {
        projectId: routeContext.project.id,
        measurementId: existing.id,
        technicalArea,
        status: payload.status,
      },
    });

    const response = await buildMeasurementsResponse(
      routeContext.tenantId,
      routeContext.project.id,
      routeContext.project.technicalAreas
    );
    const updatedMeasurement = response.data.find((item) => item.id === existing.id) ?? null;

    return NextResponse.json({
      message: "Medição atualizada com sucesso.",
      measurement: updatedMeasurement,
      ...response,
    });
  } catch (error) {
    console.error("[PROJECT_MEASUREMENTS_PATCH_ERROR]", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Dados inválidos para atualizar a medição." },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: "Erro ao atualizar medição." }, { status: 500 });
  }
}
