import { Controller, Get, Post, Req, Res } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Request, Response } from "express";
import { createOAuthMiddleware } from "@trishuliam/oauth-client/express";

@Controller("auth")
export class AuthController {
  private readonly oauth;

  constructor(private readonly config: ConfigService) {
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
    return this.oauth.loginHandler(req, res, () => {
      res.redirect(this.config.get("WEB_URL", "http://localhost:3100"));
    });
  }

  @Get("callback")
  callback(@Req() req: Request, @Res() res: Response) {
    return this.oauth.callbackHandler(req, res, () => {
      res.redirect(this.config.get("WEB_URL", "http://localhost:3100"));
    });
  }

  @Post("logout")
  logout(@Req() req: Request, @Res() res: Response) {
    return this.oauth.logoutHandler(req, res, () => {
      res.json({ ok: true });
    });
  }

  @Get("me")
  me(@Req() req: Request, @Res() res: Response) {
    return this.oauth.userInfoHandler(req, res, () => {
      res.status(401).json({ error: "Not authenticated" });
    });
  }
}
