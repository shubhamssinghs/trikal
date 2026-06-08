import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Shell } from "@/components/shell";
import { PageHeader } from "@/components/ui";
import { RunTrace } from "@/components/agent/run-trace";

export const dynamic = "force-dynamic";

export default async function AgentRunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Shell active="/activity" width="lg">
      <Link href="/activity" className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground mb-3">
        <ChevronLeft size={14} /> AI activity
      </Link>
      <PageHeader title="Agent run" subtitle="Everything the agent thought and did, step by step." />
      <RunTrace runId={id} />
    </Shell>
  );
}
