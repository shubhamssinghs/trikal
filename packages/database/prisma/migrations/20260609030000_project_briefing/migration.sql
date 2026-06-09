-- Cached AI-generated project briefing (one per project).
CREATE TABLE "project_briefings" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "data" JSONB NOT NULL,
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "project_briefings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "project_briefings_projectId_key" ON "project_briefings"("projectId");
ALTER TABLE "project_briefings" ADD CONSTRAINT "project_briefings_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
