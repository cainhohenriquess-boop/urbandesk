import { prisma } from "@/lib/prisma";

const INFRASTRUCTURE_LAYER_SCHEMA_STATEMENTS = [
  `
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_type WHERE typname = 'InfrastructureLayerCode'
    ) THEN
      CREATE TYPE "InfrastructureLayerCode" AS ENUM ('PONNOT', 'PONT_ILUM');
    END IF;
  END $$;
  `,
  `
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_type WHERE typname = 'InfrastructureLayerStatus'
    ) THEN
      CREATE TYPE "InfrastructureLayerStatus" AS ENUM ('PROCESSING', 'READY', 'FAILED');
    END IF;
  END $$;
  `,
  `
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_type WHERE typname = 'InfrastructureLayerUploadStatus'
    ) THEN
      CREATE TYPE "InfrastructureLayerUploadStatus" AS ENUM ('UPLOADED', 'PROCESSING', 'PROCESSED', 'FAILED');
    END IF;
  END $$;
  `,
  `
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_type WHERE typname = 'InfrastructureLayerUploadFileRole'
    ) THEN
      CREATE TYPE "InfrastructureLayerUploadFileRole" AS ENUM ('ZIP_ARCHIVE', 'SHP', 'SHX', 'DBF', 'PRJ', 'CPG');
    END IF;
  END $$;
  `,
  `
  CREATE TABLE IF NOT EXISTS "infrastructure_layers" (
    "id" TEXT NOT NULL,
    "code" "InfrastructureLayerCode" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "InfrastructureLayerStatus" NOT NULL DEFAULT 'PROCESSING',
    "ownerTenantId" TEXT,
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
  `,
  `
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'infrastructure_layers_uploadedById_fkey'
    ) THEN
      ALTER TABLE "infrastructure_layers"
      ADD CONSTRAINT "infrastructure_layers_uploadedById_fkey"
      FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END $$;
  `,
  `ALTER TABLE "infrastructure_layers" ADD COLUMN IF NOT EXISTS "ownerTenantId" TEXT;`,
  `
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'infrastructure_layers_ownerTenantId_fkey'
    ) THEN
      ALTER TABLE "infrastructure_layers"
      ADD CONSTRAINT "infrastructure_layers_ownerTenantId_fkey"
      FOREIGN KEY ("ownerTenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
  END $$;
  `,
  `CREATE INDEX IF NOT EXISTS "infrastructure_layers_ownerTenantId_code_status_idx" ON "infrastructure_layers"("ownerTenantId", "code", "status");`,
  `CREATE INDEX IF NOT EXISTS "infrastructure_layers_code_status_createdAt_idx" ON "infrastructure_layers"("code", "status", "createdAt");`,
  `CREATE INDEX IF NOT EXISTS "infrastructure_layers_uploadedById_createdAt_idx" ON "infrastructure_layers"("uploadedById", "createdAt");`,
  `
  CREATE TABLE IF NOT EXISTS "infrastructure_layer_tenant_access" (
    "infrastructureLayerId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "infrastructure_layer_tenant_access_pkey" PRIMARY KEY ("infrastructureLayerId", "tenantId"),
    CONSTRAINT "infrastructure_layer_tenant_access_infrastructureLayerId_fkey"
      FOREIGN KEY ("infrastructureLayerId") REFERENCES "infrastructure_layers"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "infrastructure_layer_tenant_access_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE
  );
  `,
  `
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'infrastructure_layer_tenant_access_infrastructureLayerId_fkey'
    ) THEN
      ALTER TABLE "infrastructure_layer_tenant_access"
      ADD CONSTRAINT "infrastructure_layer_tenant_access_infrastructureLayerId_fkey"
      FOREIGN KEY ("infrastructureLayerId") REFERENCES "infrastructure_layers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END $$;
  `,
  `
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'infrastructure_layer_tenant_access_tenantId_fkey'
    ) THEN
      ALTER TABLE "infrastructure_layer_tenant_access"
      ADD CONSTRAINT "infrastructure_layer_tenant_access_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END $$;
  `,
  `CREATE INDEX IF NOT EXISTS "infrastructure_layer_tenant_access_tenantId_createdAt_idx" ON "infrastructure_layer_tenant_access"("tenantId", "createdAt");`,
  `
  CREATE TABLE IF NOT EXISTS "infrastructure_layer_uploads" (
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
    CONSTRAINT "infrastructure_layer_uploads_pkey" PRIMARY KEY ("id")
  );
  `,
  `ALTER TABLE "infrastructure_layer_uploads" ADD COLUMN IF NOT EXISTS "ownerTenantId" TEXT;`,
  `ALTER TABLE "infrastructure_layer_uploads" ADD COLUMN IF NOT EXISTS "uploadMetadata" JSONB DEFAULT '{}';`,
  `ALTER TABLE "infrastructure_layer_uploads" ADD COLUMN IF NOT EXISTS "processingResult" JSONB;`,
  `ALTER TABLE "infrastructure_layer_uploads" ADD COLUMN IF NOT EXISTS "processingError" TEXT;`,
  `ALTER TABLE "infrastructure_layer_uploads" ADD COLUMN IF NOT EXISTS "uploadedById" TEXT;`,
  `ALTER TABLE "infrastructure_layer_uploads" ADD COLUMN IF NOT EXISTS "uploadedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;`,
  `ALTER TABLE "infrastructure_layer_uploads" ADD COLUMN IF NOT EXISTS "processedAt" TIMESTAMP(3);`,
  `ALTER TABLE "infrastructure_layer_uploads" ADD COLUMN IF NOT EXISTS "finalLayerId" TEXT;`,
  `ALTER TABLE "infrastructure_layer_uploads" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;`,
  `ALTER TABLE "infrastructure_layer_uploads" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3);`,
  `
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'infrastructure_layer_uploads_ownerTenantId_fkey'
    ) THEN
      ALTER TABLE "infrastructure_layer_uploads"
      ADD CONSTRAINT "infrastructure_layer_uploads_ownerTenantId_fkey"
      FOREIGN KEY ("ownerTenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
  END $$;
  `,
  `
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'infrastructure_layer_uploads_uploadedById_fkey'
    ) THEN
      ALTER TABLE "infrastructure_layer_uploads"
      ADD CONSTRAINT "infrastructure_layer_uploads_uploadedById_fkey"
      FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END $$;
  `,
  `
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'infrastructure_layer_uploads_finalLayerId_fkey'
    ) THEN
      ALTER TABLE "infrastructure_layer_uploads"
      ADD CONSTRAINT "infrastructure_layer_uploads_finalLayerId_fkey"
      FOREIGN KEY ("finalLayerId") REFERENCES "infrastructure_layers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
  END $$;
  `,
  `CREATE UNIQUE INDEX IF NOT EXISTS "infrastructure_layer_uploads_finalLayerId_key" ON "infrastructure_layer_uploads"("finalLayerId");`,
  `CREATE INDEX IF NOT EXISTS "infrastructure_layer_uploads_code_status_uploadedAt_idx" ON "infrastructure_layer_uploads"("code", "status", "uploadedAt");`,
  `CREATE INDEX IF NOT EXISTS "infrastructure_layer_uploads_ownerTenantId_uploadedAt_idx" ON "infrastructure_layer_uploads"("ownerTenantId", "uploadedAt");`,
  `CREATE INDEX IF NOT EXISTS "infrastructure_layer_uploads_uploadedById_uploadedAt_idx" ON "infrastructure_layer_uploads"("uploadedById", "uploadedAt");`,
  `
  CREATE TABLE IF NOT EXISTS "infrastructure_layer_upload_files" (
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
    CONSTRAINT "infrastructure_layer_upload_files_pkey" PRIMARY KEY ("id")
  );
  `,
  `
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'infrastructure_layer_upload_files_uploadId_fkey'
    ) THEN
      ALTER TABLE "infrastructure_layer_upload_files"
      ADD CONSTRAINT "infrastructure_layer_upload_files_uploadId_fkey"
      FOREIGN KEY ("uploadId") REFERENCES "infrastructure_layer_uploads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END $$;
  `,
  `CREATE INDEX IF NOT EXISTS "infrastructure_layer_upload_files_uploadId_role_idx" ON "infrastructure_layer_upload_files"("uploadId", "role");`,
  `
  CREATE TABLE IF NOT EXISTS "infrastructure_layer_upload_tenant_access" (
    "uploadId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "infrastructure_layer_upload_tenant_access_pkey" PRIMARY KEY ("uploadId", "tenantId")
  );
  `,
  `
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'infrastructure_layer_upload_tenant_access_uploadId_fkey'
    ) THEN
      ALTER TABLE "infrastructure_layer_upload_tenant_access"
      ADD CONSTRAINT "infrastructure_layer_upload_tenant_access_uploadId_fkey"
      FOREIGN KEY ("uploadId") REFERENCES "infrastructure_layer_uploads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END $$;
  `,
  `
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'infrastructure_layer_upload_tenant_access_tenantId_fkey'
    ) THEN
      ALTER TABLE "infrastructure_layer_upload_tenant_access"
      ADD CONSTRAINT "infrastructure_layer_upload_tenant_access_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END $$;
  `,
  `CREATE INDEX IF NOT EXISTS "infrastructure_layer_upload_tenant_access_tenantId_createdAt_idx" ON "infrastructure_layer_upload_tenant_access"("tenantId", "createdAt");`,
];

let ensureInfrastructureLayerSchemaPromise: Promise<void> | null = null;
let infrastructureLayerSchemaEnsured = false;

export async function ensureInfrastructureLayerSchema() {
  if (infrastructureLayerSchemaEnsured) return;
  if (ensureInfrastructureLayerSchemaPromise) {
    await ensureInfrastructureLayerSchemaPromise;
    return;
  }

  ensureInfrastructureLayerSchemaPromise = (async () => {
    for (const statement of INFRASTRUCTURE_LAYER_SCHEMA_STATEMENTS) {
      await prisma.$executeRawUnsafe(statement);
    }
    infrastructureLayerSchemaEnsured = true;
  })();

  try {
    await ensureInfrastructureLayerSchemaPromise;
  } finally {
    ensureInfrastructureLayerSchemaPromise = null;
  }
}
