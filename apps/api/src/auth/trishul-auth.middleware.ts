import { Injectable, NestMiddleware } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Request, Response, NextFunction } from "express";
import { createOAuthMiddleware } from "@trishuliam/oauth-client/express";

function oidcConfigured(config: ConfigService): boolean {
  const issuer = config.get<string>("OIDC_ISSUER");
  return Boolean(issuer && !issuer.includes("your-trishul") && config.get("OIDC_CLIENT_ID"));
}

@Injectable()
export class TrishulAuthMiddleware implements NestMiddleware {
  private readonly requireAuth?: (req: Request, res: Response, next: NextFunction) => Promise<void>;

  constructor(private readonly config: ConfigService) {
    if (!oidcConfigured(config)) return; // open dev mode — no guard built
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
    // OIDC not configured → open dev mode, allow through
    if (!this.requireAuth) return next();
    try {
      await this.requireAuth(req, res, next);
    } catch {
      res.status(401).json({ error: "unauthorized", message: "Authentication required" });
    }
  }
}
