import type {
  ProjectCriticality,
  ProjectIssueStatus,
  ProjectIssueType,
  ProjectPriority,
  ProjectRiskCategory,
  ProjectRiskImpact,
  ProjectRiskProbability,
  ProjectRiskStatus,
  ProjectTechnicalArea,
} from "@prisma/client";
import { z } from "zod";
import { PRISMA_PROJECT_TECHNICAL_AREAS, isTechnicalObjectType } from "@/lib/project-disciplines";
import {
  getProjectCriticalityLabel,
  getProjectIssueStatusLabel,
  getProjectIssueTypeLabel,
  getProjectRiskCategoryLabel,
  getProjectRiskImpactLabel,
  getProjectRiskProbabilityLabel,
  getProjectRiskStatusLabel,
  getProjectTechnicalAreaLabel,
} from "@/lib/project-labels";
import { formatDateTime } from "@/lib/utils";

export const PROJECT_ISSUE_TYPE_VALUES = [
  "BLOQUEIO",
  "NAO_CONFORMIDADE",
  "SEGURANCA",
  "AMBIENTAL",
  "PRAZO",
  "FINANCEIRO",
  "DOCUMENTAL",
  "COMUNITARIO",
  "TECNICO",
  "OUTRO",
] as const satisfies readonly ProjectIssueType[];

export const PROJECT_ISSUE_STATUS_VALUES = [
  "ABERTA",
  "EM_TRATATIVA",
  "RESOLVIDA",
  "FECHADA",
  "CANCELADA",
] as const satisfies readonly ProjectIssueStatus[];

export const PROJECT_RISK_CATEGORY_VALUES = [
  "PRAZO",
  "FINANCEIRO",
  "TECNICO",
  "AMBIENTAL",
  "JURIDICO",
  "OPERACIONAL",
  "SOCIAL",
  "SEGURANCA",
  "CLIMATICO",
  "OUTRO",
] as const satisfies readonly ProjectRiskCategory[];

export const PROJECT_RISK_STATUS_VALUES = [
  "IDENTIFICADO",
  "MONITORANDO",
  "MITIGADO",
  "MATERIALIZADO",
  "ENCERRADO",
] as const satisfies readonly ProjectRiskStatus[];

export const PROJECT_RISK_PROBABILITY_VALUES = [
  "BAIXA",
  "MEDIA",
  "ALTA",
] as const satisfies readonly ProjectRiskProbability[];

export const PROJECT_RISK_IMPACT_VALUES = [
  "BAIXO",
  "MEDIO",
  "ALTO",
  "CRITICO",
] as const satisfies readonly ProjectRiskImpact[];

export const PROJECT_PRIORITY_VALUES = [
  "BAIXA",
  "MEDIA",
  "ALTA",
  "URGENTE",
] as const satisfies readonly ProjectPriority[];

export const PROJECT_CRITICALITY_VALUES = [
  "BAIXA",
  "MEDIA",
  "ALTA",
  "CRITICA",
] as const satisfies readonly ProjectCriticality[];

const nullableDateSchema = z.preprocess(
  (value) => (value === "" || value === undefined || value === null ? null : value),
  z.coerce.date().nullable()
);

const nullableCuidSchema = z.preprocess(
  (value) => (value === "" || value === undefined || value === null ? null : value),
  z.string().cuid().nullable()
);

const nullableStringSchema = (max: number) =>
  z.preprocess(
    (value) => {
      if (value === "" || value === undefined || value === null) return null;
      return typeof value === "string" ? value.trim() : value;
    },
    z.string().max(max).nullable()
  );

const nullableTechnicalAreaSchema = z.preprocess(
  (value) => (value === "" || value === undefined || value === null ? null : value),
  z.enum(PRISMA_PROJECT_TECHNICAL_AREAS).nullable()
);

const nullableTechnicalObjectTypeSchema = z.preprocess(
  (value) => {
    if (value === "" || value === undefined || value === null) return null;
    return typeof value === "string" ? value.trim() : value;
  },
  z
    .string()
    .max(120)
    .nullable()
    .refine((value) => value === null || isTechnicalObjectType(value), {
      message: "Objeto técnico inválido.",
    })
);

