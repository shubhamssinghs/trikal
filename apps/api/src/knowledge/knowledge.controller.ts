import { Controller, Get, Post, Delete, Param, Query } from "@nestjs/common";
import { KnowledgeService } from "./knowledge.service";

const DEV_ORG_ID = "org_dev";

@Controller("knowledge")
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Post("ingest/transcript/:transcriptId")
  ingestTranscript(@Param("transcriptId") transcriptId: string) {
    return this.knowledgeService.ingestTranscript(transcriptId, DEV_ORG_ID);
  }

  @Post("reingest/transcript/:transcriptId")
  reingestTranscript(@Param("transcriptId") transcriptId: string) {
    return this.knowledgeService.reingestTranscript(transcriptId, DEV_ORG_ID);
  }

  @Get("search")
  search(@Query("projectId") projectId: string, @Query("q") q: string) {
    return this.knowledgeService.searchProject(projectId, q, DEV_ORG_ID);
  }

  @Get("items")
  getItems(@Query("projectId") projectId: string) {
    return this.knowledgeService.getProjectItems(projectId, DEV_ORG_ID);
  }

  @Delete("items/:id")
  deleteItem(@Param("id") id: string) {
    return this.knowledgeService.deleteItem(id, DEV_ORG_ID);
  }
}
