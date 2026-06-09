import { Injectable, Logger } from "@nestjs/common";
import { PrismaClient, Prisma, Skill } from "@prisma/client";
import Anthropic from "@anthropic-ai/sdk";
import { SettingsService } from "../settings/settings.service";
import { KnowledgeService } from "../knowledge/knowledge.service";
import { DiagramsService } from "../diagrams/diagrams.service";
import { HANDLERS, type SkillContext } from "./skill-handlers";

const MAX_ITERATIONS = 8;
const DEFAULT_MODEL = "claude-opus-4-8";

type RunInput = { surface: string; goal: string; projectId?: string | null; organizationId: string };

@Injectable()
export class AgentRuntimeService {
  private readonly logger = new Logger(AgentRuntimeService.name);

  constructor(
    private readonly prisma: PrismaClient,
    private readonly settings: SettingsService,
    private readonly knowledge: KnowledgeService,
    private readonly diagrams: DiagramsService,
  ) {}

  private async enabledSkills(organizationId: string): Promise<Skill[]> {
    return this.prisma.skill.findMany({
      where: { enabled: true, OR: [{ organizationId: null }, { organizationId }] },
      orderBy: { createdAt: "asc" },
    });
  }

  /** Persist one step of the run's trace (shown live in the dashboard run inspector). */
  private async step(runId: string, idx: number, type: string, data: { skillSlug?: string; title?: string; content?: unknown }) {
    await this.prisma.agentStep.create({
      data: {
        runId, idx, type,
        skillSlug: data.skillSlug,
        title: data.title,
        content: (data.content ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  }

  /**
   * Run the agent for a goal. Claude (tool-use loop) decides which enabled skills
   * to call; every thought, tool call and result is persisted as an AgentStep.
   */
  async run({ surface, goal, projectId, organizationId }: RunInput) {
    const s = await this.settings.resolve(organizationId);
    const apiKey = s.anthropicApiKey;
    const model = s.llmProvider === "anthropic" && s.llmModel ? s.llmModel : DEFAULT_MODEL;

    const run = await this.prisma.agentRun.create({
      data: { surface, goal, projectId: projectId ?? null, organizationId, model, status: "running" },
    });

    if (!apiKey) {
      const answer = "No Anthropic API key is configured. Add one in Settings → AI & Models to use the agent.";
      await this.step(run.id, 0, "error", { title: "Not configured", content: { answer } });
      await this.prisma.agentRun.update({ where: { id: run.id }, data: { status: "failed", error: "no_api_key", answer } });
      return { runId: run.id, answer, status: "failed" as const };
    }

    const skills = await this.enabledSkills(organizationId);
    const bySlug = new Map(skills.map((sk) => [sk.slug, sk]));
    const tools = skills.map((sk) => ({ name: sk.slug, description: sk.description, input_schema: sk.inputSchema as Record<string, unknown> }));

    const project = projectId
      ? await this.prisma.project.findFirst({ where: { id: projectId, organizationId }, select: { name: true, description: true } })
      : null;

    const system = [
      "You are an AI technical-manager assistant operating inside a project command center.",
      "You have a set of skills (tools). Decide when to call them; you may chain several skills to satisfy a request.",
      "Prefer answering from project knowledge. When a diagram would communicate better than prose, create one.",
      "Be concise and cite which skill/source produced information when relevant.",
      project ? `\nCurrent project: ${project.name}${project.description ? ` — ${project.description}` : ""}` : "",
      ...skills.filter((sk) => sk.instructions).map((sk) => `\n[${sk.name}] ${sk.instructions}`),
    ].filter(Boolean).join("\n");

    const ctx: SkillContext = { projectId, organizationId, prisma: this.prisma, knowledge: this.knowledge, diagrams: this.diagrams };
    const client = new Anthropic({ apiKey });
    const messages: Anthropic.MessageParam[] = [{ role: "user", content: goal }];

    let idx = 0;
    let answer = "";
    let tokensIn = 0;
    let tokensOut = 0;
    const artifacts: unknown[] = [];

    try {
      for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
        const params = {
          model,
          max_tokens: 8192,
          thinking: { type: "adaptive", display: "summarized" },
          system,
          tools,
          messages,
        };
        // Cast: thinking.adaptive/display + tool unions vary across SDK versions.
        const res = (await client.messages.create(params as never)) as Anthropic.Message;
        tokensIn += res.usage?.input_tokens ?? 0;
        tokensOut += res.usage?.output_tokens ?? 0;

        for (const block of res.content as Array<{ type: string; text?: string; thinking?: string }>) {
          if (block.type === "thinking" && block.thinking) {
            await this.step(run.id, idx++, "thinking", { content: { text: block.thinking } });
          } else if (block.type === "text" && block.text) {
            answer += (answer ? "\n" : "") + block.text;
            await this.step(run.id, idx++, "text", { content: { text: block.text } });
          }
        }

        if (res.stop_reason !== "tool_use") break;

        messages.push({ role: "assistant", content: res.content });
        const toolResults: Anthropic.ToolResultBlockParam[] = [];

        for (const block of res.content) {
          if (block.type !== "tool_use") continue;
          const skill = bySlug.get(block.name);
          const input = (block.input ?? {}) as Record<string, unknown>;
          await this.step(run.id, idx++, "tool_call", { skillSlug: block.name, title: skill?.name ?? block.name, content: { input } });

          // Gate external-action skills behind the approval queue (needs a project to attach to).
          if (skill?.externalAction) {
            if (projectId) {
              await this.prisma.recommendation.create({
                data: {
                  projectId,
                  type: "AGENT_ACTION",
                  title: `${skill.name}: pending approval`,
                  description: `The agent requested the external action "${skill.name}". Approve to execute.`,
                  payload: { skill: skill.slug, input } as Prisma.InputJsonValue,
                },
              }).catch(() => {});
            }
            const msg = `Queued "${skill.name}" for human approval — it will run after approval.`;
            await this.step(run.id, idx++, "tool_result", { skillSlug: block.name, content: { text: msg, queued: true } });
            toolResults.push({ type: "tool_result", tool_use_id: block.id, content: msg });
            continue;
          }

          const handlerKey = skill?.handlerKey ?? "";
          const handler = HANDLERS[handlerKey];
          let resultText: string;
          if (!handler) {
            resultText = `Skill "${block.name}" has no executable handler; treat its instructions as guidance only.`;
          } else {
            try {
              const out = await handler(input, ctx);
              resultText = out.text;
              if (out.artifact) artifacts.push(out.artifact);
            } catch (e) {
              resultText = `Skill "${block.name}" failed: ${e instanceof Error ? e.message : String(e)}`;
            }
          }
          await this.step(run.id, idx++, "tool_result", { skillSlug: block.name, content: { text: resultText } });
          toolResults.push({ type: "tool_result", tool_use_id: block.id, content: resultText });
        }

        messages.push({ role: "user", content: toolResults });
      }

      await this.prisma.agentRun.update({
        where: { id: run.id },
        data: { status: "completed", answer, tokensIn, tokensOut },
      });
      return { runId: run.id, answer: answer || "(no answer)", status: "completed" as const, artifacts };
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      this.logger.error(`Agent run ${run.id} failed: ${err}`);
      const friendly = this.friendlyError(err);
      await this.step(run.id, idx++, "error", { title: friendly ? "Provider error" : undefined, content: { error: friendly ?? err } });
      await this.prisma.agentRun.update({ where: { id: run.id }, data: { status: "failed", error: err, tokensIn, tokensOut } });
      return { runId: run.id, answer: answer || friendly || "The agent run failed. Check the run trace for details.", status: "failed" as const };
    }
  }

  /** Map known provider errors to an actionable message for the dashboard. */
  private friendlyError(err: string): string | null {
    const m = err.toLowerCase();
    if (m.includes("credit balance") || m.includes("insufficient") || m.includes("quota") || m.includes("billing"))
      return "Anthropic API: your credit balance is too low. Add credits in the Anthropic Console (Plans & Billing), then try again.";
    if (m.includes("401") || m.includes("authentication") || m.includes("invalid x-api-key") || m.includes("invalid api key"))
      return "Anthropic API: the API key is invalid. Update it in Settings → AI & Models.";
    if (m.includes("429") || m.includes("rate"))
      return "Anthropic API: rate limited. Wait a moment and try again.";
    if (m.includes("overloaded") || m.includes("529"))
      return "Anthropic API is temporarily overloaded. Try again shortly.";
    return null;
  }

  listRuns(organizationId: string, projectId?: string) {
    return this.prisma.agentRun.findMany({
      where: { organizationId, ...(projectId ? { projectId } : {}) },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, surface: true, goal: true, status: true, model: true, tokensIn: true, tokensOut: true, createdAt: true },
    });
  }

  getRun(id: string, organizationId: string) {
    return this.prisma.agentRun.findFirst({
      where: { id, organizationId },
      include: { steps: { orderBy: { idx: "asc" } } },
    });
  }
}
