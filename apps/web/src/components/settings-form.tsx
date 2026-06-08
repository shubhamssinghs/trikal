"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

interface Settings {
  llmProvider: string;
  llmModel: string;
  anthropicApiKey: string;
  openaiApiKey: string;
  voyageApiKey: string;
  anthropicConfigured: boolean;
  openaiConfigured: boolean;
  voyageConfigured: boolean;
}

const MODELS: Record<string, { id: string; label: string }[]> = {
  anthropic: [
    { id: "claude-opus-4-8", label: "Claude Opus 4.8 (most capable)" },
    { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6 (balanced)" },
    { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5 (fastest)" },
  ],
  openai: [
    { id: "gpt-4o", label: "GPT-4o" },
    { id: "gpt-4o-mini", label: "GPT-4o mini" },
    { id: "gpt-4-turbo", label: "GPT-4 Turbo" },
  ],
};

export function SettingsForm({ initial }: { initial: Settings }) {
  const router = useRouter();
  const [provider, setProvider] = useState(initial.llmProvider);
  const [model, setModel] = useState(initial.llmModel);
  const [anthropicKey, setAnthropicKey] = useState(initial.anthropicApiKey);
  const [openaiKey, setOpenaiKey] = useState(initial.openaiApiKey);
  const [voyageKey, setVoyageKey] = useState(initial.voyageApiKey);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const onProviderChange = (p: string) => {
    setProvider(p);
    // default to that provider's first model if switching
    if (!MODELS[p].some((m) => m.id === model)) setModel(MODELS[p][0].id);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("saving");
    try {
      const body: Record<string, string> = { llmProvider: provider, llmModel: model };
      // Only send keys the user actually changed (not the masked placeholder)
      if (!anthropicKey.includes("•")) body.anthropicApiKey = anthropicKey;
      if (!openaiKey.includes("•")) body.openaiApiKey = openaiKey;
      if (!voyageKey.includes("•")) body.voyageApiKey = voyageKey;

      const res = await fetch(`${API_BASE}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      setStatus("saved");
      router.refresh();
      setTimeout(() => setStatus("idle"), 2500);
    } catch {
      setStatus("error");
    }
  };

  return (
    <form onSubmit={save} className="space-y-6">
      {/* Provider */}
      <section className="rounded-lg border border-border bg-surface p-5">
        <h2 className="text-sm font-medium text-foreground mb-3">LLM Provider</h2>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {(["anthropic", "openai"] as const).map((p) => (
            <button key={p} type="button" onClick={() => onProviderChange(p)}
              className={`rounded-lg border px-4 py-3 text-left transition-colors ${
                provider === p ? "border-blue-500 bg-blue-900/20" : "border-border bg-surface-2 hover:border-muted"
              }`}>
              <p className="text-sm font-medium text-foreground capitalize">{p === "anthropic" ? "Anthropic (Claude)" : "OpenAI (GPT)"}</p>
              <p className="text-xs text-muted mt-0.5">
                {p === "anthropic"
                  ? (initial.anthropicConfigured ? "Key configured" : "No key set")
                  : (initial.openaiConfigured ? "Key configured" : "No key set")}
              </p>
            </button>
          ))}
        </div>

        <label className="block text-xs font-medium text-muted mb-1">Model</label>
        <select value={model} onChange={(e) => setModel(e.target.value)}
          className="w-full rounded border border-border bg-surface-2 px-3 py-2 text-sm text-foreground focus:border-blue-500 focus:outline-none">
          {MODELS[provider].map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
        </select>
      </section>

      {/* API Keys */}
      <section className="rounded-lg border border-border bg-surface p-5 space-y-4">
        <h2 className="text-sm font-medium text-foreground">API Keys</h2>

        <KeyInput label="Anthropic API Key" placeholder="sk-ant-..." value={anthropicKey}
          onChange={setAnthropicKey} configured={initial.anthropicConfigured}
          hint="console.anthropic.com → API Keys" />

        <KeyInput label="OpenAI API Key" placeholder="sk-..." value={openaiKey}
          onChange={setOpenaiKey} configured={initial.openaiConfigured}
          hint="platform.openai.com → API Keys" />

        <KeyInput label="Voyage AI Key (embeddings / semantic search)" placeholder="pa-..." value={voyageKey}
          onChange={setVoyageKey} configured={initial.voyageConfigured}
          hint="dash.voyageai.com → API Keys" />
      </section>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={status === "saving"}
          className="rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-5 py-2 text-sm font-medium text-white transition-colors">
          {status === "saving" ? "Saving..." : "Save Settings"}
        </button>
        {status === "saved" && <span className="text-sm text-emerald-400">✓ Saved</span>}
        {status === "error" && <span className="text-sm text-red-400">Failed to save</span>}
      </div>
    </form>
  );
}

function KeyInput({ label, placeholder, value, onChange, configured, hint }: {
  label: string; placeholder: string; value: string;
  onChange: (v: string) => void; configured: boolean; hint: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-xs font-medium text-muted">{label}</label>
        <span className={`text-xs ${configured ? "text-emerald-400" : "text-muted"}`}>
          {configured ? "● configured" : "○ not set"}
        </span>
      </div>
      <input type="password" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded border border-border bg-surface-2 px-3 py-2 text-sm text-foreground placeholder-muted focus:border-blue-500 focus:outline-none font-mono" />
      <p className="text-xs text-muted mt-1">{hint}</p>
    </div>
  );
}
