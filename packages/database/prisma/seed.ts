import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.upsert({
    where: { id: "org_dev" },
    update: {},
    create: {
      id: "org_dev",
      name: "Trikal Dev",
      slug: "trikal-dev",
    },
  });

  const standardProfile = await prisma.complianceProfile.upsert({
    where: { id: "cp_standard" },
    update: {},
    create: {
      id: "cp_standard",
      name: "Standard",
    },
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

  console.log("Seeded:", { org: org.name, profiles: [standardProfile.name, hipaaProfile.name] });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
