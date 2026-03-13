-- Add governance entities for project management
-- Strategy:
-- 1. Create enums used by governance tables
-- 2. Create new tables linked to tenants and projects
-- 3. Add foreign keys and indexes for multi-tenant and project-scoped access
-- 4. Add lightweight consistency checks for sequences, progress values and comment scope

CREATE TYPE "ProjectContractStatus" AS ENUM (
  'MINUTA',
  'VIGENTE',
  'ADITIVADO',
  'SUSPENSO',
  'ENCERRADO',
  'RESCINDIDO'
);

CREATE TYPE "ProjectFundingSourceType" AS ENUM (
  'TESOURO',
  'CONVENIO',
  'OPERACAO_CREDITO',
  'FINANCIAMENTO',
  'EMENDA',
  'FUNDO',
  'PARCERIA',
  'OUTRO'
);

CREATE TYPE "ProjectFundingSourceStatus" AS ENUM (
  'PLANEJADA',
  'ASSEGURADA',
  'LIBERADA',
  'BLOQUEADA',
  'ENCERRADA'
);

CREATE TYPE "ProjectPhaseStatus" AS ENUM (
  'PLANEJADA',
  'PRONTA',
  'EM_EXECUCAO',
  'BLOQUEADA',
  'CONCLUIDA',
  'CANCELADA'
);

CREATE TYPE "ProjectMilestoneStatus" AS ENUM (
  'PLANEJADO',
  'EM_RISCO',
  'CONCLUIDO',
  'ATRASADO',
  'CANCELADO'
);

CREATE TYPE "ProjectDocumentType" AS ENUM (
  'TERMO_REFERENCIA',
  'PROJETO_BASICO',
  'PROJETO_EXECUTIVO',
  'MEMORIAL',
  'ORCAMENTO',
  'CRONOGRAMA',
  'LICITACAO',
  'CONTRATO',
  'ADITIVO',
  'MEDICAO',
  'RELATORIO',
  'LICENCA',
  'MAPA',
  'FOTO',
  'OUTRO'
);

CREATE TYPE "ProjectMeasurementStatus" AS ENUM (
  'RASCUNHO',
  'SUBMETIDA',
  'APROVADA',
  'REJEITADA',
  'PAGA'
);

CREATE TYPE "ProjectInspectionType" AS ENUM (
  'ROTINA',
  'MEDICAO',
  'QUALIDADE',
  'SEGURANCA',
  'RECEBIMENTO',
  'EXTRAORDINARIA'
);

CREATE TYPE "ProjectInspectionStatus" AS ENUM (
  'AGENDADA',
  'REALIZADA',
  'CANCELADA'
);

CREATE TYPE "ProjectIssueType" AS ENUM (
  'BLOQUEIO',
  'NAO_CONFORMIDADE',
  'SEGURANCA',
  'AMBIENTAL',
  'PRAZO',
  'FINANCEIRO',
  'DOCUMENTAL',
  'COMUNITARIO',
  'TECNICO',
  'OUTRO'
);

CREATE TYPE "ProjectIssueStatus" AS ENUM (
  'ABERTA',
  'EM_TRATATIVA',
  'RESOLVIDA',
  'FECHADA',
  'CANCELADA'
);

CREATE TYPE "ProjectRiskCategory" AS ENUM (
  'PRAZO',
  'FINANCEIRO',
  'TECNICO',
  'AMBIENTAL',
  'JURIDICO',
  'OPERACIONAL',
  'SOCIAL',
  'SEGURANCA',
  'CLIMATICO',
  'OUTRO'
);

CREATE TYPE "ProjectRiskStatus" AS ENUM (
  'IDENTIFICADO',
  'MONITORANDO',
  'MITIGADO',
  'MATERIALIZADO',
  'ENCERRADO'
);

CREATE TYPE "ProjectRiskProbability" AS ENUM (
  'BAIXA',
  'MEDIA',
  'ALTA'
);

