"use client";

import ReactSelect, { type StylesConfig, type GroupBase } from "react-select";

export type Option = { value: string; label: string };

// react-select styled with our theme tokens (CSS vars resolve per dark/light).
function buildStyles<IsMulti extends boolean>(): StylesConfig<Option, IsMulti, GroupBase<Option>> {
  const v = (name: string) => `rgb(var(${name}))`;
  return {
    control: (base, state) => ({
      ...base,
      backgroundColor: v("--surface-2"),
      borderColor: state.isFocused ? "#3b82f6" : v("--border"),
      borderRadius: 8,
      minHeight: 38,
      boxShadow: state.isFocused ? "0 0 0 1px rgba(59,130,246,0.4)" : "none",
      "&:hover": { borderColor: state.isFocused ? "#3b82f6" : v("--border") },
      fontSize: 14,
      transition: "border-color 120ms, box-shadow 120ms",
    }),
    valueContainer: (base) => ({ ...base, padding: "2px 10px" }),
    singleValue: (base) => ({ ...base, color: v("--foreground") }),
    input: (base) => ({ ...base, color: v("--foreground") }),
    placeholder: (base) => ({ ...base, color: v("--muted") }),
    menu: (base) => ({
      ...base,
      backgroundColor: v("--surface"),
      border: `1px solid ${v("--border")}`,
      borderRadius: 10,
      overflow: "hidden",
      boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
      zIndex: 60,
    }),
    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
    option: (base, state) => ({
      ...base,
      fontSize: 14,
      backgroundColor: state.isSelected
        ? "rgba(37,99,235,0.15)"
        : state.isFocused
          ? v("--surface-2")
          : "transparent",
      color: state.isSelected ? "#3b82f6" : v("--foreground"),
      cursor: "pointer",
      "&:active": { backgroundColor: v("--surface-2") },
    }),
    multiValue: (base) => ({ ...base, backgroundColor: v("--surface-2"), borderRadius: 6 }),
    multiValueLabel: (base) => ({ ...base, color: v("--foreground"), fontSize: 12 }),
    multiValueRemove: (base) => ({
      ...base,
      color: v("--muted"),
      "&:hover": { backgroundColor: "rgba(239,68,68,0.15)", color: "#ef4444" },
    }),
    indicatorSeparator: (base) => ({ ...base, backgroundColor: v("--border") }),
    dropdownIndicator: (base) => ({ ...base, color: v("--muted") }),
    clearIndicator: (base) => ({ ...base, color: v("--muted") }),
  };
}

const portalTarget = typeof document !== "undefined" ? document.body : undefined;

/** Single-select with our theme. value/onChange are plain strings. */
export function Select({
  options,
  value,
  onChange,
  placeholder = "Select…",
}: {
  options: Option[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const selected = options.find((o) => o.value === value) ?? null;
  return (
    <ReactSelect<Option, false>
      options={options}
      value={selected}
      onChange={(opt) => onChange(opt?.value ?? "")}
      placeholder={placeholder}
      isSearchable={options.length > 6}
      styles={buildStyles<false>()}
      menuPortalTarget={portalTarget}
      menuPlacement="auto"
    />
  );
}

/** Multi-select with our theme. value/onChange are string arrays. */
export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "Select…",
}: {
  options: Option[];
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const selected = options.filter((o) => value.includes(o.value));
  return (
    <ReactSelect<Option, true>
      isMulti
      options={options}
      value={selected}
      onChange={(opts) => onChange(opts.map((o) => o.value))}
      placeholder={placeholder}
      closeMenuOnSelect={false}
      styles={buildStyles<true>()}
      menuPortalTarget={portalTarget}
      menuPlacement="auto"
    />
  );
}
