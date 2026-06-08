import Link from "next/link";
import { Upload, CheckCircle2, Workflow } from "lucide-react";
import { queries } from "@/lib/api/queries";
import { formatDate } from "@/lib/format";
import { Shell } from "@/components/shell";
import { PageHeader, Card, StatusBadge, Button } from "@/components/ui";
import { ApprovalQueue } from "@/components/approval-queue";
import { AskProject } from "@/components/ask-project";
import { MilestonesPanel } from "@/components/milestones-panel";
import { RisksPanel } from "@/components/risks-panel";
import { MembersPanel } from "@/components/members-panel";
import { ProjectActions } from "@/components/project-actions";
import { serverFetch } from "@/lib/api/server";

export const dynamic = "force-dynamic";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [project, recommendations, milestones, risks, members] = await Promise.all([
    queries.project(id),
    queries.recommendations(id),
    serverFetch<unknown[]>(`/milestones?projectId=${id}`, []),
    serverFetch<unknown[]>(`/risks?projectId=${id}`, []),
    serverFetch<unknown[]>(`/members?projectId=${id}`, []),
  ]);

  if (!project) {
    return <Shell active="/projects"><p className="text-sm text-muted">Project not found.</p></Shell>;
  }

  const pending = recommendations.filter((r) => r.status === "PENDING");
  const approved = recommendations.filter((r) => r.status === "APPROVED");
  const openRisks = (risks as { status: string }[]).filter((r) => r.status === "open").length;

  const stats = [
    { label: "Knowledge", value: (project as Record<string, { knowledgeItems?: number }>)._count?.knowledgeItems ?? 0 },
    { label: "Pending", value: pending.length },
    { label: "Milestones", value: (milestones as unknown[]).length },
    { label: "Open risks", value: openRisks },
  ];

  return (
    <Shell active="/projects" width="xl">
      <PageHeader
        title={project.name}
        subtitle={project.description}
        backHref="/projects"
        backLabel="Projects"
        meta={
          <div className="flex items-center gap-2 text-xs text-muted">
            <StatusBadge status={project.status} />
            <span>·</span>
            <span>{project.company?.name}</span>
          </div>
        }
        actions={
          <>
            <Link href={`/projects/${id}/transcripts`}>
              <Button variant="primary"><Upload size={14} /> Upload Transcript</Button>
            </Link>
            <Link href={`/projects/${id}/diagrams`}>
              <Button variant="secondary"><Workflow size={14} /> Diagrams</Button>
            </Link>
            <ProjectActions project={project} />
          </>
        }
      />

      {/* Stat strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {stats.map((s) => (
          <Card key={s.label} className="!p-0">
            <div className="px-4 py-3">
              <p className="text-2xl font-semibold text-foreground">{s.value}</p>
              <p className="text-xs text-muted mt-0.5">{s.label}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-5">
          <AskProject projectId={id} />
          <ApprovalQueue projectId={id} recommendations={pending} />
          <MilestonesPanel projectId={id} milestones={milestones as never} />
          <RisksPanel projectId={id} risks={risks as never} />

          {approved.length > 0 && (
            <Card title={`Approved Actions (${approved.length})`}>
              <div className="space-y-2">
                {approved.map((r) => (
                  <div key={r.id} className="flex items-start gap-2.5 rounded-lg border border-border bg-surface-2/40 px-3 py-2.5">
                    <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm text-foreground">{r.title}</p>
                      {r.description && <p className="text-xs text-muted mt-0.5">{r.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-5">
          <MembersPanel projectId={id} members={members as never} />

          <Card title="Project Info">
            <dl className="space-y-2.5">
              {[
                { label: "Company", value: project.company?.name ?? "—" },
                { label: "Start", value: formatDate(project.startDate) },
                { label: "Target end", value: formatDate(project.targetEndDate) },
                { label: "Recommendations", value: String(recommendations.length) },
              ].map((s) => (
                <div key={s.label} className="flex justify-between gap-3">
                  <dt className="text-xs text-muted">{s.label}</dt>
                  <dd className="text-xs text-foreground text-right">{s.value}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </aside>
      </div>
    </Shell>
  );
}
