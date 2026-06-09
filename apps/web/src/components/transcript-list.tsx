"use client";

import { useState } from "react";
import { FileText, CheckCircle2, Clock, X, ExternalLink, Users, CalendarClock, Loader2 } from "lucide-react";
import { EmptyState } from "./ui";
import { formatDate } from "@/lib/format";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

type Meta = {
  provider?: string; webUrl?: string | null; organiser?: string | null;
  attendees?: Array<{ name?: string | null; email?: string | null }>;
  scheduledStart?: string | null; scheduledEnd?: string | null;
};
type Item = { id: string; title: string; occurredAt?: string | null; processedAt?: string | null; source?: string; metadata?: Meta | null };
type Detail = Item & { rawContent?: string; knowledgeItems?: Array<{ id: string }> };

function SourceBadge({ source }: { source?: string }) {
  const granola = source === "granola";
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded ${granola ? "bg-[#6366F1]/15 text-[#818cf8]" : "bg-surface-2 text-muted"}`}>
      {granola ? "Granola" : "Uploaded"}
    </span>
  );
}

export function TranscriptList({ transcripts }: { transcripts: Item[] }) {
  const [open, setOpen] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(false);

  const openDetail = async (id: string) => {
    setLoading(true); setOpen({ id, title: "" });
    const d = await fetch(`${API_BASE}/transcripts/${id}`, { credentials: "include" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    setLoading(false);
    if (d) setOpen(d); else setOpen(null);
  };

  if (transcripts.length === 0) {
    return <EmptyState icon={<FileText size={28} />} title="No transcripts yet" description="Upload a transcript above, or enable Granola on this project to sync meetings automatically." />;
  }

  return (
    <>
      <div className="space-y-2">
        {transcripts.map((t) => (
          <button key={t.id} onClick={() => openDetail(t.id)}
            className="w-full text-left flex items-center justify-between rounded-lg border border-border bg-surface-2/40 px-4 py-3 hover:bg-surface-2/70 transition-colors">
            <div className="flex items-center gap-3 min-w-0">
              <div className="grid place-items-center w-9 h-9 rounded-lg bg-surface-2 text-muted shrink-0"><FileText size={16} /></div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{t.title}</p>
                <p className="text-xs text-muted flex items-center gap-1.5">
                  <SourceBadge source={t.source} />
                  {(t.metadata?.scheduledStart || t.occurredAt) && <span>· {formatDate(t.metadata?.scheduledStart ?? t.occurredAt ?? null)}</span>}
                  {t.metadata?.attendees?.length ? <span>· {t.metadata.attendees.length} attendees</span> : null}
                </p>
              </div>
            </div>
            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ring-1 ring-inset shrink-0 ${t.processedAt ? "bg-emerald-500/15 text-emerald-500 ring-emerald-500/30" : "bg-surface-2 text-muted ring-border"}`}>
              {t.processedAt ? <CheckCircle2 size={12} /> : <Clock size={12} />}{t.processedAt ? "Analysed" : "Pending"}
            </span>
          </button>
        ))}
      </div>

      {open && <DetailModal detail={open} loading={loading} onClose={() => setOpen(null)} />}
    </>
  );
}

function DetailModal({ detail, loading, onClose }: { detail: Detail; loading: boolean; onClose: () => void }) {
  const m = detail.metadata ?? {};
  // rawContent is "# title\nheader…\n\n## AI Notes\n…\n\n## Transcript\n…"
  const aiNotes = detail.rawContent?.split("## AI Notes")[1]?.split("## Transcript")[0]?.trim();
  const transcript = detail.rawContent?.split("## Transcript")[1]?.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-[fadeIn_120ms_ease-out]" onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-xl border border-border bg-surface shadow-2xl animate-[scaleIn_140ms_ease-out]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-3.5 shrink-0">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground truncate">{detail.title || "Loading…"}</h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <SourceBadge source={detail.source} />
              {(m.scheduledStart || detail.occurredAt) && (
                <span className="text-[11px] text-muted inline-flex items-center gap-1"><CalendarClock size={11} /> {formatDate(m.scheduledStart ?? detail.occurredAt ?? null)}</span>
              )}
              {m.webUrl && <a href={m.webUrl} target="_blank" rel="noreferrer" className="text-[11px] text-blue-400 hover:text-blue-300 inline-flex items-center gap-1"><ExternalLink size={11} /> Open in Granola</a>}
            </div>
          </div>
          <button onClick={onClose} className="text-muted hover:text-foreground shrink-0"><X size={16} /></button>
        </div>

        <div className="overflow-y-auto px-5 py-4 space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted"><Loader2 size={14} className="animate-spin" /> Loading…</div>
          ) : (
            <>
              {m.attendees && m.attendees.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted mb-1.5 flex items-center gap-1"><Users size={12} /> Attendees</p>
                  <div className="flex flex-wrap gap-1.5">
                    {m.attendees.map((a, i) => (
                      <span key={i} className="text-xs rounded-md border border-border bg-surface-2/50 px-2 py-1 text-foreground">{a.name || a.email}{m.organiser && a.email === m.organiser ? " (organiser)" : ""}</span>
                    ))}
                  </div>
                </div>
              )}
              {aiNotes && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted mb-1.5">AI Notes</p>
                  <pre className="text-xs text-foreground whitespace-pre-wrap font-sans leading-relaxed rounded-lg border border-border bg-surface-2/30 p-3">{aiNotes}</pre>
                </div>
              )}
              {transcript && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted mb-1.5">Transcript</p>
                  <pre className="text-xs text-muted whitespace-pre-wrap font-sans leading-relaxed rounded-lg border border-border bg-surface-2/30 p-3 max-h-72 overflow-y-auto">{transcript}</pre>
                </div>
              )}
              {!aiNotes && !transcript && detail.rawContent && (
                <pre className="text-xs text-foreground whitespace-pre-wrap font-sans leading-relaxed rounded-lg border border-border bg-surface-2/30 p-3">{detail.rawContent}</pre>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
