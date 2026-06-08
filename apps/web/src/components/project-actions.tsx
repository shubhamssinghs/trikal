"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Modal, Button, Field, inputClass } from "./ui";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";
const STATUSES = ["ACTIVE", "AT_RISK", "ON_HOLD", "COMPLETED", "ARCHIVED"];

interface Project {
  id: string; name: string; description?: string; status: string;
  startDate?: string; targetEndDate?: string;
}

const toDateInput = (d?: string) => (d ? new Date(d).toISOString().split("T")[0] : "");

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
      <Button variant="secondary" onClick={() => setEditing(true)}><Pencil size={14} /> Edit</Button>
      <Button variant="ghost" onClick={() => setConfirming(true)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
        <Trash2 size={14} /> Delete
      </Button>

      {editing && (
        <Modal title="Edit Project" onClose={() => setEditing(false)}>
          <form onSubmit={save} className="space-y-4">
            <Field label="Name"><input value={name} onChange={(e) => setName(e.target.value)} required className={inputClass} /></Field>
            <Field label="Description"><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={`${inputClass} resize-none`} /></Field>
            <Field label="Status">
              <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
                {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start date"><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} /></Field>
              <Field label="Target end"><input type="date" value={targetEndDate} onChange={(e) => setTargetEndDate(e.target.value)} className={inputClass} /></Field>
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
              <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save changes"}</Button>
            </div>
          </form>
        </Modal>
      )}

      {confirming && (
        <Modal title="Delete project?" onClose={() => setConfirming(false)}>
          <p className="text-sm text-muted">
            This permanently deletes <span className="text-foreground font-medium">{project.name}</span> and all its
            transcripts, knowledge base, recommendations, milestones, and risks. This cannot be undone.
          </p>
          {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
          <div className="flex justify-end gap-2 mt-5">
            <Button variant="secondary" onClick={() => setConfirming(false)}>Cancel</Button>
            <Button variant="danger" onClick={remove} disabled={busy}>{busy ? "Deleting…" : "Delete"}</Button>
          </div>
        </Modal>
      )}
    </>
  );
}
