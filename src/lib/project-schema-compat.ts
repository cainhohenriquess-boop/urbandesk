import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type ProjectSchemaMode = "full" | "legacy";

export type ProjectSchemaCompatibility = {
  executiveSchemaReady: boolean;
  governanceSchemaReady: boolean;
  schemaMode: ProjectSchemaMode;
  notice: string | null;
};

type ProjectSchemaCheckRow = {
  hasProjectCode: boolean;
  hasEstimatedBudget: boolean;
  hasProjectContracts: boolean;
  hasProjectComments: boolean;
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
      ) AS "hasProjectComments"
  `);

  const row = rows[0] ?? {
    hasProjectCode: false,
    hasEstimatedBudget: false,
    hasProjectContracts: false,
    hasProjectComments: false,
  };

  const executiveSchemaReady = row.hasProjectCode && row.hasEstimatedBudget;
  const governanceSchemaReady =
    executiveSchemaReady && row.hasProjectContracts && row.hasProjectComments;

  return {
    executiveSchemaReady,
    governanceSchemaReady,
    schemaMode: governanceSchemaReady ? "full" : "legacy",
    notice: buildCompatibilityNotice(executiveSchemaReady, governanceSchemaReady),
  };
}

export function isProjectSchemaCompatError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2021" || error.code === "P2022")
  );
}
