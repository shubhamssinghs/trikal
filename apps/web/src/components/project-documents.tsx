"use client";

import { useEffect, useState } from "react";
import { FileText, CheckCircle2, Clock, Download, Trash2, X, Loader2, Check } from "lucide-react";
import { Markdown } from "./markdown";
import { formatDate } from "@/lib/format";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

type DocLite = { id: string; title: string; status: string; version: number; updatedAt: string; approvedAt?: string | null };
type DocFull = DocLite & { content: string };

export function ProjectDocuments({ projectId }: { projectId: string }) {
  const [docs, setDocs] = useState<DocLite[]>([]);
  const [open, setOpen] = useState<DocFull | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = () =>
    fetch(`${API_BASE}/projects/${projectId}/documents`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : [])).then(setDocs).catch(() => {});
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [projectId]);

  const view = async (id: string) => {
    const d = await fetch(`${API_BASE}/projects/${projectId}/documents/${id}`, { credentials: "include" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    if (d) setOpen(d);
  };
  const approve = async (id: string) => {
    setBusy(id);
    await fetch(`${API_BASE}/projects/${projectId}/documents/${id}/approve`, { credentials: "include", method: "POST" }).catch(() => {});
    setBusy(null); load(); if (open?.id === id) setOpen(null);
  };
  const remove = async (id: string) => {
    await fetch(`${API_BASE}/projects/${projectId}/documents/${id}`, { credentials: "include", method: "DELETE" }).catch(() => {});
    load(); if (open?.id === id) setOpen(null);
  };

  if (docs.length === 0) return null; // only show once the agent has drafted something

  return (
    <section className="rounded-xl border border-border bg-surface shadow-sm p-4">
      <h2 className="text-sm font-medium text-foreground mb-3 inline-flex items-center gap-2"><FileText size={15} /> Documents <span className="text-muted">({docs.length})</span></h2>
      <div className="space-y-1.5">
        {docs.map((d) => (
          <div key={d.id} className="group flex items-center gap-2 rounded-lg border border-border bg-surface-2/30 px-3 py-2">
            <button onClick={() => view(d.id)} className="min-w-0 flex-1 text-left">
              <p className="text-sm text-foreground truncate">{d.title}</p>
              <p className="text-[11px] text-muted flex items-center gap-1.5">
                <span className={`inline-flex items-center gap-0.5 ${d.status === "approved" ? "text-emerald-500" : "text-amber-500"}`}>
                  {d.status === "approved" ? <CheckCircle2 size={11} /> : <Clock size={11} />}{d.status}
                </span>
                · v{d.version} · {formatDate(d.updatedAt)}
              </p>
            </button>
            <div className="flex items-center gap-0.5 shrink-0">
              {d.status !== "approved" && (
                <button onClick={() => approve(d.id)} disabled={busy === d.id} title="Approve → add to knowledge base" className="p-1 rounded text-emerald-500 hover:bg-emerald-500/10">
                  {busy === d.id ? <Loader2 size={13} className="animate-spin" /> : <Check size={14} />}
                </button>
              )}
              <a href={`${API_BASE}/projects/${projectId}/documents/${d.id}/export`} title="Export .docx" className="p-1 rounded text-muted hover:text-foreground hover:bg-surface-2"><Download size={13} /></a>
              <button onClick={() => remove(d.id)} title="Delete" className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-red-500/10"><Trash2 size={13} /></button>
            </div>
          </div>
        ))}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-[fadeIn_120ms_ease-out]" onClick={() => setOpen(null)}>
          <div className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-xl border border-border bg-surface shadow-2xl animate-[scaleIn_140ms_ease-out]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-3.5 shrink-0">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-foreground truncate">{open.title}</h3>
                <p className="text-[11px] text-muted mt-0.5">
                  <span className={open.status === "approved" ? "text-emerald-500" : "text-amber-500"}>{open.status}</span> · v{open.version}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {open.status !== "approved" && <button onClick={() => approve(open.id)} className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs text-white hover:bg-emerald-500">{busy === open.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Approve</button>}
                <a href={`${API_BASE}/projects/${projectId}/documents/${open.id}/export`} className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted hover:text-foreground"><Download size={12} /> .docx</a>
                <button onClick={() => setOpen(null)} className="text-muted hover:text-foreground"><X size={16} /></button>
              </div>
            </div>
            <div className="overflow-y-auto px-5 py-4"><Markdown>{open.content}</Markdown></div>
          </div>
        </div>
      )}
    </section>
  );
}
