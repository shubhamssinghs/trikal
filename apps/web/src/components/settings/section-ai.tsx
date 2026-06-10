"use client";

import { useState } from "react";
import { Card, Button, Field, inputClass } from "../ui";
import { Select } from "../select";
import { saveSettings } from "./save";
import type { Settings } from "./settings-view";

const MODELS: Record<string, { id: string; label: string }[]> = {
  anthropic: [
    { id: "claude-opus-4-8", label: "Claude Opus 4.8 (most capable)" },
    { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6 (balanced)" },
    { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5 (fastest)" },
  ],
  openai: [
    { id: "gpt-4o", label: "GPT-4o" },
    { id: "gpt-4o-mini", label: "GPT-4o mini" },
    { id: "gpt-4.1", label: "GPT-4.1" },
    { id: "gpt-4.1-mini", label: "GPT-4.1 mini" },
    { id: "gpt-4-turbo", label: "GPT-4 Turbo" },
    { id: "o4-mini", label: "o4-mini (reasoning)" },
    { id: "o3", label: "o3 (reasoning)" },
  ],
};

export function AiSection({ settings, onChange }: { settings: Settings; onChange: (s: Settings) => void }) {
  const [provider, setProvider] = useState(settings.llmProvider);
  const [model, setModel] = useState(settings.llmModel);
  const [anthropicKey, setAnthropicKey] = useState(settings.anthropicApiKey);
  const [openaiKey, setOpenaiKey] = useState(settings.openaiApiKey);
  const [voyageKey, setVoyageKey] = useState(settings.voyageApiKey);
  const [tavilyKey, setTavilyKey] = useState(settings.tavilyApiKey);
  const [webSearchEnabled, setWebSearchEnabled] = useState(settings.webSearchEnabled);
  const [temperature, setTemperature] = useState(settings.temperature);
  const [maxTokens, setMaxTokens] = useState(settings.maxTokens);
  const [chunkSize, setChunkSize] = useState(settings.chunkSize);
  const [chunkOverlap, setChunkOverlap] = useState(settings.chunkOverlap);
  const [retrievalTopK, setRetrievalTopK] = useState(settings.retrievalTopK);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const onProvider = (p: string) => {
    setProvider(p);
    if (!MODELS[p].some((m) => m.id === model)) setModel(MODELS[p][0].id);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("saving");
    try {
      const patch: Record<string, unknown> = {
        llmProvider: provider, llmModel: model,
        temperature, maxTokens, chunkSize, chunkOverlap, retrievalTopK,
        webSearchEnabled,
      };
      if (!anthropicKey.includes("•")) patch.anthropicApiKey = anthropicKey;
      if (!openaiKey.includes("•")) patch.openaiApiKey = openaiKey;
      if (!voyageKey.includes("•")) patch.voyageApiKey = voyageKey;
      if (!tavilyKey.includes("•")) patch.tavilyApiKey = tavilyKey;
      const updated = await saveSettings(patch);
      onChange(updated as Settings);
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2500);
    } catch { setStatus("error"); }
  };

  return (
    <form onSubmit={save} className="space-y-5">
      <Card title="LLM Provider">
        <div className="grid grid-cols-2 gap-3 mb-4">
          {(["anthropic", "openai"] as const).map((p) => (
            <button key={p} type="button" onClick={() => onProvider(p)}
              className={`rounded-lg border px-4 py-3 text-left transition-colors ${provider === p ? "border-blue-500 bg-blue-600/10" : "border-border bg-surface-2 hover:border-muted"}`}>
              <p className="text-sm font-medium text-foreground">{p === "anthropic" ? "Anthropic (Claude)" : "OpenAI (GPT)"}</p>
              <p className="text-xs text-muted mt-0.5">{(p === "anthropic" ? settings.anthropicConfigured : settings.openaiConfigured) ? "Key configured" : "No key set"}</p>
            </button>
          ))}
        </div>
        <Field label="Model">
          <Select value={model} onChange={setModel} options={MODELS[provider].map((m) => ({ value: m.id, label: m.label }))} />
        </Field>
      </Card>

      <Card title="API Keys">
        <div className="space-y-4">
          <KeyField label="Anthropic API Key" value={anthropicKey} onChange={setAnthropicKey} configured={settings.anthropicConfigured} hint="console.anthropic.com → API Keys" />
          <KeyField label="OpenAI API Key" value={openaiKey} onChange={setOpenaiKey} configured={settings.openaiConfigured} hint="platform.openai.com → API Keys" />
          <KeyField label="Voyage AI Key (embeddings)" value={voyageKey} onChange={setVoyageKey} configured={settings.voyageConfigured} hint="dash.voyageai.com → API Keys" />
        </div>
      </Card>

      <Card title="Web Search">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="min-w-0">
            <p className="text-sm text-foreground">Let the agent search the web</p>
            <p className="text-xs text-muted mt-0.5">Via the Tavily MCP server. The agent uses it for current/external facts that aren’t in the project knowledge base — and still searches the project first for project-specific questions. Works on any model.</p>
          </div>
          <button type="button" onClick={() => setWebSearchEnabled((v) => !v)}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${webSearchEnabled ? "bg-blue-600" : "bg-surface-2 border border-border"}`}
            aria-pressed={webSearchEnabled}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${webSearchEnabled ? "translate-x-6" : "translate-x-1"}`} />
          </button>
        </div>
        <KeyField label="Tavily API Key" value={tavilyKey} onChange={setTavilyKey} configured={settings.tavilyConfigured} hint="app.tavily.com → API Keys (free tier available)" />
        {webSearchEnabled && !settings.tavilyConfigured && !tavilyKey && (
          <p className="text-xs text-amber-400 mt-2">Add a Tavily API key for web search to actually work.</p>
        )}
      </Card>

      <Card title="Generation">
        <div className="grid grid-cols-2 gap-4">
          <Field label={`Temperature (${temperature})`}>
            <input type="range" min={0} max={1} step={0.1} value={temperature} onChange={(e) => setTemperature(Number(e.target.value))} className="w-full accent-blue-600" />
          </Field>
          <Field label="Max tokens">
            <input type="number" value={maxTokens} onChange={(e) => setMaxTokens(Number(e.target.value))} className={inputClass} />
          </Field>
        </div>
      </Card>

      <Card title="Knowledge Base & Retrieval">
        <div className="grid grid-cols-3 gap-4">
          <Field label="Chunk size (words)"><input type="number" value={chunkSize} onChange={(e) => setChunkSize(Number(e.target.value))} className={inputClass} /></Field>
          <Field label="Chunk overlap"><input type="number" value={chunkOverlap} onChange={(e) => setChunkOverlap(Number(e.target.value))} className={inputClass} /></Field>
          <Field label="Results (top-K)"><input type="number" value={retrievalTopK} onChange={(e) => setRetrievalTopK(Number(e.target.value))} className={inputClass} /></Field>
        </div>
        <p className="text-xs text-muted mt-2">Embedding model: <span className="text-foreground">{settings.embeddingModel}</span> (512-dim)</p>
      </Card>

      <SaveBar status={status} />
    </form>
  );
}

function KeyField({ label, value, onChange, configured, hint }: { label: string; value: string; onChange: (v: string) => void; configured: boolean; hint: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-medium text-muted">{label}</label>
        <span className={`text-xs ${configured ? "text-emerald-500" : "text-muted"}`}>{configured ? "● configured" : "○ not set"}</span>
      </div>
      <input type="password" value={value} onChange={(e) => onChange(e.target.value)} placeholder="enter key…" className={`${inputClass} font-mono`} />
      <p className="text-xs text-muted mt-1">{hint}</p>
    </div>
  );
}

export function SaveBar({ status }: { status: "idle" | "saving" | "saved" | "error" }) {
  return (
    <div className="flex items-center gap-3 sticky bottom-0 bg-background/80 backdrop-blur py-3">
      <Button type="submit" disabled={status === "saving"}>{status === "saving" ? "Saving…" : "Save changes"}</Button>
      {status === "saved" && <span className="text-sm text-emerald-500">✓ Saved</span>}
      {status === "error" && <span className="text-sm text-red-500">Failed to save</span>}
    </div>
  );
}
