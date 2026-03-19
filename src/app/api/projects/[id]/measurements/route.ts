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

type ProjectMeasurementsRouteContext = {
  params: Promise<{ id: string }>;
};

async function resolveProjectId(context: ProjectMeasurementsRouteContext) {
  const params = await context.params;
  return typeof params.id === "string" ? params.id : "";
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

async function resolveScopedEntities(params: {
  tenantId: string;
  projectId: string;
  phaseId: string | null;
  contractId: string | null;
}) {
  const [phase, contract] = await Promise.all([
    params.phaseId
      ? prisma.projectPhase.findFirst({
          where: {
            id: params.phaseId,
            tenantId: params.tenantId,
            projectId: params.projectId,
          },
          select: {
            id: true,
            technicalArea: true,
            name: true,
            sequence: true,
          },
        })
      : Promise.resolve(null),
    params.contractId
      ? prisma.projectContract.findFirst({
          where: {
            id: params.contractId,
            tenantId: params.tenantId,
            projectId: params.projectId,
          },
          select: {
            id: true,
            title: true,
            contractedAmount: true,
          },
        })
      : Promise.resolve(null),
  ]);

  return { phase, contract };
}

export async function GET(req: NextRequest, context: ProjectMeasurementsRouteContext) {
  try {
    const rateLimitResponse = enforceRequestRateLimit(req, {
      namespace: "api:projects:measurements:get",
      limit: 120,
      windowMs: 60_000,
    });
    if (rateLimitResponse) return rateLimitResponse;

    const projectId = await resolveProjectId(context);
    const routeContext = await resolveProjectMeasurementContext(req, projectId);
    if ("response" in routeContext) return routeContext.response;

    return NextResponse.json(
      await buildMeasurementsResponse(
        routeContext.tenantId,
        routeContext.project.id,
        routeContext.project.technicalAreas
      )
    );
  } catch (error) {
    console.error("[PROJECT_MEASUREMENTS_GET_ERROR]", error);
    return NextResponse.json({ error: "Erro ao carregar medições." }, { status: 500 });
  }
}

export async function POST(req: NextRequest, context: ProjectMeasurementsRouteContext) {
  try {
    const rateLimitResponse = enforceRequestRateLimit(req, {
      namespace: "api:projects:measurements:post",
      limit: 40,
      windowMs: 60_000,
    });
    if (rateLimitResponse) return rateLimitResponse;

    const contentTypeError = requireJsonContentType(req);
    if (contentTypeError) return contentTypeError;

    const projectId = await resolveProjectId(context);
    const routeContext = await resolveProjectMeasurementContext(req, projectId);
    if ("response" in routeContext) return routeContext.response;

    const payload = projectMeasurementInputSchema.parse(await req.json());
    const { phase, contract } = await resolveScopedEntities({
      tenantId: routeContext.tenantId,
      projectId: routeContext.project.id,
      phaseId: payload.phaseId,
      contractId: payload.contractId,
    });

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

    const [numberAggregate, totalsAggregate] = await Promise.all([
      prisma.projectMeasurement.aggregate({
        where: { tenantId: routeContext.tenantId, projectId: routeContext.project.id },
        _max: { measurementNumber: true },
      }),
      prisma.projectMeasurement.aggregate({
        where: { tenantId: routeContext.tenantId, projectId: routeContext.project.id },
        _sum: {
          measuredAmount: true,
          approvedAmount: true,
          paidAmount: true,
        },
      }),
    ]);

    const nextMeasurementNumber = (numberAggregate._max.measurementNumber ?? 0) + 1;
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

    const created = await prisma.projectMeasurement.create({
      data: {
        measurementNumber: nextMeasurementNumber,
        referenceMonth: payload.referenceMonth,
        periodStart: payload.periodStart,
        periodEnd: payload.periodEnd,
        measuredAt: new Date(),
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
        metadata: {
          source: "manual",
          createdVia: "project_measurements_module",
        },
        tenantId: routeContext.tenantId,
        projectId: routeContext.project.id,
        phaseId: phase?.id ?? null,
        contractId: contract?.id ?? null,
        measuredById: routeContext.userId,
        approvedById:
          payload.status === "APROVADA" || payload.status === "PAGA"
            ? routeContext.userId
            : null,
      },
      select: { id: true },
    });

    await writeAuditLog({
      action: AUDIT_ACTIONS.PROJECT_MEASUREMENT_CREATE,
      entityType: "project_measurement",
      entityId: created.id,
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
        measurementNumber: nextMeasurementNumber,
        technicalArea,
        status: payload.status,
      },
    });

    const response = await buildMeasurementsResponse(
      routeContext.tenantId,
      routeContext.project.id,
      routeContext.project.technicalAreas
    );
    const createdMeasurement = response.data.find((item) => item.id === created.id) ?? null;

    return NextResponse.json({
      message: "Medição registrada com sucesso.",
      measurement: createdMeasurement,
      ...response,
    });
  } catch (error) {
    console.error("[PROJECT_MEASUREMENTS_POST_ERROR]", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Dados inválidos para registrar a medição." },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: "Erro ao registrar medição." }, { status: 500 });
  }
}
