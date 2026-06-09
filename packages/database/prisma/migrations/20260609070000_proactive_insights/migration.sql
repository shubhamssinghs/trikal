-- Proactive, always-on alerts the system raises about a project without being asked.
CREATE TABLE "proactive_insights" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "title" TEXT NOT NULL,
    "detail" TEXT,
    "suggestedAction" TEXT,
    "dedupeKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proactive_insights_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "proactive_insights_projectId_dedupeKey_key" ON "proactive_insights"("projectId", "dedupeKey");
CREATE INDEX "proactive_insights_organizationId_status_idx" ON "proactive_insights"("organizationId", "status");

ALTER TABLE "proactive_insights" ADD CONSTRAINT "proactive_insights_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
