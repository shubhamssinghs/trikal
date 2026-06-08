"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { Card, inputClass } from "../ui";
import { AffiliationBadge } from "../affiliation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

type Item = { id: string; label?: string; name?: string; color?: string; _count?: { members: number } };

function labelOf(it: Item) {
  return it.label ?? it.name ?? "";
}

function LookupList({
  title, path, hint, withColor,
}: {
  title: string;
  path: "affiliations" | "roles" | "organizations";
  hint: string;
  withColor?: boolean;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [value, setValue] = useState("");
  const [color, setColor] = useState("#64748b");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // inline edit state
  const [editId, setEditId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editColor, setEditColor] = useState("#64748b");

  const load = () =>
    fetch(`${API_BASE}/lookups/${path}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then(setItems)
      .catch(() => {});

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const bodyFor = (v: string, c: string) =>
    path === "organizations" ? { name: v } : withColor ? { label: v, color: c } : { label: v };

  const add = async () => {
    const v = value.trim();
    if (!v) return;
    setBusy(true); setError("");
    const res = await fetch(`${API_BASE}/lookups/${path}`, {
      credentials: "include",
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyFor(v, color)),
    });
    setBusy(false);
    if (res.ok) { setValue(""); load(); }
    else { const m = await res.json().catch(() => null); setError(m?.message || "Failed to add."); }
  };

  const startEdit = (it: Item) => {
    setError(""); setEditId(it.id); setEditValue(labelOf(it)); setEditColor(it.color || "#64748b");
  };
  const cancelEdit = () => { setEditId(null); setEditValue(""); };

  const saveEdit = async (id: string) => {
    const v = editValue.trim();
    if (!v) return;
    setBusy(true); setError("");
    const res = await fetch(`${API_BASE}/lookups/${path}/${id}`, {
      credentials: "include",
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyFor(v, editColor)),
    });
    setBusy(false);
    if (res.ok) { cancelEdit(); load(); }
    else { const m = await res.json().catch(() => null); setError(m?.message || "Failed to save."); }
  };

  const remove = async (id: string) => {
    setError("");
    const res = await fetch(`${API_BASE}/lookups/${path}/${id}`, { credentials: "include", method: "DELETE" });
    if (res.ok) load();
    else { const m = await res.json().catch(() => null); setError(m?.message || "Can't delete — this is in use."); }
  };

  return (
    <Card title={title}>
      <p className="text-xs text-muted mb-3">{hint}</p>

      <div className="space-y-1 mb-3">
        {items.length === 0 && <span className="text-xs text-muted">None yet.</span>}
        {items.map((it) =>
          editId === it.id ? (
            <div key={it.id} className="flex items-center gap-2 rounded-lg border border-blue-500/40 bg-surface-2/40 px-2 py-1.5">
              {withColor && (
                <input type="color" value={editColor} onChange={(e) => setEditColor(e.target.value)} title="Badge color"
                  className="h-8 w-8 shrink-0 rounded-md border border-border bg-surface cursor-pointer p-0.5" />
              )}
              <input value={editValue} autoFocus onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); saveEdit(it.id); } if (e.key === "Escape") cancelEdit(); }}
                className={inputClass} />
              <button onClick={() => saveEdit(it.id)} disabled={busy || !editValue.trim()} title="Save"
                className="p-1.5 shrink-0 rounded text-green-500 hover:bg-green-500/10 disabled:opacity-50"><Check size={15} /></button>
              <button onClick={cancelEdit} title="Cancel" className="p-1.5 shrink-0 rounded text-muted hover:bg-surface-2"><X size={15} /></button>
            </div>
          ) : (
            <div key={it.id} className="group flex items-center gap-2 rounded-lg border border-border bg-surface-2/30 px-3 py-1.5">
              <span className="flex-1 min-w-0 flex items-center gap-1.5 text-sm text-foreground">
                {withColor ? <AffiliationBadge label={labelOf(it)} color={it.color} /> : labelOf(it)}
                {!!it._count?.members && (
                  <span className="text-[10px] text-muted" title={`${it._count.members} member(s) use this`}>· {it._count.members} in use</span>
                )}
              </span>
              <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => startEdit(it)} title="Edit" className="p-1 rounded text-muted hover:text-foreground hover:bg-surface-2"><Pencil size={13} /></button>
                <button onClick={() => remove(it.id)} title="Delete" className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-red-500/10"><Trash2 size={13} /></button>
              </div>
            </div>
          )
        )}
      </div>

      <div className="flex items-center gap-2">
        {withColor && (
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} title="Badge color"
            className="h-9 w-9 shrink-0 rounded-md border border-border bg-surface cursor-pointer p-0.5" />
        )}
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={`Add ${title.toLowerCase().replace(/s$/, "")}…`}
          className={inputClass}
        />
        <button onClick={add} disabled={busy || !value.trim()}
          className="inline-flex items-center gap-1 shrink-0 rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-500 disabled:opacity-50">
          <Plus size={14} /> Add
        </button>
      </div>
      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
    </Card>
  );
}

export function MasterDataSection() {
  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 px-4 py-3">
        <p className="text-sm text-foreground">Master data powers the member dropdowns.</p>
        <p className="text-xs text-muted mt-0.5">Anything in use by a member is protected — you&apos;ll see an error rather than losing data.</p>
      </div>
      <LookupList title="Affiliations" path="affiliations" withColor hint="How a member relates to the project (Client, Vendor, Internal…). Color shows on their badge." />
      <LookupList title="Roles" path="roles" hint="Job roles members can hold (Project Manager, Backend Developer…)." />
      <LookupList title="Organizations" path="organizations" hint="Employers / organizations members belong to." />
    </div>
  );
}
