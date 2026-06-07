import { Module } from "@nestjs/common";
import { KnowledgeController } from "./knowledge.controller";
import { KnowledgeService } from "./knowledge.service";
import { ChunkingService } from "./chunking.service";
import { EmbeddingService } from "./embedding.service";

@Module({
  controllers: [KnowledgeController],
  providers: [KnowledgeService, ChunkingService, EmbeddingService],
  exports: [KnowledgeService, ChunkingService, EmbeddingService],
})
export class KnowledgeModule {}