CREATE TYPE "ProjectRiskImpact" AS ENUM (
  'BAIXO',
  'MEDIO',
  'ALTO',
  'CRITICO'
);

CREATE TABLE "project_contracts" (
  "id" TEXT NOT NULL,
  "contractNumber" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "contractorName" TEXT,
  "contractorTaxId" TEXT,
  "procurementProcess" TEXT,
  "procurementModality" TEXT,
  "signedAt" TIMESTAMP(3),
  "startDate" TIMESTAMP(3),
  "endDate" TIMESTAMP(3),
  "status" "ProjectContractStatus" NOT NULL DEFAULT 'MINUTA',
  "contractedAmount" DECIMAL(15, 2),
  "additiveAmount" DECIMAL(15, 2),
  "measuredAmount" DECIMAL(15, 2),
  "paidAmount" DECIMAL(15, 2),
  "notes" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "tenantId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,

  CONSTRAINT "project_contracts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "project_contracts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "project_contracts_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "project_funding_sources" (
  "id" TEXT NOT NULL,
  "sourceName" TEXT NOT NULL,
  "sourceType" "ProjectFundingSourceType" NOT NULL,
  "status" "ProjectFundingSourceStatus" NOT NULL DEFAULT 'PLANEJADA',
  "budgetCode" TEXT,
  "externalReference" TEXT,
  "plannedAmount" DECIMAL(15, 2),
  "committedAmount" DECIMAL(15, 2),
  "releasedAmount" DECIMAL(15, 2),
  "usedAmount" DECIMAL(15, 2),
  "startDate" TIMESTAMP(3),
  "endDate" TIMESTAMP(3),
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "tenantId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,

  CONSTRAINT "project_funding_sources_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "project_funding_sources_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "project_funding_sources_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "project_phases" (
  "id" TEXT NOT NULL,
  "code" TEXT,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "technicalArea" "ProjectTechnicalArea",
  "sequence" INTEGER NOT NULL,
  "status" "ProjectPhaseStatus" NOT NULL DEFAULT 'PLANEJADA',
  "plannedStartDate" TIMESTAMP(3),
  "plannedEndDate" TIMESTAMP(3),
  "actualStartDate" TIMESTAMP(3),
  "actualEndDate" TIMESTAMP(3),
  "physicalProgressPct" INTEGER NOT NULL DEFAULT 0,
  "financialProgressPct" INTEGER NOT NULL DEFAULT 0,
  "ownerId" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "tenantId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,

  CONSTRAINT "project_phases_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "project_phases_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "project_phases_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "project_phases_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "project_phases_sequence_check" CHECK ("sequence" > 0),
  CONSTRAINT "project_phases_physicalProgressPct_check" CHECK ("physicalProgressPct" BETWEEN 0 AND 100),
  CONSTRAINT "project_phases_financialProgressPct_check" CHECK ("financialProgressPct" BETWEEN 0 AND 100)
);

