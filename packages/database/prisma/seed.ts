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

  console.log("Seeded:", { org: org.name, profiles: [standardProfile.name, hipaaProfile.name], settings: "app_settings" });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
