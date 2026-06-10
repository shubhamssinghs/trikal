-- Tavily web search (via MCP) settings on the org's AppSettings.
ALTER TABLE "app_settings" ADD COLUMN "tavilyApiKey" TEXT;
ALTER TABLE "app_settings" ADD COLUMN "webSearchEnabled" BOOLEAN NOT NULL DEFAULT false;
