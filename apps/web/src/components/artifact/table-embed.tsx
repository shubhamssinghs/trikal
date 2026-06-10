"use client";

import { memo, useEffect, useState } from "react";
import { Loader2, Table2 } from "lucide-react";
import { fetchArtifact, type GridSpec } from "@/lib/artifact";

const isNum = (v: unknown) => typeof v === "number" || (typeof v === "string" && v.trim() !== "" && !isNaN(Number(v)));

/** Render a saved table artifact (```table <id>```). */
export const TableEmbed = memo(function TableEmbed({ artifactId }: { artifactId: string }) {
  const [spec, setSpec] = useState<GridSpec | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    fetchArtifact(artifactId).then((a) => {
      if (cancelled) return;
      if (a?.spec && (a.type === "table" || a.type === "sheet")) { setSpec(a.spec as GridSpec); setState("ok"); } else setState("error");
    });
    return () => { cancelled = true; };
  }, [artifactId]);

  if (state === "loading") return <div className="my-2 grid h-16 place-items-center rounded-xl border border-border bg-surface-2/20"><Loader2 size={16} className="animate-spin text-muted" /></div>;
  if (state === "error" || !spec) return <div className="my-2 grid h-12 place-items-center rounded-xl border border-border bg-surface-2/20 text-xs text-muted"><span className="inline-flex items-center gap-1.5"><Table2 size={13} /> Table unavailable</span></div>;

  return (
    <div className="my-3 overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-xs">
        {spec.title && <caption className="caption-top px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted">{spec.title}</caption>}
        <thead>
          <tr className="bg-surface-2/60">
            {spec.columns.map((c, i) => <th key={i} className="px-3 py-2 text-left font-semibold text-foreground border-b border-border whitespace-nowrap">{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {spec.rows.map((row, ri) => (
            <tr key={ri} className={ri % 2 ? "bg-surface-2/20" : ""}>
              {spec.columns.map((_, ci) => (
                <td key={ci} className={`px-3 py-1.5 text-foreground border-b border-border/50 ${isNum(row[ci]) ? "text-right tabular-nums" : ""}`}>{row[ci] ?? ""}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {spec.note && <p className="px-3 py-1.5 text-[11px] text-muted">{spec.note}</p>}
    </div>
  );
});
