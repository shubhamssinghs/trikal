import { PrismaClient, Prisma } from "@prisma/client";
import { KnowledgeService } from "../knowledge/knowledge.service";
import { DiagramsService } from "../diagrams/diagrams.service";
import { CalendarService } from "../integrations/calendar.service";

/** A source the agent grounded on, surfaced to the user as a numbered citation. */
export interface Citation {
  n: number;
  kind: "knowledge" | "web";
  title: string;
  sourceType?: string;
  sourceId?: string;
  href?: string;
}

/** Context passed to every skill handler. */
export interface SkillContext {
  projectId?: string | null;
  organizationId: string;
  prisma: PrismaClient;
  knowledge: KnowledgeService;
  diagrams: DiagramsService;
  calendar: CalendarService;
  /** Register a source for citation; returns its global [n]. Dedupes by source. */
  cite?: (c: Omit<Citation, "n">) => number;
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
    if (!hits.length) {
      return { text: `No results in the project knowledge base for "${query}". Tell the user the project's documents don't cover this; you may then answer from general knowledge but must label it as general (not from this project).` };
    }
    const sources = hits
      .map((h) => {
        const title = h.source?.title ?? "source";
        // Global, deduped citation number so the same document keeps one [n]
        // across multiple searches in a run.
        const n = ctx.cite
          ? ctx.cite({ kind: "knowledge", title, sourceType: h.source?.sourceType, sourceId: h.source?.id })
          : 0;
        return `[${n}] (${title}) ${h.content}`;
      })
      .join("\n\n")
      .slice(0, 8000);
    return {
      text:
        `Sources retrieved from the project knowledge base for "${query}". ` +
        `Answer the user using ONLY these sources: quote the specific figures, rates, tables and names VERBATIM, cite the [n], and do not substitute generic advice for the concrete details. ` +
        `If they don't actually contain the answer, say so.\n\n${sources}`,
    };
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
  // The calendar is the user's whole calendar (not per-project), so when there
  // is a project context we annotate which meetings actually belong to THIS
  // project (by attendee email/name, company/project name in the title, or
  // attendee email domain) so the agent never preps a different project's meeting.
  "calendar.upcoming": async (input, ctx) => {
    const days = typeof input.days === "number" ? input.days : 7;
    const events = await ctx.calendar.listUpcomingMeetings(ctx.organizationId, { days, max: 20 });
    if (!events.length) return { text: "No upcoming meetings found (or no calendar is connected). Connect Google Calendar in Settings → Integrations." };

    const fmt = (e: (typeof events)[number], tag?: string) => {
      const who = e.attendees.map((a) => a.name || a.email).filter(Boolean).join(", ");
      return `- ${e.title} — ${e.start ?? "?"}${e.end ? ` to ${e.end}` : ""}${who ? ` · attendees: ${who}` : ""}${e.joinUrl ? ` · ${e.joinUrl}` : ""}${tag ? ` ${tag}` : ""}`;
    };

    if (!ctx.projectId) {
      return { text: "Upcoming meetings:\n" + events.map((e) => fmt(e)).join("\n") };
    }

    // Project-scoped relevance matching.
    const project = await ctx.prisma.project.findFirst({
      where: { id: ctx.projectId, organizationId: ctx.organizationId },
      select: { name: true, company: { select: { name: true } } },
    });
    const members = await ctx.prisma.member.findMany({
      where: { projectId: ctx.projectId },
      select: { name: true, email: true },
    });

    const GENERIC = new Set(["gmail.com", "googlemail.com", "outlook.com", "hotmail.com", "yahoo.com", "icloud.com", "live.com", "aol.com"]);
    const norm = (s: string) => s.toLowerCase().trim();
    const domainOf = (email?: string) => (email && email.includes("@") ? norm(email.split("@")[1]) : "");

    const memberEmails = new Set(members.map((m) => norm(m.email ?? "")).filter(Boolean));
    const memberDomains = new Set(Array.from(memberEmails).map(domainOf).filter((d) => d && !GENERIC.has(d)));
    const memberNames = new Set(members.map((m) => norm(m.name)).filter((n) => n.length >= 3));
    const titleTokens = [project?.name, project?.company?.name]
      .filter(Boolean).map((s) => norm(String(s))).filter((s) => s.length >= 3);

    const scored = events.map((e) => {
      const reasons: string[] = [];
      const attEmails = e.attendees.map((a) => norm(a.email ?? "")).filter(Boolean);
      const attNames = e.attendees.map((a) => norm(a.name ?? "")).filter(Boolean);
      const t = norm(e.title ?? "");
      if (attEmails.some((em) => memberEmails.has(em))) reasons.push("attendee on this project");
      if (attNames.some((n) => memberNames.has(n))) reasons.push("named project member");
      if (titleTokens.some((tok) => t.includes(tok))) reasons.push("project/company in title");
      if (!reasons.length && attEmails.map(domainOf).some((d) => memberDomains.has(d))) reasons.push("attendee from project's domain");
      return { e, reasons };
    });

    const matched = scored.filter((s) => s.reasons.length);
    const others = scored.filter((s) => !s.reasons.length);
    const pname = project?.name ?? "this project";

    if (!matched.length) {
      return {
        text:
          `No upcoming meeting on the calendar appears to belong to "${pname}" (matched on project members, company/project name, or attendee domains). ` +
          `Do NOT prepare a brief for an unrelated meeting — tell the user none of their upcoming meetings match this project and list the upcoming meetings so they can pick one:\n` +
          others.map((s) => fmt(s.e)).join("\n"),
      };
    }

    const text =
      `Upcoming meetings for "${pname}" (prepare ONLY for these unless the user names a specific one):\n` +
      matched.map((s) => fmt(s.e, `  [matches: ${s.reasons.join(", ")}]`)).join("\n") +
      (others.length
        ? `\n\nOther upcoming meetings on the calendar that do NOT belong to this project (do not prep these unless explicitly asked):\n` +
          others.map((s) => fmt(s.e)).join("\n")
        : "");
    return { text };
  },

