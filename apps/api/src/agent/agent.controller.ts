import { Controller, Get, Post, Body, Param, Query, NotFoundException } from "@nestjs/common";
import { AgentRuntimeService } from "./agent-runtime.service";

const DEV_ORG_ID = "org_dev";

@Controller("agent")
export class AgentController {
  constructor(private readonly agent: AgentRuntimeService) {}

  /** Ask the agent — it decides which skills to use and may chain several. */
  @Post("ask")
  ask(@Body("question") question: string, @Body("projectId") projectId?: string) {
    return this.agent.run({ surface: "ask", goal: question, projectId: projectId ?? null, organizationId: DEV_ORG_ID });
  }

  /** Run a specific surface (e.g. transcript-driven) with an explicit goal. */
  @Post("run")
  run(@Body("goal") goal: string, @Body("surface") surface?: string, @Body("projectId") projectId?: string) {
    return this.agent.run({ surface: surface ?? "ask", goal, projectId: projectId ?? null, organizationId: DEV_ORG_ID });
  }

  @Get("runs")
  runs(@Query("projectId") projectId?: string) {
    return this.agent.listRuns(DEV_ORG_ID, projectId);
  }

  @Get("runs/:id")
  async run_(@Param("id") id: string) {
    const run = await this.agent.getRun(id, DEV_ORG_ID);
    if (!run) throw new NotFoundException("Run not found");
    return run;
  }
}
