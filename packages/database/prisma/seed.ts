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
