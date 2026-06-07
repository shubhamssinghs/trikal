import Link from "next/link";
import { queries } from "@/lib/api/queries";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const [companies, projects] = await Promise.all([
    queries.companies().catch(() => []),
    queries.projects().catch(() => []),
  ]);

  const activeProjects = projects.filter((p) => p.status === "ACTIVE");
  const atRiskProjects = projects.filter((p) => p.status === "AT_RISK");

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <nav className="border-b border-gray-800 px-6 py-3 flex items-center gap-6">
        <span className="font-semibold text-white">Trikal</span>
        <Link href="/" className="text-sm text-gray-400 hover:text-white">Today</Link>
        <Link href="/companies" className="text-sm text-gray-400 hover:text-white">Companies</Link>
        <Link href="/projects" className="text-sm text-gray-400 hover:text-white">Projects</Link>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="mb-6">
          <h1 className="text-xl font-semibold">Today</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {new Date().toLocaleDateString("en-US", { timeZone: "UTC", weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            {/* Active Projects */}
            <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
              <h2 className="text-sm font-medium text-gray-300 mb-3">
                Active Projects <span className="text-gray-500 ml-1">({activeProjects.length})</span>
              </h2>
              {activeProjects.length === 0 ? (
                <p className="text-sm text-gray-500">No active projects. <Link href="/projects/new" className="text-blue-400 hover:underline">Create one</Link>.</p>
              ) : (
                <div className="space-y-2">
                  {activeProjects.map((p) => (
                    <Link key={p.id} href={`/projects/${p.id}`}
                      className="flex items-center justify-between rounded border border-gray-700 bg-gray-800/50 px-3 py-2 hover:bg-gray-800 transition-colors">
                      <div>
                        <p className="text-sm font-medium text-white">{p.name}</p>
                        <p className="text-xs text-gray-400">{p.company?.name}</p>
                      </div>
                      <div className="text-right">
                        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                        <p className="text-xs text-gray-500 mt-0.5">{p._count?.recommendations ?? 0} recs</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            {/* At Risk */}
            {atRiskProjects.length > 0 && (
              <section className="rounded-lg border border-amber-900/40 bg-gray-900 p-4">
                <h2 className="text-sm font-medium text-amber-400 mb-3">At Risk ({atRiskProjects.length})</h2>
                <div className="space-y-2">
                  {atRiskProjects.map((p) => (
                    <Link key={p.id} href={`/projects/${p.id}`}
                      className="flex items-center justify-between rounded border border-amber-900/30 bg-amber-900/10 px-3 py-2 hover:bg-amber-900/20 transition-colors">
                      <p className="text-sm font-medium text-white">{p.name}</p>
                      <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>

          <aside className="space-y-4">
            {/* Companies */}
            <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-medium text-gray-300">Companies</h2>
                <Link href="/companies" className="text-xs text-blue-400 hover:underline">View all</Link>
              </div>
              {companies.length === 0 ? (
                <p className="text-sm text-gray-500">No companies yet.</p>
              ) : (
                <div className="space-y-1">
                  {companies.slice(0, 5).map((c) => (
                    <Link key={c.id} href={`/companies/${c.id}`}
                      className="flex items-center justify-between rounded px-2 py-1.5 hover:bg-gray-800 transition-colors">
                      <span className="text-sm text-gray-300">{c.name}</span>
                      <span className="text-xs text-gray-500">{c._count?.projects ?? 0} projects</span>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            {/* Stats */}
            <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
              <h2 className="text-sm font-medium text-gray-300 mb-3">Overview</h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Companies", value: companies.length },
                  { label: "Projects", value: projects.length },
                  { label: "Active", value: activeProjects.length },
                  { label: "At Risk", value: atRiskProjects.length },
                ].map((s) => (
                  <div key={s.label} className="rounded bg-gray-800 px-3 py-2">
                    <p className="text-lg font-semibold text-white">{s.value}</p>
                    <p className="text-xs text-gray-400">{s.label}</p>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}
