"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sparkles, Plus, Trash2, Workflow, Loader2 } from "lucide-react";
import { Modal, Button, Field, inputClass, EmptyState } from "../ui";
import { emptyDiagram, templateFor, kindMeta, DIAGRAM_KINDS, type DiagramKind, type DiagramSummary } from "@/lib/diagram";
import { formatDate } from "@/lib/format";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export function DiagramsList({ projectId, initial }: { projectId?: string; initial: DiagramSummary[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [open, setOpen] = useState(false);
  const basePath = projectId ? `/projects/${projectId}/diagrams` : "/diagrams";

  const remove = async (id: string) => {
    await fetch(`${API_BASE}/diagrams/${id}`, { credentials: "include", method: "DELETE" }).catch(() => {});
    setItems((prev) => prev.filter((d) => d.id !== id));
  };

  return (
    <>
      <div className="flex items-center justify-end mb-4">
        <Button onClick={() => setOpen(true)}><Plus size={14} /> New diagram</Button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<Workflow size={28} />}
          title="No diagrams yet"
          description={projectId ? "Create a diagram — pick a type, then start blank or generate it from this project's knowledge base." : "Create a quick diagram — pick a type, then start blank or generate it with AI from a prompt."}
          action={<Button onClick={() => setOpen(true)}><Plus size={14} /> New diagram</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((d) => {
            const meta = kindMeta(d.kind);
            const Icon = meta.icon;
            return (
              <div key={d.id} className="group relative rounded-xl border border-border bg-surface hover:border-blue-500/40 transition-colors shadow-sm">
                <Link href={`${basePath}/${d.id}`} className="block p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="grid place-items-center w-8 h-8 rounded-lg shrink-0" style={{ backgroundColor: `${meta.color}1f`, color: meta.color }}>
                      <Icon size={16} />
                    </span>
                    <p className="text-sm font-medium text-foreground truncate flex-1">{d.title}</p>
                  </div>
                  {d.description && <p className="text-xs text-muted line-clamp-2 mb-2">{d.description}</p>}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium rounded px-1.5 py-0.5" style={{ color: meta.color, backgroundColor: `${meta.color}14` }}>{meta.label}</span>
                    <span className="text-[11px] text-muted/70">Updated {formatDate(d.updatedAt)}</span>
                  </div>
                </Link>
                <button onClick={() => remove(d.id)} title="Delete diagram" className="absolute top-3 right-3 p-1 rounded text-muted opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-500/10 transition">
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {open && <NewDiagramModal projectId={projectId} basePath={basePath} onClose={() => setOpen(false)} />}
    </>
  );
}

function NewDiagramModal({ projectId, basePath, onClose }: { projectId?: string; basePath: string; onClose: () => void }) {
  const router = useRouter();
  const [kind, setKind] = useState<DiagramKind>("architecture");
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState<"blank" | "gen" | null>(null);
  const [error, setError] = useState("");

  const createBlank = async () => {
    setBusy("blank"); setError("");
    const meta = kindMeta(kind);
    const title = `${meta.label} diagram`;
    const res = await fetch(`${API_BASE}/diagrams${projectId ? `?projectId=${projectId}` : ""}`, {
      credentials: "include", method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, kind, schemaJson: templateFor(kind, title) }),
    }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    setBusy(null);
    if (res?.id) router.push(`${basePath}/${res.id}`);
    else setError("Could not create the diagram.");
  };

  const generate = async () => {
    setBusy("gen"); setError("");
    const res = await fetch(`${API_BASE}/diagrams/generate`, {
      credentials: "include", method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...(projectId ? { projectId } : {}), kind, prompt: prompt.trim() || undefined }),
    }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    setBusy(null);
    if (res?.diagram?.id) router.push(`${basePath}/${res.diagram.id}`);
    else setError("Generation failed. Check that an AI provider key is set in Settings.");
  };

  return (
    <Modal title="New diagram" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <p className="text-[11px] font-medium text-muted mb-1.5">Type</p>
          <div className="grid grid-cols-1 gap-1.5">
            {DIAGRAM_KINDS.map((k) => {
              const Icon = k.icon;
              const active = kind === k.value;
              return (
                <button
                  key={k.value}
                  onClick={() => setKind(k.value)}
                  className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${active ? "border-blue-500/60 bg-blue-600/10" : "border-border hover:bg-surface-2"}`}
                >
                  <span className="grid place-items-center w-8 h-8 rounded-lg shrink-0" style={{ backgroundColor: `${k.color}1f`, color: k.color }}>
                    <Icon size={16} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm text-foreground">{k.label}</span>
                    <span className="block text-[11px] text-muted truncate">{k.description}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <Field label="Focus for AI (optional)">
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={2} className={inputClass} placeholder="e.g. the checkout flow, or the data pipeline" />
        </Field>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={createBlank} disabled={busy !== null}>
            {busy === "blank" ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Start blank
          </Button>
          <Button onClick={generate} disabled={busy !== null}>
            {busy === "gen" ? <><Loader2 size={14} className="animate-spin" /> Generating…</> : <><Sparkles size={14} /> Generate with AI</>}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
