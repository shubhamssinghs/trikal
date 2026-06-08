import { Injectable } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { AiService } from "./ai.service";

const SYSTEM_PROMPT = `You are a technical project manager assistant generating a daily briefing.
Analyse the provided project signals and return a prioritised JSON briefing.

Output ONLY valid JSON:
{
  "greeting": "one sentence personalised greeting",
  "topPriorities": [
    { "text": "specific action item", "urgency": "high|medium|low", "projectName": "project name" }
  ],
  "atRiskProjects": [
    { "projectName": "name", "reason": "specific reason" }
  ],
  "pendingApprovals": number,
  "openRisks": number,
  "insight": "one sentence insight or pattern noticed across projects"
}

Rules:
- topPriorities: max 5, ordered by urgency
- atRiskProjects: only include projects with status AT_RISK or that have high-severity open risks
- Be specific and actionable, not generic`;

@Injectable()
export class DailyBriefingService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly ai: AiService,
  ) {}

  async generateBriefing(organizationId: string) {
    // Gather project signals
    const [projects, openRisks, pendingRecs] = await Promise.all([
      this.prisma.project.findMany({
        where: { organizationId, status: { not: "ARCHIVED" } },
        include: {
          company: { select: { name: true } },
          milestones: { where: { status: { not: "completed" } }, orderBy: { dueDate: "asc" }, take: 3 },
          risks: { where: { status: "open" } },
          _count: { select: { recommendations: true, knowledgeItems: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: 20,
      }),
      this.prisma.risk.count({ where: { project: { organizationId }, status: "open" } }),
      this.prisma.recommendation.count({ where: { project: { organizationId }, status: "PENDING" } }),
    ]);

    if (projects.length === 0) {
      return {
        greeting: "Welcome! Start by creating a company and project.",
        topPriorities: [],
        atRiskProjects: [],
        pendingApprovals: 0,
        openRisks: 0,
        insight: "No projects yet. Upload your first meeting transcript to get started.",
      };
    }

    // Build context for AI
    const signals = projects.map((p) => ({
      project: p.name,
      company: p.company.name,
      status: p.status,
      openRisks: p.risks.length,
      highRisks: p.risks.filter((r) => r.severity === "high").map((r) => r.title),
      upcomingMilestones: p.milestones.map((m) => ({ name: m.name, due: m.dueDate })),
      knowledgeItems: p._count.knowledgeItems,
      pendingRecs: p._count.recommendations,
    }));

    const userPrompt = `Date: ${new Date().toISOString().split("T")[0]}
Total pending approvals: ${pendingRecs}
Total open risks: ${openRisks}

Project signals:
${JSON.stringify(signals, null, 2)}`;

    const raw = await this.ai.complete(SYSTEM_PROMPT, userPrompt, 1024);

    try {
      const parsed = JSON.parse(raw);
      return { ...parsed, pendingApprovals: pendingRecs, openRisks };
    } catch {
      return {
        greeting: "Good morning! Here's your project overview.",
        topPriorities: projects
          .filter((p) => p.status === "AT_RISK" || p.risks.some((r) => r.severity === "high"))
          .slice(0, 3)
          .map((p) => ({ text: `Review ${p.name}`, urgency: "high", projectName: p.name })),
        atRiskProjects: projects
          .filter((p) => p.status === "AT_RISK")
          .map((p) => ({ projectName: p.name, reason: "Status is AT_RISK" })),
        pendingApprovals: pendingRecs,
        openRisks,
        insight: `You have ${projects.length} active projects across ${new Set(projects.map((p) => p.company.name)).size} companies.`,
      };
    }
  }
}