export const projectIssueInputSchema = z
  .object({
    title: z.string().trim().min(3, "Informe o título da pendência.").max(160),
    description: nullableStringSchema(4000).optional().default(null),
    issueType: z.enum(PROJECT_ISSUE_TYPE_VALUES).default("OUTRO"),
    status: z.enum(PROJECT_ISSUE_STATUS_VALUES).default("ABERTA"),
    priority: z.enum(PROJECT_PRIORITY_VALUES).default("MEDIA"),
    severity: z.enum(PROJECT_CRITICALITY_VALUES).default("MEDIA"),
    dueDate: nullableDateSchema.optional().default(null),
    phaseId: nullableCuidSchema.optional().default(null),
    inspectionId: nullableCuidSchema.optional().default(null),
    assetId: nullableCuidSchema.optional().default(null),
    technicalArea: nullableTechnicalAreaSchema.optional().default(null),
    technicalObjectType: nullableTechnicalObjectTypeSchema.optional().default(null),
    assignedToId: nullableCuidSchema.optional().default(null),
    resolutionNotes: nullableStringSchema(4000).optional().default(null),
  })
  .superRefine((value, ctx) => {
    if (value.technicalObjectType && !value.technicalArea) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["technicalArea"],
        message: "Informe a área técnica quando houver objeto técnico relacionado.",
      });
    }

    if (
      (value.status === "RESOLVIDA" || value.status === "FECHADA") &&
      !value.resolutionNotes
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["resolutionNotes"],
        message: "Registre a resolução ao concluir ou fechar a pendência.",
      });
    }
  });

export const projectRiskInputSchema = z
  .object({
    title: z.string().trim().min(3, "Informe o título do risco.").max(160),
    description: nullableStringSchema(4000).optional().default(null),
    category: z.enum(PROJECT_RISK_CATEGORY_VALUES).default("OUTRO"),
    status: z.enum(PROJECT_RISK_STATUS_VALUES).default("IDENTIFICADO"),
    probability: z.enum(PROJECT_RISK_PROBABILITY_VALUES).default("MEDIA"),
    impact: z.enum(PROJECT_RISK_IMPACT_VALUES).default("MEDIO"),
    mitigationPlan: nullableStringSchema(4000).optional().default(null),
    contingencyPlan: nullableStringSchema(4000).optional().default(null),
    reviewDate: nullableDateSchema.optional().default(null),
    phaseId: nullableCuidSchema.optional().default(null),
    assetId: nullableCuidSchema.optional().default(null),
    technicalArea: nullableTechnicalAreaSchema.optional().default(null),
    technicalObjectType: nullableTechnicalObjectTypeSchema.optional().default(null),
    ownerId: nullableCuidSchema.optional().default(null),
  })
  .superRefine((value, ctx) => {
    if (value.technicalObjectType && !value.technicalArea) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["technicalArea"],
        message: "Informe a área técnica quando houver objeto técnico relacionado.",
      });
    }

    if (
      (value.status === "MITIGADO" || value.status === "ENCERRADO") &&
      !value.mitigationPlan
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["mitigationPlan"],
        message: "Informe a mitigação adotada para riscos mitigados ou encerrados.",
      });
    }
  });

export type ProjectIssueInput = z.infer<typeof projectIssueInputSchema>;
export type ProjectRiskInput = z.infer<typeof projectRiskInputSchema>;

type IssueLike = {
  id: string;
  title: string;
  description: string | null;
  issueType: ProjectIssueType;
  status: ProjectIssueStatus;
  priority: ProjectPriority;
  severity: ProjectCriticality | null;
  dueDate: Date | null;
  resolvedAt: Date | null;
  resolutionNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
  technicalArea: ProjectTechnicalArea | null;
  technicalObjectType: string | null;
  metadata?: unknown;
  phase?: { id: string; name: string; sequence: number } | null;
  inspection?: { id: string; occurredAt: Date | null; inspectionType: string } | null;
  asset?: { id: string; name: string; type: string } | null;
  reportedBy?: { id: string; name: string | null; email?: string | null } | null;
  assignedTo?: { id: string; name: string | null; email?: string | null } | null;
};

