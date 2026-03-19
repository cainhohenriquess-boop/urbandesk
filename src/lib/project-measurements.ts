import type { ProjectMeasurementStatus, ProjectTechnicalArea } from "@prisma/client";
import { z } from "zod";
import { PRISMA_PROJECT_TECHNICAL_AREAS } from "@/lib/project-disciplines";

type DecimalLike = { toString(): string } | number | null | undefined;

type MeasurementDocumentLike = {
  id: string;
  title: string;
  fileName: string;
  fileUrl: string | null;
  mimeType: string | null;
  fileSize: number | null;
  documentDate: Date | null;
  isPublic: boolean;
  uploadedBy?: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
};

type MeasurementLike = {
  id: string;
  measurementNumber: number;
  referenceMonth: Date | null;
  periodStart: Date | null;
  periodEnd: Date | null;
  measuredAt: Date | null;
  status: ProjectMeasurementStatus;
  technicalArea: ProjectTechnicalArea | null;
  physicalProgressPct: number;
  financialProgressPct: number;
  measuredAmount: DecimalLike;
  approvedAmount: DecimalLike;
  paidAmount: DecimalLike;
  notes: string | null;
  metadata?: unknown;
  createdAt: Date;
  updatedAt: Date;
  phase?: {
    id: string;
    name: string;
    sequence: number;
    technicalArea?: ProjectTechnicalArea | null;
  } | null;
  contract?: {
    id: string;
    title: string;
    contractNumber: string | null;
    contractedAmount?: DecimalLike;
  } | null;
  measuredBy?: {
    id: string;
    name: string | null;
    email?: string | null;
  } | null;
  approvedBy?: {
    id: string;
    name: string | null;
    email?: string | null;
  } | null;
  documents?: MeasurementDocumentLike[];
};

const PROJECT_MEASUREMENT_STATUS_VALUES = [
  "RASCUNHO",
  "SUBMETIDA",
  "APROVADA",
  "REJEITADA",
  "PAGA",
] as const satisfies readonly ProjectMeasurementStatus[];

const nullableDateSchema = z.preprocess(
  (value) => (value === "" || value === undefined || value === null ? null : value),
  z.coerce.date().nullable()
);

const nullableCuidSchema = z.preprocess(
  (value) => (value === "" || value === undefined || value === null ? null : value),
  z.string().cuid().nullable()
);

const nullableTechnicalAreaSchema = z.preprocess(
  (value) => (value === "" || value === undefined || value === null ? null : value),
  z.enum(PRISMA_PROJECT_TECHNICAL_AREAS).nullable()
);

const nullableStringSchema = (max: number) =>
  z.preprocess(
    (value) => {
      if (value === "" || value === undefined || value === null) return null;
      return typeof value === "string" ? value.trim() : value;
    },
    z.string().max(max).nullable()
  );

const moneySchema = z.preprocess(
  (value) => (value === "" || value === undefined || value === null ? null : value),
  z.coerce.number().finite().nonnegative().nullable()
);

export const projectMeasurementInputSchema = z
  .object({
    referenceMonth: z.coerce.date({ message: "Informe a competência da medição." }),
    periodStart: nullableDateSchema.optional().default(null),
    periodEnd: nullableDateSchema.optional().default(null),
    phaseId: nullableCuidSchema.optional().default(null),
    contractId: nullableCuidSchema.optional().default(null),
    technicalArea: nullableTechnicalAreaSchema.optional().default(null),
    status: z.enum(PROJECT_MEASUREMENT_STATUS_VALUES).optional().default("RASCUNHO"),
    physicalProgressPct: z.coerce
      .number({ message: "Informe o percentual físico do período." })
      .int()
      .min(0)
      .max(100),
    measuredAmount: z.coerce
      .number({ message: "Informe o valor medido." })
      .finite()
      .nonnegative(),
    approvedAmount: moneySchema.optional().default(null),
    paidAmount: moneySchema.optional().default(null),
    notes: nullableStringSchema(2000).optional().default(null),
  })
  .superRefine((value, ctx) => {
    if (value.periodStart && value.periodEnd && value.periodEnd.getTime() < value.periodStart.getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["periodEnd"],
        message: "O fim do período não pode ser anterior ao início.",
      });
    }

    if (value.approvedAmount !== null && value.approvedAmount > value.measuredAmount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["approvedAmount"],
        message: "O valor aprovado não pode ser maior que o valor medido.",
      });
    }

    const maxPayableAmount = value.approvedAmount ?? value.measuredAmount;
    if (value.paidAmount !== null && value.paidAmount > maxPayableAmount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["paidAmount"],
        message: "O valor pago não pode ser maior que o valor aprovado ou medido.",
      });
    }

    if ((value.status === "APROVADA" || value.status === "PAGA") && value.approvedAmount === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["approvedAmount"],
        message: "Informe o valor aprovado para medições aprovadas ou pagas.",
      });
    }

    if (value.status === "PAGA" && value.paidAmount === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["paidAmount"],
        message: "Informe o valor pago quando a medição estiver com status Paga.",
      });
    }
  });

