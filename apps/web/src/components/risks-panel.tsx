"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

interface Risk { id: string; title: string; description?: string; severity: string; status: string; mitigationPlan?: string }
interface Props { projectId: string; risks: Risk[] }

const severityStyle: Record<string, string> = {
  high: "text-red-400 bg-red-900/30 border-red-900/50",
  medium: "text-amber-400 bg-amber-900/30 border-amber-900/50",
  low: "text-blue-400 bg-blue-900/30 border-blue-900/50",
};

export function RisksPanel({ projectId, risks: initial }: Props) {
  const router = useRouter();
  const [risks, setRisks] = useState(initial);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [severity, setSeverity] = useState("medium");
  const [description, setDescription] = useState("");

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const res = await fetch(`${API_BASE}/risks?projectId=${projectId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, severity, description: description || undefined }),
    }).then((r) => r.json());
    setRisks((prev) => [res, ...prev]);
    setTitle(""); setSeverity("medium"); setDescription(""); setAdding(false);
    router.refresh();
  };

  const close = async (id: string) => {
    await fetch(`${API_BASE}/risks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "mitigated" }),
    });
    setRisks((prev) => prev.filter((r) => r.id !== id));
  };

  const open = risks.filter((r) => r.status === "open");

  return (
    <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-gray-300">Risks & Blockers <span className="text-gray-500">({open.length} open)</span></h2>
        <button onClick={() => setAdding(!adding)} className="text-xs text-blue-400 hover:text-blue-300">+ Add</button>
      </div>

      {adding && (
        <form onSubmit={add} className="mb-3 space-y-2">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Risk description" autoFocus
            className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none" />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Details (optional)" rows={2}
            className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none resize-none" />
          <div className="flex gap-2">
            <select value={severity} onChange={(e) => setSeverity(e.target.value)}
              className="rounded border border-gray-700 bg-gray-800 px-2 py-1.5 text-sm text-white focus:outline-none">
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <button type="submit" className="rounded bg-blue-700 hover:bg-blue-600 px-3 py-1.5 text-xs text-white">Save</button>
            <button type="button" onClick={() => setAdding(false)} className="rounded bg-gray-700 hover:bg-gray-600 px-3 py-1.5 text-xs text-gray-300">Cancel</button>
          </div>
        </form>
      )}

      {open.length === 0 ? (
        <p className="text-sm text-gray-500">No open risks.</p>
      ) : (
        <div className="space-y-2">
          {open.map((r) => (
            <div key={r.id} className={`rounded border px-3 py-2 ${severityStyle[r.severity] ?? severityStyle.medium}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{r.title}</p>
                  {r.description && <p className="text-xs opacity-70 mt-0.5">{r.description}</p>}
                </div>
                <button onClick={() => close(r.id)} className="text-xs opacity-50 hover:opacity-100 flex-shrink-0">✓ Close</button>
              </div>
              <span className="text-xs uppercase tracking-wide opacity-60 mt-1 block">{r.severity}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
