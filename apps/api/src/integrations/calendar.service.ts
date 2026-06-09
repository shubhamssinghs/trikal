import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaClient, Prisma } from "@prisma/client";
import { GoogleCalendar, type CalendarEvent, type GoogleTokens } from "./google-calendar.client";

const GOOGLE = "google-calendar";

@Injectable()
export class CalendarService {
  constructor(private readonly prisma: PrismaClient) {}

  // ── Google OAuth ──────────────────────────────────────────────────────────
  googleConnectUrl(organizationId: string): string {
    if (!GoogleCalendar.configured()) throw new BadRequestException("Google is not configured (set GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET).");
    // state carries the org so the callback (no app session) can attribute it.
    return GoogleCalendar.authUrl(Buffer.from(JSON.stringify({ o: organizationId })).toString("base64url"));
  }

  async handleGoogleCallback(code: string, state: string) {
    let organizationId = "org_dev";
    try { organizationId = JSON.parse(Buffer.from(state, "base64url").toString()).o ?? organizationId; } catch { /* default */ }
    const tokens = await GoogleCalendar.exchangeCode(code);
    await this.prisma.integration.upsert({
      where: { organizationId_provider: { organizationId, provider: GOOGLE } },
      update: { credentials: tokens as unknown as Prisma.InputJsonValue, status: "connected", lastError: null },
      create: { organizationId, provider: GOOGLE, name: "Google Calendar", credentials: tokens as unknown as Prisma.InputJsonValue, status: "connected" },
    });
    return organizationId;
  }

  async disconnectGoogle(organizationId: string) {
    await this.prisma.integration.deleteMany({ where: { organizationId, provider: GOOGLE } });
    return { ok: true };
  }

  /** Return a valid Google access token, refreshing + persisting if expired. */
  private async googleAccessToken(organizationId: string): Promise<string | null> {
    const conn = await this.prisma.integration.findUnique({ where: { organizationId_provider: { organizationId, provider: GOOGLE } } });
    if (!conn) return null;
    const creds = conn.credentials as unknown as GoogleTokens;
    if (creds.expiresAt && creds.expiresAt - 60_000 > Date.now()) return creds.accessToken;
    if (!creds.refreshToken) return creds.accessToken ?? null;
    try {
      const refreshed = await GoogleCalendar.refresh(creds.refreshToken);
      await this.prisma.integration.update({ where: { id: conn.id }, data: { credentials: refreshed as unknown as Prisma.InputJsonValue, status: "connected", lastError: null } });
      return refreshed.accessToken;
    } catch (e) {
      await this.prisma.integration.update({ where: { id: conn.id }, data: { status: "error", lastError: e instanceof Error ? e.message : "refresh failed" } });
      return null;
    }
  }

  /** Upcoming meetings across connected calendars (Google today; Microsoft later). */
  async listUpcomingMeetings(organizationId: string, opts: { days?: number; max?: number } = {}): Promise<CalendarEvent[]> {
    const token = await this.googleAccessToken(organizationId);
    if (!token) return [];
    return GoogleCalendar.listEvents(token, opts).catch(() => []);
  }
}
