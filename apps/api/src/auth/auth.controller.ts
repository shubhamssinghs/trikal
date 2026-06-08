import { Controller, Get, Post, Req, Res } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Request, Response } from "express";
import { createOAuthMiddleware } from "@trishuliam/oauth-client/express";

type OAuthInstance = ReturnType<typeof createOAuthMiddleware>;

function oidcConfigured(config: ConfigService): boolean {
  const issuer = config.get<string>("OIDC_ISSUER");
  return Boolean(issuer && !issuer.includes("your-trishul") && config.get("OIDC_CLIENT_ID"));
}

@Controller("auth")
export class AuthController {
  private readonly oauth?: OAuthInstance;
  private readonly webUrl: string;

  constructor(private readonly config: ConfigService) {
    this.webUrl = this.config.get("WEB_URL", "http://localhost:3100");
    if (!oidcConfigured(config)) return;
    this.oauth = createOAuthMiddleware({
      issuer: this.config.getOrThrow("OIDC_ISSUER"),
      clientId: this.config.getOrThrow("OIDC_CLIENT_ID"),
      clientSecret: this.config.getOrThrow("OIDC_CLIENT_SECRET"),
      redirectUri: `${this.config.get("API_URL", "http://localhost:4000")}/api/v1/auth/callback`,
      sessionSecret: this.config.getOrThrow("JWT_SECRET"),
      cookieSecure: this.config.get("NODE_ENV") === "production",
      cookieSameSite: "lax",
    });
  }

  @Get("login")
  login(@Req() req: Request, @Res() res: Response) {
    if (!this.oauth) return res.redirect(this.webUrl);
    return this.oauth.loginHandler(req, res, () => res.redirect(this.webUrl));
  }

  @Get("callback")
  callback(@Req() req: Request, @Res() res: Response) {
    if (!this.oauth) return res.redirect(this.webUrl);
    return this.oauth.callbackHandler(req, res, () => res.redirect(this.webUrl));
  }

  @Post("logout")
  logout(@Req() req: Request, @Res() res: Response) {
    if (!this.oauth) return res.json({ ok: true });
    return this.oauth.logoutHandler(req, res, () => res.json({ ok: true }));
  }

  @Get("me")
  me(@Req() req: Request, @Res() res: Response) {
    // Open dev mode (no OIDC): report a synthetic dev user so the UI works
    if (!this.oauth) {
      return res.json({ sub: "user_dev", name: "Dev User", email: "dev@trikal.local", devMode: true });
    }
    return this.oauth.userInfoHandler(req, res, () => res.status(401).json({ error: "Not authenticated" }));
  }
}
