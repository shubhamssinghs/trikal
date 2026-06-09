"use client";

import { useState, useEffect } from "react";
import { Check, Loader2, Plug, AlertCircle } from "lucide-react";
import { Card, Button, inputClass } from "../ui";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

type Conn = { id: string; name: string; desc: string; category: string; logo?: string; color: string };
type GranolaConn = { connected: boolean; status: string; keyHint: string | null; lastError: string | null };

const CONNECTORS: Conn[] = [
  { id: "jira", name: "Jira", desc: "Sync issues, create tickets from action items", category: "Tickets & Boards", logo: "https://jira.atlassian.com/favicon.ico", color: "#2684FF" },
  { id: "azure-devops", name: "Azure DevOps", desc: "Sync work items and boards", category: "Tickets & Boards", logo: "https://cdn-dynmedia-1.microsoft.com/is/content/microsoftcorp/acom_social_icon_azure", color: "#0078D7" },
  { id: "slack", name: "Slack", desc: "Read channels, draft replies", category: "Communication", logo: "https://a.slack-edge.com/80588/marketing/img/icons/icon_slack_hash_colored.png", color: "#4A154B" },
  { id: "teams", name: "Microsoft Teams", desc: "Read messages and channels", category: "Communication", logo: "https://teams.microsoft.com/favicon.ico", color: "#6264A7" },
  { id: "gmail", name: "Gmail", desc: "Read & draft emails", category: "Email", logo: "https://www.gstatic.com/images/branding/product/2x/gmail_48dp.png", color: "#EA4335" },
  { id: "zoom", name: "Zoom", desc: "Meeting recordings & transcripts", category: "Meetings", logo: "https://st1.zoom.us/zoom.ico", color: "#2D8CFF" },
  { id: "google-drive", name: "Google Drive", desc: "Sync documents", category: "Docs", logo: "https://www.gstatic.com/images/branding/product/2x/drive_48dp.png", color: "#1FA463" },
];

const CATEGORIES = ["Tickets & Boards", "Communication", "Email", "Calendar", "Meetings", "Docs"];

function Logo({ name, logo, color }: { name: string; logo?: string; color: string }) {
  const [failed, setFailed] = useState(false);
  if (!logo || failed) {
    return <div className="grid place-items-center w-10 h-10 rounded-lg text-white font-semibold text-sm shrink-0" style={{ backgroundColor: color }}>{name[0]}</div>;
  }
  return (
    <div className="grid place-items-center w-10 h-10 rounded-lg bg-white border border-border shrink-0 p-1.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logo} alt={name} className="w-full h-full object-contain" onError={() => setFailed(true)} />
    </div>
  );
}

function GranolaCard() {
  const [conn, setConn] = useState<GranolaConn | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState<"connect" | "test" | "disconnect" | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = () =>
    fetch(`${API_BASE}/integrations`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then((list: Array<GranolaConn & { provider: string }>) => setConn(list.find((c) => c.provider === "granola") ?? { connected: false, status: "disconnected", keyHint: null, lastError: null }))
      .catch(() => setConn({ connected: false, status: "disconnected", keyHint: null, lastError: null }));

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const connect = async () => {
    if (!apiKey.trim()) return;
    setBusy("connect"); setMsg(null);
    const res = await fetch(`${API_BASE}/integrations/granola`, {
      credentials: "include", method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: apiKey.trim() }),
    }).then((r) => r.json().then((b) => ({ ok: r.ok, b }))).catch(() => ({ ok: false, b: null }));
    setBusy(null);
    if (res.ok && res.b?.testOk !== false) { setApiKey(""); setMsg({ ok: true, text: "Connected to Granola." }); }
    else setMsg({ ok: false, text: res.b?.testError || res.b?.message || "Could not connect — check the key." });
    load();
  };

  const test = async () => {
    setBusy("test"); setMsg(null);
    const r = await fetch(`${API_BASE}/integrations/granola/test`, { credentials: "include", method: "POST" }).then((x) => x.json()).catch(() => ({ ok: false }));
    setBusy(null);
    setMsg(r.ok ? { ok: true, text: "Connection OK." } : { ok: false, text: r.error || "Connection failed." });
    load();
  };

  const disconnect = async () => {
    setBusy("disconnect");
    await fetch(`${API_BASE}/integrations/granola`, { credentials: "include", method: "DELETE" }).catch(() => {});
    setBusy(null); setMsg(null); load();
  };

  const connected = conn?.connected;
  return (
    <Card title="Granola" accent={connected ? "blue" : "default"}
      action={connected ? <span className="inline-flex items-center gap-1 text-xs text-emerald-400"><Check size={13} /> Connected</span> : null}>
      <div className="flex items-start gap-3">
        <Logo name="Granola" logo="https://www.granola.ai/logos/rebrand/marque.svg" color="#6366F1" />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted mb-3">
            Import meeting transcripts via the Granola API. Paste a workspace API key (starts with <span className="text-foreground">grn_</span>) from Granola → Settings → API.
            Enable it per-project on each project page to sync that project&apos;s meetings into its knowledge base.
          </p>

          {connected ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="rounded-md border border-border bg-surface-2/60 px-2.5 py-1.5 text-xs text-foreground">Key {conn?.keyHint}</span>
              <Button variant="secondary" onClick={test} disabled={!!busy}>{busy === "test" ? <Loader2 size={14} className="animate-spin" /> : "Test"}</Button>
              <Button variant="secondary" onClick={disconnect} disabled={!!busy}>{busy === "disconnect" ? <Loader2 size={14} className="animate-spin" /> : "Disconnect"}</Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} type="password" placeholder="grn_…" className={inputClass} />
              <Button onClick={connect} disabled={busy === "connect" || !apiKey.trim()}>
                {busy === "connect" ? <Loader2 size={14} className="animate-spin" /> : <><Plug size={14} /> Connect</>}
              </Button>
            </div>
          )}
          {msg && <p className={`text-xs mt-2 inline-flex items-center gap-1 ${msg.ok ? "text-emerald-400" : "text-red-500"}`}>{!msg.ok && <AlertCircle size={12} />}{msg.text}</p>}
          {conn?.status === "error" && conn.lastError && !msg && <p className="text-xs mt-2 text-red-500">{conn.lastError}</p>}
        </div>
      </div>
    </Card>
  );
}

