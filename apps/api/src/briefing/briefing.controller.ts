import { Controller, Get, Post, Param } from "@nestjs/common";
import { BriefingService } from "./briefing.service";

const DEV_ORG_ID = "org_dev";

@Controller("projects/:projectId/briefing")
export class BriefingController {
  constructor(private readonly briefing: BriefingService) {}

  @Get()
  get(@Param("projectId") projectId: string) {
    return this.briefing.get(projectId, DEV_ORG_ID);
  }

  @Post("refresh")
  refresh(@Param("projectId") projectId: string) {
    return this.briefing.generate(projectId, DEV_ORG_ID);
  }
}
