import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Shell } from "@/components/shell";
import { DiagramCanvas } from "@/components/diagram/diagram-canvas";
import { serverFetch } from "@/lib/api/server";
import { emptyDiagram, type DiagramData } from "@/lib/diagram";

export const dynamic = "force-dynamic";

type DiagramRecord = { id: string; title: string; description?: string | null; schemaJson: DiagramData } | null;

export default async function DiagramEditorPage({ params }: { params: Promise<{ id: string; diagramId: string }> }) {
  const { id, diagramId } = await params;
  const diagram = await serverFetch<DiagramRecord>(`/diagrams/${diagramId}`, null);

  if (!diagram) {
    return (
      <Shell active="/projects" width="full">
        <Link href={`/projects/${id}/diagrams`} className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground mb-4">
          <ChevronLeft size={14} /> Diagrams
        </Link>
        <p className="text-sm text-muted">Diagram not found.</p>
      </Shell>
    );
  }

  const initial: DiagramData = {
    ...emptyDiagram(diagram.title),
    ...diagram.schemaJson,
    title: diagram.title,
    description: diagram.description ?? diagram.schemaJson?.description ?? "",
  };

  return (
    <Shell active="/projects" width="full">
      <Link href={`/projects/${id}/diagrams`} className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground mb-3">
        <ChevronLeft size={14} /> All diagrams
      </Link>
      <DiagramCanvas diagramId={diagram.id} initial={initial} />
    </Shell>
  );
}
