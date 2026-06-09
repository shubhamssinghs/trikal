import { Controller, Get, Post, Delete, Body, Param, Query, Res } from "@nestjs/common";
import { Response } from "express";
import { IntegrationsService } from "./integrations.service";
import { IntegrationSyncService } from "./integration-sync.service";
import { CalendarService } from "./calendar.service";
import type { GranolaScope } from "./granola.client";

const DEV_ORG_ID = "org_dev";
const WEB_URL = process.env.WEB_URL ?? "http://localhost:3100";

@Controller("integrations")
export class IntegrationsController {
  constructor(
    private readonly integrations: IntegrationsService,
    private readonly sync: IntegrationSyncService,
    private readonly calendar: CalendarService,
  ) {}

  // ── Google Calendar OAuth ──────────────────────────────────────────────────
  @Get("google/connect")
  googleConnect(@Res() res: Response) {
    res.redirect(this.calendar.googleConnectUrl(DEV_ORG_ID));
  }

  @Get("google/callback")
  async googleCallback(@Query("code") code: string, @Query("state") state: string, @Res() res: Response) {
    try {
      if (code) await this.calendar.handleGoogleCallback(code, state ?? "");
      res.redirect(`${WEB_URL}/settings?connected=google`);
    } catch {
      res.redirect(`${WEB_URL}/settings?error=google`);
    }
  }

  @Delete("google")
  googleDisconnect() {
    return this.calendar.disconnectGoogle(DEV_ORG_ID);
  }

  // ── Org connections ──────────────────────────────────────────────────────
  @Get()
  list() {
    return this.integrations.listConnections(DEV_ORG_ID);
  }

  @Post("granola")
  connectGranola(@Body("apiKey") apiKey: string) {
    return this.integrations.connectGranola(DEV_ORG_ID, apiKey);
  }

  @Post("granola/test")
  testGranola() {
    return this.integrations.testGranola(DEV_ORG_ID);
  }

  @Delete("granola")
  disconnectGranola() {
    return this.integrations.disconnect(DEV_ORG_ID);
  }

  @Get("granola/notes")
  notes(@Query("folderId") folderId?: string) {
    return this.integrations.listGranolaNotes(DEV_ORG_ID, folderId);
  }

  @Get("granola/folders")
  folders() {
    return this.integrations.listGranolaFolders(DEV_ORG_ID);
  }

  // ── Per-project links ──────────────────────────────────────────────────────
  @Get("projects/:projectId")
  projectLinks(@Param("projectId") projectId: string) {
    return this.integrations.listProjectLinks(projectId, DEV_ORG_ID);
  }

  @Post("projects/:projectId")
  upsertProjectLink(
    @Param("projectId") projectId: string,
    @Body() body: { enabled?: boolean; scope?: GranolaScope },
  ) {
    return this.integrations.upsertProjectLink(DEV_ORG_ID, projectId, body.enabled ?? true, body.scope ?? {});
  }

  @Delete("projects/links/:id")
  removeLink(@Param("id") id: string) {
    return this.integrations.removeProjectLink(id);
  }

  @Post("projects/links/:id/sync")
  syncNow(@Param("id") id: string) {
    return this.sync.syncProjectLink(id);
  }
}
