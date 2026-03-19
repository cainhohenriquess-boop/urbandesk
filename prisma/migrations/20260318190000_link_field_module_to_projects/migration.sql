ALTER TABLE "project_inspections"
ADD COLUMN IF NOT EXISTS "assetId" TEXT,
ADD COLUMN IF NOT EXISTS "technicalArea" "ProjectTechnicalArea",
ADD COLUMN IF NOT EXISTS "technicalObjectType" TEXT;

ALTER TABLE "project_issues"
ADD COLUMN IF NOT EXISTS "technicalArea" "ProjectTechnicalArea",
ADD COLUMN IF NOT EXISTS "technicalObjectType" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'project_inspections_assetId_fkey'
  ) THEN
    ALTER TABLE "project_inspections"
    ADD CONSTRAINT "project_inspections_assetId_fkey"
    FOREIGN KEY ("assetId") REFERENCES "assets"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "project_inspections_assetId_idx"
  ON "project_inspections"("assetId");

CREATE INDEX IF NOT EXISTS "project_inspections_technicalArea_idx"
  ON "project_inspections"("technicalArea");

CREATE INDEX IF NOT EXISTS "project_inspections_projectId_technicalArea_idx"
  ON "project_inspections"("projectId", "technicalArea");

CREATE INDEX IF NOT EXISTS "project_issues_technicalArea_idx"
  ON "project_issues"("technicalArea");

CREATE INDEX IF NOT EXISTS "project_issues_projectId_technicalArea_idx"
  ON "project_issues"("projectId", "technicalArea");
