import { Controller, Get, Param, Query } from "@nestjs/common";
import { ChartsService } from "./charts.service";

const DEV_ORG_ID = "org_dev";

@Controller("charts")
export class ChartsController {
  constructor(private readonly charts: ChartsService) {}

  @Get()
  list(@Query("projectId") projectId: string) {
    return this.charts.listByProject(projectId, DEV_ORG_ID);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.charts.findOne(id, DEV_ORG_ID);
  }
}
