import Link from "next/link";
import { queries } from "@/lib/api/queries";
import { formatDate } from "@/lib/format";
import { ApprovalQueue } from "@/components/approval-queue";
import { AskProject } from "@/components/ask-project";
import { MilestonesPanel } from "@/components/milestones-panel";
import { RisksPanel } from "@/components/risks-panel";
import { StakeholdersPanel } from "@/components/stakeholders-panel";
import { Nav } from "@/components/nav";

export const dynamic = "force-dynamic";

const IAPI = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

async function fetchJson<T>(path: string, fallback: T = [] as unknown as T): Promise<T> {
  try {
    const res = await fetch(`${IAPI}${path}`, { cache: "no-store" });
    if (!res.ok) return fallback;
    return res.json();
  } catch {
    return fallback;
  }
}

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [project, recommendations, milestones, risks, stakeholders] = await Promise.all([
    queries.project(id).catch(() => null),
    queries.recommendations(id).catch(() => []),
    fetchJson<unknown[]>(`/milestones?projectId=${id}`),
    fetchJson<unknown[]>(`/risks?projectId=${id}`),
    fetchJson<unknown[]>(`/stakeholders?projectId=${id}`),
  ]);

  if (!project) return <div className="p-6 text-muted">Project not found.</div>;

  const pending = recommendations.filter((r) => r.status === "PENDING");
  const approved = recommendations.filter((r) => r.status === "APPROVED");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav active="/projects" />

      <main className="max-w-7xl mx-auto px-6 py-6">
        {/* Header */}
        <div className="mb-6">
          <Link href="/projects" className="text-xs text-muted hover:text-foreground">← Projects</Link>
          <div className="flex items-start justify-between mt-1">
            <div>
              <h1 className="text-xl font-semibold">{project.name}</h1>
              {project.description && <p className="text-sm text-muted mt-0.5">{project.description}</p>}
              <p className="text-xs text-muted mt-1">{project.company?.name}</p>
            </div>
            <div className="flex items-center gap-2">
              <Link href={`/projects/${id}/transcripts`}
                className="text-xs bg-blue-700 hover:bg-blue-600 text-white px-3 py-1.5 rounded transition-colors">
                + Upload Transcript
              </Link>
              <span className={`text-xs px-2 py-1 rounded ${
                project.status === "ACTIVE" ? "bg-emerald-900/50 text-emerald-400" :
                project.status === "AT_RISK" ? "bg-amber-900/50 text-amber-400" :
                "bg-surface-2 text-muted"
              }`}>{project.status}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Main column */}
          <div className="lg:col-span-2 space-y-4">
            <AskProject projectId={id} />
            <ApprovalQueue projectId={id} recommendations={pending} />
            <MilestonesPanel projectId={id} milestones={milestones as never} />
            <RisksPanel projectId={id} risks={risks as never} />

            {approved.length > 0 && (
              <section className="rounded-lg border border-border bg-surface p-4">
                <h2 className="text-sm font-medium text-foreground mb-3">Approved Actions ({approved.length})</h2>
                <div className="space-y-2">
                  {approved.map((r) => (
                    <div key={r.id} className="flex items-start gap-3 rounded border border-border bg-surface-2/30 px-3 py-2">
                      <span className="text-emerald-500 mt-0.5">✓</span>
                      <div>
                        <p className="text-sm text-foreground">{r.title}</p>
                        {r.description && <p className="text-xs text-muted mt-0.5">{r.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-4">
            <StakeholdersPanel projectId={id} stakeholders={stakeholders as never} />

            <section className="rounded-lg border border-border bg-surface p-4">
              <h2 className="text-sm font-medium text-foreground mb-3">Project Info</h2>
              <dl className="space-y-1.5">
                {[
                  { label: "Company", value: project.company?.name ?? "—" },
                  { label: "Start", value: formatDate(project.startDate) },
                  { label: "Target", value: formatDate(project.targetEndDate) },
                  { label: "Milestones", value: String((milestones as unknown[]).length) },
                  { label: "Open Risks", value: String((risks as {status:string}[]).filter((r) => r.status === "open").length) },
                  { label: "Recommendations", value: String(recommendations.length) },
                ].map((s) => (
                  <div key={s.label} className="flex justify-between">
                    <dt className="text-xs text-muted">{s.label}</dt>
                    <dd className="text-xs text-foreground">{s.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}
