"use client";

import { TrishulOAuthProvider } from "@trishuliam/oauth-client/react";

const issuer = process.env.NEXT_PUBLIC_OIDC_ISSUER ?? "";
const clientId = process.env.NEXT_PUBLIC_OIDC_CLIENT_ID ?? "";
const isConfigured = Boolean(issuer && clientId);

export function TrishulProvider({ children }: { children: React.ReactNode }) {
  if (!isConfigured) {
    // Auth not configured yet — render children without provider in dev
    return <>{children}</>;
  }

  const config = {
    issuer,
    clientId,
    redirectUri: typeof window !== "undefined"
      ? `${window.location.origin}/auth/callback`
      : "",
  };

  return (
    <TrishulOAuthProvider config={config}>
      {children}
    </TrishulOAuthProvider>
  );
}
