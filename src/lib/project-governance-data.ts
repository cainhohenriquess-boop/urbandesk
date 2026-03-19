import type { ProjectTechnicalArea } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  buildProjectGovernanceIndicators,
  buildProjectHistoryEvents,
  buildProjectHistoryIndicators,
  serializeProjectIssues,
  serializeProjectRisks,
} from "@/lib/project-governance";
import type { ProjectSchemaCompatibility } from "@/lib/project-schema-compat";

type ProjectGovernanceDataParams = {
  tenantId: string;
  projectId: string;
  projectTechnicalAreas: ProjectTechnicalArea[];
  compatibility: ProjectSchemaCompatibility;
};

function buildIssueSelect(compatibility: ProjectSchemaCompatibility) {
  return {
    id: true,
    title: true,
    description: true,
    issueType: true,
    status: true,
    priority: true,
    dueDate: true,
    resolvedAt: true,
    resolutionNotes: true,
    metadata: true,
    createdAt: true,
    updatedAt: true,
    technicalArea: true,
    technicalObjectType: true,
    ...(compatibility.governanceOpsSchemaReady ? { severity: true } : {}),
    phase: {
      select: {
        id: true,
        name: true,
        sequence: true,
        technicalArea: true,
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
        email: true,
      },
    },
    assignedTo: {
      select: {
        id: true,
        name: true,
        email: true,
      },
    },
  } as const;
}

function buildRiskSelect(compatibility: ProjectSchemaCompatibility) {
  return {
    id: true,
    title: true,
    description: true,
    category: true,
    status: true,
    probability: true,
    impact: true,
    mitigationPlan: true,
    contingencyPlan: true,
    reviewDate: true,
    metadata: true,
    createdAt: true,
    updatedAt: true,
    ...(compatibility.governanceOpsSchemaReady
      ? {
          technicalArea: true,
          technicalObjectType: true,
          asset: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
        }
      : {}),
    phase: {
      select: {
        id: true,
        name: true,
        sequence: true,
        technicalArea: true,
      },
    },
    owner: {
      select: {
        id: true,
        name: true,
        email: true,
      },
    },
  } as const;
}

