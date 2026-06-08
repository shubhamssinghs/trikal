import { Injectable, NestMiddleware } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Request, Response, NextFunction } from "express";
import { createOAuthMiddleware } from "@trishuliam/oauth-client/express";

function oidcConfigured(config: ConfigService): boolean {
  const issuer = config.get<string>("OIDC_ISSUER");
  return Boolean(issuer && !issuer.includes("your-trishul") && config.get("OIDC_CLIENT_ID"));
}

function extractToken(req: Request): string | null {
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  const sess = (req as Request & { session?: { accessToken?: string } }).session;
  return sess?.accessToken ?? null;
}

// Validated users cached per access token to avoid hitting the IdP userinfo
// endpoint on every request (that was costing seconds per page).
const USER_TTL_MS = 5 * 60 * 1000;
const userCache = new Map<string, { user: unknown; exp: number }>();

@Injectable()
export class TrishulAuthMiddleware implements NestMiddleware {
  private readonly requireAuth?: (req: Request, res: Response, next: NextFunction) => Promise<void>;

  constructor(private readonly config: ConfigService) {
    if (!oidcConfigured(config)) return;
    const oauthInstance = createOAuthMiddleware({
      issuer: this.config.getOrThrow("OIDC_ISSUER"),
      clientId: this.config.getOrThrow("OIDC_CLIENT_ID"),
      clientSecret: this.config.getOrThrow("OIDC_CLIENT_SECRET"),
      redirectUri: `${this.config.get("API_URL", "http://localhost:4000")}/api/v1/auth/callback`,
      sessionSecret: this.config.getOrThrow("JWT_SECRET"),
      cookieSecure: this.config.get("NODE_ENV") === "production",
      cookieSameSite: "lax",
    });
    this.requireAuth = oauthInstance.requireAuth() as (req: Request, res: Response, next: NextFunction) => Promise<void>;
  }

  async use(req: Request, res: Response, next: NextFunction) {
    if (!this.requireAuth) return next(); // open dev mode

    const token = extractToken(req);
    if (token) {
      const hit = userCache.get(token);
      if (hit && hit.exp > Date.now()) {
        (req as unknown as { user?: unknown }).user = hit.user;
        return next();
      }
    }

    // Cache miss → validate against the IdP once, then cache the result
    try {
      await this.requireAuth(req, res, () => {
        const user = (req as unknown as { user?: unknown }).user;
        if (token && user) {
          if (userCache.size > 1000) userCache.clear();
          userCache.set(token, { user, exp: Date.now() + USER_TTL_MS });
        }
        next();
      });
    } catch {
      res.status(401).json({ error: "unauthorized", message: "Authentication required" });
    }
  }
}
