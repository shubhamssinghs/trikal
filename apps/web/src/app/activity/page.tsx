import Link from "next/link";
import { ListTree } from "lucide-react";
import { Shell } from "@/components/shell";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import { serverFetch } from "@/lib/api/server";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

type Run = { id: string; surface: string; goal: string; status: string; model?: string | null; tokensIn: number; tokensOut: number; createdAt: string };

const STATUS: Record<string, string> = {
  completed: "bg-green-500/15 text-green-500",
  running: "bg-blue-500/15 text-blue-500",
  awaiting_approval: "bg-amber-500/15 text-amber-500",
  failed: "bg-red-500/15 text-red-500",
};

export default async function ActivityPage() {
  const runs = await serverFetch<Run[]>(`/agent/runs`, []);
  return (
    <Shell active="/activity" width="lg">
      <PageHeader title="AI Activity" subtitle="Every agent run — open one to see its full reasoning and the skills it used." />
      {runs.length === 0 ? (
        <EmptyState icon={<ListTree size={28} />} title="No agent runs yet" description="Ask the AI agent from a project and its runs will appear here." />
      ) : (
        <Card>
          <div className="divide-y divide-border">
            {runs.map((r) => (
              <Link key={r.id} href={`/agent/runs/${r.id}`} className="flex items-center gap-3 py-2.5 px-1 hover:bg-surface-2/40 rounded-md">
                <span className={`shrink-0 inline-flex rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${STATUS[r.status] ?? "bg-surface-2 text-muted"}`}>{r.status}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-foreground">{r.goal}</span>
                <span className="shrink-0 text-[11px] text-muted">{r.surface}</span>
                <span className="shrink-0 text-[11px] text-muted">{formatDate(r.createdAt)}</span>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </Shell>
  );
}
