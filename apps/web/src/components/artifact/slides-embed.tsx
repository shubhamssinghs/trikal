"use client";

import { memo, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, Presentation, Download, Play, ChevronLeft, ChevronRight, X } from "lucide-react";
import { fetchArtifact, type SlidesSpec, type SlideSpec } from "@/lib/artifact";
import { ChartEmbed } from "../chart/chart-embed";
import { DiagramEmbed } from "../diagram/diagram-embed";

const safe = (s: string) => s.replace(/[^\w.-]+/g, "_").slice(0, 60) || "deck";

/** Render a saved slide deck artifact (```slides <id>```): preview + present + .pptx. */
export const SlidesEmbed = memo(function SlidesEmbed({ artifactId, projectId }: { artifactId: string; projectId?: string }) {
  const [spec, setSpec] = useState<SlidesSpec | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const [present, setPresent] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchArtifact(artifactId).then((a) => {
      if (cancelled) return;
      if (a?.spec && a.type === "slides") { setSpec(a.spec as SlidesSpec); setState("ok"); } else setState("error");
    });
    return () => { cancelled = true; };
  }, [artifactId]);

  const exportPptx = async () => {
    if (!spec) return;
    setBusy(true);
    try { const { downloadSlidesPptx } = await import("@/lib/pptx-export"); await downloadSlidesPptx(spec, `${safe(spec.title)}.pptx`); }
    finally { setBusy(false); }
  };

  if (state === "loading") return <div className="my-2 grid h-20 place-items-center rounded-xl border border-border bg-surface-2/20"><Loader2 size={16} className="animate-spin text-muted" /></div>;
  if (state === "error" || !spec) return <div className="my-2 grid h-12 place-items-center rounded-xl border border-border bg-surface-2/20 text-xs text-muted"><span className="inline-flex items-center gap-1.5"><Presentation size={13} /> Deck unavailable</span></div>;

  return (
    <div className="my-3 rounded-xl border border-border bg-surface">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted"><Presentation size={13} /> {spec.title} · {spec.slides.length} slides</span>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setPresent(true)} className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2 py-1 text-[11px] text-white hover:bg-blue-500"><Play size={11} /> Present</button>
          <button onClick={exportPptx} disabled={busy} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-foreground hover:bg-surface-2 disabled:opacity-50">{busy ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />} .pptx</button>
        </div>
      </div>
      {/* Thumbnail strip */}
      <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3">
        {spec.slides.slice(0, 6).map((s, i) => (
          <button key={i} onClick={() => setPresent(true)} className="rounded-lg border border-border bg-surface-2/30 p-2 text-left hover:border-blue-500/50">
            <p className="text-[11px] font-semibold text-foreground line-clamp-2">{i + 1}. {s.title}</p>
            {s.bullets?.[0] && <p className="mt-1 text-[10px] text-muted line-clamp-2">{s.bullets[0]}</p>}
            {(s.chartId || s.diagramId) && <p className="mt-1 text-[10px] text-blue-400">{s.chartId ? "▦ chart" : "◇ diagram"}</p>}
          </button>
        ))}
      </div>
      {present && <SlideViewer spec={spec} projectId={projectId} onClose={() => setPresent(false)} />}
    </div>
  );
});

function SlideViewer({ spec, projectId, onClose }: { spec: SlidesSpec; projectId?: string; onClose: () => void }) {
  const [idx, setIdx] = useState(0);
  const [mounted, setMounted] = useState(false);
  const total = spec.slides.length;
  const go = (d: number) => setIdx((i) => Math.min(total - 1, Math.max(0, i + d)));

  useEffect(() => {
    setMounted(true);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, total]);

  if (!mounted) return null;
  const s: SlideSpec = spec.slides[idx];

  return createPortal(
    <div className="fixed inset-0 z-[80] flex flex-col bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div className="flex items-center justify-between px-5 py-3 text-white/80 shrink-0">
        <span className="text-sm">{spec.title}</span>
        <span className="text-xs">{idx + 1} / {total}</span>
        <button onClick={onClose} className="hover:text-white"><X size={18} /></button>
      </div>
      <div className="flex flex-1 items-center justify-center gap-3 px-4 pb-6 min-h-0" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => go(-1)} disabled={idx === 0} className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20 disabled:opacity-30 shrink-0"><ChevronLeft size={22} /></button>
        {/* 16:9 slide */}
        <div className="aspect-video w-full max-w-5xl max-h-full overflow-y-auto rounded-xl bg-white p-8 shadow-2xl">
          <h2 className="text-2xl font-bold text-gray-900">{s.title}</h2>
          <div className="mt-1 h-1 w-16 rounded bg-indigo-500" />
          <div className={`mt-5 grid gap-5 ${(s.chartId || s.diagramId) && s.bullets?.length ? "grid-cols-2" : "grid-cols-1"}`}>
            {s.bullets && s.bullets.length > 0 && (
              <ul className="space-y-2.5">
                {s.bullets.map((b, i) => <li key={i} className="flex gap-2 text-[15px] leading-relaxed text-gray-700"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />{b}</li>)}
              </ul>
            )}
            {s.chartId && <div className="min-w-0">{/* light theme inside white slide */}<ChartEmbed chartId={s.chartId} /></div>}
            {s.diagramId && !s.chartId && <div className="min-w-0"><DiagramEmbed diagramId={s.diagramId} projectId={projectId} /></div>}
          </div>
        </div>
        <button onClick={() => go(1)} disabled={idx === total - 1} className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20 disabled:opacity-30 shrink-0"><ChevronRight size={22} /></button>
      </div>
    </div>,
    document.body,
  );
}
