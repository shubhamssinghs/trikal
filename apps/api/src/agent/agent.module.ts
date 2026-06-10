import { Module } from "@nestjs/common";
import { AgentController } from "./agent.controller";
import { AgentRuntimeService } from "./agent-runtime.service";
import { SkillsController } from "../skills/skills.controller";
import { SkillsService } from "../skills/skills.service";
import { KnowledgeModule } from "../knowledge/knowledge.module";
import { DiagramsModule } from "../diagrams/diagrams.module";
import { AiModule } from "../ai/ai.module";
import { IntegrationsModule } from "../integrations/integrations.module";
import { McpModule } from "../mcp/mcp.module";
import { ChartsModule } from "../charts/charts.module";

@Module({
  imports: [KnowledgeModule, DiagramsModule, AiModule, IntegrationsModule, McpModule, ChartsModule],
  controllers: [AgentController, SkillsController],
  providers: [AgentRuntimeService, SkillsService],
  exports: [AgentRuntimeService],
})
export class AgentModule {}
