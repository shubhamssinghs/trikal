"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Button, Field, inputClass } from "./ui";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

type Errors = { name?: string; website?: string };

export function CreateCompanyForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const validate = (): Errors => {
    const e: Errors = {};
    if (!name.trim()) e.name = "Company name is required.";
    else if (name.trim().length < 2) e.name = "Name must be at least 2 characters.";
    if (website && !/^https?:\/\/.+\..+/.test(website.trim()))
      e.website = "Enter a valid URL (https://example.com).";
    return e;
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    setTouched({ name: true, website: true });
    if (Object.keys(e).length) return;

    setLoading(true); setSubmitError("");
    try {
      const res = await fetch(`${API_BASE}/companies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined, website: website.trim() || undefined }),
      });
      if (!res.ok) throw new Error();
      const company = await res.json();
      router.push(`/companies/${company.id}`);
    } catch {
      setSubmitError("Failed to create company. Please try again.");
      setLoading(false);
    }
  };

  const err = (k: keyof Errors) => touched[k] && errors[k];

  return (
    <Card>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Company Name *">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, name: true }))}
            placeholder="Acme Healthcare"
            className={`${inputClass} ${err("name") ? "border-red-500 focus:border-red-500 focus:ring-red-500/40" : ""}`}
          />
          {err("name") && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
        </Field>

        <Field label="Description">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
            placeholder="Brief description of the company or client…" className={`${inputClass} resize-none`} />
        </Field>

        <Field label="Website">
          <input
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, website: true }))}
            placeholder="https://example.com"
            className={`${inputClass} ${err("website") ? "border-red-500 focus:border-red-500 focus:ring-red-500/40" : ""}`}
          />
          {err("website") && <p className="text-xs text-red-500 mt-1">{errors.website}</p>}
        </Field>

        {submitError && <p className="text-sm text-red-500">{submitError}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" disabled={loading}>{loading ? "Creating…" : "Create Company"}</Button>
        </div>
      </form>
    </Card>
  );
}
