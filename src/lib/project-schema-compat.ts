import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type ProjectSchemaMode = "full" | "legacy";

export type ProjectSchemaCompatibility = {
  executiveSchemaReady: boolean;
  governanceSchemaReady: boolean;
  measurementSchemaReady: boolean;
  schemaMode: ProjectSchemaMode;
  notice: string | null;
  measurementNotice: string | null;
};

type ProjectSchemaCheckRow = {
  hasProjectCode: boolean;
  hasEstimatedBudget: boolean;
  hasProjectContracts: boolean;
  hasProjectComments: boolean;
  hasProjectMeasurements: boolean;
  hasMeasurementTechnicalArea: boolean;
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
      ) AS "hasMeasurementTechnicalArea"
  `);

  const row = rows[0] ?? {
    hasProjectCode: false,
    hasEstimatedBudget: false,
    hasProjectContracts: false,
    hasProjectComments: false,
    hasProjectMeasurements: false,
    hasMeasurementTechnicalArea: false,
  };

  const executiveSchemaReady = row.hasProjectCode && row.hasEstimatedBudget;
  const governanceSchemaReady =
    executiveSchemaReady && row.hasProjectContracts && row.hasProjectComments;
  const measurementSchemaReady =
    governanceSchemaReady && row.hasProjectMeasurements && row.hasMeasurementTechnicalArea;

  return {
    executiveSchemaReady,
    governanceSchemaReady,
    measurementSchemaReady,
    schemaMode: governanceSchemaReady ? "full" : "legacy",
    notice: buildCompatibilityNotice(executiveSchemaReady, governanceSchemaReady),
    measurementNotice: buildMeasurementNotice(measurementSchemaReady),
  };
}

export function isProjectSchemaCompatError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2021" || error.code === "P2022")
  );
}


