"use client";

import { useState } from "react";
import { Plus, Trash2, Pencil, ShieldCheck } from "lucide-react";
import { Card, Button, Modal, Field, inputClass, Toggle, EmptyState } from "../ui";
import { Select, MultiSelect } from "../select";

const EXPORT_OPTIONS = [
  { value: "pdf", label: "PDF" },
  { value: "docx", label: "DOCX" },
  { value: "csv", label: "CSV" },
  { value: "markdown", label: "Markdown" },
];

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

type Profile = {
  id: string; name: string; hipaaEnabled: boolean; piaRequired: boolean;
  phiHandling: string; auditLevel: string; aiAccessPolicy: string; retentionDays?: number | null;
  allowedExports?: string[];
  _count?: { companies: number; projects: number };
};

export function ComplianceSection({ initialProfiles }: { initialProfiles: unknown[] }) {
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles as Profile[]);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [creating, setCreating] = useState(false);

  const refresh = async () => {
    const res = await fetch(`${API_BASE}/compliance-profiles`, { credentials: "include" }).then((r) => r.json()).catch(() => null);
    if (res) setProfiles(res);
  };

  const remove = async (id: string) => {
    await fetch(`${API_BASE}/compliance-profiles/${id}`, { credentials: "include", method: "DELETE" }).catch(() => {});
    refresh();
  };

  return (
    <Card
      title="Compliance Profiles"
      action={<button onClick={() => setCreating(true)} className="text-xs text-blue-500 hover:text-blue-400 inline-flex items-center gap-1"><Plus size={13} /> New profile</button>}
    >
      {profiles.length === 0 ? (
        <EmptyState icon={<ShieldCheck size={28} />} title="No compliance profiles" description="Create profiles to control data handling, retention, and AI access per company/project." />
      ) : (
        <div className="space-y-2">
          {profiles.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-2/40 px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`grid place-items-center w-9 h-9 rounded-lg shrink-0 ${p.hipaaEnabled ? "bg-red-500/15 text-red-500" : "bg-surface-2 text-muted"}`}>
                  <ShieldCheck size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{p.name}</p>
                  <p className="text-xs text-muted">
                    {p.hipaaEnabled ? "HIPAA · " : ""}{p.piaRequired ? "PIA · " : ""}PHI: {p.phiHandling} · audit: {p.auditLevel}
                    {p._count ? ` · ${p._count.companies + p._count.projects} in use` : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => setEditing(p)} className="p-1.5 rounded text-muted hover:text-foreground hover:bg-surface-2"><Pencil size={14} /></button>
                <button onClick={() => remove(p.id)} className="p-1.5 rounded text-red-400 hover:text-red-300 hover:bg-red-500/10"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <ProfileModal
          profile={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => { setCreating(false); setEditing(null); refresh(); }}
        />
      )}
    </Card>
  );
}

function ProfileModal({ profile, onClose, onSaved }: { profile: Profile | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(profile?.name ?? "");
  const [hipaaEnabled, setHipaa] = useState(profile?.hipaaEnabled ?? false);
  const [piaRequired, setPia] = useState(profile?.piaRequired ?? false);
  const [phiHandling, setPhi] = useState(profile?.phiHandling ?? "none");
  const [auditLevel, setAudit] = useState(profile?.auditLevel ?? "standard");
  const [aiAccessPolicy, setAi] = useState(profile?.aiAccessPolicy ?? "allow");
  const [allowedExports, setExports] = useState<string[]>(profile?.allowedExports ?? []);
  const [busy, setBusy] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    const body = { name, hipaaEnabled, piaRequired, phiHandling, auditLevel, aiAccessPolicy, allowedExports };
    const url = profile ? `${API_BASE}/compliance-profiles/${profile.id}` : `${API_BASE}/compliance-profiles`;
    await fetch(url, { credentials: "include", method: profile ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => {});
    setBusy(false);
    onSaved();
  };

  return (
    <Modal title={profile ? "Edit Profile" : "New Compliance Profile"} onClose={onClose}>
      <form onSubmit={save} className="space-y-4">
        <Field label="Name"><input value={name} onChange={(e) => setName(e.target.value)} required className={inputClass} placeholder="e.g. Healthcare Strict" /></Field>
        <div className="rounded-lg border border-border divide-y divide-border px-3">
          <Toggle checked={hipaaEnabled} onChange={setHipaa} label="HIPAA enabled" description="PHI encryption and strict handling required" />
          <Toggle checked={piaRequired} onChange={setPia} label="PIA required" description="Privacy Impact Assessment needed" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="PHI handling">
            <Select value={phiHandling} onChange={setPhi} options={[{ value: "none", label: "None" }, { value: "redact", label: "Redact" }, { value: "strict", label: "Strict" }]} />
          </Field>
          <Field label="Audit level">
            <Select value={auditLevel} onChange={setAudit} options={[{ value: "minimal", label: "Minimal" }, { value: "standard", label: "Standard" }, { value: "full", label: "Full" }]} />
          </Field>
          <Field label="AI access">
            <Select value={aiAccessPolicy} onChange={setAi} options={[{ value: "allow", label: "Allow" }, { value: "restricted", label: "Restricted" }, { value: "blocked", label: "Blocked" }]} />
          </Field>
        </div>
        <Field label="Allowed exports">
          <MultiSelect value={allowedExports} onChange={setExports} options={EXPORT_OPTIONS} placeholder="Select export formats…" />
        </Field>
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
        </div>
      </form>
    </Modal>
  );
}
