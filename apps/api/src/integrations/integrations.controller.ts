import { Controller, Get, Post, Delete, Body, Param, Query } from "@nestjs/common";
import { IntegrationsService } from "./integrations.service";
import { IntegrationSyncService } from "./integration-sync.service";
import type { GranolaScope } from "./granola.client";

const DEV_ORG_ID = "org_dev";

@Controller("integrations")
export class IntegrationsController {
  constructor(
    private readonly integrations: IntegrationsService,
    private readonly sync: IntegrationSyncService,
  ) {}

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
