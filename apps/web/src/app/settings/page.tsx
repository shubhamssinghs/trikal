import Link from "next/link";
import { SettingsForm } from "@/components/settings-form";
import { Shell } from "@/components/shell";

export const dynamic = "force-dynamic";

const IAPI = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

async function getSettings() {
  try {
    const res = await fetch(`${IAPI}/settings`, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

export default async function SettingsPage() {
  const settings = await getSettings();

  return (
    <Shell active="/settings" width="md">
        <h1 className="text-xl font-semibold mb-1">Settings</h1>
        <p className="text-sm text-muted mb-6">Configure your AI provider and API keys. Keys are stored securely and never displayed in full.</p>

        {settings ? (
          <SettingsForm initial={settings} />
        ) : (
          <p className="text-sm text-red-400">Could not load settings. Is the API running?</p>
        )}
      </Shell>
  );
}
