import Link from "next/link";
import { queries } from "@/lib/api/queries";

export const dynamic = "force-dynamic";

export default async function CompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [company, projects] = await Promise.all([
    queries.company(id).catch(() => null),
    queries.projects(id).catch(() => []),
  ]);

  if (!company) return <div className="p-6 text-gray-400">Company not found.</div>;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <nav className="border-b border-gray-800 px-6 py-3 flex items-center gap-6">
        <Link href="/" className="font-semibold text-white">Trikal</Link>
        <Link href="/" className="text-sm text-gray-400 hover:text-white">Today</Link>
        <Link href="/companies" className="text-sm text-gray-400 hover:text-white">Companies</Link>
        <Link href="/projects" className="text-sm text-gray-400 hover:text-white">Projects</Link>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-6">
        <div className="mb-6">
          <Link href="/companies" className="text-xs text-gray-500 hover:text-gray-300">← Companies</Link>
          <h1 className="text-xl font-semibold mt-1">{company.name}</h1>
          {company.description && <p className="text-sm text-gray-400 mt-1">{company.description}</p>}
        </div>

        <h2 className="text-sm font-medium text-gray-300 mb-3">Projects ({projects.length})</h2>
        {projects.length === 0 ? (
          <p className="text-sm text-gray-500">No projects for this company.</p>
        ) : (
          <div className="grid gap-3">
            {projects.map((p) => (
              <Link key={p.id} href={`/projects/${p.id}`}
                className="rounded-lg border border-gray-800 bg-gray-900 px-5 py-4 hover:border-gray-600 transition-colors flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-white">{p.name}</h3>
                  {p.description && <p className="text-sm text-gray-400 mt-0.5">{p.description}</p>}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  p.status === "ACTIVE" ? "bg-emerald-900/50 text-emerald-400" :
                  p.status === "AT_RISK" ? "bg-amber-900/50 text-amber-400" :
                  "bg-gray-800 text-gray-400"
                }`}>{p.status}</span>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
