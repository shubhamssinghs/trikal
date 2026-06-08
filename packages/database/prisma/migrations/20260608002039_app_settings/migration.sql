-- DropIndex
DROP INDEX "knowledge_chunks_embedding_idx";

-- CreateTable
CREATE TABLE "app_settings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "llmProvider" TEXT NOT NULL DEFAULT 'anthropic',
    "llmModel" TEXT NOT NULL DEFAULT 'claude-sonnet-4-6',
    "anthropicApiKey" TEXT,
    "openaiApiKey" TEXT,
    "voyageApiKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "app_settings_organizationId_key" ON "app_settings"("organizationId");

-- AddForeignKey
ALTER TABLE "app_settings" ADD CONSTRAINT "app_settings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
