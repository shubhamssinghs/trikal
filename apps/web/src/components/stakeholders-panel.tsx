"use client";

import { useState, useEffect } from "react";
import { Pencil, Trash2, Network, Plus } from "lucide-react";
import { StakeholderAvatar } from "./stakeholder-avatar";
import { OrgChartModal } from "./org-chart";
import { Modal, Button, Field, inputClass } from "./ui";
import { Select } from "./select";
import { AffiliationBadge } from "./affiliation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

interface Stakeholder {
  id: string; name: string; email?: string; managerId?: string | null;
  affiliationId?: string | null; jobRoleId?: string | null; orgUnitId?: string | null;
  affiliation?: string; affiliationColor?: string; role?: string; organization?: string;
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
                    <AffiliationBadge label={s.affiliation} color={s.affiliationColor} />
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

type Opt = { value: string; label: string };

function StakeholderModal({ stakeholder, all, projectId, companyId, onClose, onSaved }: {
  stakeholder: Stakeholder | null;
  all: Stakeholder[];
  projectId?: string;
  companyId?: string;
  onClose: () => void;
  onSaved: (s: Stakeholder) => void;
}) {
  const [name, setName] = useState(stakeholder?.name ?? "");
  const [email, setEmail] = useState(stakeholder?.email ?? "");
  const [affiliationId, setAffiliationId] = useState(stakeholder?.affiliationId ?? "");
  const [jobRoleId, setJobRoleId] = useState(stakeholder?.jobRoleId ?? "");
  const [orgUnitId, setOrgUnitId] = useState(stakeholder?.orgUnitId ?? "");
  const [managerId, setManagerId] = useState(stakeholder?.managerId ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [affiliations, setAffiliations] = useState<Opt[]>([]);
  const [roles, setRoles] = useState<Opt[]>([]);
  const [orgs, setOrgs] = useState<Opt[]>([]);

  useEffect(() => {
    const get = (p: string) => fetch(`${API_BASE}/lookups/${p}`, { credentials: "include" }).then((r) => (r.ok ? r.json() : [])).catch(() => []);
    Promise.all([get("affiliations"), get("roles"), get("organizations")]).then(([a, r, o]) => {
      setAffiliations([{ value: "", label: "— Unspecified —" }, ...a.map((x: { id: string; label: string }) => ({ value: x.id, label: x.label }))]);
      setRoles([{ value: "", label: "— Unspecified —" }, ...r.map((x: { id: string; label: string }) => ({ value: x.id, label: x.label }))]);
      setOrgs([{ value: "", label: "— Unspecified —" }, ...o.map((x: { id: string; name: string }) => ({ value: x.id, label: x.name }))]);
    });
  }, []);

  const managerOptions = [
    { value: "", label: "— No manager —" },
    ...all.filter((s) => s.id !== stakeholder?.id).map((s) => ({ value: s.id, label: s.name })),
  ];

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError("Name is required."); return; }
    setBusy(true); setError("");
    const payload = {
      name: name.trim(), email: email || undefined,
      affiliationId: affiliationId || null, jobRoleId: jobRoleId || null, orgUnitId: orgUnitId || null,
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
        <Field label="Email"><input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className={inputClass} placeholder="jane@acme.com" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Role"><Select value={jobRoleId} onChange={setJobRoleId} options={roles} placeholder="—" /></Field>
          <Field label="Organization"><Select value={orgUnitId} onChange={setOrgUnitId} options={orgs} placeholder="—" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Affiliation"><Select value={affiliationId} onChange={setAffiliationId} options={affiliations} placeholder="—" /></Field>
          <Field label="Reports to"><Select value={managerId} onChange={setManagerId} options={managerOptions} placeholder="— No manager —" /></Field>
        </div>
        <p className="text-xs text-muted">Manage roles, organizations and affiliations in <span className="text-foreground">Settings → Master Data</span>.</p>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={busy}>{busy ? "Saving…" : stakeholder ? "Save changes" : "Add stakeholder"}</Button>
        </div>
      </form>
    </Modal>
  );
}
