import Link from "next/link";
import { queries } from "@/lib/api/queries";
import { Nav } from "@/components/nav";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const projects = await queries.projects().catch(() => []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav active="/projects" />

      <main className="max-w-5xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold">Projects</h1>
          <Link href="/projects/new" className="text-xs bg-blue-700 hover:bg-blue-600 text-white px-3 py-1.5 rounded transition-colors">+ New Project</Link>
        </div>
        {projects.length === 0 ? (
          <p className="text-sm text-muted">No projects yet.</p>
        ) : (
          <div className="grid gap-3">
            {projects.map((p) => (
              <Link key={p.id} href={`/projects/${p.id}`}
                className="rounded-lg border border-border bg-surface px-5 py-4 hover:border-muted transition-colors flex items-center justify-between">
                <div>
                  <h2 className="font-medium text-foreground">{p.name}</h2>
                  <p className="text-xs text-muted mt-0.5">{p.company?.name}</p>
                </div>
                <div className="text-right">
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    p.status === "ACTIVE" ? "bg-emerald-900/50 text-emerald-400" :
                    p.status === "AT_RISK" ? "bg-amber-900/50 text-amber-400" :
                    "bg-surface-2 text-muted"
                  }`}>{p.status}</span>
                  <p className="text-xs text-muted mt-1">{p._count?.recommendations ?? 0} recommendations</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
