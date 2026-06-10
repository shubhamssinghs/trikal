import { Injectable, Logger } from "@nestjs/common";
import { PrismaClient, Prisma, Skill } from "@prisma/client";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { SettingsService } from "../settings/settings.service";
import { KnowledgeService } from "../knowledge/knowledge.service";
import { DiagramsService } from "../diagrams/diagrams.service";
import { ChartsService } from "../charts/charts.service";
import { ArtifactsService } from "../artifacts/artifacts.service";
import { CalendarService } from "../integrations/calendar.service";
import { McpService, type McpToolDef } from "../mcp/mcp.service";
import { HANDLERS, type SkillContext, type Citation } from "./skill-handlers";

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
    private readonly charts: ChartsService,
    private readonly artifacts: ArtifactsService,
    private readonly calendar: CalendarService,
    private readonly mcp: McpService,
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

  /**
   * A compact, always-fresh snapshot of the project's live state, injected into the
   * system prompt so the agent can answer "are we on track / what needs attention"
   * without being spoon-fed. Kept terse so it doesn't blow the context budget.
   */
  private async projectStateBlock(projectId: string, organizationId: string): Promise<string> {
    const project = await this.prisma.project.findFirst({ where: { id: projectId, organizationId }, select: { id: true } });
    if (!project) return "";

    const now = new Date();
    const sevRank: Record<string, number> = { high: 0, medium: 1, low: 2 };
    const [risks, milestones, members, pendingRecs, recentMeetings] = await Promise.all([
      this.prisma.risk.findMany({ where: { projectId, status: "open" }, select: { title: true, severity: true } }),
      this.prisma.milestone.findMany({ where: { projectId, status: { notIn: ["done", "completed"] } }, select: { name: true, dueDate: true } }),
      this.prisma.member.findMany({ where: { projectId }, select: { name: true, jobRole: { select: { label: true } } }, take: 30 }),
      this.prisma.recommendation.findMany({ where: { projectId, status: "PENDING" }, select: { title: true }, orderBy: { createdAt: "desc" }, take: 8 }),
      this.prisma.meetingTranscript.findMany({ where: { projectId }, select: { title: true, occurredAt: true }, orderBy: { occurredAt: "desc" }, take: 3 }),
    ]);

    const fmtDate = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "no date");
    const lines: string[] = [];

    if (members.length) {
      lines.push(`Team (${members.length}): ` + members.map((m) => `${m.name}${m.jobRole?.label ? ` (${m.jobRole.label})` : ""}`).join(", "));
    }
    if (risks.length) {
      risks.sort((a, b) => (sevRank[a.severity] ?? 1) - (sevRank[b.severity] ?? 1));
      lines.push(`Open risks (${risks.length}): ` + risks.slice(0, 8).map((r) => `[${r.severity}] ${r.title}`).join("; "));
    }
    if (milestones.length) {
      const withDates = [...milestones].sort((a, b) => (a.dueDate?.getTime() ?? Infinity) - (b.dueDate?.getTime() ?? Infinity));
      lines.push(`Open milestones (${milestones.length}): ` + withDates.slice(0, 8).map((m) => {
        const overdue = m.dueDate && m.dueDate < now ? " ⚠overdue" : "";
        return `${m.name} — due ${fmtDate(m.dueDate)}${overdue}`;
      }).join("; "));
    }
    if (pendingRecs.length) {
      lines.push(`Pending recommendations awaiting approval (${pendingRecs.length}): ` + pendingRecs.map((r) => r.title).join("; "));
    }
    if (recentMeetings.length) {
      lines.push(`Recent meetings: ` + recentMeetings.map((t) => `${t.title} (${fmtDate(t.occurredAt)})`).join("; "));
    }

    if (!lines.length) return "";
    return `\nLive project state (current as of now — use this directly; don't ask the user for it):\n- ${lines.join("\n- ")}`;
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
    // External tools from MCP servers (e.g. Tavily web search), when enabled.
    const mcpTools = await this.mcp.toolsFor(organizationId).catch(() => [] as McpToolDef[]);
    const mcpToolNames = new Set(mcpTools.map((t) => t.name));
    const project = projectId
      ? await this.prisma.project.findFirst({ where: { id: projectId, organizationId }, select: { name: true, description: true, aiInstructions: true } })
      : null;
    const stateBlock = projectId ? await this.projectStateBlock(projectId, organizationId) : "";

    const system = [
      "You are an AI technical-manager assistant operating inside a project command center.",
      "You have a set of skills (tools). Decide when to call them; you may chain several skills to satisfy a request.",
      "",
      "ANSWERING POLICY — decide where the answer should come from, then ground in it:",
      project
        ? "1) This project has a knowledge base (uploaded documents, transcripts, notes). For ANY question that could plausibly be answered from it — facts, figures, rates, how something works, definitions, decisions, who/what/when, anything about this project or its documents — you MUST consult it FIRST, never answer from training knowledge, and never dismiss a question as 'unrelated' without checking. If the user refers to a SPECIFIC meeting/update by name or date ('the morning update', 'Radence team update', 'Tuesday standup'), call read_meeting to open that WHOLE meeting — plain search only returns scattered chunks and will miss details like who is working on what. Otherwise call search_project_knowledge with the user's own specific words."
        : "1) There is no project knowledge base in this context; answer from general knowledge.",
      project
        ? "2) When the search returns relevant content, answer ONLY from it. Quote the specific numbers, rates, tables, names and figures VERBATIM from the sources and cite the [n] they came from. Do NOT paraphrase concrete figures into vague generalities, and do NOT pad the answer with generic best-practice advice that isn't in the sources. If the user asks 'how is X calculated/charged/defined', give the actual rule and numbers from the document, not high-level tips."
        : "",
      project
        ? "3) If the search returns nothing relevant, say plainly that the project's knowledge base doesn't cover it. Then, if you can, answer from general knowledge — but clearly label that part as general knowledge, not something from this project. Use a web search tool for this if one is available and the question needs current/external facts."
        : "",
      mcpTools.length
        ? `A web search tool is available (${mcpTools.map((t) => t.name).join(", ")}). Use it for current events or external facts that are NOT in the project's knowledge base — but search the project knowledge base first for anything project-specific. Cite the web sources you used.`
        : "",
      "Make it obvious in your answer what came from the project's knowledge base versus your general knowledge. When a diagram would communicate better than prose, create one.",
      "You can act on the project: create milestones and risks, update the project's status, and log actions. Use these when the user asks you to — internal changes apply immediately; external sends still require approval.",
      project ? `\nCurrent project: ${project.name}${project.description ? ` — ${project.description}` : ""}` : "",
      stateBlock,
      project?.aiInstructions ? `\nProject-specific instructions (follow these):\n${project.aiInstructions}` : "",
      conversation?.summary ? `\nEarlier in this conversation (summary):\n${conversation.summary}` : "",
      ...skills.filter((sk) => sk.instructions).map((sk) => `\n[${sk.name}] ${sk.instructions}`),
    ].filter(Boolean).join("\n");

    // Citation registry — sources the agent grounds on, surfaced to the user.
    const citations: Citation[] = [];
    const citeKey = (c: Pick<Citation, "kind" | "href" | "sourceId" | "title">) =>
      c.kind === "web" ? `web:${c.href}` : `kb:${c.sourceId ?? c.title}`;
    const cite = (c: Omit<Citation, "n">): number => {
      const key = citeKey(c);
      const found = citations.find((x) => citeKey(x) === key);
      if (found) return found.n;
      const n = citations.length + 1;
      citations.push({ n, ...c });
      return n;
    };

    const ctx: SkillContext = { projectId, organizationId, prisma: this.prisma, knowledge: this.knowledge, diagrams: this.diagrams, charts: this.charts, artifacts: this.artifacts, calendar: this.calendar, cite };
    const artifacts: unknown[] = [];

    // Inline any @-mentioned content into the message the model actually sees
    // (run.goal stays the original text shown in the chat).
    const referenced = mentions?.length && projectId ? await this.resolveMentions(mentions, projectId) : "";
    const effectiveGoal = goal + referenced;

    // Execute one tool call (shared by both providers): approval gate → handler.
    // Returns text for the model + an optional artifact (surfaced in the chat).
    const executeTool = async (slug: string, input: Record<string, unknown>): Promise<{ text: string; artifact?: unknown }> => {
      // MCP-provided tools (web search, etc.) route to the MCP server, not skills.
      if (mcpToolNames.has(slug)) {
        const text = await this.mcp.callTool(organizationId, slug, input);
        // Register the web pages it surfaced as citations.
        const urls = Array.from(new Set(text.match(/https?:\/\/[^\s)\]"']+/g) ?? [])).slice(0, 8);
        for (const u of urls) {
          let host = u;
          try { host = new URL(u).hostname.replace(/^www\./, ""); } catch { /* keep raw */ }
          cite({ kind: "web", title: host, href: u });
        }
        return { text };
      }
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
        const r = await this.loopOpenAI({ apiKey, model, system, goal: effectiveGoal, history, skills, mcpTools, bySlug, step, executeTool });
        ({ answer, tokensIn, tokensOut } = r);
      } else {
        const r = await this.loopAnthropic({ apiKey, model, system, goal: effectiveGoal, history, skills, mcpTools, bySlug, step, executeTool });
        ({ answer, tokensIn, tokensOut } = r);
      }
      // Surface the sources the agent grounded on (persisted as a step so it
      // reloads with the run; the UI renders citations + a source indicator).
      if (citations.length) await step("sources", { content: { citations } });
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
    const tools = [
      ...p.skills.map((sk) => ({ name: sk.slug, description: sk.description, input_schema: sk.inputSchema as Record<string, unknown> })),
      ...p.mcpTools.map((t) => ({ name: t.name, description: t.description, input_schema: t.inputSchema })),
    ];
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
    const tools = [
      ...p.skills.map((sk) => ({ type: "function" as const, function: { name: sk.slug, description: sk.description, parameters: sk.inputSchema as Record<string, unknown> } })),
      ...p.mcpTools.map((t) => ({ type: "function" as const, function: { name: t.name, description: t.description, parameters: t.inputSchema } })),
    ];
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
  mcpTools: McpToolDef[];
  bySlug: Map<string, Skill>;
  step: StepFn;
  executeTool: (slug: string, input: Record<string, unknown>) => Promise<{ text: string; artifact?: unknown }>;
}
