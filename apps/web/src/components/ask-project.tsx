"use client";

import { useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

interface Props { projectId: string }

interface AskResult {
  answer: string;
  sources: number;
  usedVectorSearch: boolean;
}

const SUGGESTIONS = [
  "What decisions were made in the last meeting?",
  "What are the open blockers?",
  "What action items are pending?",
  "What scope changes were discussed?",
];

export function AskProject({ projectId }: Props) {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<AskResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const ask = async (q: string) => {
    const query = q.trim();
    if (!query) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch(`${API_BASE}/ai/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, question: query }),
      });
      if (!res.ok) throw new Error("Request failed");
      setResult(await res.json());
    } catch {
      setError("Failed to get answer. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-lg border border-blue-900/40 bg-surface p-4">
      <h2 className="text-sm font-medium text-blue-400 mb-3">Ask Project</h2>

      <form onSubmit={(e) => { e.preventDefault(); ask(question); }} className="flex gap-2 mb-3">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="What decisions were made about the insurance API?"
          className="flex-1 rounded border border-border bg-surface-2 px-3 py-2 text-sm text-foreground placeholder-muted focus:border-blue-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="rounded bg-blue-700 hover:bg-blue-600 disabled:opacity-50 px-3 py-2 text-sm font-medium text-white transition-colors"
        >
          {loading ? "..." : "Ask"}
        </button>
      </form>

      {/* Suggestions */}
      {!result && !loading && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {SUGGESTIONS.map((s) => (
            <button key={s} onClick={() => { setQuestion(s); ask(s); }}
              className="rounded border border-border bg-surface-2 px-2 py-1 text-xs text-muted hover:text-foreground hover:border-muted transition-colors">
              {s}
            </button>
          ))}
        </div>
      )}

      {error && <p className="text-xs text-red-400 mb-2">{error}</p>}

      {loading && (
        <div className="rounded border border-border bg-surface-2/50 p-3">
          <p className="text-sm text-muted animate-pulse">Searching knowledge base...</p>
        </div>
      )}

      {result && (
        <div className="rounded border border-border bg-surface-2/50 p-3 space-y-2">
          <p className="text-sm text-foreground whitespace-pre-wrap">{result.answer}</p>
          <div className="flex items-center gap-3 pt-1 border-t border-border">
            <span className="text-xs text-muted">{result.sources} source{result.sources !== 1 ? "s" : ""}</span>
            <span className="text-xs text-muted">·</span>
            <span className={`text-xs ${result.usedVectorSearch ? "text-blue-400" : "text-muted"}`}>
              {result.usedVectorSearch ? "vector search" : "text search"}
            </span>
            <button onClick={() => setResult(null)} className="ml-auto text-xs text-muted hover:text-muted">Clear</button>
          </div>
        </div>
      )}
    </section>
  );
}
