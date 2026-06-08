"use client";

import { useState } from "react";
import { Card } from "../ui";

type Conn = { id: string; name: string; desc: string; category: string; logo?: string; color: string };

// Logos pulled from each brand's OWN site / CDN (favicons or official product
// assets). Ones without a public first-party logo fall back to a brand-coloured
// monogram, which is also the graceful fallback if an image fails to load.
const CONNECTORS: Conn[] = [
  { id: "jira", name: "Jira", desc: "Sync issues, create tickets from action items", category: "Tickets & Boards", logo: "https://jira.atlassian.com/favicon.ico", color: "#2684FF" },
  { id: "azure-devops", name: "Azure DevOps", desc: "Sync work items and boards", category: "Tickets & Boards", logo: "https://cdn-dynmedia-1.microsoft.com/is/content/microsoftcorp/acom_social_icon_azure", color: "#0078D7" },
  { id: "trello", name: "Trello", desc: "Sync cards and boards", category: "Tickets & Boards", logo: "https://trello.com/favicon.ico", color: "#0079BF" },
  { id: "slack", name: "Slack", desc: "Read channels, draft replies", category: "Communication", logo: "https://a.slack-edge.com/80588/marketing/img/icons/icon_slack_hash_colored.png", color: "#4A154B" },
  { id: "teams", name: "Microsoft Teams", desc: "Read messages and channels", category: "Communication", logo: "https://teams.microsoft.com/favicon.ico", color: "#6264A7" },
  { id: "gmail", name: "Gmail", desc: "Read & draft emails", category: "Email", logo: "https://www.gstatic.com/images/branding/product/2x/gmail_48dp.png", color: "#EA4335" },
  { id: "outlook", name: "Outlook", desc: "Read & draft via Microsoft Graph", category: "Email", logo: "https://cdn-dynmedia-1.microsoft.com/is/content/microsoftcorp/Outlook-Icon-FY26?resMode=sharp2&op_usm=1.5,0.65,15,0&wid=64&hei=64&qlt=100&fit=constrain", color: "#0078D4" },
  { id: "google-calendar", name: "Google Calendar", desc: "Pull upcoming meetings", category: "Calendar", logo: "https://www.gstatic.com/images/branding/product/2x/calendar_48dp.png", color: "#4285F4" },
  { id: "zoom", name: "Zoom", desc: "Meeting recordings & transcripts", category: "Meetings", logo: "https://st1.zoom.us/zoom.ico", color: "#2D8CFF" },
  { id: "granola", name: "Granola", desc: "Import meeting transcripts", category: "Meetings", logo: "https://www.granola.ai/logos/rebrand/marque.svg", color: "#6366F1" },
  { id: "google-drive", name: "Google Drive", desc: "Sync documents", category: "Docs", logo: "https://www.gstatic.com/images/branding/product/2x/drive_48dp.png", color: "#1FA463" },
  { id: "sharepoint", name: "SharePoint", desc: "Sync documents & sites", category: "Docs", logo: "https://www.microsoft.com/content/dam/microsoft/bade/images/icons/en-us/456100-icon-sharepoint-17x17.svg", color: "#038387" },
  { id: "confluence", name: "Confluence", desc: "Sync pages & spaces", category: "Docs", logo: "https://confluence.atlassian.com/favicon.ico", color: "#172B4D" },
];

const CATEGORIES = ["Tickets & Boards", "Communication", "Email", "Calendar", "Meetings", "Docs"];

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
