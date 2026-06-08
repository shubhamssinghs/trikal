"use client";

import { useState } from "react";
import { formatDate } from "@/lib/format";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

interface Milestone { id: string; name: string; description?: string; dueDate?: string; status: string }
interface Props { projectId: string; milestones: Milestone[] }

export function MilestonesPanel({ projectId, milestones: initial }: Props) {
  const router = useRouter();
  const [milestones, setMilestones] = useState(initial);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [dueDate, setDueDate] = useState("");

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const res = await fetch(`${API_BASE}/milestones?projectId=${projectId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, dueDate: dueDate || undefined }),
    }).then((r) => r.json());
    setMilestones((prev) => [...prev, res]);
    setName(""); setDueDate(""); setAdding(false);
    router.refresh();
  };

  const toggle = async (m: Milestone) => {
    const next = m.status === "completed" ? "pending" : "completed";
    await fetch(`${API_BASE}/milestones/${m.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setMilestones((prev) => prev.map((x) => x.id === m.id ? { ...x, status: next } : x));
  };

  return (
    <section className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-foreground">Milestones</h2>
        <button onClick={() => setAdding(!adding)} className="text-xs text-blue-400 hover:text-blue-300">+ Add</button>
      </div>

      {adding && (
        <form onSubmit={add} className="mb-3 space-y-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Milestone name" autoFocus
            className="w-full rounded border border-border bg-surface-2 px-3 py-1.5 text-sm text-foreground focus:border-blue-500 focus:outline-none" />
          <div className="flex gap-2">
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
              className="flex-1 rounded border border-border bg-surface-2 px-3 py-1.5 text-sm text-foreground focus:border-blue-500 focus:outline-none" />
            <button type="submit" className="rounded bg-blue-700 hover:bg-blue-600 px-3 py-1.5 text-xs text-white">Save</button>
            <button type="button" onClick={() => setAdding(false)} className="rounded bg-surface-2 hover:bg-border px-3 py-1.5 text-xs text-foreground">Cancel</button>
          </div>
        </form>
      )}

      {milestones.length === 0 ? (
        <p className="text-sm text-muted">No milestones yet.</p>
      ) : (
        <div className="space-y-1.5">
          {milestones.map((m) => (
            <div key={m.id} className="flex items-center gap-2 rounded border border-border bg-surface-2/30 px-3 py-2">
              <button onClick={() => toggle(m)} className={`w-4 h-4 rounded border flex-shrink-0 ${m.status === "completed" ? "bg-emerald-600 border-emerald-600" : "border-muted"}`}>
                {m.status === "completed" && <span className="text-foreground text-xs flex items-center justify-center">✓</span>}
              </button>
              <span className={`flex-1 text-sm ${m.status === "completed" ? "line-through text-muted" : "text-foreground"}`}>{m.name}</span>
              {m.dueDate && <span className="text-xs text-muted">{formatDate(m.dueDate)}</span>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
