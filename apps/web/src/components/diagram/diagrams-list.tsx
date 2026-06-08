"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sparkles, Plus, Trash2, Workflow, Loader2 } from "lucide-react";
import { Modal, Button, Field, inputClass, EmptyState } from "../ui";
import { emptyDiagram, type DiagramSummary } from "@/lib/diagram";
import { formatDate } from "@/lib/format";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export function DiagramsList({ projectId, initial }: { projectId: string; initial: DiagramSummary[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [genOpen, setGenOpen] = useState(false);
  const [busy, setBusy] = useState<"blank" | "gen" | null>(null);

  const createBlank = async () => {
    setBusy("blank");
    const res = await fetch(`${API_BASE}/diagrams?projectId=${projectId}`, {
      credentials: "include", method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Untitled diagram", schemaJson: emptyDiagram() }),
    }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    setBusy(null);
    if (res?.id) router.push(`/projects/${projectId}/diagrams/${res.id}`);
  };

  const remove = async (id: string) => {
    await fetch(`${API_BASE}/diagrams/${id}`, { credentials: "include", method: "DELETE" }).catch(() => {});
    setItems((prev) => prev.filter((d) => d.id !== id));
  };

  return (
    <>
      <div className="flex items-center justify-end gap-2 mb-4">
        <Button variant="secondary" onClick={createBlank} disabled={busy !== null}>
          {busy === "blank" ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Blank diagram
        </Button>
        <Button onClick={() => setGenOpen(true)} disabled={busy !== null}>
          <Sparkles size={14} /> Generate with AI
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<Workflow size={28} />}
          title="No diagrams yet"
          description="Generate an architecture diagram from this project's knowledge base, or start from a blank canvas."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((d) => (
            <div key={d.id} className="group relative rounded-xl border border-border bg-surface hover:border-blue-500/40 transition-colors shadow-sm">
              <Link href={`/projects/${projectId}/diagrams/${d.id}`} className="block p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="grid place-items-center w-8 h-8 rounded-lg bg-blue-600/10 text-blue-500"><Workflow size={16} /></span>
                  <p className="text-sm font-medium text-foreground truncate">{d.title}</p>
                </div>
                {d.description && <p className="text-xs text-muted line-clamp-2 mb-2">{d.description}</p>}
                <p className="text-[11px] text-muted/70">Updated {formatDate(d.updatedAt)}</p>
              </Link>
              <button
                onClick={() => remove(d.id)}
                title="Delete diagram"
                className="absolute top-3 right-3 p-1 rounded text-muted opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-500/10 transition"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {genOpen && <GenerateModal projectId={projectId} onClose={() => setGenOpen(false)} />}
    </>
  );
}

function GenerateModal({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const generate = async () => {
    setBusy(true); setError("");
    const res = await fetch(`${API_BASE}/diagrams/generate`, {
      credentials: "include", method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, prompt: prompt.trim() || undefined }),
    }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    setBusy(false);
    if (res?.diagram?.id) router.push(`/projects/${projectId}/diagrams/${res.diagram.id}`);
    else setError("Generation failed. Check that an AI provider key is set in Settings.");
  };

  return (
    <Modal title="Generate diagram with AI" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-xs text-muted">
          The AI reads this project&apos;s knowledge base (transcripts, docs) and drafts an architecture diagram you can then edit.
        </p>
        <Field label="Focus (optional)">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            className={inputClass}
            placeholder="e.g. Focus on the data pipeline and external integrations"
          />
        </Field>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={generate} disabled={busy}>
            {busy ? <><Loader2 size={14} className="animate-spin" /> Generating…</> : <><Sparkles size={14} /> Generate</>}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
