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
      description: "Search the current project's knowledge base (transcripts, notes, docs) for information relevant to a query. Call this when answering a question that depends on what was discussed or documented in the project.",
      handlerKey: "knowledge.search",
      kind: "action",
      instructions: null as string | null,
      inputSchema: { type: "object", properties: { query: { type: "string", description: "What to search for" } }, required: ["query"], additionalProperties: false },
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
      instructions: "When asked to write/prepare a document: first search the project knowledge base for relevant context, then write a clean, well-structured document in Markdown (title with #, sections with ##, bullets, short paragraphs) grounded only in that context. Pass the full markdown as contentMarkdown along with a title. Do NOT include a link to the document in your chat reply — the app surfaces it automatically.\n\nIMPORTANT — diagrams must be embedded INSIDE contentMarkdown, never created as a separate step:\n- If the user asks for a diagram in the document, write it directly into contentMarkdown as a fenced ```mermaid code block (use a sequenceDiagram, flowchart, or stateDiagram as appropriate). This is the required approach — do NOT call create_diagram and do NOT just describe the diagram in prose; the ```mermaid block must be present in the document body.\n- To include an EXISTING project diagram instead, call list_project_diagrams to get its id, then embed a fenced ```diagram block whose only content is that id.\n\nIf the user asks to revise an existing draft, call this again with the same documentId so it rewrites that document instead of creating a new one.",
      inputSchema: { type: "object", properties: { title: { type: "string" }, contentMarkdown: { type: "string", description: "The full document body in Markdown. May contain ```mermaid or ```diagram <id> blocks." }, documentId: { type: "string", description: "Set when revising an existing draft" } }, required: ["title", "contentMarkdown"], additionalProperties: false },
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
