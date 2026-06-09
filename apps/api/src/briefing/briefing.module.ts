import { Module } from "@nestjs/common";
import { BriefingController } from "./briefing.controller";
import { BriefingService } from "./briefing.service";
import { AiModule } from "../ai/ai.module";
import { KnowledgeModule } from "../knowledge/knowledge.module";

@Module({
  imports: [AiModule, KnowledgeModule],
  controllers: [BriefingController],
  providers: [BriefingService],
  exports: [BriefingService],
})
export class BriefingModule {}
