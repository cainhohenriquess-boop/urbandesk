import type { ProjectDocumentType, ProjectTechnicalArea } from "@prisma/client";
import { z } from "zod";
import { PRISMA_PROJECT_TECHNICAL_AREAS } from "@/lib/project-disciplines";

type ProjectDocumentLike = {
  id: string;
  title: string;
  description: string | null;
  documentType: ProjectDocumentType;
  fileName: string;
  fileUrl: string | null;
  mimeType: string | null;
  fileSize: number | null;
  documentDate: Date | null;
  isPublic: boolean;
  metadata?: unknown;
  createdAt: Date;
  updatedAt: Date;
  technicalArea?: ProjectTechnicalArea | null;
  phase?: {
    id: string;
    name: string;
    sequence: number;
  } | null;
  contract?: {
    id: string;
    title: string;
    contractNumber: string | null;
  } | null;
  measurement?: {
    id: string;
    measurementNumber: number;
  } | null;
  uploadedBy?: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
};

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

export const PROJECT_DOCUMENT_TYPE_VALUES = [
  "CONTRATO",
  "TERMO_REFERENCIA",
  "EDITAL",
  "ORDEM_SERVICO",
  "PROJETO_EXECUTIVO",
  "MEMORIAL",
  "LICENCA",
  "RELATORIO_FOTOGRAFICO",
  "MEDICAO",
  "LAUDO",
  "PROJETO_BASICO",
  "ORCAMENTO",
  "CRONOGRAMA",
  "LICITACAO",
  "ADITIVO",
  "RELATORIO",
  "MAPA",
  "FOTO",
  "OUTRO",
] as const satisfies readonly ProjectDocumentType[];

export const PROJECT_DOCUMENT_ALLOWED_EXTENSIONS = new Set([
  "pdf",
  "jpg",
  "jpeg",
  "png",
  "webp",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "csv",
]);

export const PROJECT_DOCUMENT_ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
]);

export const projectDocumentUploadInputSchema = z.object({
  title: nullableStringSchema(160).optional().default(null),
  description: nullableStringSchema(2000).optional().default(null),
  documentType: z.enum(PROJECT_DOCUMENT_TYPE_VALUES, {
    message: "Selecione a categoria do documento.",
  }),
  documentDate: nullableDateSchema.optional().default(null),
  technicalArea: nullableTechnicalAreaSchema.optional().default(null),
  phaseId: nullableCuidSchema.optional().default(null),
  contractId: nullableCuidSchema.optional().default(null),
  measurementId: nullableCuidSchema.optional().default(null),
  isPublic: z.preprocess(
    (value) => value === true || value === "true" || value === "1",
    z.boolean()
  ).optional().default(false),
});

export type ProjectDocumentUploadInput = z.infer<typeof projectDocumentUploadInputSchema>;

export type SerializedProjectDocument = {
  id: string;
  title: string;
  description: string | null;
  documentType: ProjectDocumentType;
  fileName: string;
  fileUrl: string | null;
  mimeType: string | null;
  fileSize: number | null;
  documentDate: string | null;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  technicalArea: ProjectTechnicalArea | null;
  phase: {
    id: string;
    name: string;
    sequence: number;
  } | null;
  contract: {
    id: string;
    title: string;
    contractNumber: string | null;
  } | null;
  measurement: {
    id: string;
    measurementNumber: number;
  } | null;
  uploadedBy: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
};

export type ProjectDocumentIndicators = {
  totalDocuments: number;
  publicDocuments: number;
  categorizedDocuments: number;
  areaLinkedDocuments: number;
  latestDocumentDate: string | null;
  byCategory: Array<{
    documentType: ProjectDocumentType;
    count: number;
  }>;
};

function toIsoDate(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

export function buildProjectDocumentTitle(fileName: string, explicitTitle?: string | null) {
  const sanitizedTitle = explicitTitle?.trim();
  if (sanitizedTitle) return sanitizedTitle;

  const normalized = fileName.replace(/\.[^.]+$/, "").trim();
  return normalized || "Documento do projeto";
}

export function serializeProjectDocuments(
  documents: ProjectDocumentLike[]
): SerializedProjectDocument[] {
  return documents.map((document) => ({
    id: document.id,
    title: document.title,
    description: document.description ?? null,
    documentType: document.documentType,
    fileName: document.fileName,
    fileUrl: document.fileUrl ?? null,
    mimeType: document.mimeType ?? null,
    fileSize: document.fileSize ?? null,
    documentDate: toIsoDate(document.documentDate),
    isPublic: document.isPublic,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
    technicalArea: document.technicalArea ?? null,
    phase: document.phase
      ? {
          id: document.phase.id,
          name: document.phase.name,
          sequence: document.phase.sequence,
        }
      : null,
    contract: document.contract
      ? {
          id: document.contract.id,
          title: document.contract.title,
          contractNumber: document.contract.contractNumber,
        }
      : null,
    measurement: document.measurement
      ? {
          id: document.measurement.id,
          measurementNumber: document.measurement.measurementNumber,
        }
      : null,
    uploadedBy: document.uploadedBy
      ? {
          id: document.uploadedBy.id,
          name: document.uploadedBy.name,
          email: document.uploadedBy.email,
        }
      : null,
  }));
}

export function buildProjectDocumentIndicators(
  documents: SerializedProjectDocument[]
): ProjectDocumentIndicators {
  const byCategoryMap = new Map<ProjectDocumentType, number>();

  for (const document of documents) {
    byCategoryMap.set(
      document.documentType,
      (byCategoryMap.get(document.documentType) ?? 0) + 1
    );
  }

  const latestDocumentDate =
    documents
      .map((document) => document.documentDate)
      .filter((value): value is string => Boolean(value))
      .sort((left, right) => right.localeCompare(left))[0] ?? null;

  return {
    totalDocuments: documents.length,
    publicDocuments: documents.filter((document) => document.isPublic).length,
    categorizedDocuments: byCategoryMap.size,
    areaLinkedDocuments: documents.filter((document) => Boolean(document.technicalArea)).length,
    latestDocumentDate,
    byCategory: Array.from(byCategoryMap.entries()).map(([documentType, count]) => ({
      documentType,
      count,
    })),
  };
}
