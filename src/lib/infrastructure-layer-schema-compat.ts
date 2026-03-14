import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type InfrastructureLayerSchemaCompatibility = {
  publishedLayersReady: boolean;
  uploadPipelineReady: boolean;
  managementReady: boolean;
  notice: string | null;
};

type InfrastructureLayerSchemaCheckRow = {
  hasInfrastructureLayers: boolean;
  hasInfrastructureLayerTenantAccess: boolean;
  hasInfrastructureLayerUploads: boolean;
  hasInfrastructureLayerUploadFiles: boolean;
  hasInfrastructureLayerUploadTenantAccess: boolean;
};

function buildCompatibilityNotice(managementReady: boolean) {
  if (managementReady) {
    return null;
  }

  return "As camadas técnicas publicadas ainda não estão disponíveis neste ambiente porque a migration de infraestrutura elétrica não foi aplicada no banco. Aplique `npx prisma migrate deploy` no ambiente publicado para liberar o upload e a visualização dessas camadas.";
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
      ) AS "hasInfrastructureLayerTenantAccess",
      EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'infrastructure_layer_uploads'
      ) AS "hasInfrastructureLayerUploads",
      EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'infrastructure_layer_upload_files'
      ) AS "hasInfrastructureLayerUploadFiles",
      EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'infrastructure_layer_upload_tenant_access'
      ) AS "hasInfrastructureLayerUploadTenantAccess"
  `);

  const row = rows[0] ?? {
    hasInfrastructureLayers: false,
    hasInfrastructureLayerTenantAccess: false,
    hasInfrastructureLayerUploads: false,
    hasInfrastructureLayerUploadFiles: false,
    hasInfrastructureLayerUploadTenantAccess: false,
  };

  const publishedLayersReady =
    row.hasInfrastructureLayers && row.hasInfrastructureLayerTenantAccess;
  const uploadPipelineReady =
    row.hasInfrastructureLayerUploads &&
    row.hasInfrastructureLayerUploadFiles &&
    row.hasInfrastructureLayerUploadTenantAccess;
  const managementReady = publishedLayersReady && uploadPipelineReady;

  return {
    publishedLayersReady,
    uploadPipelineReady,
    managementReady,
    notice: buildCompatibilityNotice(managementReady),
  };
}

export function isInfrastructureLayerSchemaCompatError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2021" || error.code === "P2022")
  );
}
