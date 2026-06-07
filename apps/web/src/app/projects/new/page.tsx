import { CreateProjectForm } from "@/components/create-project-form";
import { queries } from "@/lib/api/queries";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function NewProjectPage() {
  const companies = await queries.companies().catch(() => []);
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <nav className="border-b border-gray-800 px-6 py-3 flex items-center gap-6">
        <Link href="/" className="font-semibold text-white">Trikal</Link>
        <Link href="/" className="text-sm text-gray-400 hover:text-white">Today</Link>
        <Link href="/companies" className="text-sm text-gray-400 hover:text-white">Companies</Link>
        <Link href="/projects" className="text-sm text-gray-400 hover:text-white">Projects</Link>
      </nav>
      <main className="max-w-lg mx-auto px-6 py-10">
        <Link href="/projects" className="text-xs text-gray-500 hover:text-gray-300">← Projects</Link>
        <h1 className="text-xl font-semibold mt-2 mb-6">New Project</h1>
        <CreateProjectForm companies={companies} />
      </main>
    </div>
  );
}
