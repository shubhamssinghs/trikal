import { Controller, Post, Get, Patch, Param, Query, Body } from "@nestjs/common";
import { TranscriptAnalysisService } from "./transcript-analysis.service";
import { AskProjectService } from "./ask-project.service";
import { DailyBriefingService } from "./daily-briefing.service";

const DEV_ORG_ID = "org_dev";

@Controller("ai")
export class AiController {
  constructor(
    private readonly transcriptAnalysis: TranscriptAnalysisService,
    private readonly askProject: AskProjectService,
    private readonly dailyBriefing: DailyBriefingService,
  ) {}

  @Get("briefing")
  briefing() {
    return this.dailyBriefing.generateBriefing(DEV_ORG_ID);
  }

  @Post("analyze/transcript/:transcriptId")
  analyze(@Param("transcriptId") transcriptId: string) {
    return this.transcriptAnalysis.analyzeTranscript(transcriptId, DEV_ORG_ID);
  }

  @Post("ask")
  ask(@Body("projectId") projectId: string, @Body("question") question: string) {
    return this.askProject.ask(projectId, question, DEV_ORG_ID);
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
