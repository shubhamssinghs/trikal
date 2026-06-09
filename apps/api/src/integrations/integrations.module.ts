import { Module } from "@nestjs/common";
import { IntegrationsController } from "./integrations.controller";
import { IntegrationsService } from "./integrations.service";
import { IntegrationSyncService } from "./integration-sync.service";
import { CalendarService } from "./calendar.service";
import { KnowledgeModule } from "../knowledge/knowledge.module";
import { BriefingModule } from "../briefing/briefing.module";
import { ProcessingModule } from "../processing/processing.module";

@Module({
  imports: [KnowledgeModule, BriefingModule, ProcessingModule],
  controllers: [IntegrationsController],
  providers: [IntegrationsService, IntegrationSyncService, CalendarService],
  exports: [IntegrationsService, IntegrationSyncService, CalendarService],
})
export class IntegrationsModule {}
