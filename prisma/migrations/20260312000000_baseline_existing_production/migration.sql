-- Baseline for the pre-migration production schema.
-- This migration is meant to bootstrap fresh databases and to baseline
-- existing production environments that were created without Prisma Migrate.

CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TYPE "TenantStatus" AS ENUM ('TRIAL', 'ATIVO', 'INADIMPLENTE', 'CANCELADO');
CREATE TYPE "TenantPlan" AS ENUM ('STARTER', 'PRO', 'ENTERPRISE');
CREATE TYPE "UserRole" AS ENUM ('SUPERADMIN', 'SECRETARIO', 'ENGENHEIRO', 'CAMPO');
CREATE TYPE "ProjectStatus" AS ENUM ('PLANEJADO', 'EM_ANDAMENTO', 'PARALISADO', 'CONCLUIDO', 'CANCELADO');
CREATE TYPE "AssetType" AS ENUM ('PONTO', 'TRECHO', 'AREA');
CREATE TYPE "InvoiceStatus" AS ENUM ('PENDENTE', 'PAGO', 'VENCIDO', 'CANCELADO');

CREATE TABLE "tenants" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "cnpj" TEXT NOT NULL,
  "state" CHAR(2) NOT NULL,
  "plan" "TenantPlan" NOT NULL DEFAULT 'STARTER',
  "status" "TenantStatus" NOT NULL DEFAULT 'TRIAL',
  "mrr" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "trialEndsAt" TIMESTAMP(3),
  "logoUrl" TEXT,
  "mapLat" DOUBLE PRECISION,
  "mapLng" DOUBLE PRECISION,
  "mapZoom" DOUBLE PRECISION DEFAULT 12,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");
CREATE UNIQUE INDEX "tenants_cnpj_key" ON "tenants"("cnpj");

CREATE TABLE "base_layers" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "geoJsonData" JSONB NOT NULL,
  "tenantId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "base_layers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "base_layers_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "base_layers_tenantId_idx" ON "base_layers"("tenantId");

CREATE TABLE "users" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" "UserRole" NOT NULL DEFAULT 'CAMPO',
  "avatarUrl" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "tenantId" TEXT,

  CONSTRAINT "users_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "users_tenantId_idx" ON "users"("tenantId");

CREATE TABLE "projects" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "status" "ProjectStatus" NOT NULL DEFAULT 'PLANEJADO',
  "budget" DECIMAL(15, 2),
  "startDate" TIMESTAMP(3),
  "endDate" TIMESTAMP(3),
  "completionPct" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "tenantId" TEXT NOT NULL,
  "geomWkt" TEXT,

  CONSTRAINT "projects_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "projects_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "projects_tenantId_idx" ON "projects"("tenantId");
CREATE INDEX "projects_status_idx" ON "projects"("status");

CREATE TABLE "assets" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "AssetType" NOT NULL,
  "description" TEXT,
  "photos" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "attributes" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "geomWkt" TEXT,
  "srid" INTEGER NOT NULL DEFAULT 4326,
  "tenantId" TEXT NOT NULL,
  "projectId" TEXT,

  CONSTRAINT "assets_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "assets_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "assets_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "assets_tenantId_idx" ON "assets"("tenantId");
CREATE INDEX "assets_projectId_idx" ON "assets"("projectId");
CREATE INDEX "assets_type_idx" ON "assets"("type");

CREATE TABLE "asset_logs" (
  "id" TEXT NOT NULL,
  "note" TEXT NOT NULL,
  "photos" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "lat" DOUBLE PRECISION,
  "lng" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "assetId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,

  CONSTRAINT "asset_logs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "asset_logs_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "asset_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "asset_logs_assetId_idx" ON "asset_logs"("assetId");

CREATE TABLE "invoices" (
  "id" TEXT NOT NULL,
  "amount" DECIMAL(12, 2) NOT NULL,
  "status" "InvoiceStatus" NOT NULL DEFAULT 'PENDENTE',
  "dueDate" TIMESTAMP(3) NOT NULL,
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "tenantId" TEXT NOT NULL,

  CONSTRAINT "invoices_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "invoices_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "invoices_tenantId_idx" ON "invoices"("tenantId");
CREATE INDEX "invoices_status_idx" ON "invoices"("status");

CREATE TABLE "user_sessions" (
  "id" TEXT NOT NULL,
  "ip" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userId" TEXT NOT NULL,

  CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "user_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "user_sessions_userId_idx" ON "user_sessions"("userId");

CREATE TABLE "audit_logs" (
  "id" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "entityType" TEXT,
  "entityId" TEXT,
  "userId" TEXT,
  "userName" TEXT,
  "userEmail" TEXT,
  "userRole" TEXT,
  "tenantId" TEXT,
  "ip" TEXT,
  "userAgent" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "audit_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "audit_logs_tenantId_createdAt_idx" ON "audit_logs"("tenantId", "createdAt");
CREATE INDEX "audit_logs_userId_createdAt_idx" ON "audit_logs"("userId", "createdAt");
CREATE INDEX "audit_logs_action_createdAt_idx" ON "audit_logs"("action", "createdAt");
