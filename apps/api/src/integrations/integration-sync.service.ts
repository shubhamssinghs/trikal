import { Injectable, Logger, NotFoundException, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { KnowledgeService } from "../knowledge/knowledge.service";
import { Prisma } from "@prisma/client";
import { GranolaClient, noteMatchesScope, buildNoteContent, buildNoteMetadata, noteOccurredAt, type GranolaScope } from "./granola.client";

const SYNC_INTERVAL_MS = 30 * 60 * 1000; // poll due projects every 30 min
const MAX_NOTES_PER_SYNC = 50;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

@Injectable()
export class IntegrationSyncService implements OnModuleInit {
  private readonly logger = new Logger(IntegrationSyncService.name);

  constructor(
    private readonly prisma: PrismaClient,
    private readonly knowledge: KnowledgeService,
  ) {}

  onModuleInit() {
    // Lightweight scheduler (no extra dep): periodically sync enabled links.
    setInterval(() => {
      this.syncAllDue().catch((e) => this.logger.error(`Scheduled sync failed: ${e instanceof Error ? e.message : e}`));
    }, SYNC_INTERVAL_MS).unref?.();
  }

  /** Sync every enabled project link (called by the scheduler). */
  async syncAllDue() {
    const links = await this.prisma.projectIntegration.findMany({ where: { enabled: true, provider: "granola" } });
    for (const link of links) {
      await this.syncProjectLink(link.id).catch((e) => this.logger.warn(`Sync ${link.id}: ${e instanceof Error ? e.message : e}`));
      await sleep(500);
    }
    return { synced: links.length };
  }

  /** Pull new Granola notes for one project link, ingest into the knowledge base. */
  async syncProjectLink(linkId: string) {
    const link = await this.prisma.projectIntegration.findUnique({ where: { id: linkId }, include: { integration: true, project: { select: { organizationId: true } } } });
    if (!link) throw new NotFoundException("Project integration not found");
    const apiKey = (link.integration.credentials as { apiKey?: string }).apiKey ?? "";
    const organizationId = link.project.organizationId;
    if (!apiKey) {
      await this.finish(linkId, "error", 0, "Granola connection has no API key");
      return { ingested: 0, error: "no_api_key" };
    }

    const client = new GranolaClient(apiKey);
    const scope = (link.scope ?? {}) as GranolaScope;
    let ingested = 0;
    try {
      const notes = await client.listNotes(link.lastSyncedAt, 200);

      for (const summary of notes) {
        if (ingested >= MAX_NOTES_PER_SYNC) break;
        // Dedupe first: skip notes already ingested for this project (avoids refetch).
        const existing = await this.prisma.meetingTranscript.findFirst({
          where: { projectId: link.projectId, source: "granola", externalId: summary.id },
          select: { id: true },
        });
        if (existing) continue;

        // Fetch full detail (AI notes + attendees/folder/calendar + transcript), then scope-match.
        const note = await client.getNote(summary.id).catch(() => null);
        await sleep(220);
        if (!note) continue;
        if (!noteMatchesScope(note, scope)) continue;

        const text = buildNoteContent(note);
        if (!text.trim()) continue;

        const transcript = await this.prisma.meetingTranscript.create({
          data: {
            projectId: link.projectId,
            title: note.title ?? "Granola meeting",
            rawContent: text,
            occurredAt: noteOccurredAt(note),
            source: "granola",
            externalId: note.id,
            metadata: buildNoteMetadata(note) as unknown as Prisma.InputJsonValue,
          },
        });
        await this.knowledge.ingestTranscript(transcript.id, organizationId).catch((e) =>
          this.logger.warn(`Ingest ${transcript.id} failed: ${e instanceof Error ? e.message : e}`),
        );
        ingested++;
        await sleep(220); // rate-limit friendly
      }

      await this.finish(linkId, "ok", ingested);
      return { ingested };
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      this.logger.error(`Granola sync ${linkId} failed: ${err}`);
      await this.finish(linkId, "error", ingested, err);
      return { ingested, error: err };
    }
  }

  private async finish(linkId: string, status: string, count: number, error?: string) {
    await this.prisma.projectIntegration.update({
      where: { id: linkId },
      data: { lastSyncedAt: new Date(), lastSyncStatus: error ? `${status}: ${error.slice(0, 200)}` : status, lastSyncCount: count },
    });
  }
}
