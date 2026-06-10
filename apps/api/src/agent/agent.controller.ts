import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req, Res, NotFoundException } from "@nestjs/common";
import { Request, Response } from "express";
import { AgentRuntimeService } from "./agent-runtime.service";

const DEV_ORG_ID = "org_dev";

/** Display name of the signed-in user (from OIDC userinfo), for the agent's identity context. */
function userNameOf(req: Request): string | undefined {
  const u = (req as unknown as { user?: Record<string, unknown> }).user;
  if (!u) return undefined;
  return (u.name ?? u.preferred_username ?? u.given_name ?? u.email) as string | undefined;
}

@Controller("agent")
export class AgentController {
  constructor(private readonly agent: AgentRuntimeService) {}

  /** Ask the agent — it decides which skills to use and may chain several. */
  @Post("ask")
  ask(
    @Req() req: Request,
    @Body("question") question: string,
    @Body("projectId") projectId?: string,
    @Body("conversationId") conversationId?: string,
    @Body("mentions") mentions?: { type: string; id: string }[],
  ) {
    return this.agent.run({ surface: "ask", goal: question, projectId: projectId ?? null, organizationId: DEV_ORG_ID, conversationId: conversationId ?? null, mentions, userName: userNameOf(req) });
  }

  /** Streaming ask — emits thinking / tool calls / answer as Server-Sent Events. */
  @Post("ask/stream")
  async askStream(
    @Req() req: Request,
    @Res() res: Response,
    @Body("question") question: string,
    @Body("projectId") projectId?: string,
    @Body("conversationId") conversationId?: string,
    @Body("mentions") mentions?: { type: string; id: string }[],
  ) {
    const userName = userNameOf(req);
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    (res as unknown as { flushHeaders?: () => void }).flushHeaders?.();
    const send = (ev: unknown) => res.write(`data: ${JSON.stringify(ev)}\n\n`);
    try {
      await this.agent.run({ surface: "ask", goal: question, projectId: projectId ?? null, organizationId: DEV_ORG_ID, conversationId: conversationId ?? null, mentions, userName, onEvent: send });
    } catch (e) {
      send({ type: "error", message: e instanceof Error ? e.message : String(e) });
    }
    res.write("data: [DONE]\n\n");
    res.end();
  }

  /** Things the chat can @-mention (documents, diagrams, meetings, members). */
  @Get("mentionables")
  mentionables(@Query("projectId") projectId: string) {
    return this.agent.mentionables(DEV_ORG_ID, projectId);
  }

  // ── Conversations ──────────────────────────────────────────────────────────
  @Post("conversations")
  createConversation(@Body("projectId") projectId?: string, @Body("title") title?: string) {
    return this.agent.createConversation(DEV_ORG_ID, projectId ?? null, title);
  }

  @Get("conversations")
  listConversations(@Query("projectId") projectId?: string) {
    return this.agent.listConversations(DEV_ORG_ID, projectId);
  }

  @Get("conversations/:id")
  async getConversation(@Param("id") id: string) {
    const c = await this.agent.getConversation(id, DEV_ORG_ID);
    if (!c) throw new NotFoundException("Conversation not found");
    return c;
  }

  @Patch("conversations/:id")
  rename(@Param("id") id: string, @Body("title") title: string) {
    return this.agent.renameConversation(id, DEV_ORG_ID, title);
  }

  @Delete("conversations/:id")
  archive(@Param("id") id: string) {
    return this.agent.archiveConversation(id, DEV_ORG_ID);
  }

  /** Run a specific surface (e.g. transcript-driven) with an explicit goal. */
  @Post("run")
  run(@Body("goal") goal: string, @Body("surface") surface?: string, @Body("projectId") projectId?: string) {
    return this.agent.run({ surface: surface ?? "ask", goal, projectId: projectId ?? null, organizationId: DEV_ORG_ID });
  }

  @Get("runs")
  runs(@Query("projectId") projectId?: string) {
    return this.agent.listRuns(DEV_ORG_ID, projectId);
  }

  @Get("runs/:id")
  async run_(@Param("id") id: string) {
    const run = await this.agent.getRun(id, DEV_ORG_ID);
    if (!run) throw new NotFoundException("Run not found");
    return run;
  }
}
