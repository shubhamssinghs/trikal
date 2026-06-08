"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Company } from "@/lib/api/queries";
import { Card, Button, Field, inputClass } from "./ui";
import { Select } from "./select";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

const COMPLIANCE_PROFILES = [
  { id: "", label: "Standard (default)" },
  { id: "cp_hipaa", label: "HIPAA / PHI Sensitive" },
];

type Errors = { name?: string; companyId?: string; dates?: string };

export function CreateProjectForm({ companies }: { companies: Company[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? "");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [targetEndDate, setTargetEndDate] = useState("");
  const [complianceProfileId, setComplianceProfileId] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const validate = (): Errors => {
    const e: Errors = {};
    if (!name.trim()) e.name = "Project name is required.";
    else if (name.trim().length < 2) e.name = "Name must be at least 2 characters.";
    if (!companyId) e.companyId = "Select a company.";
    if (startDate && targetEndDate && new Date(targetEndDate) < new Date(startDate))
      e.dates = "Target end date must be after the start date.";
    return e;
  };

  if (companies.length === 0) {
    return (
      <Card>
        <p className="text-sm text-muted">
          You need a company first.{" "}
          <a href="/companies/new" className="text-blue-500 hover:underline">Create a company</a> to add a project.
        </p>
      </Card>
    );
  }

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    setTouched({ name: true, companyId: true, dates: true });
    if (Object.keys(e).length) return;

    setLoading(true); setSubmitError("");
    try {
      const res = await fetch(`${API_BASE}/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(), companyId,
          description: description.trim() || undefined,
          startDate: startDate ? new Date(startDate).toISOString() : undefined,
          targetEndDate: targetEndDate ? new Date(targetEndDate).toISOString() : undefined,
          complianceProfileId: complianceProfileId || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      const project = await res.json();
      router.push(`/projects/${project.id}`);
    } catch {
      setSubmitError("Failed to create project. Please try again.");
      setLoading(false);
    }
  };

  const err = (k: keyof Errors) => touched[k] && errors[k];

  return (
    <Card>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Project Name *">
          <input value={name} onChange={(e) => setName(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, name: true }))}
            placeholder="Patient Portal Modernization"
            className={`${inputClass} ${err("name") ? "border-red-500 focus:border-red-500 focus:ring-red-500/40" : ""}`} />
          {err("name") && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
        </Field>

        <Field label="Company *">
          <Select value={companyId} onChange={setCompanyId} options={companies.map((c) => ({ value: c.id, label: c.name }))} placeholder="Select a company…" />
          {err("companyId") && <p className="text-xs text-red-500 mt-1">{errors.companyId}</p>}
        </Field>

        <Field label="Description">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
            placeholder="What is this project about?" className={`${inputClass} resize-none`} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Start Date">
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Target End">
            <input type="date" value={targetEndDate} onChange={(e) => setTargetEndDate(e.target.value)} className={inputClass} />
          </Field>
        </div>
        {err("dates") && <p className="text-xs text-red-500 -mt-2">{errors.dates}</p>}

        <Field label="Compliance Profile">
          <Select value={complianceProfileId} onChange={setComplianceProfileId} options={COMPLIANCE_PROFILES.map((p) => ({ value: p.id, label: p.label }))} />
        </Field>

        {submitError && <p className="text-sm text-red-500">{submitError}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" disabled={loading}>{loading ? "Creating…" : "Create Project"}</Button>
        </div>
      </form>
    </Card>
  );
}