CREATE TABLE "project_milestones" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "status" "ProjectMilestoneStatus" NOT NULL DEFAULT 'PLANEJADO',
  "targetDate" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "responsibleUserId" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "tenantId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "phaseId" TEXT,

  CONSTRAINT "project_milestones_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "project_milestones_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "project_milestones_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "project_milestones_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "project_phases"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "project_milestones_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "project_measurements" (
  "id" TEXT NOT NULL,
  "measurementNumber" INTEGER NOT NULL,
  "referenceMonth" TIMESTAMP(3),
  "periodStart" TIMESTAMP(3),
  "periodEnd" TIMESTAMP(3),
  "measuredAt" TIMESTAMP(3),
  "status" "ProjectMeasurementStatus" NOT NULL DEFAULT 'RASCUNHO',
  "physicalProgressPct" INTEGER NOT NULL DEFAULT 0,
  "financialProgressPct" INTEGER NOT NULL DEFAULT 0,
  "measuredAmount" DECIMAL(15, 2),
  "approvedAmount" DECIMAL(15, 2),
  "paidAmount" DECIMAL(15, 2),
  "notes" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "tenantId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "phaseId" TEXT,
  "contractId" TEXT,
  "measuredById" TEXT,
  "approvedById" TEXT,

  CONSTRAINT "project_measurements_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "project_measurements_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "project_measurements_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "project_measurements_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "project_phases"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "project_measurements_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "project_contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "project_measurements_measuredById_fkey" FOREIGN KEY ("measuredById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "project_measurements_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "project_measurements_number_check" CHECK ("measurementNumber" > 0),
  CONSTRAINT "project_measurements_physicalProgressPct_check" CHECK ("physicalProgressPct" BETWEEN 0 AND 100),
  CONSTRAINT "project_measurements_financialProgressPct_check" CHECK ("financialProgressPct" BETWEEN 0 AND 100)
);

