import { Shell } from "@/components/shell";

function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="h-4 w-32 rounded bg-surface-2 animate-pulse mb-3" />
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="h-9 rounded bg-surface-2 animate-pulse" />
        ))}
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <Shell>
      <div className="mb-6">
        <div className="h-6 w-40 rounded bg-surface-2 animate-pulse" />
        <div className="h-4 w-56 rounded bg-surface-2 animate-pulse mt-2" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <SkeletonCard lines={3} />
          <SkeletonCard lines={2} />
        </div>
        <aside className="space-y-4">
          <SkeletonCard lines={2} />
          <SkeletonCard lines={3} />
        </aside>
      </div>
    </Shell>
  );
}
