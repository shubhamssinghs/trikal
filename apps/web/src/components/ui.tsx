"use client";

import Link from "next/link";
import { X } from "lucide-react";

/* ── Card ──────────────────────────────────────────────────────────────── */

export function Card({
  children,
  className = "",
  title,
  action,
  accent,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
  action?: React.ReactNode;
  accent?: "default" | "blue" | "amber";
}) {
  const ring =
    accent === "blue" ? "border-blue-500/30" : accent === "amber" ? "border-amber-500/30" : "border-border";
  return (
    <section className={`rounded-xl border ${ring} bg-surface shadow-sm ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
          {title && <h2 className="text-sm font-semibold text-foreground">{title}</h2>}
          {action}
        </div>
      )}
      <div className={title || action ? "px-4 pb-4" : "p-4"}>{children}</div>
    </section>
  );
}

/* ── PageHeader ────────────────────────────────────────────────────────── */

export function PageHeader({
  title,
  subtitle,
  backHref,
  backLabel,
  actions,
  meta,
  icon,
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  actions?: React.ReactNode;
  meta?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      {backHref && (
        <Link href={backHref} className="text-xs text-muted hover:text-foreground transition-colors">
          ← {backLabel ?? "Back"}
        </Link>
      )}
      <div className="flex items-start justify-between gap-4 mt-1">
        <div className="flex items-start gap-3 min-w-0">
          {icon && <div className="mt-0.5 shrink-0">{icon}</div>}
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
            {subtitle && <p className="text-sm text-muted mt-1">{subtitle}</p>}
            {meta && <div className="mt-2">{meta}</div>}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </div>
  );
}

/* ── Button ────────────────────────────────────────────────────────────── */

type Variant = "primary" | "secondary" | "danger" | "ghost";
const variants: Record<Variant, string> = {
  primary: "bg-blue-600 hover:bg-blue-500 text-white",
  secondary: "bg-surface-2 hover:bg-border text-foreground border border-border",
  danger: "bg-red-600 hover:bg-red-500 text-white",
  ghost: "text-muted hover:text-foreground hover:bg-surface-2",
};

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

/* ── Modal ─────────────────────────────────────────────────────────────── */

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-[fadeIn_120ms_ease-out]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-border bg-surface shadow-2xl animate-[scaleIn_140ms_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <button onClick={onClose} className="text-muted hover:text-foreground transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

/* ── Form field ────────────────────────────────────────────────────────── */

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted mb-1.5">{label}</label>
      {children}
    </div>
  );
}

export const inputClass =
  "w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground placeholder-muted focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 focus:outline-none transition-colors";

/* ── StatusBadge ───────────────────────────────────────────────────────── */

const statusStyles: Record<string, string> = {
  ACTIVE: "bg-emerald-500/15 text-emerald-500 ring-emerald-500/30",
  AT_RISK: "bg-amber-500/15 text-amber-500 ring-amber-500/30",
  ON_HOLD: "bg-surface-2 text-muted ring-border",
  COMPLETED: "bg-blue-500/15 text-blue-500 ring-blue-500/30",
  ARCHIVED: "bg-surface-2 text-muted ring-border",
};

export function StatusBadge({ status }: { status: string }) {
  const cls = statusStyles[status] ?? statusStyles.ON_HOLD;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${cls}`}>
      {status.replace("_", " ")}
    </span>
  );
}

/* ── EmptyState ────────────────────────────────────────────────────────── */

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface/50 px-6 py-12 text-center">
      {icon && <div className="mb-3 text-muted">{icon}</div>}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && <p className="text-sm text-muted mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
