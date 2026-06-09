import { Injectable, Logger } from "@nestjs/common";
import { PrismaClient, Prisma, Skill } from "@prisma/client";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { SettingsService } from "../settings/settings.service";
import { KnowledgeService } from "../knowledge/knowledge.service";
import { DiagramsService } from "../diagrams/diagrams.service";
import { HANDLERS, type SkillContext } from "./skill-handlers";

const MAX_ITERATIONS = 8;
const DEFAULT_ANTHROPIC = "claude-opus-4-8";
const DEFAULT_OPENAI = "gpt-4o";

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

  private enabledSkills(organizationId: string): Promise<Skill[]> {
    return this.prisma.skill.findMany({
      where: { enabled: true, OR: [{ organizationId: null }, { organizationId }] },
      orderBy: { createdAt: "asc" },
    });
  }

  /**
   * Run the agent for a goal. Uses the org's configured provider (OpenAI
   * function-calling or Anthropic tool-use); the model decides which enabled
   * skills to call and may chain several. Every step is persisted as a trace.
   */
  async run({ surface, goal, projectId, organizationId }: RunInput) {
    const s = await this.settings.resolve(organizationId);
    const provider = s.llmProvider === "openai" ? "openai" : "anthropic";
    const apiKey = provider === "openai" ? s.openaiApiKey : s.anthropicApiKey;
    const model = s.llmModel || (provider === "openai" ? DEFAULT_OPENAI : DEFAULT_ANTHROPIC);

    const run = await this.prisma.agentRun.create({
      data: { surface, goal, projectId: projectId ?? null, organizationId, model, status: "running" },
    });

    let idx = 0;
    const step = (type: string, data: { skillSlug?: string; title?: string; content?: unknown }) =>
      this.prisma.agentStep.create({
        data: { runId: run.id, idx: idx++, type, skillSlug: data.skillSlug, title: data.title, content: (data.content ?? undefined) as Prisma.InputJsonValue | undefined },
      });

    if (!apiKey) {
      const answer = `No ${provider === "openai" ? "OpenAI" : "Anthropic"} API key is configured. Add one in Settings → AI & Models to use the agent.`;
      await step("error", { title: "Not configured", content: { error: answer } });
      await this.prisma.agentRun.update({ where: { id: run.id }, data: { status: "failed", error: "no_api_key", answer } });
      return { runId: run.id, answer, status: "failed" as const };
    }

    const skills = await this.enabledSkills(organizationId);
    const bySlug = new Map(skills.map((sk) => [sk.slug, sk]));
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
    const artifacts: unknown[] = [];

    // Execute one tool call (shared by both providers): approval gate → handler.
    const executeTool = async (slug: string, input: Record<string, unknown>): Promise<string> => {
      const skill = bySlug.get(slug);
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
        return `Queued "${skill.name}" for human approval — it will run after approval.`;
      }
      const handler = HANDLERS[skill?.handlerKey ?? ""];
      if (!handler) return `Skill "${slug}" has no executable handler; treat its instructions as guidance only.`;
      try {
        const out = await handler(input, ctx);
        if (out.artifact) artifacts.push(out.artifact);
        return out.text;
      } catch (e) {
        return `Skill "${slug}" failed: ${e instanceof Error ? e.message : String(e)}`;
      }
    };

    let answer = "";
    let tokensIn = 0;
    let tokensOut = 0;

    try {
      if (provider === "openai") {
        const r = await this.loopOpenAI({ apiKey, model, system, goal, skills, bySlug, step, executeTool });
        ({ answer, tokensIn, tokensOut } = r);
      } else {
        const r = await this.loopAnthropic({ apiKey, model, system, goal, skills, bySlug, step, executeTool });
        ({ answer, tokensIn, tokensOut } = r);
      }
      await this.prisma.agentRun.update({ where: { id: run.id }, data: { status: "completed", answer, tokensIn, tokensOut } });
      return { runId: run.id, answer: answer || "(no answer)", status: "completed" as const, artifacts };
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      this.logger.error(`Agent run ${run.id} failed: ${err}`);
      const friendly = this.friendlyError(err, provider);
      await step("error", { title: friendly ? "Provider error" : undefined, content: { error: friendly ?? err } });
      await this.prisma.agentRun.update({ where: { id: run.id }, data: { status: "failed", error: err, tokensIn, tokensOut } });
      return { runId: run.id, answer: answer || friendly || "The agent run failed. Check the run trace for details.", status: "failed" as const };
    }
  }

  // ── Anthropic tool-use loop ───────────────────────────────────────────────
  private async loopAnthropic(p: LoopParams) {
    const client = new Anthropic({ apiKey: p.apiKey });
    const tools = p.skills.map((sk) => ({ name: sk.slug, description: sk.description, input_schema: sk.inputSchema as Record<string, unknown> }));
    const messages: Anthropic.MessageParam[] = [{ role: "user", content: p.goal }];
    let answer = "", tokensIn = 0, tokensOut = 0;

    for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
      const params = { model: p.model, max_tokens: 8192, thinking: { type: "adaptive", display: "summarized" }, system: p.system, tools, messages };
      const res = (await client.messages.create(params as never)) as Anthropic.Message;
      tokensIn += res.usage?.input_tokens ?? 0;
      tokensOut += res.usage?.output_tokens ?? 0;

      for (const block of res.content as Array<{ type: string; text?: string; thinking?: string }>) {
        if (block.type === "thinking" && block.thinking) await p.step("thinking", { content: { text: block.thinking } });
        else if (block.type === "text" && block.text) { answer += (answer ? "\n" : "") + block.text; await p.step("text", { content: { text: block.text } }); }
      }
      if (res.stop_reason !== "tool_use") break;

      messages.push({ role: "assistant", content: res.content });
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of res.content) {
        if (block.type !== "tool_use") continue;
        const input = (block.input ?? {}) as Record<string, unknown>;
        await p.step("tool_call", { skillSlug: block.name, title: p.bySlug.get(block.name)?.name ?? block.name, content: { input } });
        const text = await p.executeTool(block.name, input);
        await p.step("tool_result", { skillSlug: block.name, content: { text } });
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: text });
      }
      messages.push({ role: "user", content: toolResults });
    }
    return { answer, tokensIn, tokensOut };
  }

  // ── OpenAI function-calling loop ──────────────────────────────────────────
  private async loopOpenAI(p: LoopParams) {
    const client = new OpenAI({ apiKey: p.apiKey });
    const tools = p.skills.map((sk) => ({ type: "function" as const, function: { name: sk.slug, description: sk.description, parameters: sk.inputSchema as Record<string, unknown> } }));
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: p.system },
      { role: "user", content: p.goal },
    ];
    let answer = "", tokensIn = 0, tokensOut = 0;

    for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
      const res = await client.chat.completions.create({
        model: p.model,
        max_tokens: 4096,
        messages,
        ...(tools.length ? { tools, tool_choice: "auto" as const } : {}),
      });
      tokensIn += res.usage?.prompt_tokens ?? 0;
      tokensOut += res.usage?.completion_tokens ?? 0;

      const msg = res.choices[0]?.message;
      if (!msg) break;
      if (msg.content) { answer += (answer ? "\n" : "") + msg.content; await p.step("text", { content: { text: msg.content } }); }
      messages.push(msg);

      const calls = msg.tool_calls ?? [];
      if (!calls.length) break;
      for (const tc of calls) {
        if (tc.type !== "function") continue;
        let input: Record<string, unknown> = {};
        try { input = JSON.parse(tc.function.arguments || "{}"); } catch { /* keep {} */ }
        await p.step("tool_call", { skillSlug: tc.function.name, title: p.bySlug.get(tc.function.name)?.name ?? tc.function.name, content: { input } });
        const text = await p.executeTool(tc.function.name, input);
        await p.step("tool_result", { skillSlug: tc.function.name, content: { text } });
        messages.push({ role: "tool", tool_call_id: tc.id, content: text });
      }
    }
    return { answer, tokensIn, tokensOut };
  }

  private friendlyError(err: string, provider: string): string | null {
    const m = err.toLowerCase();
    const who = provider === "openai" ? "OpenAI" : "Anthropic";
    if (m.includes("credit balance") || m.includes("insufficient_quota") || m.includes("insufficient") || m.includes("quota") || m.includes("billing"))
      return `${who} API: your account is out of credits/quota. Add billing in the ${who} console, then try again.`;
    if (m.includes("401") || m.includes("authentication") || m.includes("invalid x-api-key") || m.includes("invalid api key") || m.includes("incorrect api key"))
      return `${who} API: the API key is invalid. Update it in Settings → AI & Models.`;
    if (m.includes("429") || m.includes("rate"))
      return `${who} API: rate limited. Wait a moment and try again.`;
    if (m.includes("model") && (m.includes("does not exist") || m.includes("not found")))
      return `${who} API: the configured model isn't available to this key. Pick a different model in Settings → AI & Models.`;
    if (m.includes("overloaded") || m.includes("529"))
      return `${who} API is temporarily overloaded. Try again shortly.`;
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
    return this.prisma.agentRun.findFirst({ where: { id, organizationId }, include: { steps: { orderBy: { idx: "asc" } } } });
  }
}

type StepFn = (type: string, data: { skillSlug?: string; title?: string; content?: unknown }) => Promise<unknown>;
interface LoopParams {
  apiKey: string;
  model: string;
  system: string;
  goal: string;
  skills: Skill[];
  bySlug: Map<string, Skill>;
  step: StepFn;
  executeTool: (slug: string, input: Record<string, unknown>) => Promise<string>;
}
