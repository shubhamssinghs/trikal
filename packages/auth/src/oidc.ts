export interface OidcClaims {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
  organization_id?: string;
}

export interface AuthTokenPayload {
  sub: string;
  email: string;
  organizationId: string;
  roles: string[];
  iat: number;
  exp: number;
}
