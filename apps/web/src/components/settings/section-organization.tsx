"use client";

import { useState } from "react";
import { Card, Field, inputClass } from "../ui";
import { SaveBar } from "./section-ai";
import { saveSettings } from "./save";
import type { Settings } from "./settings-view";

const TIMEZONES = [
  "UTC", "America/Los_Angeles", "America/Denver", "America/Chicago", "America/New_York",
  "Europe/London", "Europe/Berlin", "Asia/Kolkata", "Asia/Singapore", "Asia/Tokyo", "Australia/Sydney",
];

const DATE_FORMATS = [
  { id: "medium", label: "Jun 8, 2026" },
  { id: "short", label: "06/08/2026" },
  { id: "iso", label: "2026-06-08" },
];

export function OrganizationSection({ settings, onChange }: { settings: Settings; onChange: (s: Settings) => void }) {
  const [orgName, setOrgName] = useState(settings.orgName);
  const [timezone, setTimezone] = useState(settings.timezone);
  const [dateFormat, setDateFormat] = useState(settings.dateFormat);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("saving");
    try {
      const updated = await saveSettings({ orgName, timezone, dateFormat });
      onChange(updated as Settings);
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2500);
    } catch { setStatus("error"); }
  };

  return (
    <form onSubmit={save} className="space-y-5">
      <Card title="Organization">
        <Field label="Organization name">
          <input value={orgName} onChange={(e) => setOrgName(e.target.value)} className={inputClass} />
        </Field>
      </Card>
      <Card title="Locale">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Timezone">
            <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className={inputClass}>
              {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </Field>
          <Field label="Date format">
            <select value={dateFormat} onChange={(e) => setDateFormat(e.target.value)} className={inputClass}>
              {DATE_FORMATS.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
            </select>
          </Field>
        </div>
      </Card>
      <SaveBar status={status} />
    </form>
  );
}
