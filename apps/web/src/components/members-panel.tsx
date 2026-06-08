"use client";

import { useState, useEffect } from "react";
import { Pencil, Trash2, Network, Plus } from "lucide-react";
import { MemberAvatar } from "./member-avatar";
import { OrgChartModal } from "./org-chart";
import { Modal, Button, Field, inputClass } from "./ui";
import { Select } from "./select";
import { AffiliationBadge } from "./affiliation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

interface Member {
  id: string; name: string; email?: string; managerId?: string | null;
  affiliationId?: string | null; jobRoleId?: string | null; orgUnitId?: string | null;
  affiliation?: string; affiliationColor?: string; role?: string; organization?: string;
}
interface Props { projectId?: string; companyId?: string; members: Member[] }

export function MembersPanel({ projectId, companyId, members: initial }: Props) {
  const [members, setMembers] = useState(initial);
  const [chart, setChart] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);

  const openAdd = () => { setEditing(null); setEditorOpen(true); };
  const openEdit = (m: Member) => { setEditing(m); setEditorOpen(true); };

  const onSaved = (m: Member) =>
    setMembers((prev) => (prev.some((x) => x.id === m.id) ? prev.map((x) => (x.id === m.id ? m : x)) : [...prev, m]));

  const remove = async (id: string) => {
    await fetch(`${API_BASE}/members/${id}`, { credentials: "include", method: "DELETE" }).catch(() => {});
    setMembers((prev) => prev.filter((x) => x.id !== id));
  };

  return (
    <section className="rounded-xl border border-border bg-surface shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-foreground">
          Members <span className="text-muted">({members.length})</span>
        </h2>
        <div className="flex items-center gap-3">
          {members.length > 0 && (
            <button onClick={() => setChart(true)} className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground">
              <Network size={13} /> Org chart
            </button>
          )}
          <button onClick={openAdd} className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300">
            <Plus size={13} /> Add
          </button>
        </div>
      </div>

      {members.length === 0 ? (
        <p className="text-sm text-muted">No members added.</p>
      ) : (
        <div className="space-y-1.5 max-h-72 overflow-y-auto -mr-2 pr-2">
          {members.map((m) => {
            const manager = members.find((x) => x.id === m.managerId);
            return (
              <div key={m.id} className="group flex items-center gap-2.5 rounded-lg border border-border bg-surface-2/30 px-3 py-2">
                <MemberAvatar name={m.name} email={m.email} size={28} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm text-foreground truncate">{m.name || "Unnamed"}</p>
                    <AffiliationBadge label={m.affiliation} color={m.affiliationColor} />
                  </div>
                  {(m.role || m.organization) && (
                    <p className="text-xs text-muted truncate">{m.role}{m.role && m.organization ? " · " : ""}{m.organization}</p>
                  )}
                  {manager && <p className="text-[11px] text-muted/70 truncate">↳ {manager.name}</p>}
                </div>
                <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(m)} title="Edit" className="p-1 rounded text-muted hover:text-foreground hover:bg-surface-2"><Pencil size={13} /></button>
                  <button onClick={() => remove(m.id)} title="Remove" className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-red-500/10"><Trash2 size={13} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editorOpen && (
        <MemberModal
          member={editing}
          all={members}
          projectId={projectId}
          companyId={companyId}
          onClose={() => setEditorOpen(false)}
          onSaved={(m) => { onSaved(m); setEditorOpen(false); }}
        />
      )}
      {chart && <OrgChartModal members={members} onClose={() => setChart(false)} />}
    </section>
  );
}

type Opt = { value: string; label: string };

function MemberModal({ member, all, projectId, companyId, onClose, onSaved }: {
  member: Member | null;
  all: Member[];
  projectId?: string;
  companyId?: string;
  onClose: () => void;
  onSaved: (m: Member) => void;
}) {
  const [name, setName] = useState(member?.name ?? "");
  const [email, setEmail] = useState(member?.email ?? "");
  const [affiliationId, setAffiliationId] = useState(member?.affiliationId ?? "");
  const [jobRoleId, setJobRoleId] = useState(member?.jobRoleId ?? "");
  const [orgUnitId, setOrgUnitId] = useState(member?.orgUnitId ?? "");
  const [managerId, setManagerId] = useState(member?.managerId ?? "");
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
    ...all.filter((m) => m.id !== member?.id).map((m) => ({ value: m.id, label: m.name })),
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
    const url = member ? `${API_BASE}/members/${member.id}` : `${API_BASE}/members`;
    const body = member ? payload : { ...payload, projectId, companyId };
    const res = await fetch(url, {
      credentials: "include",
      method: member ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    setBusy(false);
    if (res) onSaved(res); else setError("Failed to save.");
  };

  return (
    <Modal title={member ? "Edit Member" : "Add Member"} onClose={onClose}>
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
          <Button type="submit" disabled={busy}>{busy ? "Saving…" : member ? "Save changes" : "Add member"}</Button>
        </div>
      </form>
    </Modal>
  );
}
