"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Check, Download, Trash2, Pencil, Loader2 } from "lucide-react";
import { Markdown } from "./markdown";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

type Doc = { id: string; title: string; content: string; status: string; version: number };

/** Full-screen document viewer with approve / amend / export / delete. Portaled to body. */
export function DocumentViewer({
  projectId, documentId, onClose, onChanged, onAmend,
}: {
  projectId: string;
  documentId: string;
  onClose: () => void;
  onChanged?: () => void;
  onAmend?: (title: string) => void;
}) {
  const [doc, setDoc] = useState<Doc | null>(null);
  const [busy, setBusy] = useState<"approve" | "delete" | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetch(`${API_BASE}/projects/${projectId}/documents/${documentId}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null)).then(setDoc).catch(() => {});
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [projectId, documentId, onClose]);

  const approve = async () => {
    setBusy("approve");
    await fetch(`${API_BASE}/projects/${projectId}/documents/${documentId}/approve`, { credentials: "include", method: "POST" }).catch(() => {});
    setBusy(null); onChanged?.(); onClose();
  };
  const del = async () => {
    setBusy("delete");
    await fetch(`${API_BASE}/projects/${projectId}/documents/${documentId}`, { credentials: "include", method: "DELETE" }).catch(() => {});
    setBusy(null); onChanged?.(); onClose();
  };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-[fadeIn_120ms_ease-out]" onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[88vh] flex flex-col rounded-xl border border-border bg-surface shadow-2xl animate-[scaleIn_140ms_ease-out]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-3.5 shrink-0">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground truncate">{doc?.title ?? "Loading…"}</h3>
            {doc && <p className="text-[11px] text-muted mt-0.5"><span className={doc.status === "approved" ? "text-emerald-500" : "text-amber-500"}>{doc.status}</span> · v{doc.version}</p>}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {doc && doc.status !== "approved" && (
              <button onClick={approve} disabled={!!busy} className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs text-white hover:bg-emerald-500">
                {busy === "approve" ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Approve
              </button>
            )}
            {onAmend && doc && (
              <button onClick={() => { onAmend(doc.title); onClose(); }} className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs text-foreground hover:bg-surface-2"><Pencil size={12} /> Amend</button>
            )}
            <a href={`${API_BASE}/projects/${projectId}/documents/${documentId}/export`} className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted hover:text-foreground"><Download size={12} /> .docx</a>
            <button onClick={del} disabled={!!busy} title="Delete" className="p-1.5 rounded text-red-400 hover:text-red-300 hover:bg-red-500/10">{busy === "delete" ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}</button>
            <button onClick={onClose} className="text-muted hover:text-foreground"><X size={16} /></button>
          </div>
        </div>
        <div className="overflow-y-auto px-5 py-4">{doc ? <Markdown projectId={projectId}>{doc.content}</Markdown> : <div className="flex items-center gap-2 text-sm text-muted"><Loader2 size={14} className="animate-spin" /> Loading…</div>}</div>
      </div>
    </div>,
    document.body,
  );
}
