"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, X } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

type Insight = {
  id: string;
  kind: string;
  severity: "high" | "medium" | "low";
  title: string;
  detail?: string | null;
  suggestedAction?: string | null;
  project: { id: string; name: string };
};

const sev: Record<string, { dot: string; ring: string; label: string }> = {
  high: { dot: "bg-red-500", ring: "border-red-500/30", label: "text-red-400" },
  medium: { dot: "bg-amber-500", ring: "border-amber-500/30", label: "text-amber-400" },
  low: { dot: "bg-blue-500", ring: "border-blue-500/30", label: "text-blue-400" },
};

export function AttentionPanel() {
  const [items, setItems] = useState<Insight[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/proactive`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => { if (!cancelled) setItems(Array.isArray(d) ? d : []); })
      .catch(() => { if (!cancelled) setItems([]); });
    return () => { cancelled = true; };
  }, []);

  const dismiss = async (id: string) => {
    setItems((prev) => (prev ?? []).filter((i) => i.id !== id));
    await fetch(`${API_BASE}/proactive/${id}/dismiss`, { credentials: "include", method: "POST" }).catch(() => {});
  };

  // Render nothing until loaded, and nothing when all-clear (keeps the dashboard calm).
  if (!items || items.length === 0) return null;

  const high = items.filter((i) => i.severity === "high").length;

  return (
    <section className="rounded-xl border border-amber-500/30 bg-surface shadow-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle size={15} className="text-amber-400" />
        <h2 className="text-sm font-medium text-foreground">Needs your attention</h2>
        <span className="text-xs text-muted">{items.length} item{items.length === 1 ? "" : "s"}{high ? ` · ${high} high` : ""}</span>
      </div>

      <div className="space-y-2">
        {items.map((i) => {
          const s = sev[i.severity] ?? sev.low;
          return (
            <div key={i.id} className={`group rounded-lg border ${s.ring} bg-surface-2/40 px-3 py-2.5`}>
              <div className="flex items-start gap-2.5">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${s.dot}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground truncate">{i.title}</p>
                    <span className={`text-[10px] uppercase tracking-wide ${s.label} shrink-0`}>{i.severity}</span>
                  </div>
                  {i.detail && <p className="text-xs text-muted mt-0.5">{i.detail}</p>}
                  {i.suggestedAction && <p className="text-xs text-foreground/70 mt-1">→ {i.suggestedAction}</p>}
                  <Link href={`/projects/${i.project.id}`} className="text-xs text-blue-400 hover:text-blue-300 inline-flex items-center gap-1 mt-1.5">
                    {i.project.name} <ArrowRight size={11} />
                  </Link>
                </div>
                <button onClick={() => dismiss(i.id)} title="Dismiss" className="p-1 rounded text-muted hover:text-foreground hover:bg-surface-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <X size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
