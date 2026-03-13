-- Expand Project to support professional public urban management
-- Safe migration strategy:
-- 1. Add new enums and columns without dropping legacy fields
-- 2. Backfill equivalent values from the legacy model
-- 3. Add indexes and foreign keys after the new columns exist

CREATE TYPE "ProjectType" AS ENUM (
  'OBRA',
  'SERVICO_ENGENHARIA',
  'MANUTENCAO',
  'ESTUDO_PROJETO',
  'FISCALIZACAO',
  'LICITACAO',
  'PLANO_SETORIAL',
  'REGULARIZACAO'
);

CREATE TYPE "ProjectPriority" AS ENUM (
  'BAIXA',
  'MEDIA',
  'ALTA',
  'URGENTE'
);

CREATE TYPE "ProjectCriticality" AS ENUM (
  'BAIXA',
  'MEDIA',
  'ALTA',
  'CRITICA'
);

CREATE TYPE "ProjectOperationalStatus" AS ENUM (
  'CADASTRADO',
  'EM_ESTUDO',
  'EM_LICITACAO',
  'CONTRATADO',
  'EM_EXECUCAO',
  'EM_MEDICAO',
  'PARALISADO',
  'EM_RECEBIMENTO',
  'ENCERRADO',
  'CANCELADO'
);

CREATE TYPE "ProjectVisibility" AS ENUM (
  'INTERNO',
  'PUBLICO_RESUMIDO',
  'PUBLICO_INTEGRAL'
);

CREATE TYPE "ProjectTechnicalArea" AS ENUM (
  'DRENAGEM',
  'PAVIMENTACAO',
  'ILUMINACAO',
  'ARBORIZACAO',
  'SINALIZACAO',
  'FISCALIZACAO',
  'MOBILIDADE',
  'SANEAMENTO',
  'EDIFICACOES',
  'ZELADORIA'
);

ALTER TABLE "projects"
ADD COLUMN "code" TEXT,
ADD COLUMN "projectType" "ProjectType",
ADD COLUMN "responsibleDepartment" TEXT,
ADD COLUMN "responsibleArea" TEXT,
ADD COLUMN "technicalAreas" "ProjectTechnicalArea"[] NOT NULL DEFAULT ARRAY[]::"ProjectTechnicalArea"[],
ADD COLUMN "neighborhood" TEXT,
ADD COLUMN "district" TEXT,
ADD COLUMN "region" TEXT,
ADD COLUMN "priority" "ProjectPriority" NOT NULL DEFAULT 'MEDIA',
ADD COLUMN "criticality" "ProjectCriticality" NOT NULL DEFAULT 'MEDIA',
ADD COLUMN "operationalStatus" "ProjectOperationalStatus" NOT NULL DEFAULT 'CADASTRADO',
ADD COLUMN "publicVisibility" "ProjectVisibility" NOT NULL DEFAULT 'INTERNO',
ADD COLUMN "estimatedBudget" DECIMAL(15, 2),
ADD COLUMN "contractedBudget" DECIMAL(15, 2),
ADD COLUMN "measuredBudget" DECIMAL(15, 2),
ADD COLUMN "paidBudget" DECIMAL(15, 2),
ADD COLUMN "plannedStartDate" TIMESTAMP(3),
ADD COLUMN "plannedEndDate" TIMESTAMP(3),
ADD COLUMN "actualStartDate" TIMESTAMP(3),
ADD COLUMN "actualEndDate" TIMESTAMP(3),
ADD COLUMN "physicalProgressPct" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "financialProgressPct" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "managerId" TEXT,
ADD COLUMN "inspectorId" TEXT,
ADD COLUMN "contractorName" TEXT,
ADD COLUMN "address" TEXT,
ADD COLUMN "referencePoint" TEXT,
ADD COLUMN "procurementProcess" TEXT,
ADD COLUMN "procurementModality" TEXT,
ADD COLUMN "contractNumber" TEXT,
ADD COLUMN "metadata" JSONB NOT NULL DEFAULT '{}';

UPDATE "projects"
SET "estimatedBudget" = "budget"
WHERE "budget" IS NOT NULL
  AND "estimatedBudget" IS NULL;

UPDATE "projects"
SET "plannedStartDate" = "startDate"
WHERE "startDate" IS NOT NULL
  AND "plannedStartDate" IS NULL;

UPDATE "projects"
SET "plannedEndDate" = "endDate"
WHERE "endDate" IS NOT NULL
  AND "plannedEndDate" IS NULL;

UPDATE "projects"
SET "physicalProgressPct" = "completionPct"
WHERE "completionPct" IS NOT NULL
  AND "physicalProgressPct" = 0;

ALTER TABLE "projects"
ADD CONSTRAINT "projects_managerId_fkey"
FOREIGN KEY ("managerId") REFERENCES "users"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

ALTER TABLE "projects"
ADD CONSTRAINT "projects_inspectorId_fkey"
FOREIGN KEY ("inspectorId") REFERENCES "users"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

CREATE UNIQUE INDEX "projects_tenantId_code_key" ON "projects"("tenantId", "code");
CREATE INDEX "projects_tenantId_projectType_idx" ON "projects"("tenantId", "projectType");
CREATE INDEX "projects_tenantId_operationalStatus_idx" ON "projects"("tenantId", "operationalStatus");
CREATE INDEX "projects_tenantId_publicVisibility_idx" ON "projects"("tenantId", "publicVisibility");
CREATE INDEX "projects_managerId_idx" ON "projects"("managerId");
CREATE INDEX "projects_inspectorId_idx" ON "projects"("inspectorId");
