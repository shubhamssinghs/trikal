"use client";

import { useState, useEffect } from "react";

/** Gravatar avatar by email (SHA-256), falling back to an initial monogram. */
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

  const initial = (name?.trim()?.[0] ?? "?").toUpperCase();
  const style = { width: size, height: size };

  if (url && !failed) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name} onError={() => setFailed(true)} className="rounded-full object-cover shrink-0 border border-border" style={style} />;
  }
  return (
    <div className="rounded-full bg-surface-2 grid place-items-center text-xs text-foreground shrink-0 font-medium border border-border" style={style}>
      {initial}
    </div>
  );
}
