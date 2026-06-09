import { Injectable, Logger } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { KnowledgeService } from "../knowledge/knowledge.service";
import { TranscriptAnalysisService } from "../ai/transcript-analysis.service";
import { BriefingService } from "../briefing/briefing.service";

/**
 * Orchestrates everything that should happen automatically when a transcript
 * lands — whether from a manual upload or a Granola sync. The manager should
 * never have to click "ingest" then "analyse": dropping a meeting in does the
 * whole pipeline (knowledge ingest → AI extraction → recommendations → briefing).
 *
 * Runs as fire-and-forget from the caller (the HTTP upload returns immediately
 * and processing continues in the background), so every step is independently
 * guarded — one failure never aborts the rest.
 */
@Injectable()
export class ProcessingService {
  private readonly logger = new Logger(ProcessingService.name);
  /** Coalesce duplicate triggers for the same transcript within this process. */
  private readonly inFlight = new Set<string>();

  constructor(
    private readonly prisma: PrismaClient,
    private readonly knowledge: KnowledgeService,
    private readonly analysis: TranscriptAnalysisService,
    private readonly briefing: BriefingService,
  ) {}

  /**
   * Full pipeline for one transcript.
   * @param opts.refreshBriefing regenerate the project briefing afterwards
   *   (default true; Granola batch sync sets false and refreshes once at the end).
   * @returns projectId for callers that want to follow up (e.g. batch briefing).
   */
  async process(
    transcriptId: string,
    organizationId: string,
    opts: { refreshBriefing?: boolean } = {},
  ): Promise<{ projectId: string | null }> {
    if (this.inFlight.has(transcriptId)) return { projectId: null };
    this.inFlight.add(transcriptId);
    const { refreshBriefing = true } = opts;

    // Resolve (and org-scope) the transcript's project up front.
    const transcript = await this.prisma.meetingTranscript.findFirst({
      where: { id: transcriptId, project: { organizationId } },
      select: { projectId: true },
    });
    const projectId = transcript?.projectId ?? null;
    if (!projectId) {
      this.inFlight.delete(transcriptId);
      this.logger.warn(`process: transcript ${transcriptId} not found for org ${organizationId}`);
      return { projectId: null };
    }

    try {
      // 1) Knowledge ingest (chunk + embed). Idempotent — dedupes if already done.
      await this.knowledge
        .ingestTranscript(transcriptId, organizationId)
        .catch((e) => {
          this.logger.error(`ingest failed for ${transcriptId}: ${e?.message ?? e}`);
          return null;
        });

      // 2) AI extraction → summary, decisions, action items, risks → recommendations.
      const analyzed = await this.analysis
        .analyzeTranscript(transcriptId, organizationId)
        .catch((e) => {
          this.logger.error(`analysis failed for ${transcriptId}: ${e?.message ?? e}`);
          return null;
        });
      if (analyzed) {
        this.logger.log(
          `processed ${transcriptId}: ${analyzed.recommendationsCreated} recommendation(s)`,
        );
      }

      // 3) Refresh the project briefing so the dashboard reflects the new meeting.
      if (refreshBriefing && projectId) {
        await this.briefing.generate(projectId, organizationId).catch((e) =>
          this.logger.error(`briefing refresh failed for ${projectId}: ${e?.message ?? e}`),
        );
      }
    } finally {
      this.inFlight.delete(transcriptId);
    }

    return { projectId };
  }
}
