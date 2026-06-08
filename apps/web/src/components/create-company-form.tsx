"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export function CreateCompanyForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/companies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description: description || undefined, website: website || undefined }),
      });
      if (!res.ok) throw new Error("Failed to create company");
      const company = await res.json();
      router.push(`/companies/${company.id}`);
    } catch {
      setError("Failed to create company. Please try again.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-muted mb-1">Company Name *</label>
        <input value={name} onChange={(e) => setName(e.target.value)} required
          className="w-full rounded border border-border bg-surface-2 px-3 py-2 text-sm text-foreground placeholder-muted focus:border-blue-500 focus:outline-none"
          placeholder="Acme Healthcare" />
      </div>
      <div>
        <label className="block text-xs font-medium text-muted mb-1">Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
          className="w-full rounded border border-border bg-surface-2 px-3 py-2 text-sm text-foreground placeholder-muted focus:border-blue-500 focus:outline-none resize-none"
          placeholder="Brief description of the company or client..." />
      </div>
      <div>
        <label className="block text-xs font-medium text-muted mb-1">Website</label>
        <input value={website} onChange={(e) => setWebsite(e.target.value)} type="url"
          className="w-full rounded border border-border bg-surface-2 px-3 py-2 text-sm text-foreground placeholder-muted focus:border-blue-500 focus:outline-none"
          placeholder="https://example.com" />
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <button type="submit" disabled={loading}
        className="w-full rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50 py-2 text-sm font-medium text-white transition-colors">
        {loading ? "Creating..." : "Create Company"}
      </button>
    </form>
  );
}
