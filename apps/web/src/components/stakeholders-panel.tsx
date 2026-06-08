"use client";

import { useState } from "react";
import { Pencil, Trash2, Network, Plus } from "lucide-react";
import { StakeholderAvatar } from "./stakeholder-avatar";
import { OrgChartModal } from "./org-chart";
import { Modal, Button, Field, inputClass } from "./ui";
import { Select } from "./select";
import { AffiliationBadge, AFFILIATION_OPTIONS } from "./affiliation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

interface Stakeholder {
  id: string; name: string; email?: string; role?: string; notes?: string;
  affiliation?: string; organization?: string; managerId?: string | null;
}
interface Props { projectId?: string; companyId?: string; stakeholders: Stakeholder[] }

export function StakeholdersPanel({ projectId, companyId, stakeholders: initial }: Props) {
  const [stakeholders, setStakeholders] = useState(initial);
  const [chart, setChart] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Stakeholder | null>(null);

  const openAdd = () => { setEditing(null); setEditorOpen(true); };
  const openEdit = (s: Stakeholder) => { setEditing(s); setEditorOpen(true); };

  const onSaved = (s: Stakeholder) =>
    setStakeholders((prev) => (prev.some((x) => x.id === s.id) ? prev.map((x) => (x.id === s.id ? s : x)) : [...prev, s]));

  const remove = async (id: string) => {
    await fetch(`${API_BASE}/stakeholders/${id}`, { credentials: "include", method: "DELETE" }).catch(() => {});
    setStakeholders((prev) => prev.filter((x) => x.id !== id));
  };

  return (
    <section className="rounded-xl border border-border bg-surface shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-foreground">
          Stakeholders <span className="text-muted">({stakeholders.length})</span>
        </h2>
        <div className="flex items-center gap-3">
          {stakeholders.length > 0 && (
            <button onClick={() => setChart(true)} className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground">
              <Network size={13} /> Org chart
            </button>
          )}
          <button onClick={openAdd} className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300">
            <Plus size={13} /> Add
          </button>
        </div>
      </div>

      {stakeholders.length === 0 ? (
        <p className="text-sm text-muted">No stakeholders added.</p>
      ) : (
        <div className="space-y-1.5 max-h-72 overflow-y-auto -mr-2 pr-2">
          {stakeholders.map((s) => {
            const manager = stakeholders.find((m) => m.id === s.managerId);
            return (
              <div key={s.id} className="group flex items-center gap-2.5 rounded-lg border border-border bg-surface-2/30 px-3 py-2">
                <StakeholderAvatar name={s.name} email={s.email} size={28} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm text-foreground truncate">{s.name || "Unnamed"}</p>
                    <AffiliationBadge value={s.affiliation} />
                  </div>
                  {(s.role || s.organization) && (
                    <p className="text-xs text-muted truncate">{s.role}{s.role && s.organization ? " · " : ""}{s.organization}</p>
                  )}
                  {manager && <p className="text-[11px] text-muted/70 truncate">↳ {manager.name}</p>}
                </div>
                <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(s)} title="Edit" className="p-1 rounded text-muted hover:text-foreground hover:bg-surface-2"><Pencil size={13} /></button>
                  <button onClick={() => remove(s.id)} title="Remove" className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-red-500/10"><Trash2 size={13} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editorOpen && (
        <StakeholderModal
          stakeholder={editing}
          all={stakeholders}
          projectId={projectId}
          companyId={companyId}
          onClose={() => setEditorOpen(false)}
          onSaved={(s) => { onSaved(s); setEditorOpen(false); }}
        />
      )}
      {chart && <OrgChartModal stakeholders={stakeholders} onClose={() => setChart(false)} />}
    </section>
  );
}

function StakeholderModal({ stakeholder, all, projectId, companyId, onClose, onSaved }: {
  stakeholder: Stakeholder | null;
  all: Stakeholder[];
  projectId?: string;
  companyId?: string;
  onClose: () => void;
  onSaved: (s: Stakeholder) => void;
}) {
  const [name, setName] = useState(stakeholder?.name ?? "");
  const [role, setRole] = useState(stakeholder?.role ?? "");
  const [email, setEmail] = useState(stakeholder?.email ?? "");
  const [affiliation, setAffiliation] = useState(stakeholder?.affiliation ?? "");
  const [organization, setOrganization] = useState(stakeholder?.organization ?? "");
  const [managerId, setManagerId] = useState(stakeholder?.managerId ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const managerOptions = [
    { value: "", label: "— No manager —" },
    ...all.filter((s) => s.id !== stakeholder?.id).map((s) => ({ value: s.id, label: s.name })),
  ];

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError("Name is required."); return; }
    setBusy(true); setError("");
    const payload = {
      name: name.trim(), role: role || undefined, email: email || undefined,
      affiliation: affiliation || undefined, organization: organization || undefined,
      managerId: managerId || null,
    };
    const url = stakeholder ? `${API_BASE}/stakeholders/${stakeholder.id}` : `${API_BASE}/stakeholders`;
    const body = stakeholder ? payload : { ...payload, projectId, companyId };
    const res = await fetch(url, {
      credentials: "include",
      method: stakeholder ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    setBusy(false);
    if (res) onSaved(res); else setError("Failed to save.");
  };

  return (
    <Modal title={stakeholder ? "Edit Stakeholder" : "Add Stakeholder"} onClose={onClose}>
      <form onSubmit={save} className="space-y-4">
        <Field label="Name *"><input value={name} onChange={(e) => setName(e.target.value)} autoFocus className={inputClass} placeholder="Jane Smith" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Role"><input value={role} onChange={(e) => setRole(e.target.value)} className={inputClass} placeholder="Product Owner" /></Field>
          <Field label="Organization"><input value={organization} onChange={(e) => setOrganization(e.target.value)} className={inputClass} placeholder="Acme Inc" /></Field>
        </div>
        <Field label="Email"><input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className={inputClass} placeholder="jane@acme.com" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Affiliation"><Select value={affiliation} onChange={setAffiliation} options={AFFILIATION_OPTIONS} placeholder="—" /></Field>
          <Field label="Reports to"><Select value={managerId} onChange={setManagerId} options={managerOptions} placeholder="— No manager —" /></Field>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={busy}>{busy ? "Saving…" : stakeholder ? "Save changes" : "Add stakeholder"}</Button>
        </div>
      </form>
    </Modal>
  );
}
