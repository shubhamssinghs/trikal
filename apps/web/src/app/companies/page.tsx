import Link from "next/link";
import { queries } from "@/lib/api/queries";

export const dynamic = "force-dynamic";

export default async function CompaniesPage() {
  const companies = await queries.companies().catch(() => []);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <nav className="border-b border-gray-800 px-6 py-3 flex items-center gap-6">
        <Link href="/" className="font-semibold text-white">Trikal</Link>
        <Link href="/" className="text-sm text-gray-400 hover:text-white">Today</Link>
        <Link href="/companies" className="text-sm text-white">Companies</Link>
        <Link href="/projects" className="text-sm text-gray-400 hover:text-white">Projects</Link>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold">Companies</h1>
          <Link href="/companies/new" className="text-xs bg-blue-700 hover:bg-blue-600 text-white px-3 py-1.5 rounded transition-colors">+ New Company</Link>
        </div>

        {companies.length === 0 ? (
          <div className="rounded-lg border border-gray-800 bg-gray-900 p-8 text-center">
            <p className="text-gray-400">No companies yet.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {companies.map((c) => (
              <Link key={c.id} href={`/companies/${c.id}`}
                className="rounded-lg border border-gray-800 bg-gray-900 px-5 py-4 hover:border-gray-600 transition-colors block">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="font-medium text-white">{c.name}</h2>
                    {c.description && <p className="text-sm text-gray-400 mt-0.5">{c.description}</p>}
                  </div>
                  <span className="text-sm text-gray-500">{c._count?.projects ?? 0} projects</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
