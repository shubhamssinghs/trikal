export const AFFILIATIONS = [
  { value: "client", label: "Client", color: "#3b82f6", badge: "text-blue-600 dark:text-blue-400 bg-blue-500/10" },
  { value: "consultant", label: "Consultant", color: "#8b5cf6", badge: "text-violet-600 dark:text-violet-400 bg-violet-500/10" },
  { value: "vendor", label: "Vendor", color: "#f59e0b", badge: "text-amber-600 dark:text-amber-400 bg-amber-500/10" },
  { value: "partner", label: "Partner", color: "#10b981", badge: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10" },
  { value: "internal", label: "Internal", color: "#64748b", badge: "text-slate-600 dark:text-slate-300 bg-slate-500/10" },
] as const;

export const AFFILIATION_OPTIONS = [
  { value: "", label: "— Unspecified —" },
  ...AFFILIATIONS.map((a) => ({ value: a.value, label: a.label })),
];

export function affiliationMeta(value?: string | null) {
  return AFFILIATIONS.find((a) => a.value === value);
}

/** Clean tinted pill for a stakeholder's affiliation (Client / Consultant / …). */
export function AffiliationBadge({ value }: { value?: string | null }) {
  const meta = affiliationMeta(value);
  if (!meta) return null;
  return (
    <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold leading-none ${meta.badge}`}>
      {meta.label}
    </span>
  );
}
