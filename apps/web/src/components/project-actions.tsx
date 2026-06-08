"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

const STATUSES = ["ACTIVE", "AT_RISK", "ON_HOLD", "COMPLETED", "ARCHIVED"];

interface Project {
  id: string; name: string; description?: string; status: string;
  startDate?: string; targetEndDate?: string;
}

function toDateInput(d?: string) {
  return d ? new Date(d).toISOString().split("T")[0] : "";
}

export function ProjectActions({ project }: { project: Project }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [status, setStatus] = useState(project.status);
  const [startDate, setStartDate] = useState(toDateInput(project.startDate));
  const [targetEndDate, setTargetEndDate] = useState(toDateInput(project.targetEndDate));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const res = await fetch(`${API_BASE}/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, description: description || undefined, status,
          startDate: startDate ? new Date(startDate).toISOString() : undefined,
          targetEndDate: targetEndDate ? new Date(targetEndDate).toISOString() : undefined,
        }),
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
      const res = await fetch(`${API_BASE}/projects/${project.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      router.push("/projects");
    } catch {
      setError("Failed to delete project.");
      setBusy(false);
    }
  };

  return (
    <>
      <button onClick={() => setEditing(true)}
        className="flex items-center gap-1.5 rounded-md border border-border bg-surface-2 px-3 py-1.5 text-xs text-muted hover:text-foreground transition-colors">
        <Pencil size={13} /> Edit
      </button>
      <button onClick={() => setConfirming(true)}
        className="flex items-center gap-1.5 rounded-md border border-red-900/40 bg-red-900/10 px-3 py-1.5 text-xs text-red-400 hover:bg-red-900/20 transition-colors">
        <Trash2 size={13} /> Delete
      </button>

      {editing && (
        <Modal onClose={() => setEditing(false)} title="Edit Project">
          <form onSubmit={save} className="space-y-3">
            <Field label="Name">
              <input value={name} onChange={(e) => setName(e.target.value)} required className="pi" />
            </Field>
            <Field label="Description">
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="pi resize-none" />
            </Field>
            <Field label="Status">
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="pi">
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start Date">
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="pi" />
              </Field>
              <Field label="Target End">
                <input type="date" value={targetEndDate} onChange={(e) => setTargetEndDate(e.target.value)} className="pi" />
              </Field>
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={() => setEditing(false)} className="pbs">Cancel</button>
              <button type="submit" disabled={busy} className="pbp">{busy ? "Saving..." : "Save"}</button>
            </div>
          </form>
        </Modal>
      )}

      {confirming && (
        <Modal onClose={() => setConfirming(false)} title="Delete Project?">
          <p className="text-sm text-muted mb-4">
            This permanently deletes <span className="text-foreground font-medium">{project.name}</span> and all its
            transcripts, knowledge base, recommendations, milestones, and risks. This cannot be undone.
          </p>
          {error && <p className="text-xs text-red-400 mb-2">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button onClick={() => setConfirming(false)} className="pbs">Cancel</button>
            <button onClick={remove} disabled={busy}
              className="rounded bg-red-600 hover:bg-red-500 disabled:opacity-50 px-4 py-2 text-sm font-medium text-white transition-colors">
              {busy ? "Deleting..." : "Delete"}
            </button>
          </div>
        </Modal>
      )}

      <style>{`
        .pi { width:100%; border-radius:0.375rem; border:1px solid rgb(var(--border)); background:rgb(var(--surface-2)); padding:0.5rem 0.75rem; font-size:0.875rem; color:rgb(var(--foreground)); outline:none; }
        .pi:focus { border-color:#3b82f6; }
        .pbs { border-radius:0.375rem; background:rgb(var(--surface-2)); padding:0.5rem 1rem; font-size:0.875rem; color:rgb(var(--muted)); }
        .pbp { border-radius:0.375rem; background:#2563eb; padding:0.5rem 1rem; font-size:0.875rem; font-weight:500; color:#fff; }
        .pbp:disabled { opacity:0.5; }
      `}</style>
    </>
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
