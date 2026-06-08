"use client";

import { Card } from "../ui";

type Conn = { id: string; name: string; desc: string; category: string };

const CONNECTORS: Conn[] = [
  { id: "jira", name: "Jira", desc: "Sync issues, create tickets from action items", category: "Tickets" },
  { id: "azure-devops", name: "Azure DevOps", desc: "Sync work items and boards", category: "Tickets" },
  { id: "slack", name: "Slack", desc: "Read channels, draft replies", category: "Communication" },
  { id: "teams", name: "Microsoft Teams", desc: "Read messages and channels", category: "Communication" },
  { id: "gmail", name: "Gmail", desc: "Read & draft emails", category: "Email" },
  { id: "outlook", name: "Outlook", desc: "Read & draft via Microsoft Graph", category: "Email" },
  { id: "google-calendar", name: "Google Calendar", desc: "Pull upcoming meetings", category: "Calendar" },
  { id: "zoom", name: "Zoom", desc: "Meeting recordings & transcripts", category: "Meetings" },
  { id: "granola", name: "Granola", desc: "Import meeting transcripts", category: "Meetings" },
  { id: "google-drive", name: "Google Drive", desc: "Sync documents", category: "Docs" },
  { id: "sharepoint", name: "SharePoint", desc: "Sync documents & sites", category: "Docs" },
  { id: "confluence", name: "Confluence", desc: "Sync pages & spaces", category: "Docs" },
];

const CATEGORIES = ["Tickets", "Communication", "Email", "Calendar", "Meetings", "Docs"];

function Logo({ name }: { name: string }) {
  return (
    <div className="grid place-items-center w-10 h-10 rounded-lg bg-surface-2 text-foreground font-semibold text-sm shrink-0">
      {name[0]}
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
                  <Logo name={c.name} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{c.name}</p>
                    <p className="text-xs text-muted truncate">{c.desc}</p>
                  </div>
                </div>
                <button disabled
                  className="shrink-0 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-xs text-muted cursor-not-allowed">
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
