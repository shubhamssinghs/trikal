// Runtime enum-style objects required by @trishuliam/oauth-client at runtime
export const OAuthScope = {
  OPENID: "openid",
  PROFILE: "profile",
  EMAIL: "email",
  OFFLINE_ACCESS: "offline_access",
  ADDRESS: "address",
  PHONE: "phone",
} as const;

export const OAuthGrantType = {
  AUTHORIZATION_CODE: "authorization_code",
  REFRESH_TOKEN: "refresh_token",
  CLIENT_CREDENTIALS: "client_credentials",
  IMPLICIT: "implicit",
} as const;

export const OAuthResponseType = {
  CODE: "code",
  TOKEN: "token",
  ID_TOKEN: "id_token",
} as const;

export const OAuthTokenType = {
  BEARER: "Bearer",
  DPOP: "DPoP",
} as const;

// Type exports
export type OAuthScopeValue = typeof OAuthScope[keyof typeof OAuthScope];
export type OAuthGrantTypeValue = typeof OAuthGrantType[keyof typeof OAuthGrantType];
export type OAuthResponseTypeValue = typeof OAuthResponseType[keyof typeof OAuthResponseType];
export type OAuthTokenTypeValue = typeof OAuthTokenType[keyof typeof OAuthTokenType];

export interface OidcClaim {
  name: string;
  value?: string | string[] | number | boolean;
}

export interface OidcDiscoveryResponse {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint?: string;
  end_session_endpoint?: string;
  jwks_uri: string;
  response_types_supported: string[];
  subject_types_supported: string[];
  id_token_signing_alg_values_supported: string[];
  scopes_supported?: string[];
  token_endpoint_auth_methods_supported?: string[];
  claims_supported?: string[];
  grant_types_supported?: string[];
  code_challenge_methods_supported?: string[];
}

export interface OidcUserInfoClaims {
  sub: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  preferred_username?: string;
  email?: string;
  email_verified?: boolean;
  picture?: string;
  updated_at?: number;
  [key: string]: unknown;
}

export interface OAuthAccessTokenPayload {
  sub: string;
  iss: string;
  aud: string | string[];
  exp: number;
  iat: number;
  jti?: string;
  scope?: string;
  client_id?: string;
  [key: string]: unknown;
}

export interface IdTokenPayload extends OAuthAccessTokenPayload {
  nonce?: string;
  at_hash?: string;
  auth_time?: number;
  acr?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  preferred_username?: string;
  picture?: string;
}

export interface ParsedScopeResult {
  scopes: string[];
  raw: string;
}
