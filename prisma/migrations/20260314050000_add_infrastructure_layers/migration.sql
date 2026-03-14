CREATE TYPE "InfrastructureLayerCode" AS ENUM ('PONNOT', 'PONT_ILUM');
CREATE TYPE "InfrastructureLayerStatus" AS ENUM ('PROCESSING', 'READY', 'FAILED');

CREATE TABLE "infrastructure_layers" (
  "id" TEXT NOT NULL,
  "code" "InfrastructureLayerCode" NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "status" "InfrastructureLayerStatus" NOT NULL DEFAULT 'PROCESSING',
  "sourceArchiveName" TEXT NOT NULL,
  "sourceArchiveKey" TEXT NOT NULL,
  "sourceArchiveUrl" TEXT,
  "sourceArchiveSecureUrl" TEXT,
  "sourceArchiveExpiresAt" TIMESTAMP(3),
  "sourceArchiveContentType" TEXT,
  "sourceDatasetName" TEXT,
  "originalCrs" TEXT,
  "geometryType" TEXT,
  "featureCount" INTEGER NOT NULL DEFAULT 0,
  "bbox" JSONB,
  "geoJsonData" JSONB NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "uploadedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "infrastructure_layers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "infrastructure_layers_uploadedById_fkey"
    FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "infrastructure_layer_tenant_access" (
  "infrastructureLayerId" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "infrastructure_layer_tenant_access_pkey" PRIMARY KEY ("infrastructureLayerId", "tenantId"),
  CONSTRAINT "infrastructure_layer_tenant_access_infrastructureLayerId_fkey"
    FOREIGN KEY ("infrastructureLayerId") REFERENCES "infrastructure_layers"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "infrastructure_layer_tenant_access_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "infrastructure_layers_code_status_createdAt_idx"
  ON "infrastructure_layers"("code", "status", "createdAt");

CREATE INDEX "infrastructure_layers_uploadedById_createdAt_idx"
  ON "infrastructure_layers"("uploadedById", "createdAt");

CREATE INDEX "infrastructure_layer_tenant_access_tenantId_createdAt_idx"
  ON "infrastructure_layer_tenant_access"("tenantId", "createdAt");
