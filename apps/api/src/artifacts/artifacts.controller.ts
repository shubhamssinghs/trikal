import { Controller, Get, Param, Query } from "@nestjs/common";
import { ArtifactsService } from "./artifacts.service";

const DEV_ORG_ID = "org_dev";

@Controller("artifacts")
export class ArtifactsController {
  constructor(private readonly artifacts: ArtifactsService) {}

  @Get()
  list(@Query("projectId") projectId: string, @Query("type") type?: string) {
    return this.artifacts.listByProject(projectId, DEV_ORG_ID, type);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.artifacts.findOne(id, DEV_ORG_ID);
  }
}
