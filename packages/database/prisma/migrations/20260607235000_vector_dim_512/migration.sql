-- voyage-3-lite outputs 512 dims (correcting from 1024)
ALTER TABLE "knowledge_chunks" DROP COLUMN IF EXISTS "embedding";
ALTER TABLE "knowledge_chunks" ADD COLUMN "embedding" vector(512);

DROP INDEX IF EXISTS "knowledge_chunks_embedding_idx";
CREATE INDEX "knowledge_chunks_embedding_idx"
  ON "knowledge_chunks" USING ivfflat ("embedding" vector_cosine_ops)
  WITH (lists = 100);
