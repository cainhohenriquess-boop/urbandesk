DO $$
BEGIN
  ALTER TYPE "ProjectDocumentType" ADD VALUE IF NOT EXISTS 'EDITAL';
  ALTER TYPE "ProjectDocumentType" ADD VALUE IF NOT EXISTS 'ORDEM_SERVICO';
  ALTER TYPE "ProjectDocumentType" ADD VALUE IF NOT EXISTS 'RELATORIO_FOTOGRAFICO';
  ALTER TYPE "ProjectDocumentType" ADD VALUE IF NOT EXISTS 'LAUDO';
END $$;

ALTER TABLE "project_documents"
  ADD COLUMN IF NOT EXISTS "technicalArea" "ProjectTechnicalArea";

CREATE INDEX IF NOT EXISTS "project_documents_projectId_technicalArea_documentDate_idx"
  ON "project_documents"("projectId", "technicalArea", "documentDate");