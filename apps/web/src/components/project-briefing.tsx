"use client";

import { useEffect, useState } from "react";
import { Sparkles, RefreshCw, Loader2, CheckCircle2, HelpCircle, Lightbulb, Clock } from "lucide-react";
import { formatDate } from "@/lib/format";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

type Data = {
  plate?: string[];
  topics?: string[];
  openQuestions?: string[];
  suggestedActions?: { title: string; rationale: string }[];
};
type Briefing = { data: Data; generatedAt: string };

export function ProjectBriefing({ projectId }: { projectId: string }) {
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = () =>
    fetch(`${API_BASE}/projects/${projectId}/briefing`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((b: Briefing | null) => setBriefing(b))
      .catch(() => setBriefing(null))
      .finally(() => setLoading(false));

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [projectId]);

  const refresh = async () => {
    setRefreshing(true);
    const b = await fetch(`${API_BASE}/projects/${projectId}/briefing/refresh`, { credentials: "include", method: "POST" })
      .then((r) => (r.ok ? r.json() : null)).catch(() => null);
    setRefreshing(false);
    if (b) setBriefing(b);
  };

  const d = briefing?.data ?? {};
  const empty = !d.plate?.length && !d.topics?.length && !d.openQuestions?.length && !d.suggestedActions?.length;

  return (
    <section className="rounded-xl border border-blue-500/30 bg-gradient-to-b from-blue-500/[0.06] to-transparent shadow-sm">
      <div className="flex items-center justify-between gap-2 px-4 pt-3.5 pb-2">
        <h2 className="text-sm font-semibold text-foreground inline-flex items-center gap-2"><Sparkles size={15} className="text-blue-400" /> On your plate</h2>
        <div className="flex items-center gap-2">
          {briefing && <span className="text-[11px] text-muted inline-flex items-center gap-1"><Clock size={11} /> {formatDate(briefing.generatedAt)}</span>}
          <button onClick={refresh} disabled={refreshing || loading} title="Regenerate" className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground disabled:opacity-50">
            {refreshing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} Refresh
          </button>
        </div>
      </div>

      <div className="px-4 pb-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted py-6"><Loader2 size={14} className="animate-spin" /> Generating your briefing…</div>
        ) : empty ? (
          <p className="text-sm text-muted py-2">No briefing yet. Sync meetings or upload transcripts, then hit Refresh — the assistant will summarize what&apos;s on your plate.</p>
        ) : (
          <div className="space-y-4">
            {!!d.plate?.length && (
              <ul className="space-y-1.5">
                {d.plate.map((p, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                    <CheckCircle2 size={15} className="text-blue-400 mt-0.5 shrink-0" /> {p}
                  </li>
                ))}
              </ul>
            )}

            {!!d.suggestedActions?.length && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted mb-1.5 inline-flex items-center gap-1"><Lightbulb size={12} /> Suggested actions</p>
                <div className="space-y-1.5">
                  {d.suggestedActions.map((a, i) => (
                    <div key={i} className="rounded-lg border border-border bg-surface px-3 py-2">
                      <p className="text-sm text-foreground">{a.title}</p>
                      {a.rationale && <p className="text-xs text-muted mt-0.5">{a.rationale}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              {!!d.topics?.length && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted mb-1.5">Active topics</p>
                  <div className="flex flex-wrap gap-1.5">
                    {d.topics.map((t, i) => <span key={i} className="text-xs rounded-md border border-border bg-surface px-2 py-1 text-foreground">{t}</span>)}
                  </div>
                </div>
              )}
              {!!d.openQuestions?.length && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted mb-1.5 inline-flex items-center gap-1"><HelpCircle size={12} /> Open questions</p>
                  <ul className="space-y-1">
                    {d.openQuestions.map((q, i) => <li key={i} className="text-xs text-muted">• {q}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
