import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from "@nestjs/common";
import { StakeholdersService } from "./stakeholders.service";

const DEV_ORG_ID = "org_dev";

@Controller("stakeholders")
export class StakeholdersController {
  constructor(private readonly stakeholdersService: StakeholdersService) {}

  @Get()
  findAll(@Query("projectId") projectId?: string, @Query("companyId") companyId?: string) {
    if (projectId) return this.stakeholdersService.findByProject(projectId, DEV_ORG_ID);
    if (companyId) return this.stakeholdersService.findByCompany(companyId, DEV_ORG_ID);
    return [];
  }

  @Post()
  create(@Body() body: { name: string; email?: string; role?: string; notes?: string; projectId?: string; companyId?: string }) {
    return this.stakeholdersService.create(body);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() body: { name?: string; email?: string; role?: string; notes?: string }) {
    return this.stakeholdersService.update(id, body);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.stakeholdersService.remove(id);
  }
}
