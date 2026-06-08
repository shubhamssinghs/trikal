import Link from "next/link";
import { SettingsForm } from "@/components/settings-form";

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
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <nav className="border-b border-gray-800 px-6 py-3 flex items-center gap-6">
        <Link href="/" className="font-semibold text-white">Trikal</Link>
        <Link href="/" className="text-sm text-gray-400 hover:text-white">Today</Link>
        <Link href="/companies" className="text-sm text-gray-400 hover:text-white">Companies</Link>
        <Link href="/projects" className="text-sm text-gray-400 hover:text-white">Projects</Link>
        <Link href="/settings" className="text-sm text-white">Settings</Link>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-8">
        <h1 className="text-xl font-semibold mb-1">Settings</h1>
        <p className="text-sm text-gray-400 mb-6">Configure your AI provider and API keys. Keys are stored securely and never displayed in full.</p>

        {settings ? (
          <SettingsForm initial={settings} />
        ) : (
          <p className="text-sm text-red-400">Could not load settings. Is the API running?</p>
        )}
      </main>
    </div>
  );
}
