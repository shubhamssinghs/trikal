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

type Mention = { type: string; id: string };
export type AgentEvent =
  | { type: "meta"; runId: string; conversationId: string | null }
  | { type: "step"; step: { idx: number; type: string; skillSlug?: string | null; title?: string | null; content?: unknown } }
  | { type: "done"; status: string; answer: string; artifacts: unknown[] }
  | { type: "error"; message: string };
type RunInput = { surface: string; goal: string; projectId?: string | null; organizationId: string; conversationId?: string | null; mentions?: Mention[]; onEvent?: (ev: AgentEvent) => void };

const MAX_HISTORY_TURNS = 12; // recent turns sent verbatim; older ones live in the rolling summary

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
  /** Unified list of things the chat can @-mention (extensible per integration). */
  async mentionables(organizationId: string, projectId: string) {
    const [documents, diagrams, meetings, members] = await Promise.all([
      this.prisma.projectDocument.findMany({ where: { projectId, organizationId }, select: { id: true, title: true, status: true }, orderBy: { updatedAt: "desc" }, take: 50 }),
      this.prisma.diagram.findMany({ where: { projectId }, select: { id: true, title: true, kind: true }, orderBy: { updatedAt: "desc" }, take: 50 }),
      this.prisma.meetingTranscript.findMany({ where: { projectId, project: { organizationId } }, select: { id: true, title: true, source: true }, orderBy: { occurredAt: "desc" }, take: 50 }),
      this.prisma.member.findMany({ where: { projectId }, select: { id: true, name: true, jobRole: { select: { label: true } } }, orderBy: { name: "asc" }, take: 100 }),
    ]);
    return [
      ...documents.map((d) => ({ type: "document", id: d.id, label: d.title, sublabel: d.status })),
      ...diagrams.map((d) => ({ type: "diagram", id: d.id, label: d.title, sublabel: d.kind })),
      ...meetings.map((m) => ({ type: "meeting", id: m.id, label: m.title, sublabel: m.source })),
      ...members.map((m) => ({ type: "member", id: m.id, label: m.name, sublabel: m.jobRole?.label ?? undefined })),
    ];
  }

  /** Resolve @-mentions to text the model can use. */
  private async resolveMentions(mentions: Mention[], projectId: string): Promise<string> {
    const parts: string[] = [];
    for (const m of mentions.slice(0, 10)) {
      if (m.type === "document") {
        const d = await this.prisma.projectDocument.findFirst({ where: { id: m.id, projectId } });
        if (d) parts.push(`Document "${d.title}" (id: ${d.id}):\n${d.content.slice(0, 4000)}`);
      } else if (m.type === "diagram") {
        const d = await this.prisma.diagram.findFirst({ where: { id: m.id, projectId } });
        if (d) {
          const s = d.schemaJson as { mermaid?: string; nodes?: { label?: string }[]; edges?: unknown[] };
          const summary = s?.mermaid ? `mermaid:\n${s.mermaid}` : `nodes: ${(s?.nodes ?? []).map((n) => n.label).filter(Boolean).join(", ")}`;
          parts.push(`Diagram "${d.title}" (${d.kind}, id: ${d.id}) — embed with a \`\`\`diagram ${d.id}\`\`\` block. ${summary}`.slice(0, 2000));
        }
      } else if (m.type === "meeting") {
        const t = await this.prisma.meetingTranscript.findFirst({ where: { id: m.id, projectId } });
        if (t) parts.push(`Meeting "${t.title}":\n${t.rawContent.slice(0, 4000)}`);
      } else if (m.type === "member") {
        const mem = await this.prisma.member.findFirst({ where: { id: m.id, projectId }, include: { jobRole: true } });
        if (mem) parts.push(`Person: ${mem.name}${mem.jobRole?.label ? `, ${mem.jobRole.label}` : ""}${mem.email ? ` <${mem.email}>` : ""}`);
      }
    }
    return parts.length ? `\n\n[Referenced items the user @-mentioned — use these directly]\n${parts.join("\n\n")}` : "";
  }

  async run({ surface, goal, projectId, organizationId, conversationId, mentions, onEvent }: RunInput) {
    const s = await this.settings.resolve(organizationId);
    const provider = s.llmProvider === "openai" ? "openai" : "anthropic";
    const apiKey = provider === "openai" ? s.openaiApiKey : s.anthropicApiKey;
    const model = s.llmModel || (provider === "openai" ? DEFAULT_OPENAI : DEFAULT_ANTHROPIC);

    // Load conversation + prior turns (for memory) when in a thread.
    const conversation = conversationId
      ? await this.prisma.conversation.findFirst({ where: { id: conversationId, organizationId } })
      : null;
    const priorRuns = conversation
      ? await this.prisma.agentRun.findMany({
          where: { conversationId: conversation.id, status: "completed" },
          orderBy: { createdAt: "asc" },
          select: { goal: true, answer: true },
        })
      : [];
    const history = priorRuns
      .slice(-MAX_HISTORY_TURNS)
      .flatMap((r) => [
        { role: "user" as const, content: r.goal },
        { role: "assistant" as const, content: r.answer ?? "" },
      ])
      .filter((m) => m.content);

    const run = await this.prisma.agentRun.create({
      data: { surface, goal, projectId: projectId ?? null, organizationId, conversationId: conversation?.id ?? null, model, status: "running" },
    });

    onEvent?.({ type: "meta", runId: run.id, conversationId: conversation?.id ?? null });

    let idx = 0;
    const step = async (type: string, data: { skillSlug?: string; title?: string; content?: unknown }) => {
      const i = idx++;
      await this.prisma.agentStep.create({
        data: { runId: run.id, idx: i, type, skillSlug: data.skillSlug, title: data.title, content: (data.content ?? undefined) as Prisma.InputJsonValue | undefined },
      });
      onEvent?.({ type: "step", step: { idx: i, type, skillSlug: data.skillSlug, title: data.title, content: data.content } });
    };

    if (!apiKey) {
      const answer = `No ${provider === "openai" ? "OpenAI" : "Anthropic"} API key is configured. Add one in Settings → AI & Models to use the agent.`;
      await step("error", { title: "Not configured", content: { error: answer } });
      await this.prisma.agentRun.update({ where: { id: run.id }, data: { status: "failed", error: "no_api_key", answer } });
      onEvent?.({ type: "done", status: "failed", answer, artifacts: [] });
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
      conversation?.summary ? `\nEarlier in this conversation (summary):\n${conversation.summary}` : "",
      ...skills.filter((sk) => sk.instructions).map((sk) => `\n[${sk.name}] ${sk.instructions}`),
    ].filter(Boolean).join("\n");

    const ctx: SkillContext = { projectId, organizationId, prisma: this.prisma, knowledge: this.knowledge, diagrams: this.diagrams };
    const artifacts: unknown[] = [];

    // Inline any @-mentioned content into the message the model actually sees
    // (run.goal stays the original text shown in the chat).
    const referenced = mentions?.length && projectId ? await this.resolveMentions(mentions, projectId) : "";
    const effectiveGoal = goal + referenced;

    // Execute one tool call (shared by both providers): approval gate → handler.
    // Returns text for the model + an optional artifact (surfaced in the chat).
    const executeTool = async (slug: string, input: Record<string, unknown>): Promise<{ text: string; artifact?: unknown }> => {
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
        return { text: `Queued "${skill.name}" for human approval — it will run after approval.` };
      }
      const handler = HANDLERS[skill?.handlerKey ?? ""];
      if (!handler) return { text: `Skill "${slug}" has no executable handler; treat its instructions as guidance only.` };
      try {
        const out = await handler(input, ctx);
        if (out.artifact) artifacts.push(out.artifact);
        return { text: out.text, artifact: out.artifact };
      } catch (e) {
        return { text: `Skill "${slug}" failed: ${e instanceof Error ? e.message : String(e)}` };
      }
    };

    let answer = "";
    let tokensIn = 0;
    let tokensOut = 0;

    try {
      if (provider === "openai") {
        const r = await this.loopOpenAI({ apiKey, model, system, goal: effectiveGoal, history, skills, bySlug, step, executeTool });
        ({ answer, tokensIn, tokensOut } = r);
      } else {
        const r = await this.loopAnthropic({ apiKey, model, system, goal: effectiveGoal, history, skills, bySlug, step, executeTool });
        ({ answer, tokensIn, tokensOut } = r);
      }
      await this.prisma.agentRun.update({ where: { id: run.id }, data: { status: "completed", answer, tokensIn, tokensOut } });
      if (conversation) {
        await this.prisma.conversation.update({
          where: { id: conversation.id },
          data: {
            lastMessageAt: new Date(),
            // Title the thread from its first user message.
            ...(conversation.title === "New chat" && priorRuns.length === 0 ? { title: goal.slice(0, 60) } : {}),
          },
        });
      }
      onEvent?.({ type: "done", status: "completed", answer: answer || "(no answer)", artifacts });
      return { runId: run.id, conversationId: conversation?.id ?? null, answer: answer || "(no answer)", status: "completed" as const, artifacts };
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      this.logger.error(`Agent run ${run.id} failed: ${err}`);
      const friendly = this.friendlyError(err, provider);
      await step("error", { title: friendly ? "Provider error" : undefined, content: { error: friendly ?? err } });
      await this.prisma.agentRun.update({ where: { id: run.id }, data: { status: "failed", error: err, tokensIn, tokensOut } });
      const answerOut = answer || friendly || "The agent run failed. Check the run trace for details.";
      onEvent?.({ type: "done", status: "failed", answer: answerOut, artifacts });
      return { runId: run.id, answer: answerOut, status: "failed" as const };
    }
  }

  // ── Anthropic tool-use loop ───────────────────────────────────────────────
  private async loopAnthropic(p: LoopParams) {
    const client = new Anthropic({ apiKey: p.apiKey });
    const tools = p.skills.map((sk) => ({ name: sk.slug, description: sk.description, input_schema: sk.inputSchema as Record<string, unknown> }));
    const messages: Anthropic.MessageParam[] = [...p.history.map((h) => ({ role: h.role, content: h.content })), { role: "user", content: p.goal }];
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
        const r = await p.executeTool(block.name, input);
        await p.step("tool_result", { skillSlug: block.name, content: { text: r.text, artifact: r.artifact } });
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: r.text });
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
      ...p.history.map((h) => ({ role: h.role, content: h.content })),
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
        const r = await p.executeTool(tc.function.name, input);
        await p.step("tool_result", { skillSlug: tc.function.name, content: { text: r.text, artifact: r.artifact } });
        messages.push({ role: "tool", tool_call_id: tc.id, content: r.text });
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

  // ── Conversations (chat threads) ──────────────────────────────────────────
  createConversation(organizationId: string, projectId?: string | null, title?: string) {
    return this.prisma.conversation.create({
      data: { organizationId, projectId: projectId ?? null, title: title?.trim() || "New chat" },
    });
  }

  listConversations(organizationId: string, projectId?: string) {
    return this.prisma.conversation.findMany({
      where: { organizationId, archived: false, ...(projectId ? { projectId } : {}) },
      orderBy: { lastMessageAt: "desc" },
      take: 100,
      select: { id: true, title: true, projectId: true, lastMessageAt: true, createdAt: true },
    });
  }

  /** A conversation with its turns (each turn = user goal + assistant answer + trace steps). */
  getConversation(id: string, organizationId: string) {
    return this.prisma.conversation.findFirst({
      where: { id, organizationId },
      include: {
        runs: {
          orderBy: { createdAt: "asc" },
          include: { steps: { orderBy: { idx: "asc" } } },
        },
      },
    });
  }

  async renameConversation(id: string, organizationId: string, title: string) {
    await this.prisma.conversation.updateMany({ where: { id, organizationId }, data: { title: title.trim() || "New chat" } });
    return { ok: true };
  }

  async archiveConversation(id: string, organizationId: string) {
    await this.prisma.conversation.updateMany({ where: { id, organizationId }, data: { archived: true } });
    return { ok: true };
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
type HistoryTurn = { role: "user" | "assistant"; content: string };
interface LoopParams {
  apiKey: string;
  model: string;
  system: string;
  goal: string;
  history: HistoryTurn[];
  skills: Skill[];
  bySlug: Map<string, Skill>;
  step: StepFn;
  executeTool: (slug: string, input: Record<string, unknown>) => Promise<{ text: string; artifact?: unknown }>;
}
