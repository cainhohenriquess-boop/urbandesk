ALTER TABLE "project_issues"
ADD COLUMN IF NOT EXISTS "severity" "ProjectCriticality" NOT NULL DEFAULT 'MEDIA';

ALTER TABLE "project_risks"
ADD COLUMN IF NOT EXISTS "assetId" TEXT,
ADD COLUMN IF NOT EXISTS "technicalArea" "ProjectTechnicalArea",
ADD COLUMN IF NOT EXISTS "technicalObjectType" TEXT;

CREATE INDEX IF NOT EXISTS "project_issues_projectId_severity_idx"
ON "project_issues"("projectId", "severity");

CREATE INDEX IF NOT EXISTS "project_risks_assetId_idx"
ON "project_risks"("assetId");

CREATE INDEX IF NOT EXISTS "project_risks_technicalArea_idx"
ON "project_risks"("technicalArea");

CREATE INDEX IF NOT EXISTS "project_risks_projectId_technicalArea_idx"
ON "project_risks"("projectId", "technicalArea");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'project_risks_assetId_fkey'
  ) THEN
    ALTER TABLE "project_risks"
    ADD CONSTRAINT "project_risks_assetId_fkey"
    FOREIGN KEY ("assetId") REFERENCES "assets"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
