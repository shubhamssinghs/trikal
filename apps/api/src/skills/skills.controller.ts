import { Controller, Get, Post, Patch, Delete, Body, Param } from "@nestjs/common";
import { SkillsService } from "./skills.service";

const DEV_ORG_ID = "org_dev";

@Controller("skills")
export class SkillsController {
  constructor(private readonly skills: SkillsService) {}

  @Get()
  list() {
    return this.skills.list(DEV_ORG_ID);
  }

  @Post()
  create(@Body() body: Parameters<SkillsService["create"]>[1]) {
    return this.skills.create(DEV_ORG_ID, body);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() body: Parameters<SkillsService["update"]>[2]) {
    return this.skills.update(id, DEV_ORG_ID, body);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.skills.remove(id);
  }
}
