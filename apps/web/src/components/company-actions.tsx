"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

interface Company { id: string; name: string; description?: string; website?: string }

export function CompanyActions({ company }: { company: Company }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [name, setName] = useState(company.name);
  const [description, setDescription] = useState(company.description ?? "");
  const [website, setWebsite] = useState(company.website ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const res = await fetch(`${API_BASE}/companies/${company.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description: description || undefined, website: website || undefined }),
      });
      if (!res.ok) throw new Error();
      setEditing(false);
      router.refresh();
    } catch {
      setError("Failed to save changes.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true); setError("");
    try {
      const res = await fetch(`${API_BASE}/companies/${company.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      router.push("/companies");
    } catch {
      setError("Failed to delete company.");
      setBusy(false);
    }
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <button onClick={() => setEditing(true)}
          className="flex items-center gap-1.5 rounded-md border border-border bg-surface-2 px-3 py-1.5 text-xs text-muted hover:text-foreground transition-colors">
          <Pencil size={13} /> Edit
        </button>
        <button onClick={() => setConfirming(true)}
          className="flex items-center gap-1.5 rounded-md border border-red-900/40 bg-red-900/10 px-3 py-1.5 text-xs text-red-400 hover:bg-red-900/20 transition-colors">
          <Trash2 size={13} /> Delete
        </button>
      </div>

      {/* Edit modal */}
      {editing && (
        <Modal onClose={() => setEditing(false)} title="Edit Company">
          <form onSubmit={save} className="space-y-3">
            <Field label="Name">
              <input value={name} onChange={(e) => setName(e.target.value)} required
                className="input" />
            </Field>
            <Field label="Description">
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
                className="input resize-none" />
            </Field>
            <Field label="Website">
              <input value={website} onChange={(e) => setWebsite(e.target.value)} className="input" />
            </Field>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={() => setEditing(false)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={busy} className="btn-primary">{busy ? "Saving..." : "Save"}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete confirm */}
      {confirming && (
        <Modal onClose={() => setConfirming(false)} title="Delete Company?">
          <p className="text-sm text-muted mb-4">
            This permanently deletes <span className="text-foreground font-medium">{company.name}</span> and
            all its projects, transcripts, and knowledge. This cannot be undone.
          </p>
          {error && <p className="text-xs text-red-400 mb-2">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button onClick={() => setConfirming(false)} className="btn-secondary">Cancel</button>
            <button onClick={remove} disabled={busy}
              className="rounded bg-red-600 hover:bg-red-500 disabled:opacity-50 px-4 py-2 text-sm font-medium text-white transition-colors">
              {busy ? "Deleting..." : "Delete"}
            </button>
          </div>
        </Modal>
      )}

      <style>{`
        .input { width:100%; border-radius:0.375rem; border:1px solid rgb(var(--border)); background:rgb(var(--surface-2)); padding:0.5rem 0.75rem; font-size:0.875rem; color:rgb(var(--foreground)); outline:none; }
        .input:focus { border-color:#3b82f6; }
        .btn-secondary { border-radius:0.375rem; background:rgb(var(--surface-2)); padding:0.5rem 1rem; font-size:0.875rem; color:rgb(var(--muted)); }
        .btn-primary { border-radius:0.375rem; background:#2563eb; padding:0.5rem 1rem; font-size:0.875rem; font-weight:500; color:#fff; }
        .btn-primary:disabled { opacity:0.5; }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted mb-1">{label}</label>
      {children}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-lg border border-border bg-surface p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-foreground mb-4">{title}</h3>
        {children}
      </div>
    </div>
  );
}
