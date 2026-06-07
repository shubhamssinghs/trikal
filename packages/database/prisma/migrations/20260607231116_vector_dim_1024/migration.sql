-- Change embedding dimension from 1536 to 1024 (Voyage AI voyage-3-lite)
ALTER TABLE "knowledge_chunks" DROP COLUMN IF EXISTS "embedding";
ALTER TABLE "knowledge_chunks" ADD COLUMN "embedding" vector(1024);

-- Index for cosine similarity search scoped per knowledge item
CREATE INDEX IF NOT EXISTS "knowledge_chunks_embedding_idx"
  ON "knowledge_chunks" USING ivfflat ("embedding" vector_cosine_ops)
  WITH (lists = 100);
