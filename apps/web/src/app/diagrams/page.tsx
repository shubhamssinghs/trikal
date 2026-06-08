import { Shell } from "@/components/shell";
import { PageHeader } from "@/components/ui";
import { DiagramsList } from "@/components/diagram/diagrams-list";
import { serverFetch } from "@/lib/api/server";
import type { DiagramSummary } from "@/lib/diagram";

export const dynamic = "force-dynamic";

export default async function StandaloneDiagramsPage() {
  const diagrams = await serverFetch<DiagramSummary[]>(`/diagrams`, []);

  return (
    <Shell active="/diagrams" width="xl">
      <PageHeader
        title="Diagrams"
        subtitle="Quick, standalone diagrams — draft one with AI, edit it, and export to share. Not tied to any project."
        meta={<p className="text-xs text-muted">{diagrams.length} diagram{diagrams.length !== 1 ? "s" : ""}</p>}
      />
      <DiagramsList initial={diagrams} />
    </Shell>
  );
}
