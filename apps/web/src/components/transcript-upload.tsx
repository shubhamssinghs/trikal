"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

interface Props { projectId: string }

export function TranscriptUpload({ projectId }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<"idle" | "uploading" | "ingesting" | "analysing" | "done" | "error">("idle");
  const [result, setResult] = useState<{ transcriptId?: string; recommendations?: number } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setStatus("uploading");
    setResult(null);

    try {
      // 1. Upload transcript
      const tr = await fetch(`${API_BASE}/transcripts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, title, rawContent: content }),
      }).then((r) => r.json());

      setStatus("ingesting");

      // 2. Ingest to knowledge base
      await fetch(`${API_BASE}/knowledge/ingest/transcript/${tr.id}`, { method: "POST" });

      setStatus("analysing");

      // 3. AI analysis
      const analysis = await fetch(`${API_BASE}/ai/analyze/transcript/${tr.id}`, { method: "POST" }).then((r) => r.json());

      setStatus("done");
      setResult({ transcriptId: tr.id, recommendations: analysis.recommendationsCreated });
      setTitle("");
      setContent("");
      router.refresh();
    } catch {
      setStatus("error");
    }
  };

  const statusLabel = {
    idle: null,
    uploading: "Uploading...",
    ingesting: "Building knowledge base...",
    analysing: "Running AI analysis...",
    done: `Done — ${result?.recommendations ?? 0} recommendations created`,
    error: "Something went wrong. Try again.",
  }[status];

  return (
    <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
      <h2 className="text-sm font-medium text-gray-300 mb-3">Upload Transcript</h2>
      <form onSubmit={submit} className="space-y-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Meeting title"
          className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Paste transcript here..."
          rows={8}
          className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none resize-none"
        />
        {statusLabel && (
          <p className={`text-xs ${status === "error" ? "text-red-400" : status === "done" ? "text-emerald-400" : "text-gray-400"}`}>
            {statusLabel}
          </p>
        )}
        <button
          type="submit"
          disabled={status !== "idle" && status !== "error" && status !== "done"}
          className="rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-4 py-2 text-sm font-medium text-white transition-colors"
        >
          Upload & Analyse
        </button>
      </form>
    </section>
  );
}
