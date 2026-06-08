"use client";

import { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

type Briefing = {
  greeting: string;
  topPriorities: { text: string; urgency: string; projectName: string }[];
  atRiskProjects: { projectName: string; reason: string }[];
  pendingApprovals: number;
  openRisks: number;
  insight: string;
};

const urgencyColor: Record<string, string> = {
  high: "text-red-400 border-red-900/40",
  medium: "text-amber-400 border-amber-900/40",
  low: "text-blue-400 border-blue-900/40",
};

export function BriefingPanel() {
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 20_000); // never hang forever

    fetch(`${API_BASE}/ai/briefing`, { credentials: "include", signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => { if (!cancelled) setBriefing(data); })
      .catch(() => { if (!cancelled) setFailed(true); })
      .finally(() => { if (!cancelled) setLoading(false); clearTimeout(timeout); });

    return () => { cancelled = true; ctrl.abort(); clearTimeout(timeout); };
  }, []);

  if (loading) {
    return (
      <section className="rounded-xl border border-blue-500/30 bg-surface shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
          <h2 className="text-sm font-medium text-blue-400">AI Briefing</h2>
          <span className="text-xs text-muted">generating…</span>
        </div>
        <div className="space-y-2">
          {[0, 1, 2].map((i) => <div key={i} className="h-10 rounded bg-surface-2 animate-pulse" />)}
        </div>
      </section>
    );
  }

  if (failed || !briefing) return null;

  return (
    <section className="rounded-xl border border-blue-500/30 bg-surface shadow-sm p-4">
      <h2 className="text-sm font-medium text-blue-400 mb-1">AI Briefing</h2>
      {briefing.greeting && <p className="text-sm text-foreground italic mb-3">{briefing.greeting}</p>}

      {briefing.topPriorities.length > 0 ? (
        <div className="space-y-2">
          {briefing.topPriorities.map((p, i) => (
            <div key={i} className={`rounded border px-3 py-2 ${urgencyColor[p.urgency] ?? urgencyColor.low}`}>
              <p className="text-sm text-foreground">{p.text}</p>
              <p className="text-xs opacity-60 mt-0.5">{p.projectName} · {p.urgency}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">No priorities surfaced yet.</p>
      )}

      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border text-xs">
        <span className="text-muted">Approvals: <span className="text-foreground">{briefing.pendingApprovals}</span></span>
        <span className="text-muted">Open risks: <span className="text-foreground">{briefing.openRisks}</span></span>
      </div>
      {briefing.insight && <p className="text-xs text-muted mt-2">{briefing.insight}</p>}
    </section>
  );
}
