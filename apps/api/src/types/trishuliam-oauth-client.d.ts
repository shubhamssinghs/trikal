import type { Request, Response, NextFunction } from "express";

declare module "@trishuliam/oauth-client/express" {
  interface SessionData {
    accessToken?: string;
    refreshToken?: string;
    tokenExpiry?: number;
    oauth_state?: string;
    oauth_redirect_uri?: string;
  }

  interface ExtendedRequest extends Request {
    session?: SessionData & { destroy: (cb: (err?: Error) => void) => void };
  }

  interface AuthenticatedRequest extends ExtendedRequest {
    user?: Record<string, unknown>;
    accessToken?: string;
  }

  interface MiddlewareOptions {
    scopes?: string[];
    allowPublic?: boolean;
  }

  interface OAuthMiddlewareConfig {
    issuer: string;
    clientId: string;
    clientSecret?: string;
    redirectUri?: string;
    sessionSecret?: string;
    cookieDomain?: string;
    cookieSecure?: boolean;
    cookieSameSite?: "strict" | "lax" | "none";
  }

  type Handler = (req: ExtendedRequest, res: Response, next: NextFunction) => Promise<void>;

  interface ExpressOAuthInstance {
    middleware(options?: MiddlewareOptions): Handler;
    requireAuth(options?: MiddlewareOptions): Handler;
    loginHandler: Handler;
    callbackHandler: Handler;
    logoutHandler: Handler;
    userInfoHandler: Handler;
  }

  export function createOAuthMiddleware(config: OAuthMiddlewareConfig): ExpressOAuthInstance;
  export function requireAuth(scopes?: string[]): Handler;
}
