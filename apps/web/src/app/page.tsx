import Link from "next/link";
import { queries } from "@/lib/api/queries";
import { Shell } from "@/components/shell";
import { BriefingPanel } from "@/components/briefing-panel";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  // Fast DB-backed queries only — the slow AI briefing loads client-side
  const [companies, projects] = await Promise.all([
    queries.companies().catch(() => []),
    queries.projects().catch(() => []),
  ]);

  const activeProjects = projects.filter((p) => p.status === "ACTIVE");
  const atRiskProjects = projects.filter((p) => p.status === "AT_RISK");

  return (
    <Shell active="/" width="xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold">Today</h1>
          <p className="text-sm text-muted mt-0.5">
            {new Date().toLocaleDateString("en-US", { timeZone: "UTC", weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">

            {/* AI Briefing — loads client-side with its own loader */}
            <BriefingPanel />

            {/* Active Projects */}
            <section className="rounded-lg border border-border bg-surface p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-medium text-foreground">
                  Active Projects <span className="text-muted">({activeProjects.length})</span>
                </h2>
                <Link href="/projects/new" className="text-xs text-blue-400 hover:text-blue-300">+ New</Link>
              </div>
              {activeProjects.length === 0 ? (
                <p className="text-sm text-muted">No active projects. <Link href="/projects/new" className="text-blue-400 hover:underline">Create one</Link>.</p>
              ) : (
                <div className="space-y-2">
                  {activeProjects.map((p) => (
                    <Link key={p.id} href={`/projects/${p.id}`}
                      className="flex items-center justify-between rounded border border-border bg-surface-2/50 px-3 py-2 hover:bg-surface-2 transition-colors">
                      <div>
                        <p className="text-sm font-medium text-foreground">{p.name}</p>
                        <p className="text-xs text-muted">{p.company?.name}</p>
                      </div>
                      <div className="text-right">
                        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                        <p className="text-xs text-muted mt-0.5">{p._count?.recommendations ?? 0} recs</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            {/* At Risk */}
            {atRiskProjects.length > 0 && (
              <section className="rounded-lg border border-amber-900/40 bg-surface p-4">
                <h2 className="text-sm font-medium text-amber-400 mb-3">At Risk ({atRiskProjects.length})</h2>
                <div className="space-y-2">
                  {atRiskProjects.map((p) => (
                    <Link key={p.id} href={`/projects/${p.id}`}
                      className="flex items-center justify-between rounded border border-amber-900/30 bg-amber-900/10 px-3 py-2 hover:bg-amber-900/20 transition-colors">
                      <p className="text-sm font-medium text-foreground">{p.name}</p>
                      <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>

          <aside className="space-y-4">
            {/* Stats */}
            <section className="rounded-lg border border-border bg-surface p-4">
              <h2 className="text-sm font-medium text-foreground mb-3">Overview</h2>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Companies", value: companies.length },
                  { label: "Projects", value: projects.length },
                  { label: "Active", value: activeProjects.length },
                  { label: "At Risk", value: atRiskProjects.length, highlight: atRiskProjects.length > 0 },
                ].map((s) => (
                  <div key={s.label} className="rounded bg-surface-2 px-3 py-2">
                    <p className={`text-lg font-semibold ${s.highlight ? "text-amber-400" : "text-foreground"}`}>{s.value}</p>
                    <p className="text-xs text-muted">{s.label}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Companies */}
            <section className="rounded-lg border border-border bg-surface p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-medium text-foreground">Companies</h2>
                <Link href="/companies" className="text-xs text-blue-400 hover:underline">View all</Link>
              </div>
              {companies.length === 0 ? (
                <p className="text-sm text-muted">
                  <Link href="/companies/new" className="text-blue-400 hover:underline">Create your first company</Link>
                </p>
              ) : (
                <div className="space-y-1">
                  {companies.slice(0, 5).map((c) => (
                    <Link key={c.id} href={`/companies/${c.id}`}
                      className="flex items-center justify-between rounded px-2 py-1.5 hover:bg-surface-2 transition-colors">
                      <span className="text-sm text-foreground">{c.name}</span>
                      <span className="text-xs text-muted">{c._count?.projects ?? 0} projects</span>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </aside>
        </div>
      </Shell>
  );
}
