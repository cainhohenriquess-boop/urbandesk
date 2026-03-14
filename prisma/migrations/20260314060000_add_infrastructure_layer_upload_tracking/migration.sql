CREATE TYPE "InfrastructureLayerUploadStatus" AS ENUM ('UPLOADED', 'PROCESSING', 'PROCESSED', 'FAILED');
CREATE TYPE "InfrastructureLayerUploadFileRole" AS ENUM ('ZIP_ARCHIVE', 'SHP', 'SHX', 'DBF', 'PRJ', 'CPG');

ALTER TABLE "infrastructure_layers"
ADD COLUMN "ownerTenantId" TEXT;

ALTER TABLE "infrastructure_layers"
ADD CONSTRAINT "infrastructure_layers_ownerTenantId_fkey"
FOREIGN KEY ("ownerTenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "infrastructure_layers_ownerTenantId_code_status_idx"
ON "infrastructure_layers"("ownerTenantId", "code", "status");

CREATE TABLE "infrastructure_layer_uploads" (
  "id" TEXT NOT NULL,
  "code" "InfrastructureLayerCode" NOT NULL,
  "status" "InfrastructureLayerUploadStatus" NOT NULL DEFAULT 'UPLOADED',
  "ownerTenantId" TEXT,
  "uploadMetadata" JSONB NOT NULL DEFAULT '{}',
  "processingResult" JSONB,
  "processingError" TEXT,
  "uploadedById" TEXT NOT NULL,
  "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  "finalLayerId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "infrastructure_layer_uploads_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "infrastructure_layer_uploads_ownerTenantId_fkey"
    FOREIGN KEY ("ownerTenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "infrastructure_layer_uploads_uploadedById_fkey"
    FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "infrastructure_layer_uploads_finalLayerId_fkey"
    FOREIGN KEY ("finalLayerId") REFERENCES "infrastructure_layers"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "infrastructure_layer_uploads_finalLayerId_key"
ON "infrastructure_layer_uploads"("finalLayerId");

CREATE INDEX "infrastructure_layer_uploads_code_status_uploadedAt_idx"
ON "infrastructure_layer_uploads"("code", "status", "uploadedAt");

CREATE INDEX "infrastructure_layer_uploads_ownerTenantId_uploadedAt_idx"
ON "infrastructure_layer_uploads"("ownerTenantId", "uploadedAt");

CREATE INDEX "infrastructure_layer_uploads_uploadedById_uploadedAt_idx"
ON "infrastructure_layer_uploads"("uploadedById", "uploadedAt");

CREATE TABLE "infrastructure_layer_upload_files" (
  "id" TEXT NOT NULL,
  "uploadId" TEXT NOT NULL,
  "role" "InfrastructureLayerUploadFileRole" NOT NULL,
  "originalName" TEXT NOT NULL,
  "archiveEntryName" TEXT,
  "storageKey" TEXT,
  "storageUrl" TEXT,
  "secureUrl" TEXT,
  "secureUrlExpiresAt" TIMESTAMP(3),
  "contentType" TEXT,
  "fileSize" INTEGER,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "infrastructure_layer_upload_files_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "infrastructure_layer_upload_files_uploadId_fkey"
    FOREIGN KEY ("uploadId") REFERENCES "infrastructure_layer_uploads"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "infrastructure_layer_upload_files_uploadId_role_idx"
ON "infrastructure_layer_upload_files"("uploadId", "role");

CREATE TABLE "infrastructure_layer_upload_tenant_access" (
  "uploadId" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "infrastructure_layer_upload_tenant_access_pkey" PRIMARY KEY ("uploadId", "tenantId"),
  CONSTRAINT "infrastructure_layer_upload_tenant_access_uploadId_fkey"
    FOREIGN KEY ("uploadId") REFERENCES "infrastructure_layer_uploads"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "infrastructure_layer_upload_tenant_access_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "infrastructure_layer_upload_tenant_access_tenantId_createdAt_idx"
ON "infrastructure_layer_upload_tenant_access"("tenantId", "createdAt");
