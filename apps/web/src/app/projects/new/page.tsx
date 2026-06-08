import { CreateProjectForm } from "@/components/create-project-form";
import { queries } from "@/lib/api/queries";
import Link from "next/link";
import { Nav } from "@/components/nav";

export const dynamic = "force-dynamic";

export default async function NewProjectPage() {
  const companies = await queries.companies().catch(() => []);
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <Nav active="/projects" />
      <main className="max-w-lg mx-auto px-6 py-10">
        <Link href="/projects" className="text-xs text-gray-500 hover:text-gray-300">← Projects</Link>
        <h1 className="text-xl font-semibold mt-2 mb-6">New Project</h1>
        <CreateProjectForm companies={companies} />
      </main>
    </div>
  );
}
