import { PrismaClient, Prisma } from "@prisma/client";
import { KnowledgeService } from "../knowledge/knowledge.service";
import { DiagramsService } from "../diagrams/diagrams.service";
import { CalendarService } from "../integrations/calendar.service";

/** Context passed to every skill handler. */
export interface SkillContext {
  projectId?: string | null;
  organizationId: string;
  prisma: PrismaClient;
  knowledge: KnowledgeService;
  diagrams: DiagramsService;
  calendar: CalendarService;
}

/** A handler returns text for the model + an optional artifact surfaced in the UI. */
export interface HandlerResult {
  text: string;
  artifact?: { type: string; id?: string; label?: string; href?: string };
}

export type SkillHandler = (input: Record<string, unknown>, ctx: SkillContext) => Promise<HandlerResult>;

/**
 * Coded primitives. Dashboard-authored skills compose these by handlerKey;
 * adding a genuinely new side-effecting capability means adding a handler here.
 */
export const HANDLERS: Record<string, SkillHandler> = {
  // Search the project knowledge base (RAG).
  "knowledge.search": async (input, ctx) => {
    if (!ctx.projectId) return { text: "No project context — knowledge search is unavailable here." };
    const query = String(input.query ?? "").trim();
    if (!query) return { text: "No query provided." };
    const hits = await ctx.knowledge.searchProject(ctx.projectId, query, ctx.organizationId).catch(() => []);
    if (!hits.length) return { text: "No relevant information found in the project knowledge base." };
    const text = hits
      .map((h, i) => `[${i + 1}] (${h.source?.title ?? "source"}) ${h.content}`)
      .join("\n\n")
      .slice(0, 6000);
    return { text };
  },

  // Generate a diagram from the project (added to the project's Diagrams section as a draft).
  "diagram.create": async (input, ctx) => {
    const kind = typeof input.kind === "string" ? input.kind : "architecture";
    const prompt = typeof input.prompt === "string" ? input.prompt : undefined;
    const { diagram, nodeCount } = await ctx.diagrams.generate(ctx.organizationId, {
      projectId: ctx.projectId ?? null,
      kind,
      prompt,
    });
    const href = ctx.projectId ? `/projects/${ctx.projectId}/diagrams/${diagram.id}` : `/diagrams/${diagram.id}`;
    return {
      text: `Created a ${kind} diagram "${diagram.title}" with ${nodeCount} node(s). It's saved as a draft the user can open and edit.`,
      artifact: { type: "diagram", id: diagram.id, label: diagram.title, href },
    };
  },

  // Upcoming meetings from the connected calendar(s) — for meeting prep.
  "calendar.upcoming": async (input, ctx) => {
    const days = typeof input.days === "number" ? input.days : 7;
    const events = await ctx.calendar.listUpcomingMeetings(ctx.organizationId, { days, max: 20 });
    if (!events.length) return { text: "No upcoming meetings found (or no calendar is connected). Connect Google Calendar in Settings → Integrations." };
    const lines = events.map((e) => {
      const who = e.attendees.map((a) => a.name || a.email).filter(Boolean).join(", ");
      return `- ${e.title} — ${e.start ?? "?"}${e.end ? ` to ${e.end}` : ""}${who ? ` · attendees: ${who}` : ""}${e.joinUrl ? ` · ${e.joinUrl}` : ""}`;
    });
    return { text: "Upcoming meetings:\n" + lines.join("\n") };
  },

  // List the project's diagrams so the agent can reference/embed an existing one.
  "diagram.list": async (_input, ctx) => {
    if (!ctx.projectId) return { text: "No project context." };
    const diagrams = await ctx.prisma.diagram.findMany({
      where: { projectId: ctx.projectId },
      select: { id: true, title: true, kind: true },
      orderBy: { updatedAt: "desc" },
      take: 50,
    });
    if (!diagrams.length) return { text: "No diagrams exist in this project yet. Use create_diagram to make one." };
    return { text: "Project diagrams (embed one in a document with a ```diagram\\n<id>\\n``` block):\n" + diagrams.map((d) => `- ${d.title} (${d.kind}) — id: ${d.id}`).join("\n") };
  },

  // Draft a project document (markdown) → saved as a draft awaiting approval.
  // Iterates the same document when a documentId is supplied.
  "document.draft": async (input, ctx) => {
    if (!ctx.projectId) return { text: "No project context — documents are drafted within a project." };
    const title = String(input.title ?? "Untitled document").slice(0, 200);
    const content = String(input.contentMarkdown ?? input.content ?? "").trim();
    if (!content) return { text: "No document content was provided to save." };
    const documentId = typeof input.documentId === "string" ? input.documentId : null;

    let doc = documentId
      ? await ctx.prisma.projectDocument.findFirst({ where: { id: documentId, projectId: ctx.projectId } })
      : null;

    if (doc) {
      // Iteration: snapshot the old version, then overwrite (back to draft).
      await ctx.prisma.documentVersion.create({ data: { documentId: doc.id, version: doc.version, content: doc.content } });
      doc = await ctx.prisma.projectDocument.update({
        where: { id: doc.id },
        data: { title, content, version: doc.version + 1, status: "draft", approvedAt: null },
      });
    } else {
      doc = await ctx.prisma.projectDocument.create({
        data: { projectId: ctx.projectId, organizationId: ctx.organizationId, title, content, status: "draft" },
      });
    }

    return {
      text: `Drafted document "${doc.title}" (id: ${doc.id}, v${doc.version}). It's a draft awaiting your approval — approving adds it to the knowledge base. To revise it, call draft_document again with documentId "${doc.id}".`,
      artifact: { type: "document", id: doc.id, label: doc.title },
    };
  },

  // Skill-generator primitive: author a new composite/prompt skill (disabled until reviewed).
  "skill.create": async (input, ctx) => {
    const slug = String(input.slug ?? "").trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
    if (!slug) return { text: "A slug is required to create a skill." };
    const exists = await ctx.prisma.skill.findUnique({ where: { slug } });
    if (exists) return { text: `A skill with slug "${slug}" already exists. Pick a different slug.` };
    const kind = input.kind === "action" || input.kind === "prompt" ? input.kind : "composite";
    const created = await ctx.prisma.skill.create({
      data: {
        organizationId: ctx.organizationId,
        slug,
        name: String(input.name ?? slug),
        description: String(input.description ?? ""),
        instructions: typeof input.instructions === "string" ? input.instructions : null,
        kind,
        composes: Array.isArray(input.composes) ? (input.composes as string[]).map(String) : [],
        inputSchema: (input.inputSchema && typeof input.inputSchema === "object"
          ? input.inputSchema
          : { type: "object", properties: {}, additionalProperties: false }) as Prisma.InputJsonValue,
        enabled: false, // off until a human reviews it in Settings → Skills
        builtin: false,
      },
    });
    return {
      text: `Drafted a new ${kind} skill "${created.name}" (slug: ${created.slug}). It is disabled — enable it in Settings → Skills after review.`,
      artifact: { type: "skill", id: created.id, label: created.name, href: "/settings" },
    };
  },
};
