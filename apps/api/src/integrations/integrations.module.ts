import { Module } from "@nestjs/common";
import { IntegrationsController } from "./integrations.controller";
import { IntegrationsService } from "./integrations.service";
import { IntegrationSyncService } from "./integration-sync.service";
import { KnowledgeModule } from "../knowledge/knowledge.module";

@Module({
  imports: [KnowledgeModule],
  controllers: [IntegrationsController],
  providers: [IntegrationsService, IntegrationSyncService],
  exports: [IntegrationsService, IntegrationSyncService],
})
export class IntegrationsModule {}
