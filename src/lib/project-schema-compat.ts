import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type ProjectSchemaMode = "full" | "legacy";

export type ProjectSchemaCompatibility = {
  executiveSchemaReady: boolean;
  governanceSchemaReady: boolean;
  measurementSchemaReady: boolean;
  fieldSchemaReady: boolean;
  documentSchemaReady: boolean;
  schemaMode: ProjectSchemaMode;
  notice: string | null;
  measurementNotice: string | null;
  fieldNotice: string | null;
  documentNotice: string | null;
};

type ProjectSchemaCheckRow = {
  hasProjectCode: boolean;
  hasEstimatedBudget: boolean;
  hasProjectContracts: boolean;
  hasProjectComments: boolean;
  hasProjectMeasurements: boolean;
  hasMeasurementTechnicalArea: boolean;
  hasProjectInspections: boolean;
  hasProjectIssues: boolean;
  hasInspectionAssetId: boolean;
  hasInspectionTechnicalArea: boolean;
  hasInspectionTechnicalObjectType: boolean;
  hasIssueTechnicalArea: boolean;
  hasIssueTechnicalObjectType: boolean;
  hasDocumentTechnicalArea: boolean;
  hasDocumentTypeEdital: boolean;
  hasDocumentTypeOrdemServico: boolean;
  hasDocumentTypeRelatorioFotografico: boolean;
  hasDocumentTypeLaudo: boolean;
};

function buildCompatibilityNotice(
  executiveSchemaReady: boolean,
  governanceSchemaReady: boolean
) {
  if (!executiveSchemaReady) {
    return "A base de dados publicada ainda não recebeu a migration estrutural do módulo Projetos. A carteira está operando em modo compatível até aplicar `npx prisma migrate deploy` no ambiente de produção.";
  }

  if (!governanceSchemaReady) {
    return "A carteira já está disponível, mas a Ficha 360º e as entidades de governança do projeto ainda dependem da migration complementar no banco de produção.";
  }

  return null;
}

function buildMeasurementNotice(measurementSchemaReady: boolean) {
  if (measurementSchemaReady) return null;

  return "As medições do projeto ainda dependem da migration complementar do módulo Projetos. Aplique `npx prisma migrate deploy` no ambiente publicado para liberar registro, anexos e indicadores por área técnica.";
}

function buildFieldNotice(fieldSchemaReady: boolean) {
  if (fieldSchemaReady) return null;

  return "Fiscalização, pendências e vínculos de campo ainda dependem da migration complementar do módulo Projetos. Aplique `npx prisma migrate deploy` no ambiente publicado para liberar vínculos por área técnica e objeto relacionado.";
}

function buildDocumentNotice(documentSchemaReady: boolean) {
  if (documentSchemaReady) return null;

  return "A gestão documental ampliada do projeto ainda depende da migration complementar do módulo Projetos. Aplique `npx prisma migrate deploy` no ambiente publicado para liberar categorias novas, vínculo por área técnica e upload documental completo.";
}

