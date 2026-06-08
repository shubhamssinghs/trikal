"use client";

import { useState, useEffect } from "react";

// Pleasant, readable background colors for the initials fallback.
const PALETTE = ["#2563eb", "#7c3aed", "#db2777", "#dc2626", "#ea580c", "#d97706", "#16a34a", "#0891b2", "#4f46e5", "#0d9488"];

function initialsOf(name: string): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase() || "?";
}

function colorFor(seed: string): string {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

/** Gravatar photo by email; falls back to a colored initials avatar (generated). */
export function StakeholderAvatar({ name, email, size = 28 }: { name: string; email?: string; size?: number }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
    if (!email) { setUrl(null); return; }
    let cancelled = false;
    crypto.subtle
      .digest("SHA-256", new TextEncoder().encode(email.trim().toLowerCase()))
      .then((buf) => {
        const hex = [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
        if (!cancelled) setUrl(`https://www.gravatar.com/avatar/${hex}?d=404&s=${size * 2}`);
      });
    return () => { cancelled = true; };
  }, [email, size]);

  if (url && !failed) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name} onError={() => setFailed(true)} className="rounded-full object-cover shrink-0 border border-border" style={{ width: size, height: size }} />;
  }

  // Colored initials fallback
  return (
    <div
      className="rounded-full grid place-items-center shrink-0 font-semibold text-white"
      style={{ width: size, height: size, backgroundColor: colorFor(email || name || "?"), fontSize: Math.max(10, Math.round(size * 0.4)) }}
    >
      {initialsOf(name)}
    </div>
  );
}