  // ── Write actions: internal project mutations the agent can perform directly ──
  // (Internal data only — not external sends — so they apply immediately.)

  // Create a milestone on the project.
  "milestone.create": async (input, ctx) => {
    if (!ctx.projectId) return { text: "No project context — milestones belong to a project." };
    const name = String(input.name ?? input.title ?? "").trim();
    if (!name) return { text: "A milestone needs a name." };
    const dueRaw = input.dueDate ? String(input.dueDate) : null;
    const dueDate = dueRaw && !Number.isNaN(Date.parse(dueRaw)) ? new Date(dueRaw) : null;
    const m = await ctx.prisma.milestone.create({
      data: {
        projectId: ctx.projectId,
        name: name.slice(0, 200),
        description: input.description ? String(input.description).slice(0, 1000) : null,
        dueDate,
      },
    });
    return {
      text: `Created milestone "${m.name}"${dueDate ? ` due ${dueDate.toISOString().slice(0, 10)}` : ""}. It's now on the project.`,
      artifact: { type: "milestone", id: m.id, label: m.name },
    };
  },

  // Open a risk on the project.
  "risk.create": async (input, ctx) => {
    if (!ctx.projectId) return { text: "No project context — risks belong to a project." };
    const title = String(input.title ?? input.text ?? "").trim();
    if (!title) return { text: "A risk needs a title." };
    const sev = String(input.severity ?? "medium").toLowerCase();
    const severity = ["low", "medium", "high"].includes(sev) ? sev : "medium";
    const r = await ctx.prisma.risk.create({
      data: {
        projectId: ctx.projectId,
        title: title.slice(0, 200),
        description: input.description ? String(input.description).slice(0, 1000) : null,
        severity,
        mitigationPlan: input.mitigationPlan ? String(input.mitigationPlan).slice(0, 1000) : null,
      },
    });
    return {
      text: `Opened a ${severity} risk: "${r.title}". It's now tracked on the project.`,
      artifact: { type: "risk", id: r.id, label: r.title },
    };
  },

  // Update the project's status.
  "project.set_status": async (input, ctx) => {
    if (!ctx.projectId) return { text: "No project context." };
    const raw = String(input.status ?? "").trim().toUpperCase().replace(/[\s-]+/g, "_");
    const allowed = ["ACTIVE", "AT_RISK", "ON_HOLD", "COMPLETED", "ARCHIVED"];
    if (!allowed.includes(raw)) return { text: `Status must be one of: ${allowed.join(", ")}.` };
    const p = await ctx.prisma.project.updateMany({
      where: { id: ctx.projectId, organizationId: ctx.organizationId },
      data: { status: raw as never },
    });
    if (!p.count) return { text: "Project not found." };
    return { text: `Project status set to ${raw}.` };
  },

  // Log a tracked action item (recommendation) on the project.
  "action.log": async (input, ctx) => {
    if (!ctx.projectId) return { text: "No project context." };
    const title = String(input.title ?? input.text ?? "").trim();
    if (!title) return { text: "An action needs a title." };
    const owner = input.owner ? String(input.owner) : null;
    const rec = await ctx.prisma.recommendation.create({
      data: {
        projectId: ctx.projectId,
        type: "ACTION_ITEM",
        title: title.slice(0, 200),
        description: owner ? `Owner: ${owner}` : (input.description ? String(input.description).slice(0, 1000) : null),
        payload: { source: "agent", owner } as Prisma.InputJsonValue,
      },
    });
    return {
      text: `Logged action item "${rec.title}"${owner ? ` (owner: ${owner})` : ""} — it's in the project's action queue.`,
      artifact: { type: "recommendation", id: rec.id, label: rec.title },
    };
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
