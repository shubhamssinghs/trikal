import Link from "next/link";
import { queries } from "@/lib/api/queries";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const projects = await queries.projects().catch(() => []);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <nav className="border-b border-gray-800 px-6 py-3 flex items-center gap-6">
        <Link href="/" className="font-semibold text-white">Trikal</Link>
        <Link href="/" className="text-sm text-gray-400 hover:text-white">Today</Link>
        <Link href="/companies" className="text-sm text-gray-400 hover:text-white">Companies</Link>
        <Link href="/projects" className="text-sm text-white">Projects</Link>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-6">
        <h1 className="text-xl font-semibold mb-6">Projects</h1>
        {projects.length === 0 ? (
          <p className="text-sm text-gray-500">No projects yet.</p>
        ) : (
          <div className="grid gap-3">
            {projects.map((p) => (
              <Link key={p.id} href={`/projects/${p.id}`}
                className="rounded-lg border border-gray-800 bg-gray-900 px-5 py-4 hover:border-gray-600 transition-colors flex items-center justify-between">
                <div>
                  <h2 className="font-medium text-white">{p.name}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">{p.company?.name}</p>
                </div>
                <div className="text-right">
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    p.status === "ACTIVE" ? "bg-emerald-900/50 text-emerald-400" :
                    p.status === "AT_RISK" ? "bg-amber-900/50 text-amber-400" :
                    "bg-gray-800 text-gray-400"
                  }`}>{p.status}</span>
                  <p className="text-xs text-gray-500 mt-1">{p._count?.recommendations ?? 0} recommendations</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
