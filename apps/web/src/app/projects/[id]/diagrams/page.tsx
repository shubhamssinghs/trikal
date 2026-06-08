import { Shell } from "@/components/shell";
import { PageHeader } from "@/components/ui";
import { DiagramsList } from "@/components/diagram/diagrams-list";
import { serverFetch } from "@/lib/api/server";
import type { DiagramSummary } from "@/lib/diagram";

export const dynamic = "force-dynamic";

export default async function DiagramsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const diagrams = await serverFetch<DiagramSummary[]>(`/diagrams?projectId=${id}`, []);

  return (
    <Shell active="/projects" width="xl">
      <PageHeader
        title="Diagrams"
        subtitle="AI-generated, fully editable architecture and system diagrams scoped to this project."
        backHref={`/projects/${id}`}
        backLabel="Project"
        meta={<p className="text-xs text-muted">{diagrams.length} diagram{diagrams.length !== 1 ? "s" : ""}</p>}
      />
      <DiagramsList projectId={id} initial={diagrams} />
    </Shell>
  );
}