export async function loadProjectGovernanceData(params: ProjectGovernanceDataParams) {
  const { tenantId, projectId, projectTechnicalAreas, compatibility } = params;

  const [issuesRaw, risksRaw, phases, users, assets] = await Promise.all([
    compatibility.fieldSchemaReady
      ? prisma.projectIssue.findMany({
          where: { tenantId, projectId },
          orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
          select: buildIssueSelect(compatibility),
        })
      : Promise.resolve([]),
    prisma.projectRisk.findMany({
      where: { tenantId, projectId },
      orderBy: [{ reviewDate: "asc" }, { updatedAt: "desc" }],
      select: buildRiskSelect(compatibility),
    }),
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
    prisma.user.findMany({
      where: {
        tenantId,
        isActive: true,
      },
      orderBy: [{ name: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    }),
    prisma.asset.findMany({
      where: { tenantId, projectId },
      orderBy: [{ updatedAt: "desc" }],
      take: 300,
      select: {
        id: true,
        name: true,
        type: true,
        attributes: true,
      },
    }),
  ]);

  const issues = serializeProjectIssues(
    issuesRaw.map((issue) => ({
      ...issue,
      severity: ("severity" in issue ? issue.severity : null) ?? "MEDIA",
    }))
  );
  const risks = serializeProjectRisks(
    risksRaw.map((risk) => ({
      ...risk,
      technicalArea: ("technicalArea" in risk ? risk.technicalArea : null) ?? null,
      technicalObjectType:
        ("technicalObjectType" in risk ? risk.technicalObjectType : null) ?? null,
      asset: ("asset" in risk ? risk.asset : null) ?? null,
    }))
  );

  return {
    issues,
    risks,
    indicators: buildProjectGovernanceIndicators({ issues, risks }),
    options: {
      technicalAreas: projectTechnicalAreas,
      phases,
      users,
      assets: assets.map((asset) => ({
        id: asset.id,
        name: asset.name,
        type: asset.type,
        technicalArea:
          asset.attributes &&
          typeof asset.attributes === "object" &&
          !Array.isArray(asset.attributes) &&
          typeof (asset.attributes as { technicalArea?: unknown }).technicalArea === "string"
            ? ((asset.attributes as { technicalArea: ProjectTechnicalArea }).technicalArea ?? null)
            : null,
        technicalObjectType:
          asset.attributes &&
          typeof asset.attributes === "object" &&
          !Array.isArray(asset.attributes) &&
          typeof (asset.attributes as { technicalObjectType?: unknown }).technicalObjectType ===
            "string"
            ? ((asset.attributes as { technicalObjectType: string }).technicalObjectType ?? null)
            : null,
      })),
    },
  };
}

export async function loadProjectHistoryData(params: ProjectGovernanceDataParams) {
  const { tenantId, projectId, compatibility } = params;

  const [comments, auditLogs, inspections, measurements, documents, governance] = await Promise.all([
    prisma.projectComment.findMany({
      where: { tenantId, projectId },
      orderBy: [{ createdAt: "desc" }],
      take: 80,
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
        ...(compatibility.fieldSchemaReady
          ? {
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
            }
          : {}),
        risk: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    }),
    prisma.auditLog.findMany({
      where: {
        tenantId,
        OR: [
          {
            entityType: "project",
            entityId: projectId,
          },
          {
            metadata: {
              path: ["projectId"],
              equals: projectId,
            },
          },
        ],
      },
      orderBy: [{ createdAt: "desc" }],
      take: 120,
    }),
    compatibility.fieldSchemaReady
      ? prisma.projectInspection.findMany({
          where: { tenantId, projectId },
          orderBy: [{ updatedAt: "desc" }],
          take: 60,
          select: {
            id: true,
            inspectionType: true,
            status: true,
            summary: true,
            occurredAt: true,
            scheduledAt: true,
            createdAt: true,
            technicalArea: true,
            technicalObjectType: true,
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
              },
            },
            _count: {
              select: {
                issues: true,
                documents: true,
              },
            },
          },
        })
      : Promise.resolve([]),
    compatibility.measurementSchemaReady
      ? prisma.projectMeasurement.findMany({
          where: { tenantId, projectId },
          orderBy: [{ updatedAt: "desc" }],
          take: 60,
          select: {
            id: true,
            measurementNumber: true,
            status: true,
            technicalArea: true,
            measuredAmount: true,
            referenceMonth: true,
            measuredAt: true,
            updatedAt: true,
            phase: {
              select: {
                id: true,
                name: true,
              },
            },
            measuredBy: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        })
      : Promise.resolve([]),
    prisma.projectDocument.findMany({
      where: { tenantId, projectId },
      orderBy: [{ createdAt: "desc" }],
      take: 60,
      select: {
        id: true,
        title: true,
        documentType: true,
        documentDate: true,
        createdAt: true,
        ...(compatibility.documentSchemaReady ? { technicalArea: true } : {}),
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),
    loadProjectGovernanceData(params),
  ]);

  const events = buildProjectHistoryEvents({
    comments: comments.map((comment) => ({
      ...comment,
      measurement: "measurement" in comment ? comment.measurement ?? null : null,
      inspection: "inspection" in comment ? comment.inspection ?? null : null,
      issue: "issue" in comment ? comment.issue ?? null : null,
    })),
    auditLogs,
    issues: governance.issues,
    risks: governance.risks,
    inspections,
    measurements,
    documents: documents.map((document) => ({
      ...document,
      technicalArea: ("technicalArea" in document ? document.technicalArea : null) ?? null,
    })),
  });

  return {
    events,
    indicators: buildProjectHistoryIndicators(events),
  };
}
