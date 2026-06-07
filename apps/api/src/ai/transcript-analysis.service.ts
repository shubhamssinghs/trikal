import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import { PrismaClient, Prisma } from "@prisma/client";
import { AiService } from "./ai.service";

const SYSTEM_PROMPT = `You are a technical project analyst. Extract structured information from meeting transcripts.

Output ONLY valid JSON with this exact structure:
{
  "summary": "2-4 sentence summary",
  "decisions": [{"text": "decision", "owner": "name or null"}],
  "actionItems": [{"text": "action", "owner": "name or null", "dueDate": "YYYY-MM-DD or null"}],
  "openQuestions": ["question text"],
  "risks": [{"text": "risk description", "severity": "low|medium|high"}],
  "scopeChanges": ["scope change description"],
  "suggestedTickets": [{"title": "short title", "description": "description", "priority": "low|medium|high"}]
}

Rules:
- Be specific, extract what was actually said
- Empty arrays for fields with no content
- Never invent information not in the transcript`;

@Injectable()
export class TranscriptAnalysisService {
  private readonly logger = new Logger(TranscriptAnalysisService.name);

  constructor(
    private readonly prisma: PrismaClient,
    private readonly ai: AiService,
  ) {}

  async analyzeTranscript(transcriptId: string, organizationId: string) {
    const transcript = await this.prisma.meetingTranscript.findFirst({
      where: { id: transcriptId, project: { organizationId } },
      include: { project: { select: { name: true, description: true } } },
    });
    if (!transcript) throw new NotFoundException("Transcript not found");

    const userPrompt = `Project: ${transcript.project.name}\n\nTranscript:\n${transcript.rawContent}`;
    const raw = await this.ai.complete(SYSTEM_PROMPT, userPrompt);

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw);
    } catch {
      this.logger.error("Failed to parse AI response", raw);
      throw new Error("AI returned invalid JSON");
    }

    // Store AI run
    const aiRun = await this.prisma.aiRun.create({
      data: {
        projectId: transcript.projectId,
        userId: "user_dev",
        agentType: "transcript-analysis",
        promptVersion: "1.0.0",
        inputSummary: `Transcript: ${transcript.title}`,
        outputJson: parsed as Prisma.InputJsonValue,
        modelId: this.ai.isConfigured ? "claude-sonnet-4-6" : "mock",
      },
    });

    // Create recommendations from action items and tickets
    const recommendations = [];

    const actionItems = (parsed.actionItems as Array<{ text: string; owner: string | null }>) ?? [];
    for (const item of actionItems) {
      const rec = await this.prisma.recommendation.create({
        data: {
          projectId: transcript.projectId,
          aiRunId: aiRun.id,
          type: "CREATE_TICKET",
          title: item.text,
          description: `Owner: ${item.owner ?? "Unassigned"}`,
          payload: { source: "transcript", transcriptId, item },
        },
      });
      recommendations.push(rec);
    }

    const tickets = (parsed.suggestedTickets as Array<{ title: string; description: string; priority: string }>) ?? [];
    for (const ticket of tickets) {
      const rec = await this.prisma.recommendation.create({
        data: {
          projectId: transcript.projectId,
          aiRunId: aiRun.id,
          type: "CREATE_TICKET",
          title: ticket.title,
          description: ticket.description,
          payload: { source: "transcript", transcriptId, ticket },
        },
      });
      recommendations.push(rec);
    }

    return {
      aiRunId: aiRun.id,
      analysis: parsed,
      recommendationsCreated: recommendations.length,
      isRealAi: this.ai.isConfigured,
    };
  }

  async getProjectRecommendations(projectId: string, organizationId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId },
    });
    if (!project) throw new NotFoundException("Project not found");

    return this.prisma.recommendation.findMany({
      where: { projectId },
      include: { aiRun: { select: { agentType: true, modelId: true, createdAt: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async approveRecommendation(id: string) {
    return this.prisma.recommendation.update({
      where: { id },
      data: { status: "APPROVED" },
    });
  }

  async rejectRecommendation(id: string) {
    return this.prisma.recommendation.update({
      where: { id },
      data: { status: "REJECTED" },
    });
  }
}
