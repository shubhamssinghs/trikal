import { Controller, Get, Post, Delete, Param, Res } from "@nestjs/common";
import { Response } from "express";
import { DocumentsService } from "./documents.service";

const DEV_ORG_ID = "org_dev";

@Controller("projects/:projectId/documents")
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get()
  list(@Param("projectId") projectId: string) {
    return this.documents.list(projectId, DEV_ORG_ID);
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.documents.get(id, DEV_ORG_ID);
  }

  @Post(":id/approve")
  approve(@Param("id") id: string) {
    return this.documents.approve(id, DEV_ORG_ID);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.documents.remove(id, DEV_ORG_ID);
  }

  @Get(":id/export")
  async export(@Param("id") id: string, @Res() res: Response) {
    const { filename, buffer } = await this.documents.exportDocx(id, DEV_ORG_ID);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  }
}
