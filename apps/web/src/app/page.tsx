export default function TodayPage() {
  return (
    <main className="min-h-screen p-6">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-100">Today</h1>
        <p className="text-sm text-gray-400 mt-1">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section className="lg:col-span-2 space-y-4">
          <PriorityCard />
          <RecommendationsCard />
        </section>

        <aside className="space-y-4">
          <ApprovalQueueCard />
          <MeetingsCard />
        </aside>
      </div>
    </main>
  );
}

function PriorityCard() {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
      <h2 className="text-sm font-medium text-gray-300 mb-3">Priorities</h2>
      <p className="text-sm text-gray-500">No priorities yet. Upload a transcript to get started.</p>
    </div>
  );
}

function RecommendationsCard() {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
      <h2 className="text-sm font-medium text-gray-300 mb-3">AI Recommendations</h2>
      <p className="text-sm text-gray-500">Recommendations will appear here after transcript analysis.</p>
    </div>
  );
}

function ApprovalQueueCard() {
  return (
    <div className="rounded-lg border border-amber-900/40 bg-gray-900 p-4">
      <h2 className="text-sm font-medium text-amber-400 mb-3">Approval Queue</h2>
      <p className="text-sm text-gray-500">No pending approvals.</p>
    </div>
  );
}

function MeetingsCard() {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
      <h2 className="text-sm font-medium text-gray-300 mb-3">Today&apos;s Meetings</h2>
      <p className="text-sm text-gray-500">No meetings connected yet.</p>
    </div>
  );
}
