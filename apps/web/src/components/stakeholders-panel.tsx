"use client";

import { useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

interface Stakeholder { id: string; name: string; email?: string; role?: string; notes?: string }
interface Props { projectId?: string; companyId?: string; stakeholders: Stakeholder[] }

export function StakeholdersPanel({ projectId, companyId, stakeholders: initial }: Props) {
  const [stakeholders, setStakeholders] = useState(initial);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const res = await fetch(`${API_BASE}/stakeholders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email: email || undefined, role: role || undefined, projectId, companyId }),
    }).then((r) => r.json());
    setStakeholders((prev) => [...prev, res]);
    setName(""); setEmail(""); setRole(""); setAdding(false);
  };

  return (
    <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-gray-300">Stakeholders</h2>
        <button onClick={() => setAdding(!adding)} className="text-xs text-blue-400 hover:text-blue-300">+ Add</button>
      </div>

      {adding && (
        <form onSubmit={add} className="mb-3 space-y-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" autoFocus required
            className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none" />
          <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Role (e.g. Product Owner)"
            className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none" />
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email"
            className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none" />
          <div className="flex gap-2">
            <button type="submit" className="rounded bg-blue-700 hover:bg-blue-600 px-3 py-1.5 text-xs text-white">Save</button>
            <button type="button" onClick={() => setAdding(false)} className="rounded bg-gray-700 hover:bg-gray-600 px-3 py-1.5 text-xs text-gray-300">Cancel</button>
          </div>
        </form>
      )}

      {stakeholders.length === 0 ? (
        <p className="text-sm text-gray-500">No stakeholders added.</p>
      ) : (
        <div className="space-y-1.5">
          {stakeholders.map((s) => (
            <div key={s.id} className="flex items-center gap-3 rounded border border-gray-700 bg-gray-800/30 px-3 py-2">
              <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-xs text-gray-300 flex-shrink-0 font-medium">
                {s.name[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm text-gray-200 truncate">{s.name}</p>
                {(s.role || s.email) && (
                  <p className="text-xs text-gray-500 truncate">{s.role}{s.role && s.email ? " · " : ""}{s.email}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
