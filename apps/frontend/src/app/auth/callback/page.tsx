"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/lib/stores/auth";
import { apiClient } from "@/lib/api-client";
import { Skeleton } from "@/components/ui/skeleton";

function CallbackHandler() {
  const router = useRouter();
  const params = useSearchParams();
  const { setTokens, setUser } = useAuthStore();

  useEffect(() => {
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token") ?? "";
    const expiresIn = parseInt(params.get("expires_in") ?? "3600", 10);

    if (!accessToken) {
      router.replace("/login");
      return;
    }

    setTokens(accessToken, refreshToken, expiresIn);
    document.cookie = `trikal-auth-token=${accessToken}; path=/; max-age=${expiresIn}; SameSite=Lax`;

    apiClient
      .get("/me", { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((res) => {
        setUser(res.data.name ?? res.data.email, res.data.email);
      })
      .finally(() => {
        router.replace("/dashboard");
      });
  }, [params, router, setTokens, setUser]);

  return null;
}

export default function AuthCallbackPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-32" />
      <p className="text-sm text-muted-foreground">Signing you in…</p>
      <Suspense>
        <CallbackHandler />
      </Suspense>
    </div>
  );
}