export async function getProjectSchemaCompatibility(): Promise<ProjectSchemaCompatibility> {
  const rows = await prisma.$queryRaw<ProjectSchemaCheckRow[]>(Prisma.sql`
    SELECT
      EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'projects'
          AND column_name = 'code'
      ) AS "hasProjectCode",
      EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'projects'
          AND column_name = 'estimatedBudget'
      ) AS "hasEstimatedBudget",
      EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'project_contracts'
      ) AS "hasProjectContracts",
      EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'project_comments'
      ) AS "hasProjectComments",
      EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'project_measurements'
      ) AS "hasProjectMeasurements",
      EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'project_measurements'
          AND column_name = 'technicalArea'
      ) AS "hasMeasurementTechnicalArea",
      EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'project_inspections'
      ) AS "hasProjectInspections",
      EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'project_issues'
      ) AS "hasProjectIssues",
      EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'project_inspections'
          AND column_name = 'assetId'
      ) AS "hasInspectionAssetId",
      EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'project_inspections'
          AND column_name = 'technicalArea'
      ) AS "hasInspectionTechnicalArea",
      EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'project_inspections'
          AND column_name = 'technicalObjectType'
      ) AS "hasInspectionTechnicalObjectType",
      EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'project_issues'
          AND column_name = 'technicalArea'
      ) AS "hasIssueTechnicalArea",
      EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'project_issues'
          AND column_name = 'technicalObjectType'
      ) AS "hasIssueTechnicalObjectType"
      ,
      EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'project_documents'
          AND column_name = 'technicalArea'
      ) AS "hasDocumentTechnicalArea",
      EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_enum e ON e.enumtypid = t.oid
        WHERE t.typname = 'ProjectDocumentType'
          AND e.enumlabel = 'EDITAL'
      ) AS "hasDocumentTypeEdital",
      EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_enum e ON e.enumtypid = t.oid
        WHERE t.typname = 'ProjectDocumentType'
          AND e.enumlabel = 'ORDEM_SERVICO'
      ) AS "hasDocumentTypeOrdemServico",
      EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_enum e ON e.enumtypid = t.oid
        WHERE t.typname = 'ProjectDocumentType'
          AND e.enumlabel = 'RELATORIO_FOTOGRAFICO'
      ) AS "hasDocumentTypeRelatorioFotografico",
      EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_enum e ON e.enumtypid = t.oid
        WHERE t.typname = 'ProjectDocumentType'
          AND e.enumlabel = 'LAUDO'
      ) AS "hasDocumentTypeLaudo"
  `);

  const row = rows[0] ?? {
    hasProjectCode: false,
    hasEstimatedBudget: false,
    hasProjectContracts: false,
    hasProjectComments: false,
    hasProjectMeasurements: false,
    hasMeasurementTechnicalArea: false,
    hasProjectInspections: false,
    hasProjectIssues: false,
    hasInspectionAssetId: false,
    hasInspectionTechnicalArea: false,
    hasInspectionTechnicalObjectType: false,
    hasIssueTechnicalArea: false,
    hasIssueTechnicalObjectType: false,
    hasDocumentTechnicalArea: false,
    hasDocumentTypeEdital: false,
    hasDocumentTypeOrdemServico: false,
    hasDocumentTypeRelatorioFotografico: false,
    hasDocumentTypeLaudo: false,
  };

  const executiveSchemaReady = row.hasProjectCode && row.hasEstimatedBudget;
  const governanceSchemaReady =
    executiveSchemaReady && row.hasProjectContracts && row.hasProjectComments;
  const measurementSchemaReady =
    governanceSchemaReady && row.hasProjectMeasurements && row.hasMeasurementTechnicalArea;
  const fieldSchemaReady =
    governanceSchemaReady &&
    row.hasProjectInspections &&
    row.hasProjectIssues &&
    row.hasInspectionAssetId &&
    row.hasInspectionTechnicalArea &&
    row.hasInspectionTechnicalObjectType &&
    row.hasIssueTechnicalArea &&
    row.hasIssueTechnicalObjectType;
  const documentSchemaReady =
    governanceSchemaReady &&
    row.hasDocumentTechnicalArea &&
    row.hasDocumentTypeEdital &&
    row.hasDocumentTypeOrdemServico &&
    row.hasDocumentTypeRelatorioFotografico &&
    row.hasDocumentTypeLaudo;

  return {
    executiveSchemaReady,
    governanceSchemaReady,
    measurementSchemaReady,
    fieldSchemaReady,
    documentSchemaReady,
    schemaMode: governanceSchemaReady ? "full" : "legacy",
    notice: buildCompatibilityNotice(executiveSchemaReady, governanceSchemaReady),
    measurementNotice: buildMeasurementNotice(measurementSchemaReady),
    fieldNotice: buildFieldNotice(fieldSchemaReady),
    documentNotice: buildDocumentNotice(documentSchemaReady),
  };
}

export function isProjectSchemaCompatError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2021" || error.code === "P2022")
  );
}


