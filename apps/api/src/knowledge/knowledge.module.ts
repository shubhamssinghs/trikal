import { Module } from "@nestjs/common";
import { KnowledgeController } from "./knowledge.controller";
import { KnowledgeService } from "./knowledge.service";
import { ChunkingService } from "./chunking.service";

@Module({
  controllers: [KnowledgeController],
  providers: [KnowledgeService, ChunkingService],
  exports: [KnowledgeService, ChunkingService],
})
export class KnowledgeModule {}
