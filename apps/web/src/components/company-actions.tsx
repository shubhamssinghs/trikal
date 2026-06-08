"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Modal, Button, Field, inputClass } from "./ui";
import { LogoUpload } from "./logo-upload";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

interface Company { id: string; name: string; description?: string; website?: string; logoKey?: string | null }

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
      const res = await fetch(`${API_BASE}/companies/${company.id}`, { credentials: "include",
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
      const res = await fetch(`${API_BASE}/companies/${company.id}`, { credentials: "include", method: "DELETE" });
      if (!res.ok) throw new Error();
      router.push("/companies");
    } catch {
      setError("Failed to delete company.");
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
        <Modal title="Edit Company" onClose={() => setEditing(false)}>
          <form onSubmit={save} className="space-y-4">
            <Field label="Logo"><LogoUpload companyId={company.id} existing={Boolean(company.logoKey)} /></Field>
            <Field label="Name"><input value={name} onChange={(e) => setName(e.target.value)} required className={inputClass} /></Field>
            <Field label="Description"><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={`${inputClass} resize-none`} /></Field>
            <Field label="Website"><input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://…" className={inputClass} /></Field>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
              <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save changes"}</Button>
            </div>
          </form>
        </Modal>
      )}

      {confirming && (
        <Modal title="Delete company?" onClose={() => setConfirming(false)}>
          <p className="text-sm text-muted">
            This permanently deletes <span className="text-foreground font-medium">{company.name}</span> and all its
            projects, transcripts, and knowledge. This cannot be undone.
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
