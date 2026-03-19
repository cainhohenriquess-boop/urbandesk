import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getProjectShellData, type ProjectShellRecord } from "@/lib/project-pages";
import type { ProjectSchemaCompatibility } from "@/lib/project-schema-compat";
import { summarizePavementProjectAssets } from "@/lib/pavement-technical";
import {
  buildEmptyMeasurementIndicators,
  buildProjectMeasurementIndicators,
  serializeProjectMeasurements,
} from "@/lib/project-measurements";
import {
  buildProjectDocumentIndicators,
  serializeProjectDocuments,
} from "@/lib/project-documents";

type ProjectContext = {
  tenantId: string;
  project: ProjectShellRecord;
  compatibility: ProjectSchemaCompatibility;
};

function decimalToNumber(value: Prisma.Decimal | number | null | undefined) {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  return Number(value);
}

async function getProjectContext(projectId: string): Promise<ProjectContext | null> {
  const { tenantId, project, compatibility } = await getProjectShellData(projectId);
  if (!tenantId || !project) return null;
  return { tenantId, project, compatibility };
}

export function resolveProjectDeadline(project: {
  plannedEndDate?: Date | null;
  endDate?: Date | null;
}) {
  return project.plannedEndDate ?? project.endDate ?? null;
}

export function resolveProjectLocation(project: {
  neighborhood?: string | null;
  district?: string | null;
  region?: string | null;
}) {
  return [project.neighborhood, project.district, project.region]
    .filter((value): value is string => Boolean(value && value.trim()))
    .join(" · ");
}

export function resolvePrimaryContract(project: ProjectShellRecord) {
  return project.contracts[0] ?? null;
}

export function resolveProjectContractorName(project: ProjectShellRecord) {
  return project.contractorName ?? resolvePrimaryContract(project)?.contractorName ?? null;
}

export function resolveProjectContractedAmount(project: ProjectShellRecord) {
  return (
    decimalToNumber(project.contractedBudget) ??
    decimalToNumber(resolvePrimaryContract(project)?.contractedAmount) ??
    decimalToNumber(project.estimatedBudget) ??
    decimalToNumber(project.budget)
  );
}

export function resolveProjectMeasuredAmount(project: ProjectShellRecord) {
  return (
    decimalToNumber(project.measuredBudget) ??
    decimalToNumber(resolvePrimaryContract(project)?.measuredAmount)
  );
}

export function resolveProjectPaidAmount(project: ProjectShellRecord) {
  return (
    decimalToNumber(project.paidBudget) ??
    decimalToNumber(resolvePrimaryContract(project)?.paidAmount)
  );
}

export function resolveProjectPhysicalProgress(project: ProjectShellRecord) {
  return project.physicalProgressPct > 0
    ? project.physicalProgressPct
    : project.completionPct;
}

export function resolveProjectFinancialProgress(project: ProjectShellRecord) {
  if (project.financialProgressPct > 0) return project.financialProgressPct;

  const contractedAmount = resolveProjectContractedAmount(project);
  const paidAmount = resolveProjectPaidAmount(project);

  if (!contractedAmount || !paidAmount || contractedAmount <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((paidAmount / contractedAmount) * 100)));
}

async function loadPlanningData(context: ProjectContext) {
  const { tenantId, project, compatibility } = context;

  const [phasesBase, phaseMeasurementCounts, milestones] = await Promise.all([
    prisma.projectPhase.findMany({
      where: { tenantId, projectId: project.id },
      orderBy: [{ sequence: "asc" }],
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            documents: true,
            inspections: true,
            issues: true,
            milestones: true,
            risks: true,
          },
        },
      },
    }),
    compatibility.measurementSchemaReady
      ? prisma.projectMeasurement.groupBy({
          by: ["phaseId"],
          where: {
            tenantId,
            projectId: project.id,
            phaseId: {
              not: null,
            },
          },
          _count: {
            _all: true,
          },
        })
      : Promise.resolve([]),
    prisma.projectMilestone.findMany({
      where: { tenantId, projectId: project.id },
      orderBy: [{ targetDate: "asc" }, { createdAt: "asc" }],
      take: 8,
      include: {
        phase: {
          select: {
            id: true,
            name: true,
            sequence: true,
          },
        },
        responsibleUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),
  ]);

  const phaseMeasurementCountMap = new Map(
    phaseMeasurementCounts.map((item) => [item.phaseId, item._count._all])
  );

  const phases = phasesBase.map((phase) => ({
    ...phase,
    _count: {
      ...phase._count,
      inspections: compatibility.fieldSchemaReady ? phase._count.inspections : 0,
      issues: compatibility.fieldSchemaReady ? phase._count.issues : 0,
      measurements: phaseMeasurementCountMap.get(phase.id) ?? 0,
    },
  }));

  return { phases, milestones };
}

