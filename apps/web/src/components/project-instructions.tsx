"use client";

import { useState } from "react";
import { Loader2, Check, Sparkles } from "lucide-react";
import { Card, Button, inputClass } from "./ui";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

/** Per-project instructions the AI always follows (chat, briefing, skills). */
export function ProjectInstructions({ projectId, initial }: { projectId: string; initial: string }) {
  const [value, setValue] = useState(initial ?? "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setBusy(true); setSaved(false);
    const res = await fetch(`${API_BASE}/projects/${projectId}`, {
      credentials: "include", method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aiInstructions: value }),
    }).catch(() => null);
    setBusy(false);
    if (res?.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000); }
  };

  return (
    <Card title="AI instructions">
      <p className="text-xs text-muted mb-2 inline-flex items-start gap-1.5"><Sparkles size={13} className="text-blue-400 mt-0.5 shrink-0" /> Project-specific guidance the assistant always follows here — tone, conventions, what to prioritize, things to avoid. Applied to chat, the briefing, and skills for this project.</p>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={5}
        className={inputClass}
        placeholder={"e.g. This is a HIPAA project — never put PHI in tickets. Refer to the client as “Kindro”. Prefer concise, action-oriented answers and always cite the meeting a fact came from."}
      />
      <div className="flex items-center gap-2 mt-2">
        <Button onClick={save} disabled={busy}>{saved ? <><Check size={14} /> Saved</> : busy ? <Loader2 size={14} className="animate-spin" /> : "Save instructions"}</Button>
      </div>
    </Card>
  );
}
