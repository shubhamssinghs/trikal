import { CreateProjectForm } from "@/components/create-project-form";
import { queries } from "@/lib/api/queries";
import { Shell } from "@/components/shell";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function NewProjectPage() {
  const companies = await queries.companies().catch(() => []);
  return (
    <Shell active="/projects" width="xl">
      <PageHeader
        title="New Project"
        subtitle="Create a project under one of your companies."
        backHref="/projects"
        backLabel="Projects"
      />
      <CreateProjectForm companies={companies} />
    </Shell>
  );
}
