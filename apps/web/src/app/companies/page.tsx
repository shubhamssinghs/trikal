import Link from "next/link";
import { Plus, Building2, ArrowRight } from "lucide-react";
import { queries } from "@/lib/api/queries";
import { Shell } from "@/components/shell";
import { PageHeader, Button, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function CompaniesPage() {
  const companies = await queries.companies().catch(() => []);

  return (
    <Shell active="/companies" width="xl">
      <PageHeader
        title="Companies"
        subtitle="Clients and accounts you manage projects under."
        actions={<Link href="/companies/new"><Button><Plus size={14} /> New Company</Button></Link>}
      />

      {companies.length === 0 ? (
        <EmptyState
          icon={<Building2 size={28} />}
          title="No companies yet"
          description="Create your first company to start organising projects under it."
          action={<Link href="/companies/new"><Button><Plus size={14} /> New Company</Button></Link>}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {companies.map((c) => (
            <Link key={c.id} href={`/companies/${c.id}`}
              className="group rounded-xl border border-border bg-surface shadow-sm px-5 py-4 hover:border-blue-500/30 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="grid place-items-center w-10 h-10 rounded-lg bg-surface-2 text-muted shrink-0">
                    <Building2 size={18} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-medium text-foreground truncate">{c.name}</h2>
                    {c.description && <p className="text-sm text-muted truncate">{c.description}</p>}
                  </div>
                </div>
                <ArrowRight size={16} className="text-muted opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
              </div>
              <p className="text-xs text-muted mt-3">{c._count?.projects ?? 0} project{(c._count?.projects ?? 0) !== 1 ? "s" : ""}</p>
            </Link>
          ))}
        </div>
      )}
    </Shell>
  );
}
