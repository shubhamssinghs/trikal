-- AI Skills platform: skill registry + agent run traces.

CREATE TABLE "skills" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "instructions" TEXT,
  "kind" TEXT NOT NULL DEFAULT 'action',
  "handlerKey" TEXT,
  "inputSchema" JSONB NOT NULL,
  "composes" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "externalAction" BOOLEAN NOT NULL DEFAULT false,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "model" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "builtin" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "skills_slug_key" ON "skills"("slug");

CREATE TABLE "agent_runs" (
  "id" TEXT NOT NULL,
  "projectId" TEXT,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL DEFAULT 'user_dev',
  "surface" TEXT NOT NULL,
  "goal" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'running',
  "answer" TEXT,
  "model" TEXT,
  "tokensIn" INTEGER NOT NULL DEFAULT 0,
  "tokensOut" INTEGER NOT NULL DEFAULT 0,
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "agent_runs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "agent_runs_projectId_idx" ON "agent_runs"("projectId");
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "agent_steps" (
  "id" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "idx" INTEGER NOT NULL,
  "type" TEXT NOT NULL,
  "skillSlug" TEXT,
  "title" TEXT,
  "content" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "agent_steps_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "agent_steps_runId_idx" ON "agent_steps"("runId");
ALTER TABLE "agent_steps" ADD CONSTRAINT "agent_steps_runId_fkey"
  FOREIGN KEY ("runId") REFERENCES "agent_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