export type ProjectMeasurementInput = z.infer<typeof projectMeasurementInputSchema>;

export type SerializedMeasurementAttachment = {
  id: string;
  title: string;
  fileName: string;
  fileUrl: string | null;
  mimeType: string | null;
  fileSize: number | null;
  documentDate: string | null;
  isPublic: boolean;
  uploadedBy: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
};

export type SerializedProjectMeasurement = {
  id: string;
  measurementNumber: number;
  referenceMonth: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  measuredAt: string | null;
  status: ProjectMeasurementStatus;
  technicalArea: ProjectTechnicalArea | null;
  physicalProgressPct: number;
  financialProgressPct: number;
  measuredAmount: number | null;
  approvedAmount: number | null;
  paidAmount: number | null;
  accumulatedMeasuredAmount: number;
  accumulatedApprovedAmount: number;
  accumulatedPaidAmount: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  phase: {
    id: string;
    name: string;
    sequence: number;
    technicalArea: ProjectTechnicalArea | null;
  } | null;
  contract: {
    id: string;
    title: string;
    contractNumber: string | null;
    contractedAmount: number | null;
  } | null;
  measuredBy: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
  approvedBy: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
  attachments: SerializedMeasurementAttachment[];
};

export type ProjectMeasurementIndicators = {
  totalMeasurements: number;
  draftMeasurements: number;
  submittedMeasurements: number;
  approvedMeasurements: number;
  paidMeasurements: number;
  latestPhysicalProgressPct: number;
  latestFinancialProgressPct: number;
  latestMeasuredAmount: number;
  latestApprovedAmount: number;
  accumulatedMeasuredAmount: number;
  accumulatedApprovedAmount: number;
  accumulatedPaidAmount: number;
  pendingApprovalAmount: number;
  pendingPaymentAmount: number;
  byTechnicalArea: Array<{
    technicalArea: ProjectTechnicalArea;
    count: number;
    measuredAmount: number;
    approvedAmount: number;
    paidAmount: number;
  }>;
  byReferenceMonth: Array<{
    label: string;
    measurementNumber: number;
    measuredAmount: number;
    approvedAmount: number;
    paidAmount: number;
    accumulatedMeasuredAmount: number;
    accumulatedApprovedAmount: number;
  }>;
};

function decimalToNumber(value: DecimalLike) {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  return Number(value.toString());
}

