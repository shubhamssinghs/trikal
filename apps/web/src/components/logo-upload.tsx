"use client";

import { useRef, useState } from "react";
import { Building2, Upload, X } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

/**
 * Logo picker. In "deferred" mode (no companyId yet, e.g. create form) it holds
 * the File and shows a local preview; the parent uploads after the company is
 * created via `uploadLogo(companyId, file)`. In "immediate" mode (companyId
 * provided) it uploads straight to the API.
 */
export function LogoUpload({
  companyId,
  existing,
  onFileSelected,
}: {
  companyId?: string;
  existing?: boolean;
  onFileSelected?: (file: File | null) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(
    companyId && existing ? `${API_BASE}/companies/${companyId}/logo?v=${Date.now()}` : null
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const pick = () => ref.current?.click();

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setError("");
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError("Image must be under 5 MB."); return; }

    // local preview
    setPreview(URL.createObjectURL(file));

    if (companyId) {
      // immediate upload
      setBusy(true);
      try {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch(`${API_BASE}/companies/${companyId}/logo`, { method: "POST", body: form });
        if (!res.ok) throw new Error();
        setPreview(`${API_BASE}/companies/${companyId}/logo?v=${Date.now()}`);
      } catch {
        setError("Upload failed.");
      } finally {
        setBusy(false);
      }
    } else {
      onFileSelected?.(file);
    }
  };

  const clear = async () => {
    setPreview(null);
    onFileSelected?.(null);
    if (ref.current) ref.current.value = "";
    if (companyId && existing) {
      await fetch(`${API_BASE}/companies/${companyId}/logo`, { method: "DELETE" }).catch(() => {});
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <button type="button" onClick={pick}
          className="grid place-items-center w-16 h-16 rounded-xl border border-border bg-surface-2 overflow-hidden hover:border-blue-500/40 transition-colors">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Logo" className="w-full h-full object-cover" />
          ) : (
            <Building2 size={22} className="text-muted" />
          )}
        </button>
        {preview && (
          <button type="button" onClick={clear}
            className="absolute -top-1.5 -right-1.5 grid place-items-center w-5 h-5 rounded-full bg-red-600 text-white shadow">
            <X size={12} />
          </button>
        )}
      </div>

      <div>
        <button type="button" onClick={pick} disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-xs text-foreground hover:bg-border transition-colors disabled:opacity-50">
          <Upload size={13} /> {busy ? "Uploading…" : preview ? "Replace logo" : "Upload logo"}
        </button>
        <p className="text-xs text-muted mt-1">PNG, JPG, WebP or SVG · optional · auto-cropped to a square</p>
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </div>

      <input ref={ref} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={onChange} className="hidden" />
    </div>
  );
}

/** Uploads a deferred logo file after a company is created. */
export async function uploadLogo(companyId: string, file: File) {
  const form = new FormData();
  form.append("file", file);
  await fetch(`${API_BASE}/companies/${companyId}/logo`, { method: "POST", body: form }).catch(() => {});
}

/** Display a company logo with a fallback icon. */
export function CompanyLogo({ companyId, hasLogo, size = 40 }: { companyId: string; hasLogo?: boolean; size?: number }) {
  if (!hasLogo) {
    return (
      <div className="grid place-items-center rounded-lg bg-surface-2 text-muted shrink-0" style={{ width: size, height: size }}>
        <Building2 size={size * 0.45} />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`${API_BASE}/companies/${companyId}/logo`}
      alt=""
      className="rounded-lg object-cover shrink-0 border border-border"
      style={{ width: size, height: size }}
    />
  );
}
