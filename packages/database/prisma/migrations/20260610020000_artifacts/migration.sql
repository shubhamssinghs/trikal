-- Generic generated artifacts (styled table / slide deck / spreadsheet), embeddable like charts.
CREATE TABLE "artifacts" (
    "id" TEXT NOT NULL,
    "projectId" TEXT,
    "organizationId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "spec" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "artifacts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "artifacts_projectId_idx" ON "artifacts"("projectId");
ALTER TABLE "artifacts" ADD CONSTRAINT "artifacts_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
