-- Rename the stakeholders table to members (concept renamed app-wide).
-- Existing FK constraints/indexes keep their physical names; Prisma maps by
-- table name (@@map("members")) so runtime is unaffected.
ALTER TABLE "stakeholders" RENAME TO "members";
