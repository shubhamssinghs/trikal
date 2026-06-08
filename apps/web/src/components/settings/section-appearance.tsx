"use client";

import { useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { Card } from "../ui";
import { SaveBar } from "./section-ai";
import { saveSettings } from "./save";
import { useTheme } from "../theme-provider";
import type { Settings } from "./settings-view";

const OPTIONS = [
  { id: "dark", label: "Dark", icon: Moon },
  { id: "light", label: "Light", icon: Sun },
  { id: "system", label: "System", icon: Monitor },
];

export function AppearanceSection({ settings, onChange }: { settings: Settings; onChange: (s: Settings) => void }) {
  const { theme, toggle } = useTheme();
  const [choice, setChoice] = useState(settings.defaultTheme);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const pick = (id: string) => {
    setChoice(id);
    // apply immediately for dark/light
    if ((id === "dark" && theme === "light") || (id === "light" && theme === "dark")) toggle();
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("saving");
    try {
      const updated = await saveSettings({ defaultTheme: choice });
      onChange(updated as Settings);
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2500);
    } catch { setStatus("error"); }
  };

  return (
    <form onSubmit={save} className="space-y-5">
      <Card title="Theme">
        <div className="grid grid-cols-3 gap-3">
          {OPTIONS.map((o) => {
            const Icon = o.icon;
            const active = choice === o.id;
            return (
              <button key={o.id} type="button" onClick={() => pick(o.id)}
                className={`flex flex-col items-center gap-2 rounded-lg border px-4 py-5 transition-colors ${active ? "border-blue-500 bg-blue-600/10" : "border-border bg-surface-2 hover:border-muted"}`}>
                <Icon size={20} className={active ? "text-blue-500" : "text-muted"} />
                <span className="text-sm text-foreground">{o.label}</span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted mt-3">Theme switches instantly; saving sets it as the workspace default.</p>
      </Card>
      <SaveBar status={status} />
    </form>
  );
}
