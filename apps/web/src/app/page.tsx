import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { queries } from "@/lib/api/queries";
import { Shell } from "@/components/shell";
import { PageHeader, Card, StatusBadge, EmptyState, Button } from "@/components/ui";
import { BriefingPanel } from "@/components/briefing-panel";
import { AttentionPanel } from "@/components/attention-panel";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const [companies, projects] = await Promise.all([
    queries.companies().catch(() => []),
    queries.projects().catch(() => []),
  ]);

  const activeProjects = projects.filter((p) => p.status === "ACTIVE");
  const atRiskProjects = projects.filter((p) => p.status === "AT_RISK");
  const today = new Date().toLocaleDateString("en-US", { timeZone: "UTC", weekday: "long", month: "long", day: "numeric" });

  const stats = [
    { label: "Companies", value: companies.length },
    { label: "Projects", value: projects.length },
    { label: "Active", value: activeProjects.length },
    { label: "At Risk", value: atRiskProjects.length, highlight: atRiskProjects.length > 0 },
  ];

  return (
    <Shell active="/" width="xl">
      <PageHeader title="Today" subtitle={today} />

      {/* Stat strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {stats.map((s) => (
          <Card key={s.label} className="!p-0">
            <div className="px-4 py-3">
              <p className={`text-2xl font-semibold ${s.highlight ? "text-amber-500" : "text-foreground"}`}>{s.value}</p>
              <p className="text-xs text-muted mt-0.5">{s.label}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <AttentionPanel />
          <BriefingPanel />

          <Card
            title={`Active Projects (${activeProjects.length})`}
            action={<Link href="/projects/new" className="text-xs text-blue-500 hover:text-blue-400 inline-flex items-center gap-1"><Plus size={13} /> New</Link>}
          >
            {activeProjects.length === 0 ? (
              <EmptyState
                title="No active projects"
                description="Create a project to start tracking work, transcripts, and AI recommendations."
                action={<Link href="/projects/new"><Button><Plus size={14} /> New Project</Button></Link>}
              />
            ) : (
              <div className="space-y-2">
                {activeProjects.map((p) => (
                  <Link key={p.id} href={`/projects/${p.id}`}
                    className="group flex items-center justify-between rounded-lg border border-border bg-surface-2/40 px-4 py-3 hover:bg-surface-2/80 hover:border-blue-500/30 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                      <p className="text-xs text-muted">{p.company?.name}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-muted">{p._count?.recommendations ?? 0} recs</span>
                      <ArrowRight size={15} className="text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          {atRiskProjects.length > 0 && (
            <Card title={`At Risk (${atRiskProjects.length})`} accent="amber">
              <div className="space-y-2">
                {atRiskProjects.map((p) => (
                  <Link key={p.id} href={`/projects/${p.id}`}
                    className="flex items-center justify-between rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 hover:bg-amber-500/10 transition-colors">
                    <p className="text-sm font-medium text-foreground">{p.name}</p>
                    <StatusBadge status={p.status} />
                  </Link>
                ))}
              </div>
            </Card>
          )}
        </div>

        <aside className="space-y-5">
          <Card title="Companies" action={<Link href="/companies" className="text-xs text-blue-500 hover:text-blue-400">View all</Link>}>
            {companies.length === 0 ? (
              <EmptyState
                title="No companies"
                action={<Link href="/companies/new"><Button variant="secondary"><Plus size={14} /> New Company</Button></Link>}
              />
            ) : (
              <div className="space-y-0.5">
                {companies.slice(0, 6).map((c) => (
                  <Link key={c.id} href={`/companies/${c.id}`}
                    className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-surface-2 transition-colors">
                    <span className="text-sm text-foreground truncate">{c.name}</span>
                    <span className="text-xs text-muted shrink-0 ml-2">{c._count?.projects ?? 0}</span>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </aside>
      </div>
    </Shell>
  );
}
