"use client";

import { useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

interface Chunk { chunkId: string; content: string; source: { id: string; title: string; sourceType: string } }

interface Props { projectId: string }

export function KnowledgeSearch({ projectId }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Chunk[]>([]);
  const [searching, setSearching] = useState(false);

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    try {
      const data = await fetch(
        `${API_BASE}/knowledge/search?projectId=${projectId}&q=${encodeURIComponent(query)}`
      ).then((r) => r.json());
      setResults(Array.isArray(data) ? data : []);
    } finally {
      setSearching(false);
    }
  };

  return (
    <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
      <h2 className="text-sm font-medium text-gray-300 mb-3">Search Knowledge Base</h2>
      <form onSubmit={search} className="flex gap-2 mb-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search transcripts..."
          className="flex-1 rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={searching}
          className="rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50 px-3 py-2 text-sm text-gray-300 transition-colors"
        >
          {searching ? "..." : "Search"}
        </button>
      </form>

      {results.length > 0 && (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {results.map((r) => (
            <div key={r.chunkId} className="rounded border border-gray-700 bg-gray-800/30 px-3 py-2">
              <p className="text-xs text-blue-400 mb-1">{r.source.title}</p>
              <p className="text-xs text-gray-300 line-clamp-3">{r.content}</p>
            </div>
          ))}
        </div>
      )}
      {results.length === 0 && query && !searching && (
        <p className="text-xs text-gray-500">No results for &ldquo;{query}&rdquo;</p>
      )}
    </section>
  );
}
