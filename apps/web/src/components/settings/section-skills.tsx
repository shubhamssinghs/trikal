"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Wrench, Lock, Pencil, Sparkles, Loader2 } from "lucide-react";
import { Card, Button, Modal, Field, inputClass } from "../ui";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

type Skill = {
  id: string; slug: string; name: string; description: string; instructions?: string | null;
  kind: string; enabled: boolean; builtin: boolean; externalAction: boolean; composes: string[];
};

function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${checked ? "bg-blue-600" : "bg-surface-2 border border-border"}`}>
      <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-4" : "translate-x-1"}`} />
    </button>
  );
}

export function SkillsSection() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Skill | null>(null);
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
        <p className="text-xs text-muted mt-0.5">The agent decides when to call them and can chain several together. Enable what it&apos;s allowed to use; built-in skills can be toggled but not deleted. <span className="text-foreground">New skill</span> drafts one for you with AI — describe it and the generator proposes the name, slug, description and instructions.</p>
      </div>

      <Card title="Skills" action={<button onClick={() => setCreating(true)} className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"><Plus size={13} /> New skill</button>}>
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
              <div className="flex items-center gap-1.5 shrink-0">
                <Switch checked={s.enabled} onChange={(v) => patch(s.id, { enabled: v })} />
                <button onClick={() => setEditing(s)} title="Edit" className="p-1 rounded text-muted hover:text-foreground hover:bg-surface-2"><Pencil size={13} /></button>
                {!s.builtin && (
                  <button onClick={() => remove(s.id)} title="Delete" className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-red-500/10"><Trash2 size={13} /></button>
                )}
              </div>
            </div>
          ))}
          {skills.length === 0 && <p className="text-sm text-muted">No skills yet.</p>}
        </div>
      </Card>

      {creating && <NewSkillModal onClose={() => setCreating(false)} onCreated={() => { setCreating(false); load(); }} />}
      {editing && <EditSkillModal skill={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
}

/** Generator-first: describe it → AI drafts all fields → review/edit → create. */
function NewSkillModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [phase, setPhase] = useState<"describe" | "review">("describe");
  const [prompt, setPrompt] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [kind, setKind] = useState("prompt");
  const [composes, setComposes] = useState<string[]>([]);

  const draft = async () => {
    if (!prompt.trim()) return;
    setDrafting(true); setError("");
    const res = await fetch(`${API_BASE}/skills/draft`, {
      credentials: "include", method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: prompt.trim() }),
    });
    setDrafting(false);
    if (!res.ok) { setError((await res.json().catch(() => ({}))).message || "Couldn't draft a skill."); return; }
    const d = await res.json();
    setName(d.name ?? ""); setSlug(d.slug ?? ""); setDescription(d.description ?? "");
    setInstructions(d.instructions ?? ""); setKind(d.kind ?? "prompt"); setComposes(d.composes ?? []);
    setPhase("review");
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError("");
    const res = await fetch(`${API_BASE}/skills`, {
      credentials: "include", method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "_"), description, instructions, kind, composes, enabled: false }),
    });
    setBusy(false);
    if (res.ok) onCreated();
    else setError((await res.json().catch(() => ({}))).message || "Couldn't create the skill.");
  };

  return (
    <Modal title="New skill" onClose={onClose}>
      {phase === "describe" ? (
        <div className="space-y-4">
          <Field label="Describe the skill you want *">
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} autoFocus rows={4} className={inputClass}
              placeholder="e.g. Draft an escalation email to the client when a project risk goes critical, summarizing the risk and proposed mitigation." />
          </Field>
          <p className="text-xs text-muted">The generator researches your existing skills and proposes a complete skill — name, slug, description, instructions, and which skills it composes. You review before it&apos;s saved.</p>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={() => setPhase("review")}>Skip / manual</Button>
            <Button type="button" onClick={draft} disabled={drafting || !prompt.trim()}>
              {drafting ? <><Loader2 size={14} className="animate-spin" /> Drafting…</> : <><Sparkles size={14} /> Draft with AI</>}
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={create} className="space-y-4">
          <div className="rounded-lg border border-blue-500/20 bg-blue-500/[0.04] px-3 py-2 text-xs text-muted inline-flex items-center gap-1.5"><Sparkles size={12} className="text-blue-400" /> Review the draft and edit anything before creating.</div>
          <Field label="Name *"><input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="Escalation email drafter" /></Field>
          <Field label="Slug (tool name)"><input value={slug} onChange={(e) => setSlug(e.target.value)} className={inputClass} placeholder="auto from name" /></Field>
          <Field label="Description (when the agent should use it) *">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={inputClass} />
          </Field>
          <Field label="Instructions (guidance added to the agent)">
            <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={3} className={inputClass} />
          </Field>
          {composes.length > 0 && <p className="text-[11px] text-muted">Composes: {composes.join(", ")} · kind: {kind}</p>}
          <p className="text-xs text-muted">Created disabled. Side-effecting actions still need a developer-registered handler; prompt/composite skills work from these fields.</p>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex justify-between gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={() => setPhase("describe")}>← Back</Button>
            <Button type="submit" disabled={busy || !name.trim()}>{busy ? "Creating…" : "Create skill"}</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

/** Edit an existing skill directly. Built-ins: only enabled + instructions are persisted. */
function EditSkillModal({ skill, onClose, onSaved }: { skill: Skill; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(skill.name);
  const [description, setDescription] = useState(skill.description);
  const [instructions, setInstructions] = useState(skill.instructions ?? "");
  const [externalAction, setExternalAction] = useState(skill.externalAction);
  const [composes, setComposes] = useState((skill.composes ?? []).join(", "));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError("");
    const body = skill.builtin
      ? { instructions }
      : { name, description, instructions, externalAction, composes: composes.split(",").map((s) => s.trim()).filter(Boolean) };
    const res = await fetch(`${API_BASE}/skills/${skill.id}`, {
      credentials: "include", method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    setBusy(false);
    if (res.ok) onSaved(); else setError((await res.json().catch(() => ({}))).message || "Couldn't save.");
  };

  return (
    <Modal title={`Edit ${skill.name}`} onClose={onClose}>
      <form onSubmit={save} className="space-y-4">
        {skill.builtin && <p className="text-xs text-muted">This is a built-in skill — only its instructions can be changed here.</p>}
        {!skill.builtin && (
          <>
            <Field label="Name *"><input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} /></Field>
            <Field label="Description (when the agent should use it)">
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={inputClass} />
            </Field>
          </>
        )}
        <Field label="Instructions (guidance added to the agent)">
          <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={4} className={inputClass} />
        </Field>
        {!skill.builtin && (
          <>
            <Field label="Composes (skill slugs, comma-separated)"><input value={composes} onChange={(e) => setComposes(e.target.value)} className={inputClass} placeholder="search_project_knowledge, create_diagram" /></Field>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input type="checkbox" checked={externalAction} onChange={(e) => setExternalAction(e.target.checked)} className="rounded border-border" />
              Requires approval (external action)
            </label>
          </>
        )}
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save changes"}</Button>
        </div>
      </form>
    </Modal>
  );
}
