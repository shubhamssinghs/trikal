import { Shell } from "@/components/shell";
import { PageHeader } from "@/components/ui";
import { SettingsView } from "@/components/settings/settings-view";
import { serverFetch } from "@/lib/api/server";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [settings, profiles] = await Promise.all([
    serverFetch<Record<string, unknown> | null>("/settings", null),
    serverFetch<unknown[]>("/compliance-profiles", []),
  ]);

  return (
    <Shell active="/settings" width="xl">
      <PageHeader title="Settings" subtitle="Manage your workspace, AI, integrations, and compliance." />
      {settings ? (
        <SettingsView initialSettings={settings as never} initialProfiles={profiles} />
      ) : (
        <p className="text-sm text-red-500">Could not load settings. Is the API running?</p>
      )}
    </Shell>
  );
}
