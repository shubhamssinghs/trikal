import { Controller, Get, Post, Param, Query, Body } from "@nestjs/common";
import { KnowledgeService } from "./knowledge.service";

const DEV_ORG_ID = "org_dev";

@Controller("knowledge")
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Post("ingest/transcript/:transcriptId")
  ingestTranscript(@Param("transcriptId") transcriptId: string) {
    return this.knowledgeService.ingestTranscript(transcriptId, DEV_ORG_ID);
  }

  @Get("search")
  search(@Query("projectId") projectId: string, @Query("q") q: string) {
    return this.knowledgeService.searchProject(projectId, q, DEV_ORG_ID);
  }

  @Get("items")
  getItems(@Query("projectId") projectId: string) {
    return this.knowledgeService.getProjectItems(projectId, DEV_ORG_ID);
  }
}