type RiskLike = {
  id: string;
  title: string;
  description: string | null;
  category: ProjectRiskCategory;
  status: ProjectRiskStatus;
  probability: ProjectRiskProbability;
  impact: ProjectRiskImpact;
  mitigationPlan: string | null;
  contingencyPlan: string | null;
  reviewDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  technicalArea: ProjectTechnicalArea | null;
  technicalObjectType: string | null;
  phase?: { id: string; name: string; sequence: number } | null;
  asset?: { id: string; name: string; type: string } | null;
  owner?: { id: string; name: string | null; email?: string | null } | null;
};

type HistoryCommentLike = {
  id: string;
  body: string;
  isInternal: boolean;
  createdAt: Date;
  metadata?: unknown;
  author?: { id: string; name: string | null; email: string | null } | null;
  phase?: { id: string; name: string } | null;
  milestone?: { id: string; title: string } | null;
  measurement?: { id: string; measurementNumber: number } | null;
  inspection?: { id: string; inspectionType: string } | null;
  issue?: { id: string; title: string } | null;
  risk?: { id: string; title: string } | null;
};

type HistoryAuditLike = {
  id: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  userRole: string | null;
  metadata?: unknown;
  createdAt: Date;
};

type HistoryInspectionLike = {
  id: string;
  inspectionType: string;
  status: string;
  summary: string | null;
  occurredAt: Date | null;
  scheduledAt: Date | null;
  createdAt: Date;
  technicalArea: ProjectTechnicalArea | null;
  technicalObjectType: string | null;
  phase?: { id: string; name: string; sequence: number } | null;
  inspector?: { id: string; name: string | null } | null;
  _count?: { issues: number; documents: number } | null;
};

type HistoryMeasurementLike = {
  id: string;
  measurementNumber: number;
  status: string;
  technicalArea: ProjectTechnicalArea | null;
  measuredAmount: { toString(): string } | number | null;
  referenceMonth: Date | null;
  measuredAt: Date | null;
  updatedAt: Date;
  phase?: { id: string; name: string } | null;
  measuredBy?: { id: string; name: string | null } | null;
};

type HistoryDocumentLike = {
  id: string;
  title: string;
  documentType: string;
  technicalArea: ProjectTechnicalArea | null;
  documentDate: Date | null;
  createdAt: Date;
  uploadedBy?: { id: string; name: string | null; email: string | null } | null;
};

export type SerializedProjectIssue = {
  id: string;
  title: string;
  description: string | null;
  issueType: ProjectIssueType;
  status: ProjectIssueStatus;
  priority: ProjectPriority;
  severity: ProjectCriticality;
  dueDate: string | null;
  resolvedAt: string | null;
  resolutionNotes: string | null;
  createdAt: string;
  updatedAt: string;
  source: "campo" | "fiscalizacao" | "projeto";
  technicalArea: ProjectTechnicalArea | null;
  technicalObjectType: string | null;
  phase: { id: string; name: string; sequence: number } | null;
  inspection: { id: string; occurredAt: string | null; inspectionType: string } | null;
  asset: { id: string; name: string; type: string } | null;
  reportedBy: { id: string; name: string | null; email: string | null } | null;
  assignedTo: { id: string; name: string | null; email: string | null } | null;
};

export type SerializedProjectRisk = {
  id: string;
  title: string;
  description: string | null;
  category: ProjectRiskCategory;
  status: ProjectRiskStatus;
  probability: ProjectRiskProbability;
  impact: ProjectRiskImpact;
  mitigationPlan: string | null;
  contingencyPlan: string | null;
  reviewDate: string | null;
  createdAt: string;
  updatedAt: string;
  technicalArea: ProjectTechnicalArea | null;
  technicalObjectType: string | null;
  phase: { id: string; name: string; sequence: number } | null;
  asset: { id: string; name: string; type: string } | null;
  owner: { id: string; name: string | null; email: string | null } | null;
  score: number;
};

export type ProjectGovernanceIndicators = {
  totalIssues: number;
  openIssues: number;
  overdueIssues: number;
  criticalIssues: number;
  totalRisks: number;
  activeRisks: number;
  highExposureRisks: number;
  materializedRisks: number;
  issuesByArea: Array<{ technicalArea: ProjectTechnicalArea; count: number }>;
  risksByArea: Array<{ technicalArea: ProjectTechnicalArea; count: number }>;
};

