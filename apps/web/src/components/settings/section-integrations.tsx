"use client";

import { useState } from "react";
import { Card } from "../ui";

type Conn = { id: string; name: string; desc: string; category: string; logo?: string; color: string };

const SI = (slug: string) => `https://cdn.simpleicons.org/${slug}`;
const VL = (slug: string) => `https://www.vectorlogo.zone/logos/${slug}/${slug}-icon.svg`;

// Real logos where a reliable CDN has them; otherwise a brand-coloured monogram
// (also the graceful fallback if a remote logo fails to load).
const CONNECTORS: Conn[] = [
  { id: "jira", name: "Jira", desc: "Sync issues, create tickets from action items", category: "Tickets", logo: VL("atlassian_jira"), color: "#2684FF" },
  { id: "azure-devops", name: "Azure DevOps", desc: "Sync work items and boards", category: "Tickets", color: "#0078D7" },
  { id: "slack", name: "Slack", desc: "Read channels, draft replies", category: "Communication", logo: VL("slack"), color: "#4A154B" },
  { id: "teams", name: "Microsoft Teams", desc: "Read messages and channels", category: "Communication", color: "#6264A7" },
  { id: "gmail", name: "Gmail", desc: "Read & draft emails", category: "Email", logo: SI("gmail"), color: "#EA4335" },
  { id: "outlook", name: "Outlook", desc: "Read & draft via Microsoft Graph", category: "Email", color: "#0078D4" },
  { id: "google-calendar", name: "Google Calendar", desc: "Pull upcoming meetings", category: "Calendar", logo: SI("googlecalendar"), color: "#4285F4" },
  { id: "zoom", name: "Zoom", desc: "Meeting recordings & transcripts", category: "Meetings", logo: SI("zoom"), color: "#2D8CFF" },
  { id: "granola", name: "Granola", desc: "Import meeting transcripts", category: "Meetings", color: "#6366F1" },
  { id: "google-drive", name: "Google Drive", desc: "Sync documents", category: "Docs", logo: SI("googledrive"), color: "#1FA463" },
  { id: "sharepoint", name: "SharePoint", desc: "Sync documents & sites", category: "Docs", color: "#038387" },
  { id: "confluence", name: "Confluence", desc: "Sync pages & spaces", category: "Docs", logo: SI("confluence"), color: "#172B4D" },
];

const CATEGORIES = ["Tickets", "Communication", "Email", "Calendar", "Meetings", "Docs"];

function Logo({ name, logo, color }: { name: string; logo?: string; color: string }) {
  const [failed, setFailed] = useState(false);
  if (!logo || failed) {
    return (
      <div className="grid place-items-center w-10 h-10 rounded-lg text-white font-semibold text-sm shrink-0" style={{ backgroundColor: color }}>
        {name[0]}
      </div>
    );
  }
  return (
    <div className="grid place-items-center w-10 h-10 rounded-lg bg-white border border-border shrink-0 p-1.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logo} alt={name} className="w-full h-full object-contain" onError={() => setFailed(true)} />
    </div>
  );
}

export function IntegrationsSection() {
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 px-4 py-3">
        <p className="text-sm text-foreground">Connectors are coming soon.</p>
        <p className="text-xs text-muted mt-0.5">
          Each integration uses OAuth and starts read-only — external writes (creating tickets, sending messages)
          always go through the approval queue.
        </p>
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
                <button disabled className="shrink-0 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-xs text-muted cursor-not-allowed">
                  Connect
                </button>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
