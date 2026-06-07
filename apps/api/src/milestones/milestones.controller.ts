import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from "@nestjs/common";
import { MilestonesService } from "./milestones.service";

const DEV_ORG_ID = "org_dev";

@Controller("milestones")
export class MilestonesController {
  constructor(private readonly milestonesService: MilestonesService) {}

  @Get()
  findByProject(@Query("projectId") projectId: string) {
    return this.milestonesService.findByProject(projectId, DEV_ORG_ID);
  }

  @Post()
  create(@Query("projectId") projectId: string, @Body() body: { name: string; description?: string; dueDate?: string }) {
    return this.milestonesService.create(projectId, body, DEV_ORG_ID);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() body: { name?: string; description?: string; dueDate?: string; status?: string }) {
    return this.milestonesService.update(id, body, DEV_ORG_ID);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.milestonesService.remove(id, DEV_ORG_ID);
  }
}
