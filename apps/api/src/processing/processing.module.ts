import { Module } from "@nestjs/common";
import { ProcessingService } from "./processing.service";
import { KnowledgeModule } from "../knowledge/knowledge.module";
import { AiModule } from "../ai/ai.module";
import { BriefingModule } from "../briefing/briefing.module";

/**
 * Auto-processing pipeline shared by manual upload and Granola sync.
 * Imports the three services a fresh transcript needs to run end to end.
 */
@Module({
  imports: [KnowledgeModule, AiModule, BriefingModule],
  providers: [ProcessingService],
  exports: [ProcessingService],
})
export class ProcessingModule {}
