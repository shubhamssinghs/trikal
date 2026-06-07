import Link from "next/link";
import { queries } from "@/lib/api/queries";
import { ApprovalQueue } from "@/components/approval-queue";
import { AskProject } from "@/components/ask-project";

export const dynamic = "force-dynamic";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [project, recommendations] = await Promise.all([
    queries.project(id).catch(() => null),
    queries.recommendations(id).catch(() => []),
  ]);

  if (!project) return <div className="p-6 text-gray-400">Project not found.</div>;

  const pending = recommendations.filter((r) => r.status === "PENDING");
  const approved = recommendations.filter((r) => r.status === "APPROVED");

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <nav className="border-b border-gray-800 px-6 py-3 flex items-center gap-6">
        <Link href="/" className="font-semibold text-white">Trikal</Link>
        <Link href="/" className="text-sm text-gray-400 hover:text-white">Today</Link>
        <Link href="/companies" className="text-sm text-gray-400 hover:text-white">Companies</Link>
        <Link href="/projects" className="text-sm text-gray-400 hover:text-white">Projects</Link>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="mb-6">
          <Link href="/projects" className="text-xs text-gray-500 hover:text-gray-300">← Projects</Link>
          <div className="flex items-center justify-end mt-1">
            <Link href={`/projects/${id}/transcripts`}
              className="text-xs bg-blue-700 hover:bg-blue-600 text-white px-3 py-1.5 rounded transition-colors">
              + Upload Transcript
            </Link>
          </div>
          <div className="flex items-start justify-between mt-1">
            <div>
              <h1 className="text-xl font-semibold">{project.name}</h1>
              {project.description && <p className="text-sm text-gray-400 mt-0.5">{project.description}</p>}
            </div>
            <span className={`text-xs px-2 py-1 rounded ${
              project.status === "ACTIVE" ? "bg-emerald-900/50 text-emerald-400" :
              project.status === "AT_RISK" ? "bg-amber-900/50 text-amber-400" :
              "bg-gray-800 text-gray-400"
            }`}>{project.status}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            {/* Ask Project */}
            <AskProject projectId={id} />

            {/* Approval Queue */}
            <ApprovalQueue projectId={id} recommendations={pending} />

            {/* Approved actions */}
            {approved.length > 0 && (
              <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
                <h2 className="text-sm font-medium text-gray-300 mb-3">Approved Actions ({approved.length})</h2>
                <div className="space-y-2">
                  {approved.map((r) => (
                    <div key={r.id} className="flex items-start gap-3 rounded border border-gray-700 bg-gray-800/30 px-3 py-2">
                      <span className="text-emerald-500 mt-0.5">✓</span>
                      <div>
                        <p className="text-sm text-gray-200">{r.title}</p>
                        {r.description && <p className="text-xs text-gray-500 mt-0.5">{r.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          <aside className="space-y-4">
            {/* Stats */}
            <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
              <h2 className="text-sm font-medium text-gray-300 mb-3">Knowledge Base</h2>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Items", value: (project as Record<string, unknown>)._count?.knowledgeItems ?? 0 },
                  { label: "Recs", value: recommendations.length },
                  { label: "Pending", value: pending.length },
                  { label: "Approved", value: approved.length },
                ].map((s) => (
                  <div key={s.label} className="rounded bg-gray-800 px-2 py-2 text-center">
                    <p className="text-lg font-semibold text-white">{String(s.value)}</p>
                    <p className="text-xs text-gray-400">{s.label}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
              <h2 className="text-sm font-medium text-gray-300 mb-2">Project Info</h2>
              <dl className="space-y-1.5">
                <div className="flex justify-between">
                  <dt className="text-xs text-gray-500">Company</dt>
                  <dd className="text-xs text-gray-300">{project.company?.name ?? "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-xs text-gray-500">Start</dt>
                  <dd className="text-xs text-gray-300">
                    {project.startDate ? new Date(project.startDate).toLocaleDateString() : "—"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-xs text-gray-500">Target</dt>
                  <dd className="text-xs text-gray-300">
                    {project.targetEndDate ? new Date(project.targetEndDate).toLocaleDateString() : "—"}
                  </dd>
                </div>
              </dl>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}
