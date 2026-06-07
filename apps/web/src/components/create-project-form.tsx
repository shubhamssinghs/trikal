"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Company } from "@/lib/api/queries";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

const COMPLIANCE_PROFILES = [
  { id: "", label: "Standard (default)" },
  { id: "cp_hipaa", label: "HIPAA / PHI Sensitive" },
  { id: "cp_standard", label: "Standard" },
];

export function CreateProjectForm({ companies }: { companies: Company[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? "");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [targetEndDate, setTargetEndDate] = useState("");
  const [complianceProfileId, setComplianceProfileId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !companyId) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          companyId,
          description: description || undefined,
          startDate: startDate || undefined,
          targetEndDate: targetEndDate || undefined,
          complianceProfileId: complianceProfileId || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const project = await res.json();
      router.push(`/projects/${project.id}`);
    } catch {
      setError("Failed to create project. Please try again.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">Project Name *</label>
        <input value={name} onChange={(e) => setName(e.target.value)} required
          className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
          placeholder="Patient Portal Modernization" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">Company *</label>
        <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} required
          className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none">
          {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
          className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none resize-none"
          placeholder="What is this project about?" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Start Date</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Target End</label>
          <input type="date" value={targetEndDate} onChange={(e) => setTargetEndDate(e.target.value)}
            className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">Compliance Profile</label>
        <select value={complianceProfileId} onChange={(e) => setComplianceProfileId(e.target.value)}
          className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none">
          {COMPLIANCE_PROFILES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <button type="submit" disabled={loading}
        className="w-full rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50 py-2 text-sm font-medium text-white transition-colors">
        {loading ? "Creating..." : "Create Project"}
      </button>
    </form>
  );
}
