export const AFFILIATIONS = [
  { value: "client", label: "Client", color: "#3b82f6" },        // blue
  { value: "consultant", label: "Consultant", color: "#8b5cf6" }, // violet (you/us)
  { value: "vendor", label: "Vendor", color: "#f59e0b" },         // amber
  { value: "partner", label: "Partner", color: "#10b981" },       // emerald
  { value: "internal", label: "Internal", color: "#64748b" },     // slate
] as const;

export const AFFILIATION_OPTIONS = [
  { value: "", label: "— Unspecified —" },
  ...AFFILIATIONS.map((a) => ({ value: a.value, label: a.label })),
];

export function affiliationMeta(value?: string | null) {
  return AFFILIATIONS.find((a) => a.value === value);
}

/** Small colored pill for a stakeholder's affiliation (Client / Consultant / …). */
export function AffiliationBadge({ value }: { value?: string | null }) {
  const meta = affiliationMeta(value);
  if (!meta) return null;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset"
      style={{ color: meta.color, backgroundColor: `${meta.color}1a`, borderColor: `${meta.color}40` }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
      {meta.label}
    </span>
  );
}