function GoogleCalendarCard() {
  const [conn, setConn] = useState<GranolaConn | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () =>
    fetch(`${API_BASE}/integrations`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then((list: Array<GranolaConn & { provider: string }>) => setConn(list.find((c) => c.provider === "google-calendar") ?? { connected: false, status: "disconnected", keyHint: null, lastError: null }))
      .catch(() => setConn({ connected: false, status: "disconnected", keyHint: null, lastError: null }));
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const connect = () => { window.location.href = `${API_BASE}/integrations/google/connect`; };
  const disconnect = async () => { setBusy(true); await fetch(`${API_BASE}/integrations/google`, { credentials: "include", method: "DELETE" }).catch(() => {}); setBusy(false); load(); };

  const connected = conn?.connected;
  return (
    <Card title="Google Calendar" accent={connected ? "blue" : "default"}
      action={connected ? <span className="inline-flex items-center gap-1 text-xs text-emerald-400"><Check size={13} /> Connected</span> : null}>
      <div className="flex items-start gap-3">
        <Logo name="Google Calendar" logo="https://www.gstatic.com/images/branding/product/2x/calendar_48dp.png" color="#4285F4" />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted mb-3">Read-only access to your upcoming meetings so the assistant can prep you (the <span className="text-foreground">Prepare me for the meeting</span> skill) and surface what&apos;s next.</p>
          {connected ? (
            <Button variant="secondary" onClick={disconnect} disabled={busy}>{busy ? <Loader2 size={14} className="animate-spin" /> : "Disconnect"}</Button>
          ) : (
            <Button onClick={connect}><Plug size={14} /> Connect Google</Button>
          )}
          {conn?.status === "error" && conn.lastError && <p className="text-xs mt-2 text-red-500">{conn.lastError}</p>}
        </div>
      </div>
    </Card>
  );
}

export function IntegrationsSection() {
  return (
    <div className="space-y-5">
      <GranolaCard />
      <GoogleCalendarCard />

      <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 px-4 py-3">
        <p className="text-sm text-foreground">More connectors are coming.</p>
        <p className="text-xs text-muted mt-0.5">Each uses OAuth and starts read-only — external writes (tickets, messages) always go through the approval queue.</p>
      </div>

      {CATEGORIES.map((cat) => (
        <Card key={cat} title={cat}>
          <div className="grid sm:grid-cols-2 gap-3">
            {CONNECTORS.filter((c) => c.category === cat).map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-2/40 px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Logo name={c.name} logo={c.logo} color={c.color} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{c.name}</p>
                    <p className="text-xs text-muted truncate">{c.desc}</p>
                  </div>
                </div>
                <button disabled className="shrink-0 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-xs text-muted cursor-not-allowed">Connect</button>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
