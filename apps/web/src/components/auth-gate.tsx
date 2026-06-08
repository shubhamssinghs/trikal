"use client";

import { useAuth, login } from "@/lib/auth/use-auth";
import { TrikalLogo } from "./trikal-logo";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen grid place-items-center bg-background text-foreground px-4">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-surface shadow-sm p-8 text-center">
          <span className="grid place-items-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-sm mx-auto mb-5">
            <TrikalLogo className="w-9 text-white" />
          </span>
          <h1 className="text-xl font-semibold">Trikal</h1>
          <p className="text-sm text-muted mt-1 mb-6">AI Technical Manager Command Center</p>
          <button onClick={login}
            className="w-full rounded-lg bg-blue-600 hover:bg-blue-500 px-4 py-2.5 text-sm font-medium text-white transition-colors">
            Sign in with Trishul IAM
          </button>
          <p className="text-xs text-muted mt-4">You&apos;ll be redirected to your identity provider.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
