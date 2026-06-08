"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Card, inputClass } from "../ui";
import { AffiliationBadge } from "../affiliation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

type Item = { id: string; label?: string; name?: string; color?: string; _count?: { stakeholders: number } };

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

  const load = () =>
    fetch(`${API_BASE}/lookups/${path}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then(setItems)
      .catch(() => {});

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const add = async () => {
    const v = value.trim();
    if (!v) return;
    setBusy(true); setError("");
    const body = path === "organizations" ? { name: v } : withColor ? { label: v, color } : { label: v };
    const res = await fetch(`${API_BASE}/lookups/${path}`, {
      credentials: "include",
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (res.ok) { setValue(""); load(); }
    else {
      const msg = await res.json().catch(() => null);
      setError(msg?.message || "Failed to add.");
    }
  };

  const remove = async (id: string) => {
    setError("");
    const res = await fetch(`${API_BASE}/lookups/${path}/${id}`, { credentials: "include", method: "DELETE" });
    if (res.ok) load();
    else {
      const msg = await res.json().catch(() => null);
      setError(msg?.message || "Can't delete — this is in use.");
    }
  };

  return (
    <Card title={title}>
      <p className="text-xs text-muted mb-3">{hint}</p>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {items.length === 0 && <span className="text-xs text-muted">None yet.</span>}
        {items.map((it) => (
          <span key={it.id} className="group inline-flex items-center gap-1 rounded-md border border-border bg-surface-2/40 pl-2 pr-1 py-1 text-xs text-foreground">
            {withColor ? <AffiliationBadge label={labelOf(it)} color={it.color} /> : labelOf(it)}
            {!!it._count?.stakeholders && (
              <span className="text-[10px] text-muted" title={`${it._count.stakeholders} stakeholder(s) use this`}>· {it._count.stakeholders}</span>
            )}
            <button onClick={() => remove(it.id)} title="Delete" className="p-0.5 rounded text-muted hover:text-red-400 hover:bg-red-500/10">
              <Trash2 size={12} />
            </button>
          </span>
        ))}
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
        <p className="text-sm text-foreground">Master data powers the stakeholder dropdowns.</p>
        <p className="text-xs text-muted mt-0.5">Anything in use by a stakeholder is protected — you&apos;ll see an error rather than losing data.</p>
      </div>
      <LookupList title="Affiliations" path="affiliations" withColor hint="How a stakeholder relates to the project (Client, Vendor, Internal…). Color shows on their badge." />
      <LookupList title="Roles" path="roles" hint="Job roles stakeholders can hold (Project Manager, Backend Developer…)." />
      <LookupList title="Organizations" path="organizations" hint="Employers / organizations stakeholders belong to." />
    </div>
  );
}
