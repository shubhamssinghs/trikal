import { Shell } from "@/components/shell";
import { PageHeader } from "@/components/ui";
import { SettingsView } from "@/components/settings/settings-view";

export const dynamic = "force-dynamic";

const IAPI = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

async function getJson(path: string, fallback: unknown) {
  try {
    const res = await fetch(`${IAPI}${path}`, { cache: "no-store" });
    if (!res.ok) return fallback;
    return res.json();
  } catch { return fallback; }
}

export default async function SettingsPage() {
  const [settings, profiles] = await Promise.all([
    getJson("/settings", null),
    getJson("/compliance-profiles", []),
  ]);

  return (
    <Shell active="/settings" width="xl">
      <PageHeader title="Settings" subtitle="Manage your workspace, AI, integrations, and compliance." />
      {settings ? (
        <SettingsView initialSettings={settings} initialProfiles={profiles} />
      ) : (
        <p className="text-sm text-red-500">Could not load settings. Is the API running?</p>
      )}
    </Shell>
  );
}
