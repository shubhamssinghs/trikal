"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Wrench, Lock } from "lucide-react";
import { Card, Button, Modal, Field, inputClass } from "../ui";

/** Compact inline on/off switch. */
function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${checked ? "bg-blue-600" : "bg-surface-2 border border-border"}`}
    >
      <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-4" : "translate-x-1"}`} />
    </button>
  );
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

type Skill = {
  id: string; slug: string; name: string; description: string; instructions?: string | null;
  kind: string; enabled: boolean; builtin: boolean; externalAction: boolean; composes: string[];
};

export function SkillsSection() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  const load = () =>
    fetch(`${API_BASE}/skills`, { credentials: "include" }).then((r) => (r.ok ? r.json() : [])).then(setSkills).catch(() => {});
  useEffect(() => { load(); }, []);

  const patch = async (id: string, body: Partial<Skill>) => {
    setSkills((prev) => prev.map((s) => (s.id === id ? { ...s, ...body } : s)));
    await fetch(`${API_BASE}/skills/${id}`, { credentials: "include", method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => {});
  };
  const remove = async (id: string) => {
    const res = await fetch(`${API_BASE}/skills/${id}`, { credentials: "include", method: "DELETE" });
    if (res.ok) load(); else setError((await res.json().catch(() => ({}))).message || "Couldn't delete.");
  };

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 px-4 py-3">
        <p className="text-sm text-foreground">Skills are the tools the AI agent can use.</p>
        <p className="text-xs text-muted mt-0.5">The agent decides when to call them and can chain several together. Enable what it&apos;s allowed to use; built-in skills can be toggled but not deleted. Use the <span className="text-foreground">Skill generator</span> skill (ask the agent to “create a skill that…”) to draft new ones.</p>
      </div>

      <Card title="Skills" action={<button onClick={() => setOpen(true)} className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"><Plus size={13} /> New skill</button>}>
        {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
        <div className="space-y-2">
          {skills.map((s) => (
            <div key={s.id} className="flex items-start gap-3 rounded-lg border border-border bg-surface-2/40 px-3 py-2.5">
              <Wrench size={15} className="mt-0.5 shrink-0 text-muted" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-sm font-medium text-foreground">{s.name}</p>
                  <code className="text-[10px] text-muted bg-surface px-1 py-0.5 rounded">{s.slug}</code>
                  {s.builtin && <span className="inline-flex items-center gap-0.5 text-[10px] text-muted"><Lock size={9} /> built-in</span>}
                  {s.externalAction && <span className="text-[10px] text-amber-500">needs approval</span>}
                  <span className="text-[10px] text-muted">· {s.kind}</span>
                </div>
                <p className="text-xs text-muted mt-0.5">{s.description}</p>
                {!!s.composes?.length && <p className="text-[11px] text-muted mt-0.5">composes: {s.composes.join(", ")}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Switch checked={s.enabled} onChange={(v) => patch(s.id, { enabled: v })} />
                {!s.builtin && (
                  <button onClick={() => remove(s.id)} title="Delete" className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-red-500/10"><Trash2 size={13} /></button>
                )}
              </div>
            </div>
          ))}
          {skills.length === 0 && <p className="text-sm text-muted">No skills yet.</p>}
        </div>
      </Card>

      {open && <NewSkillModal onClose={() => setOpen(false)} onCreated={() => { setOpen(false); load(); }} />}
    </div>
  );
}

function NewSkillModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError("");
    const res = await fetch(`${API_BASE}/skills`, {
      credentials: "include", method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "_"), description, instructions, kind: "prompt", enabled: false }),
    });
    setBusy(false);
    if (res.ok) onCreated();
    else setError((await res.json().catch(() => ({}))).message || "Couldn't create the skill.");
  };

  return (
    <Modal title="New skill" onClose={onClose}>
      <form onSubmit={save} className="space-y-4">
        <Field label="Name *"><input value={name} onChange={(e) => setName(e.target.value)} autoFocus className={inputClass} placeholder="Escalation email drafter" /></Field>
        <Field label="Slug (tool name)"><input value={slug} onChange={(e) => setSlug(e.target.value)} className={inputClass} placeholder="auto from name" /></Field>
        <Field label="Description (when the agent should use it) *">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={inputClass} placeholder="Call this when the user asks to draft an escalation email…" />
        </Field>
        <Field label="Instructions (guidance added to the agent)">
          <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={3} className={inputClass} placeholder="How the skill should behave…" />
        </Field>
        <p className="text-xs text-muted">Created disabled. This is a prompt skill — for actions that compose other skills or perform side effects, use the Skill generator or ask a developer to register a handler.</p>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={busy || !name.trim()}>{busy ? "Creating…" : "Create skill"}</Button>
        </div>
      </form>
    </Modal>
  );
}