export type SerializedProjectHistoryEvent = {
  id: string;
  kind: "comentario" | "auditoria" | "pendencia" | "risco" | "fiscalizacao" | "medicao" | "documento";
  title: string;
  detail: string;
  timestamp: string;
  actorName: string | null;
  area: ProjectTechnicalArea | null;
  tone: "neutral" | "brand" | "success" | "warning" | "danger";
  badge: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
};

export type ProjectHistoryIndicators = {
  totalEvents: number;
  auditEvents: number;
  operationalEvents: number;
  fieldEvents: number;
  latestEventAt: string | null;
  byKind: Array<{ kind: SerializedProjectHistoryEvent["kind"]; count: number }>;
  byArea: Array<{ technicalArea: ProjectTechnicalArea; count: number }>;
};

function toIsoDate(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function decimalToNumber(value: { toString(): string } | number | null | undefined) {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  return Number(value.toString());
}

function resolveIssueSource(value: IssueLike["metadata"], hasInspection: boolean) {
  if (hasInspection) return "fiscalizacao" as const;
  if (!value || typeof value !== "object" || Array.isArray(value)) return "projeto" as const;
  return (value as { source?: unknown }).source === "campo" ? "campo" : "projeto";
}

function formatPriority(value: ProjectPriority) {
  switch (value) {
    case "BAIXA":
      return "Baixa";
    case "MEDIA":
      return "Média";
    case "ALTA":
      return "Alta";
    case "URGENTE":
      return "Urgente";
    default:
      return value;
  }
}

function getHistoryTone(status: string | null | undefined) {
  switch (status) {
    case "REALIZADA":
    case "RESOLVIDA":
    case "FECHADA":
    case "MITIGADO":
    case "ENCERRADO":
      return "success" as const;
    case "ABERTA":
    case "MATERIALIZADO":
    case "CRITICO":
    case "CRITICA":
      return "danger" as const;
    case "AGENDADA":
    case "EM_TRATATIVA":
    case "MONITORANDO":
    case "IDENTIFICADO":
    case "SUBMETIDA":
      return "warning" as const;
    default:
      return "brand" as const;
  }
}

function formatAuditAction(action: string) {
  return action
    .toLowerCase()
    .split("_")
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

function commentContextLabel(comment: HistoryCommentLike) {
  if (comment.issue) return `Pendência: ${comment.issue.title}`;
  if (comment.risk) return `Risco: ${comment.risk.title}`;
  if (comment.inspection) return `Fiscalização ${comment.inspection.inspectionType.toLowerCase()}`;
  if (comment.measurement) return `Medição #${comment.measurement.measurementNumber}`;
  if (comment.milestone) return `Marco: ${comment.milestone.title}`;
  if (comment.phase) return `Fase: ${comment.phase.name}`;
  return "Projeto";
}

export function serializeProjectIssues(issues: IssueLike[]): SerializedProjectIssue[] {
  return issues.map((issue) => ({
    id: issue.id,
    title: issue.title,
    description: issue.description,
    issueType: issue.issueType,
    status: issue.status,
    priority: issue.priority,
    severity: issue.severity ?? "MEDIA",
    dueDate: toIsoDate(issue.dueDate),
    resolvedAt: toIsoDate(issue.resolvedAt),
    resolutionNotes: issue.resolutionNotes,
    createdAt: issue.createdAt.toISOString(),
    updatedAt: issue.updatedAt.toISOString(),
    source: resolveIssueSource(issue.metadata, Boolean(issue.inspection)),
    technicalArea: issue.technicalArea,
    technicalObjectType: issue.technicalObjectType,
    phase: issue.phase
      ? {
          id: issue.phase.id,
          name: issue.phase.name,
          sequence: issue.phase.sequence,
        }
      : null,
    inspection: issue.inspection
      ? {
          id: issue.inspection.id,
          occurredAt: toIsoDate(issue.inspection.occurredAt),
          inspectionType: issue.inspection.inspectionType,
        }
      : null,
    asset: issue.asset
      ? {
          id: issue.asset.id,
          name: issue.asset.name,
          type: issue.asset.type,
        }
      : null,
    reportedBy: issue.reportedBy
      ? {
          id: issue.reportedBy.id,
          name: issue.reportedBy.name,
          email: issue.reportedBy.email ?? null,
        }
      : null,
    assignedTo: issue.assignedTo
      ? {
          id: issue.assignedTo.id,
          name: issue.assignedTo.name,
          email: issue.assignedTo.email ?? null,
        }
      : null,
  }));
}

export function serializeProjectRisks(risks: RiskLike[]): SerializedProjectRisk[] {
  return risks.map((risk) => ({
    id: risk.id,
    title: risk.title,
    description: risk.description,
    category: risk.category,
    status: risk.status,
    probability: risk.probability,
    impact: risk.impact,
    mitigationPlan: risk.mitigationPlan,
    contingencyPlan: risk.contingencyPlan,
    reviewDate: toIsoDate(risk.reviewDate),
    createdAt: risk.createdAt.toISOString(),
    updatedAt: risk.updatedAt.toISOString(),
    technicalArea: risk.technicalArea,
    technicalObjectType: risk.technicalObjectType,
    phase: risk.phase
      ? {
          id: risk.phase.id,
          name: risk.phase.name,
          sequence: risk.phase.sequence,
        }
      : null,
    asset: risk.asset
      ? {
          id: risk.asset.id,
          name: risk.asset.name,
          type: risk.asset.type,
        }
      : null,
    owner: risk.owner
      ? {
          id: risk.owner.id,
          name: risk.owner.name,
          email: risk.owner.email ?? null,
        }
      : null,
    score:
      (risk.probability === "ALTA" ? 3 : risk.probability === "MEDIA" ? 2 : 1) *
      (risk.impact === "CRITICO"
        ? 4
        : risk.impact === "ALTO"
          ? 3
          : risk.impact === "MEDIO"
            ? 2
            : 1),
  }));
}

export function buildProjectGovernanceIndicators(input: {
  issues: SerializedProjectIssue[];
  risks: SerializedProjectRisk[];
}): ProjectGovernanceIndicators {
  const now = Date.now();
  const openIssues = input.issues.filter(
    (issue) => issue.status === "ABERTA" || issue.status === "EM_TRATATIVA"
  );
  const activeRisks = input.risks.filter((risk) => risk.status !== "ENCERRADO");
  const issuesByAreaMap = new Map<ProjectTechnicalArea, number>();
  const risksByAreaMap = new Map<ProjectTechnicalArea, number>();

  for (const issue of input.issues) {
    if (!issue.technicalArea) continue;
    issuesByAreaMap.set(
      issue.technicalArea,
      (issuesByAreaMap.get(issue.technicalArea) ?? 0) + 1
    );
  }

  for (const risk of input.risks) {
    if (!risk.technicalArea) continue;
    risksByAreaMap.set(
      risk.technicalArea,
      (risksByAreaMap.get(risk.technicalArea) ?? 0) + 1
    );
  }

  return {
    totalIssues: input.issues.length,
    openIssues: openIssues.length,
    overdueIssues: openIssues.filter(
      (issue) => issue.dueDate && new Date(issue.dueDate).getTime() < now
    ).length,
    criticalIssues: openIssues.filter(
      (issue) => issue.severity === "ALTA" || issue.severity === "CRITICA"
    ).length,
    totalRisks: input.risks.length,
    activeRisks: activeRisks.length,
    highExposureRisks: activeRisks.filter((risk) => risk.score >= 9).length,
    materializedRisks: input.risks.filter((risk) => risk.status === "MATERIALIZADO").length,
    issuesByArea: Array.from(issuesByAreaMap.entries()).map(([technicalArea, count]) => ({
      technicalArea,
      count,
    })),
    risksByArea: Array.from(risksByAreaMap.entries()).map(([technicalArea, count]) => ({
      technicalArea,
      count,
    })),
  };
}

export function buildProjectHistoryEvents(input: {
  comments: HistoryCommentLike[];
  auditLogs: HistoryAuditLike[];
  issues: SerializedProjectIssue[];
  risks: SerializedProjectRisk[];
  inspections: HistoryInspectionLike[];
  measurements: HistoryMeasurementLike[];
  documents: HistoryDocumentLike[];
}): SerializedProjectHistoryEvent[] {
  const commentEvents: SerializedProjectHistoryEvent[] = input.comments.map((comment) => ({
    id: `comment-${comment.id}`,
    kind: "comentario",
    title: `Comentário de ${comment.author?.name || "equipe"}`,
    detail: `${commentContextLabel(comment)} · ${comment.body}`,
    timestamp: comment.createdAt.toISOString(),
    actorName: comment.author?.name || comment.author?.email || null,
    area: null,
    tone: comment.isInternal ? "neutral" : "brand",
    badge: comment.isInternal ? "Interno" : "Compartilhável",
    entityId: comment.id,
    metadata:
      comment.metadata && typeof comment.metadata === "object" && !Array.isArray(comment.metadata)
        ? (comment.metadata as Record<string, unknown>)
        : null,
  }));

  const auditEvents: SerializedProjectHistoryEvent[] = input.auditLogs.map((log) => ({
    id: `audit-${log.id}`,
    kind: "auditoria",
    title: formatAuditAction(log.action),
    detail: [log.userName || log.userEmail || "Sistema", log.entityType || "evento"]
      .filter(Boolean)
      .join(" · "),
    timestamp: log.createdAt.toISOString(),
    actorName: log.userName || log.userEmail || null,
    area:
      log.metadata &&
      typeof log.metadata === "object" &&
      !Array.isArray(log.metadata) &&
      typeof (log.metadata as { technicalArea?: unknown }).technicalArea === "string" &&
      PRISMA_PROJECT_TECHNICAL_AREAS.includes(
        (log.metadata as { technicalArea: ProjectTechnicalArea }).technicalArea
      )
        ? (log.metadata as { technicalArea: ProjectTechnicalArea }).technicalArea
        : null,
    tone: getHistoryTone(log.action),
    badge: "Auditoria",
    entityId: log.entityId,
    metadata:
      log.metadata && typeof log.metadata === "object" && !Array.isArray(log.metadata)
        ? (log.metadata as Record<string, unknown>)
        : null,
  }));

  const issueEvents: SerializedProjectHistoryEvent[] = input.issues.map((issue) => ({
    id: `issue-${issue.id}`,
    kind: "pendencia",
    title: issue.title,
    detail: [
      getProjectIssueTypeLabel(issue.issueType),
      getProjectIssueStatusLabel(issue.status),
      `Severidade ${getProjectCriticalityLabel(issue.severity).toLowerCase()}`,
      issue.assignedTo?.name || null,
    ]
      .filter(Boolean)
      .join(" · "),
    timestamp: issue.updatedAt,
    actorName: issue.assignedTo?.name || issue.reportedBy?.name || null,
    area: issue.technicalArea,
    tone: getHistoryTone(issue.status),
    badge: "Pendência",
    entityId: issue.id,
    metadata: null,
  }));

  const riskEvents: SerializedProjectHistoryEvent[] = input.risks.map((risk) => ({
    id: `risk-${risk.id}`,
    kind: "risco",
    title: risk.title,
    detail: [
      getProjectRiskCategoryLabel(risk.category),
      getProjectRiskStatusLabel(risk.status),
      `${getProjectRiskProbabilityLabel(risk.probability)} x ${getProjectRiskImpactLabel(
        risk.impact
      )}`,
      risk.owner?.name || null,
    ]
      .filter(Boolean)
      .join(" · "),
    timestamp: risk.updatedAt,
    actorName: risk.owner?.name || null,
    area: risk.technicalArea,
    tone: getHistoryTone(risk.status),
    badge: "Risco",
    entityId: risk.id,
    metadata: null,
  }));

  const inspectionEvents: SerializedProjectHistoryEvent[] = input.inspections.map((inspection) => ({
    id: `inspection-${inspection.id}`,
    kind: "fiscalizacao",
    title: inspection.summary || `Fiscalização ${inspection.inspectionType.toLowerCase()}`,
    detail: [
      inspection.phase ? `Fase ${inspection.phase.sequence}` : null,
      inspection.inspector?.name || null,
      inspection._count?.issues ? `${inspection._count.issues} pendência(s)` : null,
    ]
      .filter(Boolean)
      .join(" · "),
    timestamp:
      inspection.occurredAt?.toISOString() ??
      inspection.scheduledAt?.toISOString() ??
      inspection.createdAt.toISOString(),
    actorName: inspection.inspector?.name || null,
    area: inspection.technicalArea,
    tone: getHistoryTone(inspection.status),
    badge: "Fiscalização",
    entityId: inspection.id,
    metadata: null,
  }));

  const measurementEvents: SerializedProjectHistoryEvent[] = input.measurements.map((measurement) => ({
    id: `measurement-${measurement.id}`,
    kind: "medicao",
    title: `Medição #${measurement.measurementNumber}`,
    detail: [
      measurement.phase?.name || null,
      measurement.measuredBy?.name || null,
      decimalToNumber(measurement.measuredAmount) !== null
        ? `Valor medido ${decimalToNumber(measurement.measuredAmount)?.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          })}`
        : null,
    ]
      .filter(Boolean)
      .join(" · "),
    timestamp:
      measurement.measuredAt?.toISOString() ??
      measurement.referenceMonth?.toISOString() ??
      measurement.updatedAt.toISOString(),
    actorName: measurement.measuredBy?.name || null,
    area: measurement.technicalArea,
    tone: getHistoryTone(measurement.status),
    badge: "Medição",
    entityId: measurement.id,
    metadata: null,
  }));

  const documentEvents: SerializedProjectHistoryEvent[] = input.documents.map((document) => ({
    id: `document-${document.id}`,
    kind: "documento",
    title: document.title,
    detail: [document.documentType, document.uploadedBy?.name || document.uploadedBy?.email || null]
      .filter(Boolean)
      .join(" · "),
    timestamp: document.documentDate?.toISOString() ?? document.createdAt.toISOString(),
    actorName: document.uploadedBy?.name || document.uploadedBy?.email || null,
    area: document.technicalArea,
    tone: "brand",
    badge: "Documento",
    entityId: document.id,
    metadata: null,
  }));

  return [
    ...commentEvents,
    ...auditEvents,
    ...issueEvents,
    ...riskEvents,
    ...inspectionEvents,
    ...measurementEvents,
    ...documentEvents,
  ]
    .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
    .slice(0, 200);
}

export function buildProjectHistoryIndicators(
  events: SerializedProjectHistoryEvent[]
): ProjectHistoryIndicators {
  const byKindMap = new Map<SerializedProjectHistoryEvent["kind"], number>();
  const byAreaMap = new Map<ProjectTechnicalArea, number>();

  for (const event of events) {
    byKindMap.set(event.kind, (byKindMap.get(event.kind) ?? 0) + 1);
    if (event.area) {
      byAreaMap.set(event.area, (byAreaMap.get(event.area) ?? 0) + 1);
    }
  }

  return {
    totalEvents: events.length,
    auditEvents: events.filter((event) => event.kind === "auditoria").length,
    operationalEvents: events.filter((event) => event.kind !== "auditoria").length,
    fieldEvents: events.filter(
      (event) =>
        event.kind === "fiscalizacao" ||
        (event.metadata &&
          typeof event.metadata.source === "string" &&
          event.metadata.source === "campo")
    ).length,
    latestEventAt: events[0]?.timestamp ?? null,
    byKind: Array.from(byKindMap.entries()).map(([kind, count]) => ({ kind, count })),
    byArea: Array.from(byAreaMap.entries()).map(([technicalArea, count]) => ({
      technicalArea,
      count,
    })),
  };
}

export function formatHistoryEventSubtitle(event: SerializedProjectHistoryEvent) {
  const areaLabel = event.area ? getProjectTechnicalAreaLabel(event.area) : null;
  return [event.badge, areaLabel, event.actorName, formatDateTime(event.timestamp)]
    .filter(Boolean)
    .join(" · ");
}

export function isIssueOpen(status: ProjectIssueStatus) {
  return status === "ABERTA" || status === "EM_TRATATIVA";
}

export function isRiskActive(status: ProjectRiskStatus) {
  return status !== "ENCERRADO";
}

export function formatIssueSeveritySummary(value: ProjectCriticality) {
  return getProjectCriticalityLabel(value);
}

export function formatIssuePrioritySummary(value: ProjectPriority) {
  return formatPriority(value);
}
