"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { X, ExternalLink } from "lucide-react";
import { DiagramEmbed } from "./diagram-embed";

/** Quick preview of a diagram in a modal (so you don't leave the chat). */
export function DiagramModal({ diagramId, projectId, label, onClose }: { diagramId: string; projectId: string; label?: string; onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-[fadeIn_120ms_ease-out]" onClick={onClose}>
      <div className="w-full max-w-3xl max-h-[88vh] flex flex-col rounded-xl border border-border bg-surface shadow-2xl animate-[scaleIn_140ms_ease-out]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5 shrink-0">
          <h3 className="text-sm font-semibold text-foreground truncate">{label || "Diagram"}</h3>
          <div className="flex items-center gap-2 shrink-0">
            <Link href={`/projects/${projectId}/diagrams/${diagramId}`} className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs text-foreground hover:bg-surface-2"><ExternalLink size={12} /> Open in editor</Link>
            <button onClick={onClose} className="text-muted hover:text-foreground"><X size={16} /></button>
          </div>
        </div>
        <div className="overflow-y-auto px-5 py-4"><DiagramEmbed diagramId={diagramId} projectId={projectId} /></div>
      </div>
    </div>,
    document.body,
  );
}
