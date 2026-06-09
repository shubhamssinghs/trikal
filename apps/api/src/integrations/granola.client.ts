const BASE_URL = "https://public-api.granola.ai/v1";

export interface GranolaNoteSummary {
  id: string;
  title?: string;
  owner?: { name?: string; email?: string };
  created_at?: string;
  updated_at?: string;
}

export interface GranolaTranscriptItem {
  text?: string;
  start_time?: string;
  end_time?: string;
  speaker?: { source?: string; diarization_label?: string };
}

export interface GranolaNote extends GranolaNoteSummary {
  web_url?: string;
  summary_text?: string;
  summary_markdown?: string;
  attendees?: Array<{ name?: string; email?: string }>;
  calendar_event?: {
    event_title?: string;
    organiser?: string;
    invitees?: Array<{ email?: string }>;
    scheduled_start_time?: string;
    scheduled_end_time?: string;
    calendar_event_id?: string;
  };
  folder_membership?: Array<{ folder_id?: string; id?: string; name?: string } | string>;
  transcript?: GranolaTranscriptItem[];
}

export interface GranolaScope {
  mode?: "all" | "selective";
  keywords?: string[];
  ownerDomains?: string[];
  folderIds?: string[];
  noteIds?: string[];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Thin client for the official Granola REST API (Bearer grn_ key). */
export class GranolaClient {
  constructor(private readonly apiKey: string) {}

  private get headers() {
    return { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" };
  }

  async test(): Promise<{ ok: boolean; error?: string }> {
    if (!this.apiKey) return { ok: false, error: "Missing API key" };
    try {
      const res = await fetch(`${BASE_URL}/notes`, { headers: this.headers });
      if (res.status === 401 || res.status === 403) return { ok: false, error: "Invalid or unauthorized Granola API key" };
      if (!res.ok) return { ok: false, error: `Granola API error ${res.status}` };
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  /** List notes created after `since`, following the cursor (minimal fields). */
  async listNotes(since?: Date | null, max = 200): Promise<GranolaNoteSummary[]> {
    const out: GranolaNoteSummary[] = [];
    let cursor: string | undefined;
    for (let page = 0; page < 25 && out.length < max; page++) {
      const params = new URLSearchParams();
      if (since) params.set("created_after", since.toISOString());
      if (cursor) params.set("cursor", cursor);
      const res = await fetch(`${BASE_URL}/notes?${params.toString()}`, { headers: this.headers });
      if (!res.ok) throw new Error(`Granola /notes ${res.status}`);
      const body = (await res.json()) as { notes?: GranolaNoteSummary[]; data?: GranolaNoteSummary[]; hasMore?: boolean; cursor?: string };
      out.push(...(body.notes ?? body.data ?? []));
      if (!body.hasMore || !body.cursor) break;
      cursor = body.cursor;
      await sleep(220);
    }
    return out;
  }

  /** Full note detail incl. AI summary, attendees, calendar, folder, and transcript. */
  async getNote(noteId: string): Promise<GranolaNote> {
    const res = await fetch(`${BASE_URL}/notes/${noteId}?include=transcript`, { headers: this.headers });
    if (!res.ok) throw new Error(`Granola /notes/${noteId} ${res.status}`);
    return (await res.json()) as GranolaNote;
  }
}

/** Structured metadata we persist per meeting (and surface in the dashboard). */
export function buildNoteMetadata(note: GranolaNote) {
  const ce = note.calendar_event;
  return {
    provider: "granola" as const,
    webUrl: note.web_url ?? null,
    organiser: ce?.organiser ?? null,
    attendees: (note.attendees ?? []).map((a) => ({ name: a.name ?? null, email: a.email ?? null })),
    invitees: (ce?.invitees ?? []).map((i) => i.email).filter(Boolean),
    scheduledStart: ce?.scheduled_start_time ?? note.created_at ?? null,
    scheduledEnd: ce?.scheduled_end_time ?? null,
    calendarEventId: ce?.calendar_event_id ?? null,
    createdAt: note.created_at ?? null,
  };
}

/**
 * Build the ingestable text. A short context header (title, date, attendees)
 * is embedded with the content so the AI can answer "who/when" questions, then
 * the AI notes (high-signal) and the raw spoken transcript.
 */
export function buildNoteContent(note: GranolaNote): string {
  const parts: string[] = [];
  const m = buildNoteMetadata(note);
  const header: string[] = [`# ${note.title ?? "Meeting"}`, `Source: Granola meeting`];
  if (m.scheduledStart) header.push(`When: ${m.scheduledStart}${m.scheduledEnd ? ` – ${m.scheduledEnd}` : ""}`);
  const people = m.attendees.map((a) => a.name || a.email).filter(Boolean);
  if (people.length) header.push(`Attendees: ${people.join(", ")}`);
  if (m.organiser) header.push(`Organiser: ${m.organiser}`);
  parts.push(header.join("\n"));

  const ai = note.summary_markdown || note.summary_text;
  if (ai) parts.push(`## AI Notes\n${ai}`);
  const lines = (note.transcript ?? [])
    .map((t) => {
      const who = t.speaker?.diarization_label || (t.speaker?.source === "microphone" ? "Me" : "Participant");
      return `${who}: ${(t.text ?? "").trim()}`;
    })
    .filter((l) => l.length > 3);
  if (lines.length) parts.push(`## Transcript\n${lines.join("\n")}`);
  return parts.join("\n\n");
}

/** Best occurred-at: scheduled meeting start, else created_at. */
export function noteOccurredAt(note: GranolaNote): Date | null {
  const t = note.calendar_event?.scheduled_start_time || note.created_at;
  return t ? new Date(t) : null;
}

/** Whether a note (full detail) matches a project's scope rules. Default: include all. */
export function noteMatchesScope(note: GranolaNote, scope: GranolaScope | undefined | null): boolean {
  if (!scope || scope.mode !== "selective") return true;
  const hay = `${note.title ?? ""} ${note.summary_text ?? ""} ${note.summary_markdown ?? ""}`.toLowerCase();
  const kw = (scope.keywords ?? []).some((k) => k && hay.includes(k.toLowerCase()));

  const emails = [
    note.owner?.email,
    ...(note.attendees ?? []).map((a) => a.email),
    ...(note.calendar_event?.invitees ?? []).map((i) => i.email),
    note.calendar_event?.organiser,
  ].filter(Boolean).map((e) => (e as string).toLowerCase());
  const dom = (scope.ownerDomains ?? []).some((d) => {
    const needle = `@${d.toLowerCase().replace(/^@/, "")}`;
    return emails.some((e) => e.endsWith(needle));
  });

  const folders = (note.folder_membership ?? []).map((f) => (typeof f === "string" ? f : f.folder_id || f.id || ""));
  const folder = (scope.folderIds ?? []).some((f) => f && folders.includes(f));

  const picked = (scope.noteIds ?? []).includes(note.id);
  return kw || dom || folder || picked;
}
