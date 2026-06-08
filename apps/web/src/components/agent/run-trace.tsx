"use client";

import { useEffect, useState } from "react";
import { Brain, MessageSquare, Wrench, ArrowDownToLine, AlertTriangle, Loader2 } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

type Step = { id: string; idx: number; type: string; skillSlug?: string | null; title?: string | null; content?: Record<string, unknown> | null };
type Run = {
  id: string; surface: string; goal: string; status: string; model?: string | null;
  answer?: string | null; tokensIn: number; tokensOut: number; createdAt: string; steps: Step[];
};

const META: Record<string, { icon: typeof Brain; color: string; label: string }> = {
  thinking: { icon: Brain, color: "#8b5cf6", label: "Thinking" },
  text: { icon: MessageSquare, color: "#2563eb", label: "Response" },
  tool_call: { icon: Wrench, color: "#d97706", label: "Tool call" },
  tool_result: { icon: ArrowDownToLine, color: "#16a34a", label: "Tool result" },
  error: { icon: AlertTriangle, color: "#dc2626", label: "Error" },
};

function text(c?: Record<string, unknown> | null): string {
  if (!c) return "";
  if (typeof c.text === "string") return c.text;
  if (typeof c.error === "string") return c.error;
  if (c.input) return JSON.stringify(c.input, null, 2);
  return JSON.stringify(c, null, 2);
}

export function RunTrace({ runId }: { runId: string }) {
  const [run, setRun] = useState<Run | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch(`${API_BASE}/agent/runs/${runId}`, { credentials: "include" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (alive) { setRun(d); setLoading(false); } })
        .catch(() => { if (alive) setLoading(false); });
    load();
    // Poll while running so the trace fills in live.
    const t = setInterval(() => { if (run?.status === "running") load(); }, 1500);
    return () => { alive = false; clearInterval(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId, run?.status]);

  if (loading) return <p className="text-sm text-muted">Loading run…</p>;
  if (!run) return <p className="text-sm text-muted">Run not found.</p>;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-surface p-4">
        <div className="flex items-center gap-2 mb-1">
          <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${
            run.status === "completed" ? "bg-green-500/15 text-green-500" :
            run.status === "running" ? "bg-blue-500/15 text-blue-500" :
            run.status === "awaiting_approval" ? "bg-amber-500/15 text-amber-500" : "bg-red-500/15 text-red-500"}`}>
            {run.status === "running" && <Loader2 size={10} className="animate-spin" />}
            {run.status}
          </span>
          <span className="text-[11px] text-muted">{run.surface}</span>
          {run.model && <span className="text-[11px] text-muted">· {run.model}</span>}
          <span className="text-[11px] text-muted ml-auto">{run.tokensIn + run.tokensOut} tokens</span>
        </div>
        <p className="text-sm text-foreground">{run.goal}</p>
      </div>

      <ol className="relative border-l border-border ml-2 space-y-3">
        {run.steps.map((s) => {
          const m = META[s.type] ?? META.text;
          const Icon = m.icon;
          return (
            <li key={s.id} className="ml-5">
              <span className="absolute -left-[9px] grid place-items-center w-[18px] h-[18px] rounded-full border border-border bg-surface" style={{ color: m.color }}>
                <Icon size={11} />
              </span>
              <div className="rounded-lg border border-border bg-surface px-3 py-2">
                <p className="text-[11px] font-semibold mb-0.5" style={{ color: m.color }}>
                  {m.label}{s.title ? ` · ${s.title}` : s.skillSlug ? ` · ${s.skillSlug}` : ""}
                </p>
                <pre className="text-xs text-foreground whitespace-pre-wrap font-sans leading-snug">{text(s.content)}</pre>
              </div>
            </li>
          );
        })}
        {run.steps.length === 0 && <li className="ml-5 text-sm text-muted">No steps recorded.</li>}
      </ol>
    </div>
  );
}
