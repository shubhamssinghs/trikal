"use client";

import { useState } from "react";
import { Card, Toggle } from "../ui";
import { SaveBar } from "./section-ai";
import { saveSettings } from "./save";
import type { Settings } from "./settings-view";

export function NotificationsSection({ settings, onChange }: { settings: Settings; onChange: (s: Settings) => void }) {
  const [n, setN] = useState<Record<string, boolean>>(settings.notifications ?? {});
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const set = (k: string, v: boolean) => setN((p) => ({ ...p, [k]: v }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("saving");
    try {
      const updated = await saveSettings({ notifications: n });
      onChange(updated as Settings);
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2500);
    } catch { setStatus("error"); }
  };

  return (
    <form onSubmit={save} className="space-y-5">
      <Card title="Channels">
        <div className="divide-y divide-border">
          <Toggle label="In-app notifications" description="Show alerts inside the dashboard" checked={n.inApp ?? true} onChange={(v) => set("inApp", v)} />
          <Toggle label="Email notifications" description="Send important alerts to your email" checked={n.email ?? false} onChange={(v) => set("email", v)} />
        </div>
      </Card>
      <Card title="What to notify me about">
        <div className="divide-y divide-border">
          <Toggle label="Urgent AI recommendations" checked={n.urgentRecs ?? true} onChange={(v) => set("urgentRecs", v)} />
          <Toggle label="Pending approvals" checked={n.approvals ?? true} onChange={(v) => set("approvals", v)} />
          <Toggle label="At-risk projects" checked={n.atRisk ?? true} onChange={(v) => set("atRisk", v)} />
        </div>
      </Card>
      <SaveBar status={status} />
    </form>
  );
}
