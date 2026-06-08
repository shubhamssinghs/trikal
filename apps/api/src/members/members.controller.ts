import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from "@nestjs/common";
import { MembersService } from "./members.service";

const DEV_ORG_ID = "org_dev";

type Body_ = {
  name?: string; email?: string; managerId?: string | null;
  affiliationId?: string | null; jobRoleId?: string | null; orgUnitId?: string | null;
  projectId?: string; companyId?: string;
};

@Controller("members")
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  findAll(@Query("projectId") projectId?: string, @Query("companyId") companyId?: string) {
    if (projectId) return this.membersService.findByProject(projectId, DEV_ORG_ID);
    if (companyId) return this.membersService.findByCompany(companyId, DEV_ORG_ID);
    return [];
  }

  @Post()
  create(@Body() body: Body_) {
    return this.membersService.create(body);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() body: Body_) {
    return this.membersService.update(id, body);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.membersService.remove(id);
  }
}
