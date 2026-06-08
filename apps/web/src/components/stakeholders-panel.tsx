"use client";

import { useState } from "react";
import { Pencil, Trash2, Check, X, Network } from "lucide-react";
import { StakeholderAvatar } from "./stakeholder-avatar";
import { OrgChartModal } from "./org-chart";
import { Select } from "./select";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

interface Stakeholder { id: string; name: string; email?: string; role?: string; notes?: string; managerId?: string | null }
interface Props { projectId?: string; companyId?: string; stakeholders: Stakeholder[] }

export function StakeholdersPanel({ projectId, companyId, stakeholders: initial }: Props) {
  const [stakeholders, setStakeholders] = useState(initial);
  const [adding, setAdding] = useState(false);
  const [chart, setChart] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [managerId, setManagerId] = useState("");

  const managerOptions = [
    { value: "", label: "— No manager —" },
    ...stakeholders.map((s) => ({ value: s.id, label: s.name })),
  ];

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const res = await fetch(`${API_BASE}/stakeholders`, {
      credentials: "include",
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email: email || undefined, role: role || undefined, managerId: managerId || undefined, projectId, companyId }),
    }).then((r) => r.json());
    setStakeholders((prev) => [...prev, res]);
    setName(""); setEmail(""); setRole(""); setManagerId(""); setAdding(false);
  };

  const onUpdated = (s: Stakeholder) => setStakeholders((prev) => prev.map((x) => (x.id === s.id ? s : x)));
  const onDeleted = (id: string) => setStakeholders((prev) => prev.filter((x) => x.id !== id));

  return (
    <section className="rounded-xl border border-border bg-surface shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-foreground">Stakeholders</h2>
        <div className="flex items-center gap-3">
          {stakeholders.length > 0 && (
            <button onClick={() => setChart(true)} className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground">
              <Network size={13} /> Org chart
            </button>
          )}
          <button onClick={() => setAdding(!adding)} className="text-xs text-blue-400 hover:text-blue-300">+ Add</button>
        </div>
      </div>

      {adding && (
        <form onSubmit={add} className="mb-3 space-y-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" autoFocus required
            className="w-full rounded border border-border bg-surface-2 px-3 py-1.5 text-sm text-foreground focus:border-blue-500 focus:outline-none" />
          <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Role (e.g. Product Owner)"
            className="w-full rounded border border-border bg-surface-2 px-3 py-1.5 text-sm text-foreground focus:border-blue-500 focus:outline-none" />
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email"
            className="w-full rounded border border-border bg-surface-2 px-3 py-1.5 text-sm text-foreground focus:border-blue-500 focus:outline-none" />
          {stakeholders.length > 0 && (
            <div>
              <label className="text-xs text-muted">Reports to</label>
              <Select value={managerId} onChange={setManagerId} options={managerOptions} placeholder="— No manager —" />
            </div>
          )}
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
            <StakeholderRow key={s.id} stakeholder={s} all={stakeholders} onUpdated={onUpdated} onDeleted={onDeleted} />
          ))}
        </div>
      )}

      {chart && <OrgChartModal stakeholders={stakeholders} onClose={() => setChart(false)} />}
    </section>
  );
}

function StakeholderRow({ stakeholder, all, onUpdated, onDeleted }: {
  stakeholder: Stakeholder;
  all: Stakeholder[];
  onUpdated: (s: Stakeholder) => void;
  onDeleted: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(stakeholder.name);
  const [role, setRole] = useState(stakeholder.role ?? "");
  const [email, setEmail] = useState(stakeholder.email ?? "");
  const [managerId, setManagerId] = useState(stakeholder.managerId ?? "");
  const [busy, setBusy] = useState(false);

  const managerOptions = [
    { value: "", label: "— No manager —" },
    ...all.filter((s) => s.id !== stakeholder.id).map((s) => ({ value: s.id, label: s.name })),
  ];

  const save = async () => {
    if (!name.trim()) return;
    setBusy(true);
    const updated = await fetch(`${API_BASE}/stakeholders/${stakeholder.id}`, {
      credentials: "include",
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, role: role || undefined, email: email || undefined, managerId: managerId || null }),
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
        <div>
          <label className="text-xs text-muted">Reports to</label>
          <Select value={managerId} onChange={setManagerId} options={managerOptions} placeholder="— No manager —" />
        </div>
        <div className="flex gap-1.5">
          <button onClick={save} disabled={busy} className="inline-flex items-center gap-1 rounded bg-blue-700 hover:bg-blue-600 px-2.5 py-1 text-xs text-white disabled:opacity-50"><Check size={12} /> Save</button>
          <button onClick={() => setEditing(false)} className="inline-flex items-center gap-1 rounded bg-surface-2 hover:bg-border px-2.5 py-1 text-xs text-foreground"><X size={12} /> Cancel</button>
        </div>
      </div>
    );
  }

  const manager = all.find((s) => s.id === stakeholder.managerId);
  return (
    <div className="group flex items-center gap-3 rounded border border-border bg-surface-2/30 px-3 py-2">
      <StakeholderAvatar name={stakeholder.name} email={stakeholder.email} size={28} />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-foreground truncate">{stakeholder.name || "Unnamed"}</p>
        {(stakeholder.role || stakeholder.email) && (
          <p className="text-xs text-muted truncate">{stakeholder.role}{stakeholder.role && stakeholder.email ? " · " : ""}{stakeholder.email}</p>
        )}
        {manager && <p className="text-xs text-muted/70 truncate">↳ reports to {manager.name}</p>}
      </div>
      <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => setEditing(true)} title="Edit" className="p-1 rounded text-muted hover:text-foreground hover:bg-surface-2"><Pencil size={13} /></button>
        <button onClick={remove} disabled={busy} title="Remove" className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-red-500/10"><Trash2 size={13} /></button>
      </div>
    </div>
  );
}
