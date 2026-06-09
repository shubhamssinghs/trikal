-- Integrations: org-level connections + per-project links, and transcript provenance/dedupe.

ALTER TABLE "meeting_transcripts" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE "meeting_transcripts" ADD COLUMN "externalId" TEXT;
CREATE UNIQUE INDEX "meeting_transcripts_projectId_source_externalId_key"
  ON "meeting_transcripts"("projectId", "source", "externalId");

CREATE TABLE "integrations" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "credentials" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'connected',
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "integrations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "integrations_organizationId_provider_key" ON "integrations"("organizationId", "provider");

CREATE TABLE "project_integrations" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "integrationId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "scope" JSONB NOT NULL DEFAULT '{}',
  "lastSyncedAt" TIMESTAMP(3),
  "lastSyncStatus" TEXT,
  "lastSyncCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "project_integrations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "project_integrations_projectId_integrationId_key" ON "project_integrations"("projectId", "integrationId");
ALTER TABLE "project_integrations" ADD CONSTRAINT "project_integrations_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_integrations" ADD CONSTRAINT "project_integrations_integrationId_fkey"
  FOREIGN KEY ("integrationId") REFERENCES "integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
