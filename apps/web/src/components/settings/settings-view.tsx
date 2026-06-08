"use client";

import { useState } from "react";
import {
  Bot, Plug, ShieldCheck, CheckSquare, Bell, Building2, Palette, Users, Lock, Database,
} from "lucide-react";
import { AiSection } from "./section-ai";
import { IntegrationsSection } from "./section-integrations";
import { ComplianceSection } from "./section-compliance";
import { ApprovalsSection } from "./section-approvals";
import { NotificationsSection } from "./section-notifications";
import { OrganizationSection } from "./section-organization";
import { AppearanceSection } from "./section-appearance";
import { MembersSection } from "./section-members";
import { SecuritySection } from "./section-security";
import { MasterDataSection } from "./section-master-data";

export type Settings = Record<string, unknown> & {
  orgName: string;
  llmProvider: string; llmModel: string;
  anthropicApiKey: string; openaiApiKey: string; voyageApiKey: string;
  anthropicConfigured: boolean; openaiConfigured: boolean; voyageConfigured: boolean;
  embeddingModel: string; chunkSize: number; chunkOverlap: number;
  retrievalTopK: number; temperature: number; maxTokens: number;
  timezone: string; dateFormat: string; defaultTheme: string;
  approvals: Record<string, boolean>; notifications: Record<string, boolean>;
  oidcIssuer: string; oidcClientId: string;
};

const SECTIONS = [
  { id: "ai", label: "AI & Models", icon: Bot },
  { id: "integrations", label: "Integrations", icon: Plug },
  { id: "compliance", label: "Compliance", icon: ShieldCheck },
  { id: "approvals", label: "Approvals", icon: CheckSquare },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "organization", label: "Organization", icon: Building2 },
  { id: "master-data", label: "Master Data", icon: Database },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "members", label: "Workspace & Roles", icon: Users },
  { id: "security", label: "Security", icon: Lock },
];

export function SettingsView({
  initialSettings,
  initialProfiles,
}: {
  initialSettings: Settings;
  initialProfiles: unknown[];
}) {
  const [active, setActive] = useState("ai");
  const [settings, setSettings] = useState(initialSettings);

  return (
    <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6">
      {/* Sub-nav */}
      <nav className="space-y-0.5 md:sticky md:top-6 md:self-start">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          const isActive = active === s.id;
          return (
            <button key={s.id} onClick={() => setActive(s.id)}
              className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-left transition-colors ${
                isActive ? "bg-blue-600/10 text-blue-500 font-medium" : "text-muted hover:text-foreground hover:bg-surface-2"
              }`}>
              <Icon size={16} className={isActive ? "" : "opacity-80"} />
              {s.label}
            </button>
          );
        })}
      </nav>

      {/* Active section */}
      <div className="min-w-0">
        {active === "ai" && <AiSection settings={settings} onChange={setSettings} />}
        {active === "integrations" && <IntegrationsSection />}
        {active === "compliance" && <ComplianceSection initialProfiles={initialProfiles} />}
        {active === "approvals" && <ApprovalsSection settings={settings} onChange={setSettings} />}
        {active === "notifications" && <NotificationsSection settings={settings} onChange={setSettings} />}
        {active === "organization" && <OrganizationSection settings={settings} onChange={setSettings} />}
        {active === "master-data" && <MasterDataSection />}
        {active === "appearance" && <AppearanceSection settings={settings} onChange={setSettings} />}
        {active === "members" && <MembersSection />}
        {active === "security" && <SecuritySection settings={settings} />}
      </div>
    </div>
  );
}
