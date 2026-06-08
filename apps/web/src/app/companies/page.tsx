import Link from "next/link";
import { queries } from "@/lib/api/queries";
import { Nav } from "@/components/nav";

export const dynamic = "force-dynamic";

export default async function CompaniesPage() {
  const companies = await queries.companies().catch(() => []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav active="/companies" />

      <main className="max-w-5xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold">Companies</h1>
          <Link href="/companies/new" className="text-xs bg-blue-700 hover:bg-blue-600 text-white px-3 py-1.5 rounded transition-colors">+ New Company</Link>
        </div>

        {companies.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface p-8 text-center">
            <p className="text-muted">No companies yet.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {companies.map((c) => (
              <Link key={c.id} href={`/companies/${c.id}`}
                className="rounded-lg border border-border bg-surface px-5 py-4 hover:border-muted transition-colors block">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="font-medium text-foreground">{c.name}</h2>
                    {c.description && <p className="text-sm text-muted mt-0.5">{c.description}</p>}
                  </div>
                  <span className="text-sm text-muted">{c._count?.projects ?? 0} projects</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
