import Link from "next/link";
import { ChevronLeft, Plug, Info } from "lucide-react";
import { Shell } from "@/components/shell";
import { PageHeader, Card } from "@/components/ui";
import { ProjectIntegrations } from "@/components/project-integrations";
import { serverFetch } from "@/lib/api/server";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

type Project = {
  id: string; name: string; description?: string | null; status: string;
  company?: { name?: string } | null; startDate?: string | null; targetEndDate?: string | null;
};

export default async function ProjectSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await serverFetch<Project | null>(`/projects/${id}`, null);

  if (!project) {
    return (
      <Shell active="/projects" width="lg">
        <Link href={`/projects/${id}`} className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground mb-4"><ChevronLeft size={14} /> Project</Link>
        <p className="text-sm text-muted">Project not found.</p>
      </Shell>
    );
  }

  return (
    <Shell active="/projects" width="lg">
      <PageHeader
        title="Project Settings"
        subtitle={project.name}
        backHref={`/projects/${id}`}
        backLabel="Project"
      />

      <div className="space-y-5">
        <Card title="General">
          <div className="flex items-start gap-2.5 mb-3">
            <Info size={15} className="text-muted mt-0.5 shrink-0" />
            <p className="text-xs text-muted">Project details. Inline editing of name, status, and dates is coming here next.</p>
          </div>
          <dl className="grid grid-cols-2 gap-y-2.5 gap-x-4">
            {[
              { label: "Name", value: project.name },
              { label: "Company", value: project.company?.name ?? "—" },
              { label: "Status", value: project.status },
              { label: "Start", value: formatDate(project.startDate ?? null) },
              { label: "Target end", value: formatDate(project.targetEndDate ?? null) },
            ].map((r) => (
              <div key={r.label}>
                <dt className="text-[11px] text-muted">{r.label}</dt>
                <dd className="text-sm text-foreground">{r.value}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <div>
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2"><Plug size={15} /> Integrations</h2>
          <p className="text-xs text-muted mb-3">Connect this project to external sources. The connection (API key) is configured once in <Link href="/settings" className="text-blue-400 hover:text-blue-300">Settings → Integrations</Link>; here you enable and scope it per project.</p>
          <ProjectIntegrations projectId={id} />
        </div>
      </div>
    </Shell>
  );
}
