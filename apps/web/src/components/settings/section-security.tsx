"use client";

import { Card, Field, inputClass } from "../ui";
import type { Settings } from "./settings-view";

export function SecuritySection({ settings }: { settings: Settings }) {
  const configured = Boolean(settings.oidcIssuer && !settings.oidcIssuer.includes("your-trishul"));
  return (
    <div className="space-y-5">
      <Card title="Authentication (Trishul IAM / OIDC)">
        <div className={`rounded-lg border px-4 py-3 mb-4 ${configured ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"}`}>
          <p className="text-sm text-foreground">{configured ? "OIDC configured" : "OIDC not fully configured"}</p>
          <p className="text-xs text-muted mt-0.5">
            These come from server environment variables. When unset, the dashboard runs in open dev mode.
          </p>
        </div>
        <div className="space-y-4">
          <Field label="OIDC Issuer">
            <input value={settings.oidcIssuer || "—"} readOnly className={`${inputClass} opacity-70`} />
          </Field>
          <Field label="Client ID">
            <input value={settings.oidcClientId || "—"} readOnly className={`${inputClass} opacity-70`} />
          </Field>
          <Field label="Client Secret">
            <input value="•••••••• (server env)" readOnly className={`${inputClass} opacity-70`} />
          </Field>
        </div>
        <p className="text-xs text-muted mt-3">
          Set <code className="text-foreground">OIDC_ISSUER</code>, <code className="text-foreground">OIDC_CLIENT_ID</code>,
          and <code className="text-foreground">OIDC_CLIENT_SECRET</code> in the API environment to enable sign-in.
        </p>
      </Card>

      <Card title="Sessions">
        <p className="text-sm text-muted">Session management and active-device controls activate once OIDC sign-in is enabled.</p>
      </Card>
    </div>
  );
}
