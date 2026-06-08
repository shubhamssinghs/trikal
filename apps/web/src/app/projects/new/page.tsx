import { CreateProjectForm } from "@/components/create-project-form";
import { queries } from "@/lib/api/queries";
import Link from "next/link";
import { Shell } from "@/components/shell";

export const dynamic = "force-dynamic";

export default async function NewProjectPage() {
  const companies = await queries.companies().catch(() => []);
  return (
    <Shell active="/projects" width="sm">
        <Link href="/projects" className="text-xs text-muted hover:text-foreground">← Projects</Link>
        <h1 className="text-xl font-semibold mt-2 mb-6">New Project</h1>
        <CreateProjectForm companies={companies} />
      </Shell>
  );
}
