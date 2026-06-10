import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.upsert({
    where: { id: "org_dev" },
    update: {},
    create: { id: "org_dev", name: "Trikal Dev", slug: "trikal-dev" },
  });

  await prisma.user.upsert({
    where: { id: "user_dev" },
    update: {},
    create: {
      id: "user_dev",
      email: "dev@trikal.local",
      name: "Dev User",
      organizationId: "org_dev",
    },
  });

  const standardProfile = await prisma.complianceProfile.upsert({
    where: { id: "cp_standard" },
    update: {},
    create: { id: "cp_standard", name: "Standard" },
  });

  const hipaaProfile = await prisma.complianceProfile.upsert({
    where: { id: "cp_hipaa" },
    update: {},
    create: {
      id: "cp_hipaa",
      name: "HIPAA / PHI Sensitive",
      hipaaEnabled: true,
      piaRequired: true,
      phiHandling: "strict",
      auditLevel: "full",
      aiAccessPolicy: "restricted",
    },
  });

  // Settings — seed keys from env on first run (so existing .env keys migrate into DB)
  await prisma.appSettings.upsert({
    where: { organizationId: "org_dev" },
    update: {},
    create: {
      organizationId: "org_dev",
      llmProvider: "anthropic",
      llmModel: "claude-sonnet-4-6",
      anthropicApiKey: process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== "sk-ant-change-me"
        ? process.env.ANTHROPIC_API_KEY : null,
      openaiApiKey: process.env.OPENAI_API_KEY ?? null,
      voyageApiKey: process.env.VOYAGE_API_KEY || null,
    },
  });

  // Affiliations (with colors)
  const affiliations = [
    { label: "Client", color: "#3b82f6" },
    { label: "Consultant", color: "#8b5cf6" },
    { label: "Vendor", color: "#f59e0b" },
    { label: "Partner", color: "#10b981" },
    { label: "Internal", color: "#64748b" },
  ];
  for (const a of affiliations) {
    await prisma.affiliation.upsert({ where: { label: a.label }, update: {}, create: a });
  }

  // Platform-relevant roles
  const roles = [
    "Executive Sponsor", "CEO", "CTO", "VP Engineering", "Program Manager",
    "Project Manager", "Technical Project Manager", "Product Owner", "Product Manager",
    "Business Analyst", "Solution Architect", "Engineering Lead", "Frontend Developer",
    "Backend Developer", "Full-stack Developer", "AI / ML Developer", "QA Engineer",
    "DevOps Engineer", "UX Designer", "UI Designer", "Scrum Master", "Client Contact",
    "Vendor Contact", "Stakeholder",
  ];
  for (const label of roles) {
    await prisma.jobRole.upsert({ where: { label }, update: {}, create: { label } });
  }

  // Built-in AI skills (tools the agent can call). organizationId null = global.
  const skills = [
    {
      slug: "search_project_knowledge",
      name: "Search project knowledge",
      description: "Search the current project's knowledge base (uploaded documents, transcripts, notes). Call this FIRST — before answering — for ANY question that could be answered from the project's documents: facts, figures, rates, how something works, definitions, decisions, people, processes. Use the user's specific terms. Do not assume the answer isn't there without searching, and do not answer such questions from your own general knowledge.",
      handlerKey: "knowledge.search",
      kind: "action",
      instructions: null as string | null,
      inputSchema: { type: "object", properties: { query: { type: "string", description: "What to search for" } }, required: ["query"], additionalProperties: false },
    },
    {
      slug: "read_meeting",
      name: "Read a specific meeting",
      description: "Open ONE specific meeting/note in full by name or date — e.g. 'the morning update', 'Radence team update', 'Tuesday DSU', 'the 10 Jun standup'. Use this (not search) whenever the user refers to a particular meeting and you need exactly what was said in it — who said what, what each person is working on, decisions. Returns the full transcript.",
      handlerKey: "meeting.read",
      kind: "action",
      instructions: "Pass a distinctive keyword from the meeting's title (e.g. 'Morning Update', 'Radence', a date) as `title`. It returns the most recent matching meeting in full — answer from it verbatim (quote who is working on what), don't generalise into logistics. If nothing matches, fall back to search_project_knowledge.",
      inputSchema: { type: "object", properties: { title: { type: "string", description: "Keyword from the meeting title or date" } }, additionalProperties: false },
    },
    {
      slug: "create_diagram",
      name: "Create a diagram",
      description: "Generate an editable diagram for the project. Call this when a diagram would explain something better than prose — architecture, a data/sequence flow, or a process. Saves a draft the user can open and edit.",
      handlerKey: "diagram.create",
      kind: "action",
      instructions: null as string | null,
      inputSchema: { type: "object", properties: { kind: { type: "string", enum: ["architecture", "flow", "sequence", "state", "gantt"], description: "Diagram type" }, prompt: { type: "string", description: "What the diagram should depict" } }, required: ["kind"], additionalProperties: false },
    },
    {
      slug: "list_upcoming_meetings",
      name: "Upcoming meetings",
      description: "List the user's upcoming meetings from their connected calendar (title, time, attendees, join link). Call this for meeting prep or 'what's on my calendar' questions.",
      handlerKey: "calendar.upcoming",
      kind: "action",
      instructions: null as string | null,
      inputSchema: { type: "object", properties: { days: { type: "number", description: "How many days ahead to look (default 7)" } }, additionalProperties: false },
    },
    {
      slug: "prepare_for_meeting",
      name: "Prepare me for the meeting",
      description: "Prepare the user for an upcoming meeting: find the next (or specified) meeting on their calendar, then pull relevant context from the project knowledge base and produce a prep brief.",
      handlerKey: null as string | null,
      kind: "composite",
      composes: ["list_upcoming_meetings", "search_project_knowledge"],
      instructions: "To prepare for a meeting (you are ALWAYS inside one specific project — only prep meetings that belong to it):\n1) call list_upcoming_meetings. Its output marks which meetings belong to THIS project ('matches: …') versus other projects. You MUST only prepare for meetings flagged as belonging to this project. If the tool says none of the upcoming meetings match this project, STOP and tell the user that — list the upcoming meetings and ask which one they mean (or note it likely belongs to a different project). NEVER prepare a brief for a meeting flagged as belonging to another project, even if it's the soonest one.\n2) Among the project's matching meetings, pick the one(s) the user means (e.g. 'tomorrow' = meetings on that date; 'the Kindro DSU' = that title). If vague and several match, prepare the 1-3 most relevant and say which you chose.\n3) For EACH chosen meeting, call search_project_knowledge with SPECIFIC queries built from the meeting's title and distinctive attendee names/topics (e.g. 'Kindro Care DSU action items', 'Wave CRM integration decisions') — NEVER search the literal word 'meeting'. Run more than one query if useful.\n4) Ground the brief ONLY in what the searches return: recap of the last related discussion, decisions made, and open action items, each tied to its source. If the knowledge base has nothing relevant, say 'No prior context found in this project' — do NOT invent generic 'focus'/'next steps' text or infer an agenda the sources don't support.\n5) Output per meeting: when & attendees, what happened last time (grounded), open items to follow up, and 3-5 concrete talking points.\nNote: the knowledge base is per-project, so you can only ground meetings that belong to this project.",
      inputSchema: { type: "object", properties: { meeting: { type: "string", description: "Optional: which meeting (title/keyword); otherwise the next one" } }, additionalProperties: false },
    },
    {
      slug: "list_project_diagrams",
      name: "List project diagrams",
      description: "List the diagrams that already exist in this project (with their ids), so you can reference or embed one — e.g. when adding an existing diagram to a document.",
      handlerKey: "diagram.list",
      kind: "action",
      instructions: null as string | null,
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
    },
    {
      slug: "draft_document",
      name: "Document drafter",
      description: "Draft a document (spec, summary, proposal, report, handover, meeting recap, PRD) from the project's knowledge base or the current conversation. Produces a draft the user approves before it's saved to the knowledge base.",
      handlerKey: "document.draft",
      kind: "action",
      instructions: "When asked to write/prepare a document: first search the project knowledge base for relevant context, then write a clean, well-structured document in Markdown (title with #, sections with ##, bullets, short paragraphs) grounded only in that context. Pass the full markdown as contentMarkdown along with a title. Do NOT include a link to the document in your chat reply — the app surfaces it automatically.\n\nIMPORTANT — diagrams must be embedded INSIDE contentMarkdown, never created as a separate step:\n- If the user asks for a diagram in the document, write it directly into contentMarkdown as a fenced ```mermaid code block (use a sequenceDiagram, flowchart, or stateDiagram as appropriate). This is the required approach — do NOT call create_diagram and do NOT just describe the diagram in prose; the ```mermaid block must be present in the document body.\n- To include an EXISTING project diagram instead, call list_project_diagrams to get its id, then embed a fenced ```diagram block whose only content is that id.\n- For DATA (comparisons, trends, distributions, cost/usage numbers), call create_chart first to make a chart, then embed it with a fenced ```chart block whose only content is the returned chart id. Prefer a chart over a long table when showing numbers.\n- For structured tabular data (comparison matrices, rate cards), call create_table and embed it with a fenced ```table block (its id) — this exports as a real Word table. For data the user will want as Excel, call create_spreadsheet and embed a ```sheet block.\n\nIf the user asks to revise an existing draft, call this again with the same documentId so it rewrites that document instead of creating a new one.",
      inputSchema: { type: "object", properties: { title: { type: "string" }, contentMarkdown: { type: "string", description: "The full document body in Markdown. May contain ```mermaid or ```diagram <id> blocks." }, documentId: { type: "string", description: "Set when revising an existing draft" } }, required: ["title", "contentMarkdown"], additionalProperties: false },
    },
    {
      slug: "create_chart",
      name: "Create a chart",
      description: "Generate a data visualization (bar, line, area, pie, or doughnut chart) from numbers — comparisons, trends over time, distributions, breakdowns. Call this whenever data would be clearer as a chart than a table, e.g. cost comparisons, usage over time, credit consumption by model. Returns a chart you can embed in a document or chat reply with a ```chart <id>``` block.",
      handlerKey: "chart.create",
      kind: "action",
      instructions: "Build the chart from real numbers (from the knowledge base or the conversation). Choose the type that fits: bar = compare categories, line/area = trend over an ordered axis (time), pie/doughnut = parts of a whole. Provide `labels` (the categories / x-axis points / pie slices) and one or more `series`, each with a `label` and a `data` array of numbers aligned to the labels. Set `valueLabel` to the unit (e.g. 'Credits'). After creating it, embed it where it belongs with a fenced ```chart block whose only content is the returned id.",
      inputSchema: { type: "object", properties: { type: { type: "string", enum: ["bar", "line", "area", "pie", "doughnut"] }, title: { type: "string" }, labels: { type: "array", items: { type: "string" }, description: "Category labels / x-axis points / pie slices" }, series: { type: "array", items: { type: "object", properties: { label: { type: "string" }, data: { type: "array", items: { type: "number" } }, color: { type: "string", description: "Optional hex color" } }, required: ["label", "data"] } }, stacked: { type: "boolean" }, valueLabel: { type: "string", description: "Value/y-axis unit, e.g. Credits" } }, required: ["type", "title", "labels", "series"], additionalProperties: false },
    },
    {
      slug: "create_table",
      name: "Create a table",
      description: "Build a styled data table (comparison matrix, breakdown, summary grid). Renders inline and exports as a real Word table in .docx. Use when tabular data is clearer than prose — e.g. model-vs-model comparisons, rate cards, option matrices.",
      handlerKey: "table.create",
      kind: "action",
      instructions: "Provide `columns` (header strings) and `rows` (each row an array of cell values aligned to the columns; numbers stay numeric). Keep it grounded in real data. After creating, embed it with a fenced ```table block whose only content is the returned id.",
      inputSchema: { type: "object", properties: { title: { type: "string" }, columns: { type: "array", items: { type: "string" } }, rows: { type: "array", items: { type: "array", items: {} } }, note: { type: "string" } }, required: ["title", "columns", "rows"], additionalProperties: false },
    },
    {
      slug: "create_slides",
      name: "Create a slide deck",
      description: "Generate a presentation deck (titles + bullet points, with optional embedded chart or diagram per slide). Renders as a deck the user can present and export to PowerPoint (.pptx). Use for exec summaries, readouts, proposals — e.g. 'turn this into a one-slide model comparison'.",
      handlerKey: "slides.create",
      kind: "action",
      instructions: "Build concise, executive-ready slides: each slide has a short `title` and 3-6 punchy `bullets`. To put a visual on a slide, first create_chart or create_diagram, then set that slide's `chartId` or `diagramId` to the returned id. Ground content in the knowledge base. After creating, embed the deck with a fenced ```slides block whose only content is the returned id.",
      inputSchema: { type: "object", properties: { title: { type: "string" }, slides: { type: "array", items: { type: "object", properties: { title: { type: "string" }, bullets: { type: "array", items: { type: "string" } }, chartId: { type: "string" }, diagramId: { type: "string" }, notes: { type: "string" } }, required: ["title"] } } }, required: ["title", "slides"], additionalProperties: false },
    },
    {
      slug: "create_spreadsheet",
      name: "Create a spreadsheet",
      description: "Build a spreadsheet (grid of columns + rows) the user can view and download as Excel (.xlsx). Use for data the user will want to sort/filter/keep — cost breakdowns, trackers, exports.",
      handlerKey: "sheet.create",
      kind: "action",
      instructions: "Provide `columns` (headers) and `rows` (arrays of cell values aligned to columns; keep numbers numeric so Excel treats them as numbers). After creating, embed it with a fenced ```sheet block whose only content is the returned id.",
      inputSchema: { type: "object", properties: { title: { type: "string" }, columns: { type: "array", items: { type: "string" } }, rows: { type: "array", items: { type: "array", items: {} } } }, required: ["title", "columns", "rows"], additionalProperties: false },
    },
    {
      slug: "create_milestone",
      name: "Create a milestone",
      description: "Add a milestone to the current project (a dated deliverable/checkpoint). Call this when the user asks to plan, schedule, or track a deliverable, or when a meeting clearly established a target date.",
      handlerKey: "milestone.create",
      kind: "action",
      instructions: null as string | null,
      inputSchema: { type: "object", properties: { name: { type: "string", description: "Milestone name" }, dueDate: { type: "string", description: "Due date YYYY-MM-DD (optional)" }, description: { type: "string" } }, required: ["name"], additionalProperties: false },
    },
    {
      slug: "open_risk",
      name: "Open a risk",
      description: "Track a new risk on the current project (something that could derail it). Call this when the user flags a concern/blocker, or when analysis/meetings surface a material risk worth tracking.",
      handlerKey: "risk.create",
      kind: "action",
      instructions: null as string | null,
      inputSchema: { type: "object", properties: { title: { type: "string" }, severity: { type: "string", enum: ["low", "medium", "high"] }, description: { type: "string" }, mitigationPlan: { type: "string" } }, required: ["title"], additionalProperties: false },
    },
    {
      slug: "set_project_status",
      name: "Set project status",
      description: "Change the current project's status (ACTIVE, AT_RISK, ON_HOLD, COMPLETED, ARCHIVED). Call this when the user asks to mark a project at-risk, on hold, complete, etc.",
      handlerKey: "project.set_status",
      kind: "action",
      instructions: null as string | null,
      inputSchema: { type: "object", properties: { status: { type: "string", enum: ["ACTIVE", "AT_RISK", "ON_HOLD", "COMPLETED", "ARCHIVED"] } }, required: ["status"], additionalProperties: false },
    },
    {
      slug: "log_action_item",
      name: "Log an action item",
      description: "Record a tracked action item / to-do on the current project (with an optional owner). Call this when the user asks you to note a follow-up, assign a task, or capture next steps.",
      handlerKey: "action.log",
      kind: "action",
      instructions: null as string | null,
      inputSchema: { type: "object", properties: { title: { type: "string" }, owner: { type: "string" }, description: { type: "string" } }, required: ["title"], additionalProperties: false },
    },
    {
      slug: "generate_skill",
      name: "Skill generator",
      description: "Author a new reusable skill from a specification: a name, description, when-to-use instructions, and which existing skills it composes. The new skill is created disabled for human review in Settings → Skills.",
      handlerKey: "skill.create",
      kind: "action",
      instructions: "When the user asks to create or design a new skill: first research the intent and review the skills that already exist so you can compose them where useful. If the request is ambiguous, ask one or two clarifying questions before proceeding. Then author the complete skill yourself — a clear snake_case slug, a name, a description that states WHEN the agent should call it, when-to-use instructions, the kind (composite if it orchestrates existing skills, else prompt), and which existing skill slugs it composes — and call generate_skill with those fields. The new skill is created disabled for human review.",
      inputSchema: { type: "object", properties: { slug: { type: "string" }, name: { type: "string" }, description: { type: "string" }, instructions: { type: "string" }, kind: { type: "string", enum: ["composite", "prompt"] }, composes: { type: "array", items: { type: "string" } } }, required: ["slug", "name", "description"], additionalProperties: false },
    },
  ];
  for (const sk of skills) {
    await prisma.skill.upsert({
      where: { slug: sk.slug },
      update: { name: sk.name, description: sk.description, handlerKey: sk.handlerKey, inputSchema: sk.inputSchema, instructions: sk.instructions },
      create: { ...sk, organizationId: null, builtin: true, enabled: true },
    });
  }

  console.log("Seeded:", {
    org: org.name,
    profiles: [standardProfile.name, hipaaProfile.name],
    affiliations: affiliations.length,
    roles: roles.length,
    skills: skills.length,
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
