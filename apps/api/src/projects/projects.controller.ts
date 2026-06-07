import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from "@nestjs/common";
import { ProjectsService } from "./projects.service";
import { CreateProjectDto } from "./dto/create-project.dto";
import { UpdateProjectDto } from "./dto/update-project.dto";
import { ProjectStatus } from "@prisma/client";

const DEV_ORG_ID = "org_dev";

@Controller("projects")
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  findAll(@Query("companyId") companyId?: string) {
    return this.projectsService.findAll(DEV_ORG_ID, companyId);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.projectsService.findOne(id, DEV_ORG_ID);
  }

  @Post()
  create(@Body() dto: CreateProjectDto) {
    return this.projectsService.create(dto, DEV_ORG_ID);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateProjectDto) {
    return this.projectsService.update(id, dto, DEV_ORG_ID);
  }

  @Patch(":id/status")
  updateStatus(@Param("id") id: string, @Body("status") status: ProjectStatus) {
    return this.projectsService.updateStatus(id, status, DEV_ORG_ID);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.projectsService.remove(id, DEV_ORG_ID);
  }
}
