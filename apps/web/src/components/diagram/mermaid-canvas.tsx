"use client";

import { useEffect, useRef, useState } from "react";
import { Save, Check, Download, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button, inputClass } from "../ui";
import { type DiagramData, mermaidTemplate } from "@/lib/diagram";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

/** Live Mermaid preview pane. Renders `code` to SVG, surfacing parse errors. */
function Preview({ code }: { code: string }) {
  const [svg, setSvg] = useState("");
  const [error, setError] = useState("");
  const idRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const mermaid = (await import("mermaid")).default;
      mermaid.initialize({ startOnLoad: false, theme: document.documentElement.classList.contains("dark") ? "dark" : "default", securityLevel: "strict" });
      try {
        const { svg } = await mermaid.render(`m${idRef.current++}`, code || "");
        if (!cancelled) { setSvg(svg); setError(""); }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Invalid Mermaid syntax");
      }
    })();
    return () => { cancelled = true; };
  }, [code]);

  if (error) {
    return (
      <div className="flex items-start gap-2 text-xs text-amber-500 p-4">
        <AlertTriangle size={14} className="mt-0.5 shrink-0" />
        <span className="whitespace-pre-wrap">{error}</span>
      </div>
    );
  }
  return <div className="w-full grid place-items-center p-4 [&_svg]:max-w-full [&_svg]:h-auto" dangerouslySetInnerHTML={{ __html: svg }} />;
}

export function MermaidCanvas({ diagramId, kind, initial }: { diagramId: string; kind: string; initial: DiagramData }) {
  const router = useRouter();
  const [title, setTitle] = useState(initial.title);
  const [code, setCode] = useState(initial.mermaid || mermaidTemplate(kind));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setSaving(true); setSaved(false);
    const schemaJson: DiagramData = { ...initial, title: title.trim() || "Untitled diagram", mermaid: code };
    const res = await fetch(`${API_BASE}/diagrams/${diagramId}`, {
      credentials: "include", method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: schemaJson.title, schemaJson }),
    }).catch(() => null);
    setSaving(false);
    if (res?.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000); router.refresh(); }
  };

  const exportSvg = async () => {
    const mermaid = (await import("mermaid")).default;
    mermaid.initialize({ startOnLoad: false, theme: document.documentElement.classList.contains("dark") ? "dark" : "default", securityLevel: "strict" });
    try {
      const { svg } = await mermaid.render("export", code);
      const blob = new Blob([svg], { type: "image/svg+xml" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${title.replace(/\s+/g, "-").toLowerCase() || "diagram"}.svg`;
      a.click();
    } catch { /* ignore invalid syntax */ }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] min-h-[560px] rounded-xl border border-border bg-surface overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2 shrink-0">
        <input value={title} onChange={(e) => setTitle(e.target.value)} className={`${inputClass} max-w-xs`} placeholder="Diagram title" />
        <span className="text-[11px] text-muted">Mermaid · {kind}</span>
        <div className="flex-1" />
        <button onClick={exportSvg} className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-2 text-xs text-muted hover:text-foreground hover:bg-surface-2">
          <Download size={13} /> SVG
        </button>
        <Button onClick={save} disabled={saving}>
          {saved ? <><Check size={14} /> Saved</> : <><Save size={14} /> {saving ? "Saving…" : "Save"}</>}
        </Button>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 min-h-0">
        <div className="border-r border-border min-h-0 flex flex-col">
          <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted">Mermaid source</p>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck={false}
            className="flex-1 w-full resize-none bg-surface-2/30 text-foreground font-mono text-xs leading-relaxed p-3 outline-none"
          />
        </div>
        <div className="min-h-0 overflow-auto">
          <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted">Preview</p>
          <Preview code={code} />
        </div>
      </div>
    </div>
  );
}
