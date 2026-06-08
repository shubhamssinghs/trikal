import { FileText, CheckCircle2, Clock } from "lucide-react";
import { TranscriptUpload } from "@/components/transcript-upload";
import { KnowledgeSearch } from "@/components/knowledge-search";
import { Shell } from "@/components/shell";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

const API_BASE = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

async function getTranscripts(projectId: string) {
  try {
    const res = await fetch(`${API_BASE}/transcripts?projectId=${projectId}`, { cache: "no-store" });
    if (!res.ok) return [];
    return res.json();
  } catch { return []; }
}

type Transcript = { id: string; title: string; occurredAt: string; processedAt?: string };

export default async function TranscriptsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const transcripts: Transcript[] = await getTranscripts(id);
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

      <Card title={`Uploaded Transcripts (${transcripts.length})`}>
        {transcripts.length === 0 ? (
          <EmptyState
            icon={<FileText size={28} />}
            title="No transcripts yet"
            description="Upload your first meeting transcript above to start building this project's knowledge base."
          />
        ) : (
          <div className="space-y-2">
            {transcripts.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-lg border border-border bg-surface-2/40 px-4 py-3 hover:bg-surface-2/70 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="grid place-items-center w-9 h-9 rounded-lg bg-surface-2 text-muted shrink-0">
                    <FileText size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{t.title}</p>
                    <p className="text-xs text-muted">{formatDate(t.occurredAt)}</p>
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ring-1 ring-inset ${
                  t.processedAt
                    ? "bg-emerald-500/15 text-emerald-500 ring-emerald-500/30"
                    : "bg-surface-2 text-muted ring-border"
                }`}>
                  {t.processedAt ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                  {t.processedAt ? "Analysed" : "Pending"}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </Shell>
  );
}
