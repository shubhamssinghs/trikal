import { Module } from "@nestjs/common";
import { AgentController } from "./agent.controller";
import { AgentRuntimeService } from "./agent-runtime.service";
import { SkillsController } from "../skills/skills.controller";
import { SkillsService } from "../skills/skills.service";
import { KnowledgeModule } from "../knowledge/knowledge.module";
import { DiagramsModule } from "../diagrams/diagrams.module";

@Module({
  imports: [KnowledgeModule, DiagramsModule],
  controllers: [AgentController, SkillsController],
  providers: [AgentRuntimeService, SkillsService],
  exports: [AgentRuntimeService],
})
export class AgentModule {}
