"use client";

import { useEffect, useState } from "react";
import { FileText, BarChart3, Table2, Sheet, Presentation, Sparkles, Check, Download, Loader2, FolderOpen } from "lucide-react";
import { Markdown } from "../markdown";
import { ChartEmbed } from "../chart/chart-embed";
import { DiagramEmbed } from "../diagram/diagram-embed";
import { TableEmbed } from "./table-embed";
import { SheetEmbed } from "./sheet-embed";
import { SlidesEmbed } from "./slides-embed";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export type ViewerItem = { type?: string; id?: string; label?: string; href?: string };

const ICON: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  document: FileText, chart: BarChart3, table: Table2, sheet: Sheet, slides: Presentation, diagram: Sparkles,
};

/** Right-hand viewer: a list of files created in this chat + the selected one rendered big. */
export function ArtifactPane({ items, selected, onSelect, projectId, onChanged }: {
  items: ViewerItem[]; selected: ViewerItem | null; onSelect: (it: ViewerItem) => void; projectId: string; onChanged?: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5 shrink-0">
        <FolderOpen size={15} className="text-blue-400" />
        <span className="text-sm font-medium text-foreground">Files</span>
        <span className="text-xs text-muted">{items.length}</span>
      </div>

      {items.length === 0 ? (
        <div className="flex-1 grid place-items-center text-center px-6">
          <div>
            <div className="grid place-items-center w-11 h-11 rounded-xl bg-surface-2 text-muted mx-auto mb-3"><FolderOpen size={20} /></div>
            <p className="text-sm font-medium text-foreground">Nothing here yet</p>
            <p className="text-xs text-muted mt-1 max-w-xs">Documents, charts, tables, spreadsheets, slide decks and diagrams the assistant creates will show up here.</p>
          </div>
        </div>
      ) : (
        <>
          {/* file chips */}
          <div className="flex gap-1.5 overflow-x-auto border-b border-border px-3 py-2 shrink-0">
            {items.map((it, i) => {
              const Icon = ICON[it.type ?? ""] ?? FileText;
              const active = selected?.id === it.id && selected?.type === it.type;
              return (
                <button key={`${it.type}-${it.id}-${i}`} onClick={() => onSelect(it)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs whitespace-nowrap ${active ? "border-blue-500 bg-blue-600/10 text-foreground" : "border-border text-muted hover:text-foreground hover:bg-surface-2"}`}>
                  <Icon size={12} /> <span className="max-w-[140px] truncate">{it.label || it.type}</span>
                </button>
              );
            })}
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {selected ? <ViewerBody item={selected} projectId={projectId} onChanged={onChanged} /> : <p className="text-sm text-muted">Select a file above.</p>}
          </div>
        </>
      )}
    </div>
  );
}

function ViewerBody({ item, projectId, onChanged }: { item: ViewerItem; projectId: string; onChanged?: () => void }) {
  if (!item.id) return null;
  switch (item.type) {
    case "chart": return <ChartEmbed chartId={item.id} />;
    case "table": return <TableEmbed artifactId={item.id} />;
    case "sheet": return <SheetEmbed artifactId={item.id} />;
    case "slides": return <SlidesEmbed artifactId={item.id} projectId={projectId} />;
    case "diagram": return <DiagramEmbed diagramId={item.id} projectId={projectId} />;
    case "document": return <DocPane docId={item.id} projectId={projectId} onChanged={onChanged} />;
    default: return <p className="text-sm text-muted">Can’t preview this item.</p>;
  }
}

type Doc = { id: string; title: string; content: string; status: string; version: number };

function DocPane({ docId, projectId, onChanged }: { docId: string; projectId: string; onChanged?: () => void }) {
  const [doc, setDoc] = useState<Doc | null>(null);
  const [busy, setBusy] = useState<"approve" | "export" | null>(null);

  const load = () => fetch(`${API_BASE}/projects/${projectId}/documents/${docId}`, { credentials: "include" }).then((r) => (r.ok ? r.json() : null)).then(setDoc).catch(() => {});
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [docId, projectId]);

  const approve = async () => {
    setBusy("approve");
    await fetch(`${API_BASE}/projects/${projectId}/documents/${docId}/approve`, { credentials: "include", method: "POST" }).catch(() => {});
    setBusy(null); await load(); onChanged?.();
  };
  const exportDocx = async () => {
    if (!doc) return;
    setBusy("export");
    try { const { markdownToDocx, downloadBlob } = await import("@/lib/docx-export"); const blob = await markdownToDocx(doc.title, doc.content, projectId); downloadBlob(blob, `${doc.title.replace(/[^\w.-]+/g, "_").slice(0, 60) || "document"}.docx`); }
    finally { setBusy(null); }
  };

  if (!doc) return <div className="flex items-center gap-2 text-sm text-muted"><Loader2 size={14} className="animate-spin" /> Loading…</div>;
  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-3">
        <p className="text-[11px] text-muted"><span className={doc.status === "approved" ? "text-emerald-500" : "text-amber-500"}>{doc.status}</span> · v{doc.version}</p>
        <div className="flex items-center gap-1.5">
          {doc.status !== "approved" && <button onClick={approve} disabled={!!busy} className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-xs text-white hover:bg-emerald-500">{busy === "approve" ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Approve</button>}
          <button onClick={exportDocx} disabled={busy === "export"} className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs text-muted hover:text-foreground disabled:opacity-50">{busy === "export" ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />} .docx</button>
        </div>
      </div>
      <div className="[&>*:first-child]:mt-0"><Markdown projectId={projectId}>{doc.content}</Markdown></div>
    </div>
  );
}
