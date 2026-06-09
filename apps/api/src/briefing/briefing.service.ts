import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaClient, Prisma } from "@prisma/client";
import { AiService } from "../ai/ai.service";
import { KnowledgeService } from "../knowledge/knowledge.service";

const SYSTEM_PROMPT = `You are a technical project manager's assistant. From the project context (meeting notes, transcripts, milestones, risks), produce a concise, action-oriented briefing.

Output ONLY valid JSON with this exact shape:
{
  "plate": ["specific thing on the manager's plate today/next — an action item, follow-up, or task"],
  "topics": ["key topic or theme currently active"],
  "openQuestions": ["unresolved question or decision needed"],
  "suggestedActions": [{"title": "concrete next action", "rationale": "why, grounded in the context"}]
}

Rules:
- Be specific and grounded ONLY in the provided context — never invent.
- "plate" = what the manager personally needs to do or follow up on next.
- Prefer recent meetings. Empty arrays if nothing applies. 3-6 items max per list.`;

type BriefingData = {
  plate: string[];
  topics: string[];
  openQuestions: string[];
  suggestedActions: { title: string; rationale: string }[];
};

@Injectable()
export class BriefingService {
  private readonly logger = new Logger(BriefingService.name);

  constructor(
    private readonly prisma: PrismaClient,
    private readonly ai: AiService,
    private readonly knowledge: KnowledgeService,
  ) {}

  /** Cached briefing (generates one on first request). */
  async get(projectId: string, organizationId: string) {
    const project = await this.prisma.project.findFirst({ where: { id: projectId, organizationId }, select: { id: true } });
    if (!project) throw new NotFoundException("Project not found");
    const cached = await this.prisma.projectBriefing.findUnique({ where: { projectId } });
    if (cached) return cached;
    return this.generate(projectId, organizationId);
  }

  /** Generate (or regenerate) and cache the project briefing. */
  async generate(projectId: string, organizationId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId },
      select: { id: true, name: true, description: true },
    });
    if (!project) throw new NotFoundException("Project not found");

    let context = "";
    try {
      const hits = await this.knowledge.searchProject(
        projectId,
        "today's priorities, action items, tasks, decisions, follow-ups, who owes what, next steps",
        organizationId,
      );
      context = hits.map((h, i) => `[${i + 1}] (${h.source?.title ?? "source"}) ${h.content}`).join("\n\n").slice(0, 7000);
    } catch {
      context = "";
    }

    const [milestones, risks] = await Promise.all([
      this.prisma.milestone.findMany({ where: { projectId }, select: { name: true, dueDate: true, status: true }, orderBy: { dueDate: "asc" }, take: 8 }),
      this.prisma.risk.findMany({ where: { projectId, status: "open" }, select: { title: true, severity: true }, take: 8 }),
    ]);

    const userPrompt = [
      `Project: ${project.name}${project.description ? ` — ${project.description}` : ""}`,
      milestones.length ? `\nMilestones:\n${milestones.map((m) => `- ${m.name} (${m.status}${m.dueDate ? `, due ${m.dueDate.toISOString().slice(0, 10)}` : ""})`).join("\n")}` : "",
      risks.length ? `\nOpen risks:\n${risks.map((r) => `- ${r.title} [${r.severity}]`).join("\n")}` : "",
      context ? `\nFrom recent meetings & notes:\n${context}` : "\n(No meeting/notes content yet.)",
    ].filter(Boolean).join("\n");

    const raw = await this.ai.complete(SYSTEM_PROMPT, userPrompt, 2048, organizationId);
    const data = this.parse(raw);

    return this.prisma.projectBriefing.upsert({
      where: { projectId },
      update: { data: data as unknown as Prisma.InputJsonValue, generatedAt: new Date() },
      create: { projectId, data: data as unknown as Prisma.InputJsonValue },
    });
  }

  private parse(raw: string): BriefingData {
    const empty: BriefingData = { plate: [], topics: [], openQuestions: [], suggestedActions: [] };
    try {
      const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
      const p = JSON.parse(cleaned) as Partial<BriefingData>;
      return {
        plate: Array.isArray(p.plate) ? p.plate.map(String).slice(0, 8) : [],
        topics: Array.isArray(p.topics) ? p.topics.map(String).slice(0, 8) : [],
        openQuestions: Array.isArray(p.openQuestions) ? p.openQuestions.map(String).slice(0, 8) : [],
        suggestedActions: Array.isArray(p.suggestedActions)
          ? p.suggestedActions.filter((a) => a && typeof a === "object").map((a) => ({ title: String(a.title ?? ""), rationale: String(a.rationale ?? "") })).filter((a) => a.title).slice(0, 8)
          : [],
      };
    } catch {
      this.logger.warn(`Briefing response was not JSON: ${raw.slice(0, 120)}`);
      // Surface the model's text (e.g. a provider/billing notice) so it isn't silently empty.
      return { ...empty, topics: raw.startsWith("[") || raw.includes("API") ? [raw.slice(0, 200)] : [] };
    }
  }
}
