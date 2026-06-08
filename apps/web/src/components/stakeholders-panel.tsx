"use client";

import { useState, useEffect } from "react";
import { Pencil, Trash2, Check, X } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

interface Stakeholder { id: string; name: string; email?: string; role?: string; notes?: string }
interface Props { projectId?: string; companyId?: string; stakeholders: Stakeholder[] }

/** Gravatar avatar by email (SHA-256), falling back to an initial monogram. */
function Avatar({ name, email }: { name: string; email?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
    if (!email) { setUrl(null); return; }
    let cancelled = false;
    crypto.subtle
      .digest("SHA-256", new TextEncoder().encode(email.trim().toLowerCase()))
      .then((buf) => {
        const hex = [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
        if (!cancelled) setUrl(`https://www.gravatar.com/avatar/${hex}?d=404&s=80`);
      });
    return () => { cancelled = true; };
  }, [email]);

  const initial = (name?.trim()?.[0] ?? "?").toUpperCase();
  if (url && !failed) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name} onError={() => setFailed(true)} className="w-7 h-7 rounded-full object-cover shrink-0 border border-border" />;
  }
  return (
    <div className="w-7 h-7 rounded-full bg-surface-2 grid place-items-center text-xs text-foreground shrink-0 font-medium">
      {initial}
    </div>
  );
}

export function StakeholdersPanel({ projectId, companyId, stakeholders: initial }: Props) {
  const [stakeholders, setStakeholders] = useState(initial);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const res = await fetch(`${API_BASE}/stakeholders`, {
      credentials: "include",
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email: email || undefined, role: role || undefined, projectId, companyId }),
    }).then((r) => r.json());
    setStakeholders((prev) => [...prev, res]);
    setName(""); setEmail(""); setRole(""); setAdding(false);
  };

  const onUpdated = (s: Stakeholder) => setStakeholders((prev) => prev.map((x) => (x.id === s.id ? s : x)));
  const onDeleted = (id: string) => setStakeholders((prev) => prev.filter((x) => x.id !== id));

  return (
    <section className="rounded-xl border border-border bg-surface shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-foreground">Stakeholders</h2>
        <button onClick={() => setAdding(!adding)} className="text-xs text-blue-400 hover:text-blue-300">+ Add</button>
      </div>

      {adding && (
        <form onSubmit={add} className="mb-3 space-y-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" autoFocus required
            className="w-full rounded border border-border bg-surface-2 px-3 py-1.5 text-sm text-foreground focus:border-blue-500 focus:outline-none" />
          <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Role (e.g. Product Owner)"
            className="w-full rounded border border-border bg-surface-2 px-3 py-1.5 text-sm text-foreground focus:border-blue-500 focus:outline-none" />
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email"
            className="w-full rounded border border-border bg-surface-2 px-3 py-1.5 text-sm text-foreground focus:border-blue-500 focus:outline-none" />
          <div className="flex gap-2">
            <button type="submit" className="rounded bg-blue-700 hover:bg-blue-600 px-3 py-1.5 text-xs text-white">Save</button>
            <button type="button" onClick={() => setAdding(false)} className="rounded bg-surface-2 hover:bg-border px-3 py-1.5 text-xs text-foreground">Cancel</button>
          </div>
        </form>
      )}

      {stakeholders.length === 0 ? (
        <p className="text-sm text-muted">No stakeholders added.</p>
      ) : (
        <div className="space-y-1.5">
          {stakeholders.map((s) => (
            <StakeholderRow key={s.id} stakeholder={s} onUpdated={onUpdated} onDeleted={onDeleted} />
          ))}
        </div>
      )}
    </section>
  );
}

function StakeholderRow({ stakeholder, onUpdated, onDeleted }: {
  stakeholder: Stakeholder;
  onUpdated: (s: Stakeholder) => void;
  onDeleted: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(stakeholder.name);
  const [role, setRole] = useState(stakeholder.role ?? "");
  const [email, setEmail] = useState(stakeholder.email ?? "");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!name.trim()) return;
    setBusy(true);
    const updated = await fetch(`${API_BASE}/stakeholders/${stakeholder.id}`, {
      credentials: "include",
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, role: role || undefined, email: email || undefined }),
    }).then((r) => r.json()).catch(() => null);
    setBusy(false);
    if (updated) { onUpdated(updated); setEditing(false); }
  };

  const remove = async () => {
    setBusy(true);
    await fetch(`${API_BASE}/stakeholders/${stakeholder.id}`, { credentials: "include", method: "DELETE" }).catch(() => {});
    onDeleted(stakeholder.id);
  };

  if (editing) {
    return (
      <div className="rounded border border-border bg-surface-2/40 px-3 py-2 space-y-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name"
          className="w-full rounded border border-border bg-surface-2 px-2 py-1 text-sm text-foreground focus:border-blue-500 focus:outline-none" />
        <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Role"
          className="w-full rounded border border-border bg-surface-2 px-2 py-1 text-sm text-foreground focus:border-blue-500 focus:outline-none" />
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email"
          className="w-full rounded border border-border bg-surface-2 px-2 py-1 text-sm text-foreground focus:border-blue-500 focus:outline-none" />
        <div className="flex gap-1.5">
          <button onClick={save} disabled={busy} className="inline-flex items-center gap-1 rounded bg-blue-700 hover:bg-blue-600 px-2.5 py-1 text-xs text-white disabled:opacity-50"><Check size={12} /> Save</button>
          <button onClick={() => setEditing(false)} className="inline-flex items-center gap-1 rounded bg-surface-2 hover:bg-border px-2.5 py-1 text-xs text-foreground"><X size={12} /> Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex items-center gap-3 rounded border border-border bg-surface-2/30 px-3 py-2">
      <Avatar name={stakeholder.name} email={stakeholder.email} />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-foreground truncate">{stakeholder.name || "Unnamed"}</p>
        {(stakeholder.role || stakeholder.email) && (
          <p className="text-xs text-muted truncate">{stakeholder.role}{stakeholder.role && stakeholder.email ? " · " : ""}{stakeholder.email}</p>
        )}
      </div>
      <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => setEditing(true)} title="Edit" className="p-1 rounded text-muted hover:text-foreground hover:bg-surface-2"><Pencil size={13} /></button>
        <button onClick={remove} disabled={busy} title="Remove" className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-red-500/10"><Trash2 size={13} /></button>
      </div>
    </div>
  );
}
