const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
const SCOPES = ["openid", "email", "https://www.googleapis.com/auth/calendar.readonly"];

export interface CalendarEvent {
  id: string;
  title: string;
  start: string | null;
  end: string | null;
  attendees: { email?: string; name?: string; responseStatus?: string }[];
  organizer?: string;
  location?: string;
  joinUrl?: string;
  description?: string;
}

export interface GoogleTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number; // epoch ms
  scope?: string;
}

/** Google OAuth2 + Calendar (read-only) client. */
export const GoogleCalendar = {
  configured(): boolean {
    return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  },

  redirectUri(): string {
    return `${process.env.API_URL ?? "http://localhost:4000"}/api/v1/integrations/google/callback`;
  },

  authUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      redirect_uri: this.redirectUri(),
      response_type: "code",
      scope: SCOPES.join(" "),
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
      state,
    });
    return `${AUTH_URL}?${params.toString()}`;
  },

  async exchangeCode(code: string): Promise<GoogleTokens> {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID ?? "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
        redirect_uri: this.redirectUri(),
        grant_type: "authorization_code",
      }),
    });
    if (!res.ok) throw new Error(`Google token exchange failed: ${res.status} ${await res.text().catch(() => "")}`);
    const t = (await res.json()) as { access_token: string; refresh_token?: string; expires_in: number; scope?: string };
    return { accessToken: t.access_token, refreshToken: t.refresh_token, expiresAt: Date.now() + t.expires_in * 1000, scope: t.scope };
  },

  async refresh(refreshToken: string): Promise<GoogleTokens> {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: process.env.GOOGLE_CLIENT_ID ?? "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
        grant_type: "refresh_token",
      }),
    });
    if (!res.ok) throw new Error(`Google token refresh failed: ${res.status}`);
    const t = (await res.json()) as { access_token: string; expires_in: number; scope?: string };
    return { accessToken: t.access_token, refreshToken, expiresAt: Date.now() + t.expires_in * 1000, scope: t.scope };
  },

  async listEvents(accessToken: string, opts: { days?: number; max?: number } = {}): Promise<CalendarEvent[]> {
    const now = new Date();
    const timeMax = new Date(now.getTime() + (opts.days ?? 7) * 86400_000);
    const params = new URLSearchParams({
      timeMin: now.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: String(opts.max ?? 20),
    });
    const res = await fetch(`${EVENTS_URL}?${params.toString()}`, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) throw new Error(`Google events ${res.status}`);
    const body = (await res.json()) as { items?: GoogleRawEvent[] };
    return (body.items ?? []).map(normalize);
  },
};

interface GoogleRawEvent {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  hangoutLink?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  organizer?: { email?: string };
  attendees?: { email?: string; displayName?: string; responseStatus?: string }[];
  conferenceData?: { entryPoints?: { uri?: string }[] };
}

function normalize(e: GoogleRawEvent): CalendarEvent {
  return {
    id: e.id,
    title: e.summary ?? "(no title)",
    start: e.start?.dateTime ?? e.start?.date ?? null,
    end: e.end?.dateTime ?? e.end?.date ?? null,
    attendees: (e.attendees ?? []).map((a) => ({ email: a.email, name: a.displayName, responseStatus: a.responseStatus })),
    organizer: e.organizer?.email,
    location: e.location,
    joinUrl: e.hangoutLink ?? e.conferenceData?.entryPoints?.find((p) => p.uri)?.uri,
    description: e.description,
  };
}
