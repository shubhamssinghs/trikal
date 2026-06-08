import Link from "next/link";
import { Plus, FolderKanban, ArrowRight } from "lucide-react";
import { queries } from "@/lib/api/queries";
import { Shell } from "@/components/shell";
import { PageHeader, Button, EmptyState, StatusBadge } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const projects = await queries.projects().catch(() => []);

  return (
    <Shell active="/projects" width="xl">
      <PageHeader
        title="Projects"
        subtitle="Every project across your companies."
        actions={<Link href="/projects/new"><Button><Plus size={14} /> New Project</Button></Link>}
      />

      {projects.length === 0 ? (
        <EmptyState
          icon={<FolderKanban size={28} />}
          title="No projects yet"
          description="Create a project to track transcripts, milestones, risks, and AI recommendations."
          action={<Link href="/projects/new"><Button><Plus size={14} /> New Project</Button></Link>}
        />
      ) : (
        <div className="grid gap-3">
          {projects.map((p) => (
            <Link key={p.id} href={`/projects/${p.id}`}
              className="group rounded-xl border border-border bg-surface shadow-sm px-5 py-4 hover:border-blue-500/30 transition-colors flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="grid place-items-center w-10 h-10 rounded-lg bg-surface-2 text-muted shrink-0">
                  <FolderKanban size={18} />
                </div>
                <div className="min-w-0">
                  <h2 className="font-medium text-foreground truncate">{p.name}</h2>
                  <p className="text-xs text-muted truncate">{p.company?.name} · {p._count?.recommendations ?? 0} recommendations</p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <StatusBadge status={p.status} />
                <ArrowRight size={16} className="text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </Shell>
  );
}
