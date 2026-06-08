/** Tinted pill for a stakeholder's affiliation. Color comes from the DB record. */
export function AffiliationBadge({ label, color }: { label?: string | null; color?: string | null }) {
  if (!label) return null;
  const c = color || "#64748b";
  return (
    <span
      className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold leading-none"
      style={{ color: c, backgroundColor: `${c}1f` }}
    >
      {label}
    </span>
  );
}
