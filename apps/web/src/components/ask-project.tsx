"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, ExternalLink, ListTree } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

interface Props { projectId: string }

type Artifact = { type: string; id?: string; label?: string; href?: string };
interface AskResult { runId: string; answer: string; status: string; artifacts?: Artifact[] }

const SUGGESTIONS = [
  "What decisions were made in the last meeting?",
  "Draw the system architecture",
  "What are the open blockers?",
  "Diagram the order processing flow",
];

export function AskProject({ projectId }: Props) {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<AskResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const ask = async (q: string) => {
    const query = q.trim();
    if (!query) return;
    setLoading(true); setError(""); setResult(null);
    try {
      const res = await fetch(`${API_BASE}/agent/ask`, {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, question: query }),
      });
      if (!res.ok) throw new Error("Request failed");
      setResult(await res.json());
    } catch {
      setError("Failed to get an answer. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-xl border border-blue-500/30 bg-surface shadow-sm p-4">
      <h2 className="text-sm font-medium text-blue-400 mb-3 inline-flex items-center gap-1.5">
        <Sparkles size={14} /> Ask the AI agent
      </h2>

      <form onSubmit={(e) => { e.preventDefault(); ask(question); }} className="flex gap-2 mb-3">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question, or “draw the architecture”…"
          className="flex-1 rounded border border-border bg-surface-2 px-3 py-2 text-sm text-foreground placeholder-muted focus:border-blue-500 focus:outline-none"
        />
        <button type="submit" disabled={loading || !question.trim()}
          className="rounded bg-blue-700 hover:bg-blue-600 disabled:opacity-50 px-3 py-2 text-sm font-medium text-white transition-colors">
          {loading ? "…" : "Ask"}
        </button>
      </form>

      {!result && !loading && (
        <div className="flex flex-wrap gap-1.5 mb-1">
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
          <p className="text-sm text-muted animate-pulse">The agent is working — thinking, searching, and using skills…</p>
        </div>
      )}

      {result && (
        <div className="rounded border border-border bg-surface-2/50 p-3 space-y-2">
          <p className="text-sm text-foreground whitespace-pre-wrap">{result.answer}</p>

          {!!result.artifacts?.length && (
            <div className="flex flex-wrap gap-1.5">
              {result.artifacts.map((a, i) => (
                a.href ? (
                  <Link key={i} href={a.href} className="inline-flex items-center gap-1 rounded-md border border-blue-500/30 bg-blue-500/10 px-2 py-1 text-xs text-blue-400 hover:bg-blue-500/20">
                    <ExternalLink size={11} /> {a.label ?? a.type}
                  </Link>
                ) : null
              ))}
            </div>
          )}

          <div className="flex items-center gap-3 pt-1 border-t border-border">
            <Link href={`/agent/runs/${result.runId}`} className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground">
              <ListTree size={12} /> View reasoning
            </Link>
            <button onClick={() => setResult(null)} className="ml-auto text-xs text-muted hover:text-foreground">Clear</button>
          </div>
        </div>
      )}
    </section>
  );
}
