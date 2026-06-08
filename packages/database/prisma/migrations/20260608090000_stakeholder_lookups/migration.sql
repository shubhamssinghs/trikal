-- Master lookup tables
CREATE TABLE "affiliations" (
  "id" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "color" TEXT NOT NULL DEFAULT '#64748b',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "affiliations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "affiliations_label_key" ON "affiliations"("label");

CREATE TABLE "job_roles" (
  "id" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "job_roles_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "job_roles_label_key" ON "job_roles"("label");

CREATE TABLE "org_units" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "org_units_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "org_units_name_key" ON "org_units"("name");

-- Stakeholder: replace free-text columns with FK lookups
ALTER TABLE "stakeholders" DROP COLUMN IF EXISTS "role";
ALTER TABLE "stakeholders" DROP COLUMN IF EXISTS "affiliation";
ALTER TABLE "stakeholders" DROP COLUMN IF EXISTS "organization";
ALTER TABLE "stakeholders" ADD COLUMN "affiliationId" TEXT;
ALTER TABLE "stakeholders" ADD COLUMN "jobRoleId" TEXT;
ALTER TABLE "stakeholders" ADD COLUMN "orgUnitId" TEXT;

ALTER TABLE "stakeholders" ADD CONSTRAINT "stakeholders_affiliationId_fkey" FOREIGN KEY ("affiliationId") REFERENCES "affiliations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "stakeholders" ADD CONSTRAINT "stakeholders_jobRoleId_fkey" FOREIGN KEY ("jobRoleId") REFERENCES "job_roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "stakeholders" ADD CONSTRAINT "stakeholders_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "org_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;
