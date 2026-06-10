"use client";

import { memo, useEffect, useState } from "react";
import { Loader2, Sheet, Download } from "lucide-react";
import { fetchArtifact, type GridSpec } from "@/lib/artifact";

const isNum = (v: unknown) => typeof v === "number" || (typeof v === "string" && v.trim() !== "" && !isNaN(Number(v)));
const safe = (s: string) => s.replace(/[^\w.-]+/g, "_").slice(0, 60) || "sheet";

/** Render a saved spreadsheet artifact (```sheet <id>```) with an .xlsx download. */
export const SheetEmbed = memo(function SheetEmbed({ artifactId }: { artifactId: string }) {
  const [spec, setSpec] = useState<GridSpec | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchArtifact(artifactId).then((a) => {
      if (cancelled) return;
      if (a?.spec && a.type === "sheet") { setSpec(a.spec as GridSpec); setState("ok"); } else setState("error");
    });
    return () => { cancelled = true; };
  }, [artifactId]);

  const download = async () => {
    if (!spec) return;
    setBusy(true);
    try { const { downloadSheetXlsx } = await import("@/lib/xlsx-export"); await downloadSheetXlsx(spec, `${safe(spec.title)}.xlsx`); }
    finally { setBusy(false); }
  };

  if (state === "loading") return <div className="my-2 grid h-16 place-items-center rounded-xl border border-border bg-surface-2/20"><Loader2 size={16} className="animate-spin text-muted" /></div>;
  if (state === "error" || !spec) return <div className="my-2 grid h-12 place-items-center rounded-xl border border-border bg-surface-2/20 text-xs text-muted"><span className="inline-flex items-center gap-1.5"><Sheet size={13} /> Spreadsheet unavailable</span></div>;

  const preview = spec.rows.slice(0, 12);
  return (
    <div className="my-3 rounded-xl border border-border">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted"><Sheet size={13} /> {spec.title}</span>
        <button onClick={download} disabled={busy} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-foreground hover:bg-surface-2 disabled:opacity-50">
          {busy ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />} .xlsx
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead><tr className="bg-surface-2/60">{spec.columns.map((c, i) => <th key={i} className="px-3 py-1.5 text-left font-semibold text-foreground border-b border-border whitespace-nowrap">{c}</th>)}</tr></thead>
          <tbody>
            {preview.map((row, ri) => (
              <tr key={ri} className={ri % 2 ? "bg-surface-2/20" : ""}>
                {spec.columns.map((_, ci) => <td key={ci} className={`px-3 py-1 text-foreground border-b border-border/50 ${isNum(row[ci]) ? "text-right tabular-nums" : ""}`}>{row[ci] ?? ""}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {spec.rows.length > preview.length && <p className="px-3 py-1.5 text-[11px] text-muted">+{spec.rows.length - preview.length} more rows — download to see all.</p>}
    </div>
  );
});
