import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type InfrastructureLayerSchemaCompatibility = {
  publishedLayersReady: boolean;
  notice: string | null;
};

type InfrastructureLayerSchemaCheckRow = {
  hasInfrastructureLayers: boolean;
  hasInfrastructureLayerTenantAccess: boolean;
};

function buildCompatibilityNotice(publishedLayersReady: boolean) {
  if (publishedLayersReady) {
    return null;
  }

  return "As camadas técnicas publicadas ainda não estão disponíveis neste ambiente porque a migration de infraestrutura não foi aplicada no banco.";
}

export async function getInfrastructureLayerSchemaCompatibility(): Promise<InfrastructureLayerSchemaCompatibility> {
  const rows = await prisma.$queryRaw<InfrastructureLayerSchemaCheckRow[]>(Prisma.sql`
    SELECT
      EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'infrastructure_layers'
      ) AS "hasInfrastructureLayers",
      EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'infrastructure_layer_tenant_access'
      ) AS "hasInfrastructureLayerTenantAccess"
  `);

  const row = rows[0] ?? {
    hasInfrastructureLayers: false,
    hasInfrastructureLayerTenantAccess: false,
  };

  const publishedLayersReady =
    row.hasInfrastructureLayers && row.hasInfrastructureLayerTenantAccess;

  return {
    publishedLayersReady,
    notice: buildCompatibilityNotice(publishedLayersReady),
  };
}

export function isInfrastructureLayerSchemaCompatError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2021" || error.code === "P2022")
  );
}
