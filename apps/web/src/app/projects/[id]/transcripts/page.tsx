import Link from "next/link";
import { TranscriptUpload } from "@/components/transcript-upload";
import { KnowledgeSearch } from "@/components/knowledge-search";
import { Nav } from "@/components/nav";

export const dynamic = "force-dynamic";

const API_BASE = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

async function getTranscripts(projectId: string) {
  const res = await fetch(`${API_BASE}/transcripts?projectId=${projectId}`, { cache: "no-store" });
  if (!res.ok) return [];
  return res.json();
}

export default async function TranscriptsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const transcripts = await getTranscripts(id);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <Nav active="/projects" />

      <main className="max-w-5xl mx-auto px-6 py-6">
        <div className="mb-6">
          <Link href={`/projects/${id}`} className="text-xs text-gray-500 hover:text-gray-300">← Project</Link>
          <h1 className="text-xl font-semibold mt-1">Transcripts & Knowledge Base</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Upload */}
          <TranscriptUpload projectId={id} />

          {/* Search */}
          <KnowledgeSearch projectId={id} />
        </div>

        {/* Transcript list */}
        {transcripts.length > 0 && (
          <section className="mt-4 rounded-lg border border-gray-800 bg-gray-900 p-4">
            <h2 className="text-sm font-medium text-gray-300 mb-3">Uploaded Transcripts ({transcripts.length})</h2>
            <div className="space-y-2">
              {transcripts.map((t: { id: string; title: string; occurredAt: string; processedAt?: string }) => (
                <div key={t.id} className="flex items-center justify-between rounded border border-gray-700 bg-gray-800/30 px-3 py-2">
                  <div>
                    <p className="text-sm text-white">{t.title}</p>
                    <p className="text-xs text-gray-500">{new Date(t.occurredAt).toLocaleDateString("en-US", { timeZone: "UTC" })}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    t.processedAt ? "bg-emerald-900/50 text-emerald-400" : "bg-gray-700 text-gray-400"
                  }`}>
                    {t.processedAt ? "Analysed" : "Pending"}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