CREATE TABLE "project_inspections" (
  "id" TEXT NOT NULL,
  "inspectionType" "ProjectInspectionType" NOT NULL DEFAULT 'ROTINA',
  "status" "ProjectInspectionStatus" NOT NULL DEFAULT 'AGENDADA',
  "scheduledAt" TIMESTAMP(3),
  "occurredAt" TIMESTAMP(3),
  "location" TEXT,
  "summary" TEXT,
  "findings" TEXT,
  "recommendations" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "tenantId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "phaseId" TEXT,
  "measurementId" TEXT,
  "inspectorId" TEXT,

  CONSTRAINT "project_inspections_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "project_inspections_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "project_inspections_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "project_inspections_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "project_phases"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "project_inspections_measurementId_fkey" FOREIGN KEY ("measurementId") REFERENCES "project_measurements"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "project_inspections_inspectorId_fkey" FOREIGN KEY ("inspectorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "project_risks" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "category" "ProjectRiskCategory" NOT NULL DEFAULT 'OUTRO',
  "status" "ProjectRiskStatus" NOT NULL DEFAULT 'IDENTIFICADO',
  "probability" "ProjectRiskProbability" NOT NULL DEFAULT 'MEDIA',
  "impact" "ProjectRiskImpact" NOT NULL DEFAULT 'MEDIO',
  "mitigationPlan" TEXT,
  "contingencyPlan" TEXT,
  "reviewDate" TIMESTAMP(3),
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "tenantId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "phaseId" TEXT,
  "ownerId" TEXT,

  CONSTRAINT "project_risks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "project_risks_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "project_risks_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "project_risks_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "project_phases"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "project_risks_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "project_issues" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "issueType" "ProjectIssueType" NOT NULL DEFAULT 'OUTRO',
  "status" "ProjectIssueStatus" NOT NULL DEFAULT 'ABERTA',
  "priority" "ProjectPriority" NOT NULL DEFAULT 'MEDIA',
  "dueDate" TIMESTAMP(3),
  "resolvedAt" TIMESTAMP(3),
  "resolutionNotes" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "tenantId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "phaseId" TEXT,
  "inspectionId" TEXT,
  "assetId" TEXT,
  "reportedById" TEXT,
  "assignedToId" TEXT,

  CONSTRAINT "project_issues_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "project_issues_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "project_issues_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "project_issues_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "project_phases"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "project_issues_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "project_inspections"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "project_issues_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "project_issues_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "project_issues_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "project_documents" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "documentType" "ProjectDocumentType" NOT NULL DEFAULT 'OUTRO',
  "fileName" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "fileUrl" TEXT,
  "mimeType" TEXT,
  "fileSize" INTEGER,
  "documentDate" TIMESTAMP(3),
  "isPublic" BOOLEAN NOT NULL DEFAULT false,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "tenantId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "phaseId" TEXT,
  "contractId" TEXT,
  "measurementId" TEXT,
  "inspectionId" TEXT,
  "uploadedById" TEXT,

  CONSTRAINT "project_documents_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "project_documents_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "project_documents_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "project_documents_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "project_phases"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "project_documents_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "project_contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "project_documents_measurementId_fkey" FOREIGN KEY ("measurementId") REFERENCES "project_measurements"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "project_documents_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "project_inspections"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "project_documents_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "project_comments" (
  "id" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "isInternal" BOOLEAN NOT NULL DEFAULT true,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "tenantId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "authorId" TEXT,
  "phaseId" TEXT,
  "contractId" TEXT,
  "milestoneId" TEXT,
  "measurementId" TEXT,
  "inspectionId" TEXT,
  "issueId" TEXT,
  "riskId" TEXT,

  CONSTRAINT "project_comments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "project_comments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "project_comments_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "project_comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "project_comments_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "project_phases"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "project_comments_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "project_contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "project_comments_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "project_milestones"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "project_comments_measurementId_fkey" FOREIGN KEY ("measurementId") REFERENCES "project_measurements"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "project_comments_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "project_inspections"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "project_comments_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "project_issues"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "project_comments_riskId_fkey" FOREIGN KEY ("riskId") REFERENCES "project_risks"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "project_comments_scope_check" CHECK (
    (CASE WHEN "phaseId" IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN "contractId" IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN "milestoneId" IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN "measurementId" IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN "inspectionId" IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN "issueId" IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN "riskId" IS NOT NULL THEN 1 ELSE 0 END) <= 1
  )
);

CREATE UNIQUE INDEX "project_contracts_tenantId_contractNumber_key" ON "project_contracts"("tenantId", "contractNumber");
CREATE INDEX "project_contracts_tenantId_projectId_idx" ON "project_contracts"("tenantId", "projectId");
CREATE INDEX "project_contracts_projectId_status_idx" ON "project_contracts"("projectId", "status");

CREATE INDEX "project_funding_sources_tenantId_projectId_idx" ON "project_funding_sources"("tenantId", "projectId");
CREATE INDEX "project_funding_sources_projectId_sourceType_idx" ON "project_funding_sources"("projectId", "sourceType");
CREATE INDEX "project_funding_sources_projectId_status_idx" ON "project_funding_sources"("projectId", "status");

CREATE UNIQUE INDEX "project_phases_projectId_sequence_key" ON "project_phases"("projectId", "sequence");
CREATE UNIQUE INDEX "project_phases_projectId_code_key" ON "project_phases"("projectId", "code");
CREATE INDEX "project_phases_tenantId_projectId_idx" ON "project_phases"("tenantId", "projectId");
CREATE INDEX "project_phases_projectId_status_idx" ON "project_phases"("projectId", "status");
CREATE INDEX "project_phases_ownerId_idx" ON "project_phases"("ownerId");

CREATE INDEX "project_milestones_tenantId_projectId_idx" ON "project_milestones"("tenantId", "projectId");
CREATE INDEX "project_milestones_projectId_status_idx" ON "project_milestones"("projectId", "status");
CREATE INDEX "project_milestones_phaseId_targetDate_idx" ON "project_milestones"("phaseId", "targetDate");
CREATE INDEX "project_milestones_responsibleUserId_idx" ON "project_milestones"("responsibleUserId");

CREATE UNIQUE INDEX "project_measurements_projectId_measurementNumber_key" ON "project_measurements"("projectId", "measurementNumber");
CREATE INDEX "project_measurements_tenantId_projectId_idx" ON "project_measurements"("tenantId", "projectId");
CREATE INDEX "project_measurements_projectId_status_idx" ON "project_measurements"("projectId", "status");
CREATE INDEX "project_measurements_contractId_idx" ON "project_measurements"("contractId");
CREATE INDEX "project_measurements_phaseId_idx" ON "project_measurements"("phaseId");
CREATE INDEX "project_measurements_measuredById_idx" ON "project_measurements"("measuredById");
CREATE INDEX "project_measurements_approvedById_idx" ON "project_measurements"("approvedById");

CREATE INDEX "project_inspections_tenantId_projectId_idx" ON "project_inspections"("tenantId", "projectId");
CREATE INDEX "project_inspections_projectId_status_idx" ON "project_inspections"("projectId", "status");
CREATE INDEX "project_inspections_projectId_inspectionType_idx" ON "project_inspections"("projectId", "inspectionType");
CREATE INDEX "project_inspections_phaseId_idx" ON "project_inspections"("phaseId");
CREATE INDEX "project_inspections_measurementId_idx" ON "project_inspections"("measurementId");
CREATE INDEX "project_inspections_inspectorId_occurredAt_idx" ON "project_inspections"("inspectorId", "occurredAt");

CREATE INDEX "project_issues_tenantId_projectId_idx" ON "project_issues"("tenantId", "projectId");
CREATE INDEX "project_issues_projectId_status_idx" ON "project_issues"("projectId", "status");
CREATE INDEX "project_issues_projectId_priority_idx" ON "project_issues"("projectId", "priority");
CREATE INDEX "project_issues_phaseId_idx" ON "project_issues"("phaseId");
CREATE INDEX "project_issues_inspectionId_idx" ON "project_issues"("inspectionId");
CREATE INDEX "project_issues_assetId_idx" ON "project_issues"("assetId");
CREATE INDEX "project_issues_reportedById_idx" ON "project_issues"("reportedById");
CREATE INDEX "project_issues_assignedToId_idx" ON "project_issues"("assignedToId");

CREATE INDEX "project_documents_tenantId_projectId_idx" ON "project_documents"("tenantId", "projectId");
CREATE INDEX "project_documents_projectId_documentType_idx" ON "project_documents"("projectId", "documentType");
CREATE INDEX "project_documents_tenantId_isPublic_idx" ON "project_documents"("tenantId", "isPublic");
CREATE INDEX "project_documents_phaseId_idx" ON "project_documents"("phaseId");
CREATE INDEX "project_documents_contractId_idx" ON "project_documents"("contractId");
CREATE INDEX "project_documents_measurementId_idx" ON "project_documents"("measurementId");
CREATE INDEX "project_documents_inspectionId_idx" ON "project_documents"("inspectionId");
CREATE INDEX "project_documents_uploadedById_idx" ON "project_documents"("uploadedById");

CREATE INDEX "project_risks_tenantId_projectId_idx" ON "project_risks"("tenantId", "projectId");
CREATE INDEX "project_risks_projectId_status_idx" ON "project_risks"("projectId", "status");
CREATE INDEX "project_risks_projectId_category_idx" ON "project_risks"("projectId", "category");
CREATE INDEX "project_risks_phaseId_idx" ON "project_risks"("phaseId");
CREATE INDEX "project_risks_ownerId_idx" ON "project_risks"("ownerId");

CREATE INDEX "project_comments_tenantId_projectId_createdAt_idx" ON "project_comments"("tenantId", "projectId", "createdAt");
CREATE INDEX "project_comments_authorId_createdAt_idx" ON "project_comments"("authorId", "createdAt");
CREATE INDEX "project_comments_phaseId_idx" ON "project_comments"("phaseId");
CREATE INDEX "project_comments_contractId_idx" ON "project_comments"("contractId");
CREATE INDEX "project_comments_milestoneId_idx" ON "project_comments"("milestoneId");
CREATE INDEX "project_comments_measurementId_idx" ON "project_comments"("measurementId");
CREATE INDEX "project_comments_inspectionId_idx" ON "project_comments"("inspectionId");
CREATE INDEX "project_comments_issueId_idx" ON "project_comments"("issueId");
CREATE INDEX "project_comments_riskId_idx" ON "project_comments"("riskId");
