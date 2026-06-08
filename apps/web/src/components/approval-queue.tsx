"use client";

import { useState } from "react";
import type { Recommendation } from "@/lib/api/queries";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

async function approve(id: string) {
  await fetch(`${API_BASE}/ai/recommendations/${id}/approve`, { credentials: "include", method: "PATCH" });
}
async function reject(id: string) {
  await fetch(`${API_BASE}/ai/recommendations/${id}/reject`, { credentials: "include", method: "PATCH" });
}

interface Props {
  projectId: string;
  recommendations: Recommendation[];
}

export function ApprovalQueue({ recommendations: initial }: Props) {
  const [recs, setRecs] = useState(initial);
  const [loading, setLoading] = useState<string | null>(null);

  const handle = async (id: string, action: "approve" | "reject") => {
    setLoading(id);
    try {
      await (action === "approve" ? approve(id) : reject(id));
      setRecs((prev) => prev.filter((r) => r.id !== id));
    } finally {
      setLoading(null);
    }
  };

  return (
    <section className="rounded-xl border border-amber-500/30 bg-surface shadow-sm p-4">
      <h2 className="text-sm font-medium text-amber-400 mb-3">
        Approval Queue{" "}
        <span className="text-amber-600">({recs.length})</span>
      </h2>

      {recs.length === 0 ? (
        <p className="text-sm text-muted">No pending approvals.</p>
      ) : (
        <div className="space-y-2">
          {recs.map((r) => (
            <div key={r.id}
              className="rounded border border-border bg-surface-2/50 px-3 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{r.title}</p>
                  {r.description && (
                    <p className="text-xs text-muted mt-0.5 truncate">{r.description}</p>
                  )}
                  <p className="text-xs text-muted mt-1">{r.type}</p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={() => handle(r.id, "approve")}
                    disabled={loading === r.id}
                    className="rounded bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 px-2.5 py-1 text-xs font-medium text-white transition-colors"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handle(r.id, "reject")}
                    disabled={loading === r.id}
                    className="rounded bg-surface-2 hover:bg-border disabled:opacity-50 px-2.5 py-1 text-xs font-medium text-foreground transition-colors"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
