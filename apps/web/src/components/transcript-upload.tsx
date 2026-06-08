"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

interface Props { projectId: string }

type Mode = "text" | "file";
type Status = "idle" | "uploading" | "ingesting" | "analysing" | "done" | "error";

export function TranscriptUpload({ projectId }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<Mode>("text");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<{ recommendations?: number } | null>(null);

  const reset = () => { setStatus("idle"); setResult(null); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("uploading");
    setResult(null);

    try {
      let transcriptId: string;

      if (mode === "file" && file) {
        // File upload via multipart
        const form = new FormData();
        form.append("projectId", projectId);
        form.append("title", title || file.name);
        form.append("file", file);
        const res = await fetch(`${API_BASE}/transcripts/upload`, { method: "POST", body: form });
        if (!res.ok) throw new Error("Upload failed");
        const t = await res.json();
        transcriptId = t.id;
      } else {
        // Text upload via JSON
        if (!content.trim()) throw new Error("No content");
        const res = await fetch(`${API_BASE}/transcripts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, title, rawContent: content }),
        });
        if (!res.ok) throw new Error("Upload failed");
        const t = await res.json();
        transcriptId = t.id;
      }

      setStatus("ingesting");
      await fetch(`${API_BASE}/knowledge/ingest/transcript/${transcriptId}`, { method: "POST" });

      setStatus("analysing");
      const analysis = await fetch(`${API_BASE}/ai/analyze/transcript/${transcriptId}`, { method: "POST" }).then((r) => r.json());

      setStatus("done");
      setResult({ recommendations: analysis.recommendationsCreated });
      setTitle(""); setContent(""); setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    } catch {
      setStatus("error");
    }
  };

  const statusLabel: Record<Status, string | null> = {
    idle: null,
    uploading: "Uploading...",
    ingesting: "Building knowledge base...",
    analysing: "Running AI analysis...",
    done: `Done — ${result?.recommendations ?? 0} recommendations created`,
    error: "Something went wrong. Try again.",
  };

  const busy = status !== "idle" && status !== "error" && status !== "done";

  return (
    <section className="rounded-xl border border-border bg-surface shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-foreground">Upload Transcript</h2>
        <div className="flex rounded overflow-hidden border border-border text-xs">
          {(["text", "file"] as Mode[]).map((m) => (
            <button key={m} onClick={() => { setMode(m); reset(); }}
              className={`px-3 py-1 ${mode === m ? "bg-blue-700 text-white" : "text-muted hover:text-foreground"}`}>
              {m === "text" ? "Paste text" : "Upload file"}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={submit} className="space-y-3">
        <input value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder={mode === "file" ? "Title (optional, defaults to filename)" : "Meeting title"}
          className="w-full rounded border border-border bg-surface-2 px-3 py-2 text-sm text-foreground placeholder-muted focus:border-blue-500 focus:outline-none" />

        {mode === "text" ? (
          <textarea value={content} onChange={(e) => setContent(e.target.value)}
            placeholder="Paste transcript here..." rows={7}
            className="w-full rounded border border-border bg-surface-2 px-3 py-2 text-sm text-foreground placeholder-muted focus:border-blue-500 focus:outline-none resize-none" />
        ) : (
          <div className="rounded border-2 border-dashed border-border bg-surface-2/50 px-4 py-6 text-center">
            <input ref={fileRef} type="file" accept=".txt,.pdf,.docx" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="hidden" id="file-input" />
            <label htmlFor="file-input" className="cursor-pointer">
              {file ? (
                <p className="text-sm text-blue-400">{file.name} <span className="text-muted">({(file.size / 1024).toFixed(0)} KB)</span></p>
              ) : (
                <p className="text-sm text-muted">Drop a <span className="text-blue-400">.txt, .pdf, or .docx</span> file here, or <span className="text-blue-400 underline">browse</span></p>
              )}
            </label>
          </div>
        )}

        {statusLabel[status] && (
          <p className={`text-xs ${status === "error" ? "text-red-400" : status === "done" ? "text-emerald-400" : "text-muted"}`}>
            {statusLabel[status]}
          </p>
        )}

        <button type="submit" disabled={busy || (mode === "text" ? !content.trim() : !file)}
          className="rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-4 py-2 text-sm font-medium text-white transition-colors">
          {busy ? "Processing..." : "Upload & Analyse"}
        </button>
      </form>
    </section>
  );
}
