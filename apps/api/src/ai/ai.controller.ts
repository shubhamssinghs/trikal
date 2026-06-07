import { Controller, Post, Get, Patch, Param, Query } from "@nestjs/common";
import { TranscriptAnalysisService } from "./transcript-analysis.service";

const DEV_ORG_ID = "org_dev";

@Controller("ai")
export class AiController {
  constructor(private readonly transcriptAnalysis: TranscriptAnalysisService) {}

  @Post("analyze/transcript/:transcriptId")
  analyze(@Param("transcriptId") transcriptId: string) {
    return this.transcriptAnalysis.analyzeTranscript(transcriptId, DEV_ORG_ID);
  }

  @Get("recommendations")
  getRecommendations(@Query("projectId") projectId: string) {
    return this.transcriptAnalysis.getProjectRecommendations(projectId, DEV_ORG_ID);
  }

  @Patch("recommendations/:id/approve")
  approve(@Param("id") id: string) {
    return this.transcriptAnalysis.approveRecommendation(id);
  }

  @Patch("recommendations/:id/reject")
  reject(@Param("id") id: string) {
    return this.transcriptAnalysis.rejectRecommendation(id);
  }
}
