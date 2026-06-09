-- Chat threads (conversations) + link agent runs to a conversation.

CREATE TABLE "conversations" (
  "id" TEXT NOT NULL,
  "projectId" TEXT,
  "organizationId" TEXT NOT NULL,
  "title" TEXT NOT NULL DEFAULT 'New chat',
  "summary" TEXT,
  "archived" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "conversations_projectId_idx" ON "conversations"("projectId");
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "agent_runs" ADD COLUMN "conversationId" TEXT;
CREATE INDEX "agent_runs_conversationId_idx" ON "agent_runs"("conversationId");
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_conversationId_fkey"
  FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
