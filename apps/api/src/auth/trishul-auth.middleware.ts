import { Injectable, NestMiddleware, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Request, Response, NextFunction } from "express";
import { createOAuthMiddleware } from "@trishuliam/oauth-client/express";

@Injectable()
export class TrishulAuthMiddleware implements NestMiddleware {
  private readonly requireAuth: (req: Request, res: Response, next: NextFunction) => Promise<void>;

  constructor(private readonly config: ConfigService) {
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
    // Bypass auth in dev when OIDC issuer is not configured
    if (!this.config.get("OIDC_ISSUER") || this.config.get("NODE_ENV") === "development") {
      return next();
    }
    try {
      await this.requireAuth(req, res, next);
    } catch {
      throw new UnauthorizedException("Authentication required");
    }
  }
}
