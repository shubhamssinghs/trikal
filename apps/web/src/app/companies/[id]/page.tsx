import Link from "next/link";
import { FolderKanban, ArrowRight, Globe } from "lucide-react";
import { queries } from "@/lib/api/queries";
import { Shell } from "@/components/shell";
import { PageHeader, Card, StatusBadge, EmptyState, Button } from "@/components/ui";
import { CompanyActions } from "@/components/company-actions";
import { CompanyLogo } from "@/components/logo-upload";

export const dynamic = "force-dynamic";

export default async function CompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [company, projects] = await Promise.all([
    queries.company(id).catch(() => null),
    queries.projects(id).catch(() => []),
  ]);

  if (!company) {
    return <Shell active="/companies"><p className="text-sm text-muted">Company not found.</p></Shell>;
  }

  return (
    <Shell active="/companies" width="xl">
      <PageHeader
        title={company.name}
        subtitle={company.description}
        backHref="/companies"
        backLabel="Companies"
        icon={<CompanyLogo companyId={company.id} hasLogo={Boolean(company.logoKey)} size={48} />}
        meta={
          company.website ? (
            <a href={company.website} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-blue-500 hover:text-blue-400">
              <Globe size={13} /> {company.website}
            </a>
          ) : undefined
        }
        actions={<CompanyActions company={company} />}
      />

      <Card
        title={`Projects (${projects.length})`}
        action={<Link href="/projects/new" className="text-xs text-blue-500 hover:text-blue-400">+ New</Link>}
      >
        {projects.length === 0 ? (
          <EmptyState
            icon={<FolderKanban size={28} />}
            title="No projects yet"
            description="Create the first project under this company."
            action={<Link href="/projects/new"><Button>New Project</Button></Link>}
          />
        ) : (
          <div className="space-y-2">
            {projects.map((p) => (
              <Link key={p.id} href={`/projects/${p.id}`}
                className="group flex items-center justify-between rounded-lg border border-border bg-surface-2/40 px-4 py-3 hover:bg-surface-2/80 hover:border-blue-500/30 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="grid place-items-center w-9 h-9 rounded-lg bg-surface-2 text-muted shrink-0">
                    <FolderKanban size={16} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-medium text-foreground truncate">{p.name}</h3>
                    {p.description && <p className="text-xs text-muted truncate">{p.description}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <StatusBadge status={p.status} />
                  <ArrowRight size={15} className="text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </Shell>
  );
}