function toIsoDate(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function getMeasurementSortKey(value: MeasurementLike) {
  return (
    value.referenceMonth?.getTime() ??
    value.periodEnd?.getTime() ??
    value.periodStart?.getTime() ??
    value.measuredAt?.getTime() ??
    value.createdAt.getTime()
  );
}

function formatMonthLabel(value: Date | null, fallbackNumber: number) {
  if (!value) return `Medição ${fallbackNumber}`;
  return new Intl.DateTimeFormat("pt-BR", {
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(value);
}

export function serializeMeasurementAttachment(
  attachment: MeasurementDocumentLike
): SerializedMeasurementAttachment {
  return {
    id: attachment.id,
    title: attachment.title,
    fileName: attachment.fileName,
    fileUrl: attachment.fileUrl,
    mimeType: attachment.mimeType,
    fileSize: attachment.fileSize,
    documentDate: toIsoDate(attachment.documentDate),
    isPublic: attachment.isPublic,
    uploadedBy: attachment.uploadedBy
      ? {
          id: attachment.uploadedBy.id,
          name: attachment.uploadedBy.name,
          email: attachment.uploadedBy.email,
        }
      : null,
  };
}

export function serializeProjectMeasurements(
  measurements: MeasurementLike[]
): SerializedProjectMeasurement[] {
  const ordered = [...measurements].sort((left, right) => {
    const diff = getMeasurementSortKey(left) - getMeasurementSortKey(right);
    if (diff !== 0) return diff;
    return left.measurementNumber - right.measurementNumber;
  });

  let accumulatedMeasuredAmount = 0;
  let accumulatedApprovedAmount = 0;
  let accumulatedPaidAmount = 0;

  const accumulatedMap = new Map<
    string,
    { measuredAmount: number; approvedAmount: number; paidAmount: number }
  >();

  for (const measurement of ordered) {
    accumulatedMeasuredAmount += decimalToNumber(measurement.measuredAmount) ?? 0;
    accumulatedApprovedAmount += decimalToNumber(measurement.approvedAmount) ?? 0;
    accumulatedPaidAmount += decimalToNumber(measurement.paidAmount) ?? 0;

    accumulatedMap.set(measurement.id, {
      measuredAmount: accumulatedMeasuredAmount,
      approvedAmount: accumulatedApprovedAmount,
      paidAmount: accumulatedPaidAmount,
    });
  }

  return measurements.map((measurement) => {
    const accumulated = accumulatedMap.get(measurement.id) ?? {
      measuredAmount: 0,
      approvedAmount: 0,
      paidAmount: 0,
    };

    return {
      id: measurement.id,
      measurementNumber: measurement.measurementNumber,
      referenceMonth: toIsoDate(measurement.referenceMonth),
      periodStart: toIsoDate(measurement.periodStart),
      periodEnd: toIsoDate(measurement.periodEnd),
      measuredAt: toIsoDate(measurement.measuredAt),
      status: measurement.status,
      technicalArea: measurement.technicalArea ?? measurement.phase?.technicalArea ?? null,
      physicalProgressPct: measurement.physicalProgressPct,
      financialProgressPct: measurement.financialProgressPct,
      measuredAmount: decimalToNumber(measurement.measuredAmount),
      approvedAmount: decimalToNumber(measurement.approvedAmount),
      paidAmount: decimalToNumber(measurement.paidAmount),
      accumulatedMeasuredAmount: accumulated.measuredAmount,
      accumulatedApprovedAmount: accumulated.approvedAmount,
      accumulatedPaidAmount: accumulated.paidAmount,
      notes: measurement.notes ?? null,
      createdAt: measurement.createdAt.toISOString(),
      updatedAt: measurement.updatedAt.toISOString(),
      phase: measurement.phase
        ? {
            id: measurement.phase.id,
            name: measurement.phase.name,
            sequence: measurement.phase.sequence,
            technicalArea: measurement.phase.technicalArea ?? null,
          }
        : null,
      contract: measurement.contract
        ? {
            id: measurement.contract.id,
            title: measurement.contract.title,
            contractNumber: measurement.contract.contractNumber ?? null,
            contractedAmount: decimalToNumber(measurement.contract.contractedAmount),
          }
        : null,
      measuredBy: measurement.measuredBy
        ? {
            id: measurement.measuredBy.id,
            name: measurement.measuredBy.name,
            email: measurement.measuredBy.email ?? null,
          }
        : null,
      approvedBy: measurement.approvedBy
        ? {
            id: measurement.approvedBy.id,
            name: measurement.approvedBy.name,
            email: measurement.approvedBy.email ?? null,
          }
        : null,
      attachments: (measurement.documents ?? []).map(serializeMeasurementAttachment),
    };
  });
}

export function buildProjectMeasurementIndicators(
  measurements: SerializedProjectMeasurement[]
): ProjectMeasurementIndicators {
  const ordered = [...measurements].sort((left, right) => {
    const leftDate = Date.parse(left.referenceMonth ?? left.periodEnd ?? left.periodStart ?? left.createdAt);
    const rightDate = Date.parse(right.referenceMonth ?? right.periodEnd ?? right.periodStart ?? right.createdAt);
    const diff = leftDate - rightDate;
    if (!Number.isNaN(diff) && diff !== 0) return diff;
    return left.measurementNumber - right.measurementNumber;
  });

  const latest = ordered[ordered.length - 1] ?? null;
  const statusCounts: Record<ProjectMeasurementStatus, number> = {
    RASCUNHO: 0,
    SUBMETIDA: 0,
    APROVADA: 0,
    REJEITADA: 0,
    PAGA: 0,
  };
  const byTechnicalArea = new Map<
    ProjectTechnicalArea,
    { technicalArea: ProjectTechnicalArea; count: number; measuredAmount: number; approvedAmount: number; paidAmount: number }
  >();

  for (const measurement of measurements) {
    statusCounts[measurement.status] += 1;
    if (!measurement.technicalArea) continue;

    const current = byTechnicalArea.get(measurement.technicalArea) ?? {
      technicalArea: measurement.technicalArea,
      count: 0,
      measuredAmount: 0,
      approvedAmount: 0,
      paidAmount: 0,
    };

    current.count += 1;
    current.measuredAmount += measurement.measuredAmount ?? 0;
    current.approvedAmount += measurement.approvedAmount ?? 0;
    current.paidAmount += measurement.paidAmount ?? 0;
    byTechnicalArea.set(measurement.technicalArea, current);
  }

  const accumulatedMeasuredAmount = latest?.accumulatedMeasuredAmount ?? 0;
  const accumulatedApprovedAmount = latest?.accumulatedApprovedAmount ?? 0;
  const accumulatedPaidAmount = latest?.accumulatedPaidAmount ?? 0;

  return {
    totalMeasurements: measurements.length,
    draftMeasurements: statusCounts.RASCUNHO,
    submittedMeasurements: statusCounts.SUBMETIDA,
    approvedMeasurements: statusCounts.APROVADA,
    paidMeasurements: statusCounts.PAGA,
    latestPhysicalProgressPct: latest?.physicalProgressPct ?? 0,
    latestFinancialProgressPct: latest?.financialProgressPct ?? 0,
    latestMeasuredAmount: latest?.measuredAmount ?? 0,
    latestApprovedAmount: latest?.approvedAmount ?? 0,
    accumulatedMeasuredAmount,
    accumulatedApprovedAmount,
    accumulatedPaidAmount,
    pendingApprovalAmount: Math.max(0, accumulatedMeasuredAmount - accumulatedApprovedAmount),
    pendingPaymentAmount: Math.max(0, accumulatedApprovedAmount - accumulatedPaidAmount),
    byTechnicalArea: [...byTechnicalArea.values()].sort((left, right) => right.count - left.count),
    byReferenceMonth: ordered.map((measurement) => ({
      label: formatMonthLabel(
        measurement.referenceMonth ? new Date(measurement.referenceMonth) : null,
        measurement.measurementNumber
      ),
      measurementNumber: measurement.measurementNumber,
      measuredAmount: measurement.measuredAmount ?? 0,
      approvedAmount: measurement.approvedAmount ?? 0,
      paidAmount: measurement.paidAmount ?? 0,
      accumulatedMeasuredAmount: measurement.accumulatedMeasuredAmount,
      accumulatedApprovedAmount: measurement.accumulatedApprovedAmount,
    })),
  };
}

export function resolveMeasurementFinancialProgressPct(params: {
  contractedAmount: number | null;
  status: ProjectMeasurementStatus;
  accumulatedMeasuredAmount: number;
  accumulatedApprovedAmount: number;
  accumulatedPaidAmount: number;
}) {
  if (!params.contractedAmount || params.contractedAmount <= 0) return 0;

  const referenceAmount =
    params.status === "PAGA"
      ? params.accumulatedPaidAmount
      : params.status === "APROVADA"
        ? params.accumulatedApprovedAmount
        : Math.max(params.accumulatedApprovedAmount, params.accumulatedMeasuredAmount);

  return Math.max(0, Math.min(100, Math.round((referenceAmount / params.contractedAmount) * 100)));
}

export function resolveMeasurementBaseContractedAmount(params: {
  contractAmount?: number | null;
  projectContractedAmount?: number | null;
  projectEstimatedBudget?: number | null;
  projectBudget?: number | null;
}) {
  return (
    params.contractAmount ??
    params.projectContractedAmount ??
    params.projectEstimatedBudget ??
    params.projectBudget ??
    null
  );
}

export function buildEmptyMeasurementIndicators(): ProjectMeasurementIndicators {
  return {
    totalMeasurements: 0,
    draftMeasurements: 0,
    submittedMeasurements: 0,
    approvedMeasurements: 0,
    paidMeasurements: 0,
    latestPhysicalProgressPct: 0,
    latestFinancialProgressPct: 0,
    latestMeasuredAmount: 0,
    latestApprovedAmount: 0,
    accumulatedMeasuredAmount: 0,
    accumulatedApprovedAmount: 0,
    accumulatedPaidAmount: 0,
    pendingApprovalAmount: 0,
    pendingPaymentAmount: 0,
    byTechnicalArea: [],
    byReferenceMonth: [],
  };
}
