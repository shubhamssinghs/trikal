import Link from "next/link";
import { queries } from "@/lib/api/queries";
import { Nav } from "@/components/nav";

export const dynamic = "force-dynamic";

const IAPI = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

type Briefing = {
  greeting: string;
  topPriorities: { text: string; urgency: string; projectName: string }[];
  atRiskProjects: { projectName: string; reason: string }[];
  pendingApprovals: number;
  openRisks: number;
  insight: string;
};

async function getBriefing(): Promise<Briefing | null> {
  try {
    const res = await fetch(`${IAPI}/ai/briefing`, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

const urgencyColor: Record<string, string> = {
  high: "text-red-400 border-red-900/40",
  medium: "text-amber-400 border-amber-900/40",
  low: "text-blue-400 border-blue-900/40",
};

export default async function TodayPage() {
  const [companies, projects, briefing] = await Promise.all([
    queries.companies().catch(() => []),
    queries.projects().catch(() => []),
    getBriefing(),
  ]);

  const activeProjects = projects.filter((p) => p.status === "ACTIVE");
  const atRiskProjects = projects.filter((p) => p.status === "AT_RISK");

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <Nav active="/" />

      <main className="max-w-7xl mx-auto px-6 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold">Today</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {new Date().toLocaleDateString("en-US", { timeZone: "UTC", weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
          {briefing?.greeting && <p className="text-sm text-gray-300 mt-2 italic">{briefing.greeting}</p>}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">

            {/* AI Priorities */}
            {briefing && briefing.topPriorities.length > 0 && (
              <section className="rounded-lg border border-blue-900/40 bg-gray-900 p-4">
                <h2 className="text-sm font-medium text-blue-400 mb-3">AI Priorities</h2>
                <div className="space-y-2">
                  {briefing.topPriorities.map((p, i) => (
                    <div key={i} className={`rounded border px-3 py-2 ${urgencyColor[p.urgency] ?? urgencyColor.low}`}>
                      <p className="text-sm text-gray-200">{p.text}</p>
                      <p className="text-xs opacity-60 mt-0.5">{p.projectName} · {p.urgency}</p>
                    </div>
                  ))}
                </div>
                {briefing.insight && (
                  <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-800">{briefing.insight}</p>
                )}
              </section>
            )}

            {/* Active Projects */}
            <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-medium text-gray-300">
                  Active Projects <span className="text-gray-500">({activeProjects.length})</span>
                </h2>
                <Link href="/projects/new" className="text-xs text-blue-400 hover:text-blue-300">+ New</Link>
              </div>
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
            {/* Stats */}
            <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
              <h2 className="text-sm font-medium text-gray-300 mb-3">Overview</h2>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Companies", value: companies.length },
                  { label: "Projects", value: projects.length },
                  { label: "Approvals", value: briefing?.pendingApprovals ?? "—", highlight: (briefing?.pendingApprovals ?? 0) > 0 },
                  { label: "Open Risks", value: briefing?.openRisks ?? "—", highlight: (briefing?.openRisks ?? 0) > 0 },
                ].map((s) => (
                  <div key={s.label} className="rounded bg-gray-800 px-3 py-2">
                    <p className={`text-lg font-semibold ${s.highlight ? "text-amber-400" : "text-white"}`}>{s.value}</p>
                    <p className="text-xs text-gray-400">{s.label}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Companies */}
            <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-medium text-gray-300">Companies</h2>
                <Link href="/companies" className="text-xs text-blue-400 hover:underline">View all</Link>
              </div>
              {companies.length === 0 ? (
                <p className="text-sm text-gray-500">
                  <Link href="/companies/new" className="text-blue-400 hover:underline">Create your first company</Link>
                </p>
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
          </aside>
        </div>
      </main>
    </div>
  );
}
