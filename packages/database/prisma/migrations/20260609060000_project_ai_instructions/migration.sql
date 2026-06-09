-- Per-project custom instructions always given to the AI.
ALTER TABLE "projects" ADD COLUMN "aiInstructions" TEXT;
