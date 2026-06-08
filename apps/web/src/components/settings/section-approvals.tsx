"use client";

import { useState } from "react";
import { Card, Toggle } from "../ui";
import { SaveBar } from "./section-ai";
import { saveSettings } from "./save";
import type { Settings } from "./settings-view";

const ITEMS = [
  { key: "createTicket", label: "Creating tickets", desc: "Jira / Azure DevOps work items" },
  { key: "sendMessage", label: "Sending messages", desc: "Slack / Teams / email replies" },
  { key: "updateDoc", label: "Updating documents", desc: "Publishing or editing external docs" },
  { key: "publishDiagram", label: "Publishing diagrams", desc: "Exporting diagrams to external tools" },
];

export function ApprovalsSection({ settings, onChange }: { settings: Settings; onChange: (s: Settings) => void }) {
  const [approvals, setApprovals] = useState<Record<string, boolean>>(settings.approvals ?? {});
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("saving");
    try {
      const updated = await saveSettings({ approvals });
      onChange(updated as Settings);
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2500);
    } catch { setStatus("error"); }
  };

  return (
    <form onSubmit={save} className="space-y-5">
      <Card title="Require approval for external actions">
        <p className="text-sm text-muted mb-2">AI can draft these, but they only execute after you approve them in the queue. Turning a toggle off would let that action run automatically (not recommended).</p>
        <div className="divide-y divide-border">
          {ITEMS.map((it) => (
            <Toggle key={it.key} label={it.label} description={it.desc}
              checked={approvals[it.key] ?? true}
              onChange={(v) => setApprovals((a) => ({ ...a, [it.key]: v }))} />
          ))}
        </div>
      </Card>
      <SaveBar status={status} />
    </form>
  );
}
