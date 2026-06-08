-- Allow diagrams that aren't tied to a project (standalone / quick diagrams),
-- owned directly by an organization.
ALTER TABLE "diagrams" ALTER COLUMN "projectId" DROP NOT NULL;
ALTER TABLE "diagrams" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "diagrams" ADD CONSTRAINT "diagrams_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
