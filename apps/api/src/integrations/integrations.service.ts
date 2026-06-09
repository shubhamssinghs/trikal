import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaClient, Prisma } from "@prisma/client";
import { GranolaClient, type GranolaScope } from "./granola.client";

const PROVIDER = "granola";

function shapeConnection(i: { id: string; provider: string; name: string; status: string; lastError: string | null; credentials: unknown; updatedAt: Date }) {
  const key = (i.credentials as { apiKey?: string } | null)?.apiKey ?? "";
  return {
    id: i.id, provider: i.provider, name: i.name, status: i.status, lastError: i.lastError,
    connected: !!key, keyHint: key ? `grn_…${key.slice(-4)}` : null, updatedAt: i.updatedAt,
  };
}

@Injectable()
export class IntegrationsService {
  constructor(private readonly prisma: PrismaClient) {}

  // ── Org-level connections ────────────────────────────────────────────────
  async listConnections(organizationId: string) {
    const rows = await this.prisma.integration.findMany({ where: { organizationId }, orderBy: { provider: "asc" } });
    return rows.map(shapeConnection);
  }

  private granolaClientFor(apiKey: string) {
    return new GranolaClient(apiKey);
  }

  /** Create/update the Granola connection. Tests the key before persisting status. */
  async connectGranola(organizationId: string, apiKey: string) {
    if (!apiKey?.trim() || !apiKey.startsWith("grn_")) throw new BadRequestException("Enter a valid Granola API key (starts with grn_).");
    const probe = await this.granolaClientFor(apiKey.trim()).test();
    const data = {
      organizationId, provider: PROVIDER, name: "Granola",
      credentials: { apiKey: apiKey.trim() } as Prisma.InputJsonValue,
      status: probe.ok ? "connected" : "error",
      lastError: probe.ok ? null : probe.error ?? "Connection failed",
    };
    const conn = await this.prisma.integration.upsert({
      where: { organizationId_provider: { organizationId, provider: PROVIDER } },
      update: { credentials: data.credentials, status: data.status, lastError: data.lastError },
      create: data,
    });
    return { ...shapeConnection(conn), testOk: probe.ok, testError: probe.error };
  }

  async testGranola(organizationId: string) {
    const conn = await this.requireConnection(organizationId);
    const apiKey = (conn.credentials as { apiKey?: string }).apiKey ?? "";
    const probe = await this.granolaClientFor(apiKey).test();
    await this.prisma.integration.update({ where: { id: conn.id }, data: { status: probe.ok ? "connected" : "error", lastError: probe.ok ? null : probe.error } });
    return probe;
  }

  async disconnect(organizationId: string) {
    await this.prisma.integration.deleteMany({ where: { organizationId, provider: PROVIDER } });
    return { ok: true };
  }

  private async requireConnection(organizationId: string) {
    const conn = await this.prisma.integration.findUnique({ where: { organizationId_provider: { organizationId, provider: PROVIDER } } });
    if (!conn) throw new NotFoundException("Granola is not connected. Add an API key in Settings → Integrations.");
    return conn;
  }

  /** List recent Granola notes (for the per-project mapping picker). */
  async listGranolaNotes(organizationId: string) {
    const conn = await this.requireConnection(organizationId);
    const apiKey = (conn.credentials as { apiKey?: string }).apiKey ?? "";
    const notes = await this.granolaClientFor(apiKey).listNotes(null, 100);
    return notes.map((n) => ({ id: n.id, title: n.title ?? "Untitled", summary: "", owner: n.owner?.email ?? n.owner?.name ?? "", created: n.created_at ?? null }));
  }

  // ── Per-project links ────────────────────────────────────────────────────
  async listProjectLinks(projectId: string, organizationId: string) {
    await this.assertProject(projectId, organizationId);
    return this.prisma.projectIntegration.findMany({ where: { projectId }, orderBy: { provider: "asc" } });
  }

  async upsertProjectLink(organizationId: string, projectId: string, enabled: boolean, scope: GranolaScope) {
    await this.assertProject(projectId, organizationId);
    const conn = await this.requireConnection(organizationId);
    return this.prisma.projectIntegration.upsert({
      where: { projectId_integrationId: { projectId, integrationId: conn.id } },
      update: { enabled, scope: (scope ?? {}) as Prisma.InputJsonValue },
      create: { projectId, integrationId: conn.id, provider: PROVIDER, enabled, scope: (scope ?? {}) as Prisma.InputJsonValue },
    });
  }

  async removeProjectLink(id: string) {
    await this.prisma.projectIntegration.delete({ where: { id } }).catch(() => {});
    return { ok: true };
  }

  private async assertProject(projectId: string, organizationId: string) {
    const p = await this.prisma.project.findFirst({ where: { id: projectId, organizationId } });
    if (!p) throw new NotFoundException("Project not found");
    return p;
  }
}
