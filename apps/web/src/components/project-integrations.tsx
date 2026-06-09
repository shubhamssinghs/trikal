"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Loader2, Check } from "lucide-react";
import { Button, inputClass } from "./ui";
import { formatDate } from "@/lib/format";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

type Scope = { mode?: "all" | "selective"; keywords?: string[]; ownerDomains?: string[]; noteIds?: string[] };
type Link = { id: string; enabled: boolean; scope: Scope; lastSyncedAt: string | null; lastSyncStatus: string | null; lastSyncCount: number };
type Note = { id: string; title: string; summary: string; owner: string; created: string | null };

export function ProjectIntegrations({ projectId }: { projectId: string }) {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [link, setLink] = useState<Link | null>(null);
  const [mode, setMode] = useState<"all" | "selective">("all");
  const [keywords, setKeywords] = useState("");
  const [domains, setDomains] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [showNotes, setShowNotes] = useState(false);
  const [busy, setBusy] = useState<"save" | "sync" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const loadConn = () =>
    fetch(`${API_BASE}/integrations`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then((list: Array<{ provider: string; connected: boolean }>) => setConnected(!!list.find((c) => c.provider === "granola")?.connected))
      .catch(() => setConnected(false));

  const loadLink = () =>
    fetch(`${API_BASE}/integrations/projects/${projectId}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then((links: Link[]) => {
        const g = links[0] ?? null;
        setLink(g);
        if (g) {
          const sc = g.scope ?? {};
          setMode(sc.mode === "selective" ? "selective" : "all");
          setKeywords((sc.keywords ?? []).join(", "));
          setDomains((sc.ownerDomains ?? []).join(", "));
          setPicked(sc.noteIds ?? []);
        }
      })
      .catch(() => {});

  useEffect(() => { loadConn(); loadLink(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [projectId]);

  const scopeBody = (): Scope => ({
    mode,
    keywords: keywords.split(",").map((s) => s.trim()).filter(Boolean),
    ownerDomains: domains.split(",").map((s) => s.trim().replace(/^@/, "")).filter(Boolean),
    noteIds: picked,
  });

  const save = async (enabled: boolean) => {
    setBusy("save"); setMsg(null);
    const res = await fetch(`${API_BASE}/integrations/projects/${projectId}`, {
      credentials: "include", method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled, scope: scopeBody() }),
    }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    setBusy(null);
    if (res) { setMsg("Saved."); loadLink(); } else setMsg("Failed to save.");
  };

  const syncNow = async () => {
    if (!link) return;
    setBusy("sync"); setMsg(null);
    const res = await fetch(`${API_BASE}/integrations/projects/links/${link.id}/sync`, { credentials: "include", method: "POST" })
      .then((r) => (r.ok ? r.json() : null)).catch(() => null);
    setBusy(null);
    setMsg(res ? `Synced — ${res.ingested ?? 0} new meeting(s) ingested.` : "Sync failed.");
    loadLink();
  };

  const loadNotes = async () => {
    setShowNotes((v) => !v);
    if (notes.length) return;
    const list = await fetch(`${API_BASE}/integrations/granola/notes`, { credentials: "include" }).then((r) => (r.ok ? r.json() : [])).catch(() => []);
    setNotes(list);
  };

  if (connected === null) return null;

  return (
    <section className="rounded-xl border border-border bg-surface shadow-sm p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-medium text-foreground flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://www.granola.ai/logos/rebrand/marque.svg" alt="" className="w-4 h-4" /> Granola
        </h2>
        {link && (
          <button type="button" role="switch" aria-checked={link.enabled} onClick={() => save(!link.enabled)} disabled={busy === "save"}
            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${link.enabled ? "bg-blue-600" : "bg-surface-2 border border-border"}`}>
            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${link.enabled ? "translate-x-4" : "translate-x-1"}`} />
          </button>
        )}
      </div>

      {!connected ? (
        <p className="text-xs text-muted">Connect Granola in <span className="text-foreground">Settings → Integrations</span> first, then enable it for this project.</p>
      ) : !link ? (
        <div className="space-y-2">
          <p className="text-xs text-muted">Sync this project&apos;s Granola meetings into its knowledge base.</p>
          <Button onClick={() => save(true)} disabled={busy === "save"}>{busy === "save" ? <Loader2 size={14} className="animate-spin" /> : "Enable for this project"}</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Mapping mode */}
          <div className="flex gap-1.5 text-xs">
            {(["all", "selective"] as const).map((m) => (
              <button key={m} onClick={() => setMode(m)}
                className={`rounded-md px-2.5 py-1 border ${mode === m ? "border-blue-500/50 bg-blue-600/10 text-blue-400" : "border-border text-muted hover:text-foreground"}`}>
                {m === "all" ? "All meetings" : "Selective"}
              </button>
            ))}
          </div>

          {mode === "selective" && (
            <div className="space-y-2">
              <div>
                <label className="block text-[11px] text-muted mb-1">Keyword / title match (comma-separated)</label>
                <input value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="acme, billing, onboarding" className={inputClass} />
              </div>
              <div>
                <label className="block text-[11px] text-muted mb-1">Attendee email domains</label>
                <input value={domains} onChange={(e) => setDomains(e.target.value)} placeholder="acme.com, client.io" className={inputClass} />
              </div>
              <div>
                <button onClick={loadNotes} className="text-[11px] text-blue-400 hover:text-blue-300">{showNotes ? "Hide" : "Pick specific meetings"} ({picked.length})</button>
                {showNotes && (
                  <div className="mt-1.5 max-h-44 overflow-y-auto rounded-lg border border-border divide-y divide-border">
                    {notes.length === 0 ? <p className="text-[11px] text-muted p-2">No notes (or none with transcripts yet).</p> : notes.map((n) => {
                      const on = picked.includes(n.id);
                      return (
                        <button key={n.id} onClick={() => setPicked((p) => on ? p.filter((x) => x !== n.id) : [...p, n.id])}
                          className="w-full flex items-center gap-2 px-2 py-1.5 text-left hover:bg-surface-2/50">
                          <span className={`grid place-items-center w-4 h-4 rounded border ${on ? "bg-blue-600 border-blue-600 text-white" : "border-border"}`}>{on && <Check size={11} />}</span>
                          <span className="min-w-0"><span className="block text-xs text-foreground truncate">{n.title}</span><span className="block text-[10px] text-muted truncate">{n.owner}</span></span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => save(link.enabled)} disabled={busy === "save"}>{busy === "save" ? <Loader2 size={14} className="animate-spin" /> : "Save mapping"}</Button>
            <Button onClick={syncNow} disabled={busy === "sync" || !link.enabled}>{busy === "sync" ? <Loader2 size={14} className="animate-spin" /> : <><RefreshCw size={13} /> Sync now</>}</Button>
          </div>

          <p className="text-[11px] text-muted">
            {link.lastSyncedAt ? <>Last synced {formatDate(link.lastSyncedAt)} · {link.lastSyncCount} ingested · {link.lastSyncStatus?.startsWith("error") ? <span className="text-red-500">{link.lastSyncStatus}</span> : "ok"}</> : "Not synced yet. Auto-syncs every 30 min when enabled."}
          </p>
          {msg && <p className="text-[11px] text-foreground inline-flex items-center gap-1"><Check size={11} className="text-emerald-400" /> {msg}</p>}
        </div>
      )}
    </section>
  );
}
