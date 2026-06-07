import { Module } from "@nestjs/common";
import { AiService } from "./ai.service";
import { TranscriptAnalysisService } from "./transcript-analysis.service";
import { AiController } from "./ai.controller";
import { TranscriptsModule } from "../transcripts/transcripts.module";
import { KnowledgeModule } from "../knowledge/knowledge.module";

@Module({
  imports: [TranscriptsModule, KnowledgeModule],
  controllers: [AiController],
  providers: [AiService, TranscriptAnalysisService],
  exports: [AiService, TranscriptAnalysisService],
})
export class AiModule {}
