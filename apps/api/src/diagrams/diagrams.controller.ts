import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from "@nestjs/common";
import { DiagramsService } from "./diagrams.service";

const DEV_ORG_ID = "org_dev";

type SchemaBody = {
  title?: string;
  description?: string;
  kind?: string;
  schemaJson?: Parameters<DiagramsService["create"]>[2]["schemaJson"];
};

@Controller("diagrams")
export class DiagramsController {
  constructor(private readonly diagrams: DiagramsService) {}

  @Get()
  list(@Query("projectId") projectId: string) {
    return this.diagrams.listByProject(projectId, DEV_ORG_ID);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.diagrams.findOne(id, DEV_ORG_ID);
  }

  @Post()
  create(@Query("projectId") projectId: string, @Body() body: SchemaBody) {
    return this.diagrams.create(projectId, DEV_ORG_ID, body);
  }

  @Post("generate")
  generate(@Body("projectId") projectId: string, @Body("prompt") prompt?: string, @Body("kind") kind?: string) {
    return this.diagrams.generate(projectId, DEV_ORG_ID, prompt, kind);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() body: SchemaBody) {
    return this.diagrams.update(id, DEV_ORG_ID, body);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.diagrams.remove(id, DEV_ORG_ID);
  }
}
