"use client";

import { useEffect, useState } from "react";
import { FileText, CheckCircle2, Clock } from "lucide-react";
import { DocumentViewer } from "./document-viewer";
import { formatDate } from "@/lib/format";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

type DocLite = { id: string; title: string; status: string; version: number; updatedAt: string };

export function ProjectDocuments({ projectId }: { projectId: string }) {
  const [docs, setDocs] = useState<DocLite[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = () =>
    fetch(`${API_BASE}/projects/${projectId}/documents`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : [])).then(setDocs).catch(() => {});
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [projectId]);

  if (docs.length === 0) return null;

  return (
    <section className="rounded-xl border border-border bg-surface shadow-sm p-4">
      <h2 className="text-sm font-medium text-foreground mb-3 inline-flex items-center gap-2"><FileText size={15} /> Documents <span className="text-muted">({docs.length})</span></h2>
      <div className="space-y-1.5">
        {docs.map((d) => (
          <button key={d.id} onClick={() => setOpenId(d.id)} className="w-full text-left flex items-center gap-2 rounded-lg border border-border bg-surface-2/30 px-3 py-2 hover:bg-surface-2/60">
            <FileText size={14} className="text-muted shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm text-foreground truncate">{d.title}</span>
              <span className="block text-[11px] text-muted flex items-center gap-1.5">
                <span className={`inline-flex items-center gap-0.5 ${d.status === "approved" ? "text-emerald-500" : "text-amber-600 dark:text-amber-400"}`}>
                  {d.status === "approved" ? <CheckCircle2 size={11} /> : <Clock size={11} />}{d.status}
                </span>
                · v{d.version} · {formatDate(d.updatedAt)}
              </span>
            </span>
          </button>
        ))}
      </div>

      {openId && <DocumentViewer projectId={projectId} documentId={openId} onClose={() => setOpenId(null)} onChanged={load} />}
    </section>
  );
}
