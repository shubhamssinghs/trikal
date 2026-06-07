import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from "@nestjs/common";
import { RisksService } from "./risks.service";

const DEV_ORG_ID = "org_dev";

@Controller("risks")
export class RisksController {
  constructor(private readonly risksService: RisksService) {}

  @Get()
  findByProject(@Query("projectId") projectId: string) {
    return this.risksService.findByProject(projectId, DEV_ORG_ID);
  }

  @Post()
  create(@Query("projectId") projectId: string, @Body() body: { title: string; description?: string; severity?: string; mitigationPlan?: string }) {
    return this.risksService.create(projectId, body, DEV_ORG_ID);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() body: { title?: string; description?: string; severity?: string; status?: string; mitigationPlan?: string }) {
    return this.risksService.update(id, body, DEV_ORG_ID);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.risksService.remove(id, DEV_ORG_ID);
  }
}
