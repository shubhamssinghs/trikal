import { TranscriptUpload } from "@/components/transcript-upload";
import { KnowledgeSearch } from "@/components/knowledge-search";
import { TranscriptList } from "@/components/transcript-list";
import { Shell } from "@/components/shell";
import { PageHeader, Card } from "@/components/ui";
import { serverFetch } from "@/lib/api/server";

export const dynamic = "force-dynamic";

type Transcript = { id: string; title: string; occurredAt: string; processedAt?: string; source?: string; metadata?: Record<string, unknown> };

export default async function TranscriptsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const transcripts: Transcript[] = await serverFetch<Transcript[]>(`/transcripts?projectId=${id}`, []);
  const analysed = transcripts.filter((t) => t.processedAt).length;

  return (
    <Shell active="/projects" width="xl">
      <PageHeader
        title="Knowledge Base"
        subtitle="Upload meeting transcripts — they're chunked, embedded, and made searchable, then analysed by AI."
        backHref={`/projects/${id}`}
        backLabel="Project"
        meta={
          <p className="text-xs text-muted">
            {transcripts.length} transcript{transcripts.length !== 1 ? "s" : ""} · {analysed} analysed
          </p>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <TranscriptUpload projectId={id} />
        <KnowledgeSearch projectId={id} />
      </div>

      <Card title={`Meetings & Transcripts (${transcripts.length})`}>
        <TranscriptList transcripts={transcripts} />
      </Card>
    </Shell>
  );
}
