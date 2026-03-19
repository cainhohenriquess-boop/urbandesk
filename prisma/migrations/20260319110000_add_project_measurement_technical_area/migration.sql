ALTER TABLE "project_measurements"
ADD COLUMN IF NOT EXISTS "technicalArea" "ProjectTechnicalArea";

CREATE INDEX IF NOT EXISTS "project_measurements_projectId_technicalArea_idx"
ON "project_measurements"("projectId", "technicalArea");
