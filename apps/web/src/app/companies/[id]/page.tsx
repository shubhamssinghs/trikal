import Link from "next/link";
import { queries } from "@/lib/api/queries";
import { Shell } from "@/components/shell";

export const dynamic = "force-dynamic";

export default async function CompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [company, projects] = await Promise.all([
    queries.company(id).catch(() => null),
    queries.projects(id).catch(() => []),
  ]);

  if (!company) return <div className="p-6 text-muted">Company not found.</div>;

  return (
    <Shell active="/companies" width="lg">
        <div className="mb-6">
          <Link href="/companies" className="text-xs text-muted hover:text-foreground">← Companies</Link>
          <h1 className="text-xl font-semibold mt-1">{company.name}</h1>
          {company.description && <p className="text-sm text-muted mt-1">{company.description}</p>}
        </div>

        <h2 className="text-sm font-medium text-foreground mb-3">Projects ({projects.length})</h2>
        {projects.length === 0 ? (
          <p className="text-sm text-muted">No projects for this company.</p>
        ) : (
          <div className="grid gap-3">
            {projects.map((p) => (
              <Link key={p.id} href={`/projects/${p.id}`}
                className="rounded-lg border border-border bg-surface px-5 py-4 hover:border-muted transition-colors flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-foreground">{p.name}</h3>
                  {p.description && <p className="text-sm text-muted mt-0.5">{p.description}</p>}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  p.status === "ACTIVE" ? "bg-emerald-900/50 text-emerald-400" :
                  p.status === "AT_RISK" ? "bg-amber-900/50 text-amber-400" :
                  "bg-surface-2 text-muted"
                }`}>{p.status}</span>
              </Link>
            ))}
          </div>
        )}
      </Shell>
  );
}