async function loadFinancialData(context: ProjectContext) {
  const { tenantId, project, compatibility } = context;

  const [contracts, fundingSources, measurementTotals] = await Promise.all([
    prisma.projectContract.findMany({
      where: { tenantId, projectId: project.id },
      orderBy: [{ updatedAt: "desc" }],
      take: 12,
    }),
    prisma.projectFundingSource.findMany({
      where: { tenantId, projectId: project.id },
      orderBy: [{ isPrimary: "desc" }, { updatedAt: "desc" }],
      take: 8,
    }),
    compatibility.measurementSchemaReady
      ? prisma.projectMeasurement.aggregate({
          where: { tenantId, projectId: project.id },
          _count: { _all: true },
          _sum: {
            approvedAmount: true,
            measuredAmount: true,
            paidAmount: true,
          },
        })
      : Promise.resolve({
          _count: { _all: 0 },
          _sum: {
            approvedAmount: null,
            measuredAmount: null,
            paidAmount: null,
          },
        }),
  ]);

  return { contracts, fundingSources, measurementTotals };
}

async function loadDocumentData(context: ProjectContext) {
  const { tenantId, project, compatibility } = context;

  const documents = await prisma.projectDocument.findMany({
    where: { tenantId, projectId: project.id },
    orderBy: [{ documentDate: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      description: true,
      documentType: true,
      fileName: true,
      fileUrl: true,
      mimeType: true,
      fileSize: true,
      documentDate: true,
      isPublic: true,
      createdAt: true,
      updatedAt: true,
      ...(compatibility.documentSchemaReady ? { technicalArea: true } : {}),
      uploadedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      phase: {
        select: {
          id: true,
          name: true,
          sequence: true,
        },
      },
      contract: {
        select: {
          id: true,
          title: true,
          contractNumber: true,
        },
      },
      ...(compatibility.measurementSchemaReady
        ? {
            measurement: {
              select: {
                id: true,
                measurementNumber: true,
              },
            },
          }
        : {}),
    },
  });

  const serializedDocuments = serializeProjectDocuments(
    documents.map((document) => ({
      ...document,
      measurement: "measurement" in document ? document.measurement ?? null : null,
      technicalArea: "technicalArea" in document ? document.technicalArea ?? null : null,
    }))
  );

  return {
    documents: serializedDocuments,
    documentIndicators: buildProjectDocumentIndicators(serializedDocuments),
  };
}

async function loadMeasurementData(context: ProjectContext) {
  const { tenantId, project, compatibility } = context;

  if (!compatibility.measurementSchemaReady) {
    return { measurements: [] };
  }

  const measurements = await prisma.projectMeasurement.findMany({
    where: { tenantId, projectId: project.id },
    orderBy: [{ measurementNumber: "desc" }],
    take: 24,
    include: {
      phase: {
        select: {
          id: true,
          name: true,
          sequence: true,
        },
      },
      contract: {
        select: {
          id: true,
          title: true,
          contractNumber: true,
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

  return { measurements };
}

async function loadInspectionData(context: ProjectContext) {
  const { tenantId, project, compatibility } = context;

  if (!compatibility.fieldSchemaReady) {
    return { inspections: [] };
  }

  const inspections = compatibility.measurementSchemaReady
    ? await prisma.projectInspection.findMany({
        where: { tenantId, projectId: project.id },
        orderBy: [{ occurredAt: "desc" }, { scheduledAt: "desc" }, { createdAt: "desc" }],
        take: 24,
        include: {
          phase: {
            select: {
              id: true,
              name: true,
              sequence: true,
            },
          },
          measurement: {
            select: {
              id: true,
              measurementNumber: true,
            },
          },
          inspector: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          asset: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
          _count: {
            select: {
              documents: true,
              issues: true,
            },
          },
        },
      })
    : (
        await prisma.projectInspection.findMany({
          where: { tenantId, projectId: project.id },
          orderBy: [{ occurredAt: "desc" }, { scheduledAt: "desc" }, { createdAt: "desc" }],
          take: 24,
          include: {
            phase: {
              select: {
                id: true,
                name: true,
                sequence: true,
              },
            },
            inspector: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            asset: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
            _count: {
              select: {
                documents: true,
                issues: true,
              },
            },
          },
        })
      ).map((inspection) => ({
        ...inspection,
        measurement: null,
      }));

  return { inspections };
}

async function loadIssuesAndRisksData(context: ProjectContext) {
  const { tenantId, project, compatibility } = context;

  const [issues, risks] = await Promise.all([
    compatibility.fieldSchemaReady
      ? prisma.projectIssue.findMany({
          where: { tenantId, projectId: project.id },
          orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
          take: 24,
          include: {
            phase: {
              select: {
                id: true,
                name: true,
                sequence: true,
              },
            },
            inspection: {
              select: {
                id: true,
                occurredAt: true,
                inspectionType: true,
              },
            },
            asset: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
            reportedBy: {
              select: {
                id: true,
                name: true,
              },
            },
            assignedTo: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        })
      : Promise.resolve([]),
    prisma.projectRisk.findMany({
      where: { tenantId, projectId: project.id },
      orderBy: [{ reviewDate: "asc" }, { updatedAt: "desc" }],
      take: 24,
      include: {
        phase: {
          select: {
            id: true,
            name: true,
            sequence: true,
          },
        },
        owner: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
  ]);

  return { issues, risks };
}

async function loadHistoryData(context: ProjectContext) {
  const { tenantId, project, compatibility } = context;

  const [comments, auditLogs] = await Promise.all([
    compatibility.measurementSchemaReady
      ? prisma.projectComment.findMany({
          where: { tenantId, projectId: project.id },
          orderBy: [{ createdAt: "desc" }],
          take: 24,
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            phase: {
              select: {
                id: true,
                name: true,
              },
            },
            milestone: {
              select: {
                id: true,
                title: true,
              },
            },
            measurement: {
              select: {
                id: true,
                measurementNumber: true,
              },
            },
            inspection: {
              select: {
                id: true,
                inspectionType: true,
              },
            },
            issue: {
              select: {
                id: true,
                title: true,
              },
            },
            risk: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        })
      : (
          await prisma.projectComment.findMany({
            where: { tenantId, projectId: project.id },
            orderBy: [{ createdAt: "desc" }],
            take: 24,
            include: {
              author: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              phase: {
                select: {
                  id: true,
                  name: true,
                },
              },
              milestone: {
                select: {
                  id: true,
                  title: true,
                },
              },
              inspection: {
                select: {
                  id: true,
                  inspectionType: true,
                },
              },
              issue: {
                select: {
                  id: true,
                  title: true,
                },
              },
              risk: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
          })
        ).map((comment) => ({
          ...comment,
          measurement: null,
        })),
    prisma.auditLog.findMany({
      where: {
        tenantId,
        OR: [
          {
            entityType: "project",
            entityId: project.id,
          },
          {
            metadata: {
              path: ["projectId"],
              equals: project.id,
            },
          },
        ],
      },
      orderBy: [{ createdAt: "desc" }],
      take: 24,
    }),
  ]);

  return { comments, auditLogs };
}

async function loadGisData(context: ProjectContext) {
  const { tenantId, project } = context;

  const [assetGroups, recentAssets, pavementAssets] = await Promise.all([
    prisma.asset.groupBy({
      by: ["type"],
      where: { tenantId, projectId: project.id },
      _count: { _all: true },
    }),
    prisma.asset.findMany({
      where: { tenantId, projectId: project.id },
      orderBy: { updatedAt: "desc" },
      take: 8,
      select: {
        id: true,
        name: true,
        type: true,
        updatedAt: true,
      },
    }),
    prisma.asset.findMany({
      where: { tenantId, projectId: project.id, type: "TRECHO" },
      select: {
        id: true,
        name: true,
        attributes: true,
      },
    }),
  ]);

  const pavementSummary = summarizePavementProjectAssets(
    pavementAssets.map((asset) => ({
      id: asset.id,
      name: asset.name,
      attributes:
        asset.attributes && typeof asset.attributes === "object" && !Array.isArray(asset.attributes)
          ? { ...(asset.attributes as Record<string, unknown>) }
          : {},
    }))
  );

  return { assetGroups, recentAssets, pavementSummary };
}

export async function getProjectOverviewData(projectId: string) {
  const context = await getProjectContext(projectId);
  if (!context) return null;

  const [
    planning,
    financial,
    documents,
    measurements,
    inspections,
    issuesAndRisks,
    history,
    gis,
  ] = await Promise.all([
    loadPlanningData(context),
    loadFinancialData(context),
    loadDocumentData(context),
    loadMeasurementData(context),
    loadInspectionData(context),
    loadIssuesAndRisksData(context),
    loadHistoryData(context),
    loadGisData(context),
  ]);

  return {
    tenantId: context.tenantId,
    project: context.project,
    ...planning,
    ...financial,
    ...documents,
    ...measurements,
    ...inspections,
    ...issuesAndRisks,
    ...history,
    ...gis,
  };
}

export async function getProjectPlanningData(projectId: string) {
  const context = await getProjectContext(projectId);
  if (!context) return null;

  return {
    tenantId: context.tenantId,
    project: context.project,
    ...(await loadPlanningData(context)),
  };
}

export async function getProjectFinancialData(projectId: string) {
  const context = await getProjectContext(projectId);
  if (!context) return null;

  return {
    tenantId: context.tenantId,
    project: context.project,
    ...(await loadFinancialData(context)),
  };
}

export async function getProjectDocumentsData(projectId: string) {
  const context = await getProjectContext(projectId);
  if (!context) return null;

  return {
    tenantId: context.tenantId,
    project: context.project,
    compatibility: context.compatibility,
    ...(await loadDocumentData(context)),
  };
}

export async function getProjectMeasurementsData(projectId: string) {
  const { tenantId, project, compatibility } = await getProjectShellData(projectId);
  if (!tenantId || !project) return null;

  if (!compatibility.measurementSchemaReady) {
    return {
      tenantId,
      project,
      compatibility,
      measurements: [],
      measurementIndicators: buildEmptyMeasurementIndicators(),
      options: {
        technicalAreas: project.technicalAreas,
        phases: [],
        contracts: [],
      },
    };
  }

  const context = { tenantId, project, compatibility };
  const [{ measurements }, phases, contracts] = await Promise.all([
    loadMeasurementData(context),
    prisma.projectPhase.findMany({
      where: { tenantId, projectId: project.id },
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
      where: { tenantId, projectId: project.id },
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
    tenantId,
    project,
    compatibility,
    measurements: serializedMeasurements,
    measurementIndicators: buildProjectMeasurementIndicators(serializedMeasurements),
    options: {
      technicalAreas: project.technicalAreas,
      phases,
      contracts: contracts.map((contract) => ({
        ...contract,
        contractedAmount: contract.contractedAmount ? Number(contract.contractedAmount) : null,
      })),
    },
  };
}

export async function getProjectInspectionData(projectId: string) {
  const context = await getProjectContext(projectId);
  if (!context) return null;

  return {
    tenantId: context.tenantId,
    project: context.project,
    ...(await loadInspectionData(context)),
  };
}

export async function getProjectIssuesAndRisksData(projectId: string) {
  const context = await getProjectContext(projectId);
  if (!context) return null;

  return {
    tenantId: context.tenantId,
    project: context.project,
    ...(await loadIssuesAndRisksData(context)),
  };
}

export async function getProjectHistoryData(projectId: string) {
  const context = await getProjectContext(projectId);
  if (!context) return null;

  return {
    tenantId: context.tenantId,
    project: context.project,
    ...(await loadHistoryData(context)),
  };
}

export async function getProjectGisData(projectId: string) {
  const context = await getProjectContext(projectId);
  if (!context) return null;

  return {
    tenantId: context.tenantId,
    project: context.project,
    ...(await loadGisData(context)),
  };
}

export type ProjectOverviewData = NonNullable<
  Awaited<ReturnType<typeof getProjectOverviewData>>
>;

