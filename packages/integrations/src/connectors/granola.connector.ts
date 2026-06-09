import type { Connector, ConnectorConfig, SyncContext, SyncResult, NormalizedEvent, ExternalAction, ActionResult } from "../connector.interface";

const BASE_URL = "https://public-api.granola.ai/v1";

/** A Granola note as returned by GET /notes. */
export interface GranolaNote {
  id: string;
  title?: string;
  summary?: string;
  owner?: { name?: string; email?: string };
  created?: string;
  updated?: string;
  // Best-effort / undocumented fields used for mapping when present:
  folder_id?: string;
  folderId?: string;
  attendees?: Array<{ name?: string; email?: string }>;
}

export interface GranolaTranscriptItem {
  speaker?: { source?: string; diarization_label?: string };
  text?: string;
}

/** Per-project mapping rules stored on ProjectIntegration.scope. */
export interface GranolaScope {
  mode?: "all" | "selective";
  keywords?: string[];
  ownerDomains?: string[];
  folderIds?: string[];
  noteIds?: string[];
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Granola connector — official REST API (Bearer grn_ key). Poll-based:
 * list notes since `since`, then fetch each note's transcript. Honors the
 * 5 req/s rate limit with a small inter-request delay.
 */
export class GranolaConnector implements Connector {
  readonly type = "granola" as const;
  private apiKey = "";

  constructor(apiKey?: string) {
    if (apiKey) this.apiKey = apiKey;
  }

  private headers() {
    return { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" };
  }

  /** Verify the key works (also used as a "Test connection" probe). */
  async connect(config: ConnectorConfig): Promise<{ success: boolean; error?: string }> {
    this.apiKey = config.credentials.apiKey ?? this.apiKey;
    if (!this.apiKey) return { success: false, error: "Missing Granola API key" };
    try {
      const res = await fetch(`${BASE_URL}/notes`, { headers: this.headers() });
      if (res.status === 401 || res.status === 403) return { success: false, error: "Invalid or unauthorized Granola API key" };
      if (!res.ok) return { success: false, error: `Granola API error ${res.status}` };
      return { success: true };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  /** List notes created after `since`, following the cursor (newest pages). */
  async listNotes(since?: Date, max = 200): Promise<GranolaNote[]> {
    const out: GranolaNote[] = [];
    let cursor: string | undefined;
    for (let page = 0; page < 25 && out.length < max; page++) {
      const params = new URLSearchParams();
      if (since) params.set("created_after", since.toISOString());
      if (cursor) params.set("cursor", cursor);
      const res = await fetch(`${BASE_URL}/notes?${params.toString()}`, { headers: this.headers() });
      if (!res.ok) throw new Error(`Granola /notes ${res.status}: ${await res.text().catch(() => "")}`);
      const body = (await res.json()) as { notes?: GranolaNote[]; data?: GranolaNote[]; hasMore?: boolean; cursor?: string };
      const notes = body.notes ?? body.data ?? [];
      out.push(...notes);
      if (!body.hasMore || !body.cursor) break;
      cursor = body.cursor;
      await sleep(220); // stay under 5 req/s
    }
    return out;
  }

  /** Fetch a note's transcript and flatten it to plain text. */
  async getTranscript(noteId: string): Promise<{ note: GranolaNote; text: string }> {
    const res = await fetch(`${BASE_URL}/notes/${noteId}?include=transcript`, { headers: this.headers() });
    if (!res.ok) throw new Error(`Granola /notes/${noteId} ${res.status}`);
    const note = (await res.json()) as GranolaNote & { transcript?: GranolaTranscriptItem[] };
    const lines = (note.transcript ?? []).map((t) => {
      const who = t.speaker?.diarization_label || (t.speaker?.source === "microphone" ? "Me" : "Them");
      return `${who}: ${(t.text ?? "").trim()}`;
    });
    const summaryHeader = note.summary ? `Summary:\n${note.summary}\n\nTranscript:\n` : "";
    return { note, text: summaryHeader + lines.join("\n") };
  }

  /** Whether a note matches a project's scope rules. */
  static matches(note: GranolaNote, scope: GranolaScope): boolean {
    if (!scope || scope.mode !== "selective") return true; // default: everything accessible
    const hay = `${note.title ?? ""} ${note.summary ?? ""}`.toLowerCase();
    const kw = (scope.keywords ?? []).some((k) => k && hay.includes(k.toLowerCase()));
    const dom = (scope.ownerDomains ?? []).some((d) => d && (note.owner?.email ?? "").toLowerCase().endsWith(`@${d.toLowerCase().replace(/^@/, "")}`));
    const folder = (scope.folderIds ?? []).some((f) => f && (note.folder_id === f || note.folderId === f));
    const picked = (scope.noteIds ?? []).includes(note.id);
    return kw || dom || folder || picked;
  }

  // The high-level sync/ingest loop lives in the API (it needs DB + knowledge
  // pipeline). This connector exposes the primitives above; `sync`/`normalize`
  // satisfy the interface for callers that want a one-shot pull.
  async sync(_context: SyncContext): Promise<SyncResult> {
    return { success: true, itemsIngested: 0, errors: [], syncedAt: new Date() };
  }

  async normalize(raw: unknown): Promise<NormalizedEvent[]> {
    const notes = Array.isArray(raw) ? (raw as GranolaNote[]) : [];
    return notes.map((n) => ({
      id: n.id,
      organizationId: "",
      source: "granola" as const,
      sourceType: "meeting",
      externalId: n.id,
      title: n.title ?? "Untitled meeting",
      body: n.summary,
      author: n.owner?.name ? { name: n.owner.name, email: n.owner.email } : undefined,
      occurredAt: n.created ? new Date(n.created) : new Date(),
      classification: "internal",
    }));
  }

  async executeAction(_action: ExternalAction): Promise<ActionResult> {
    return { success: false, error: "Granola is read-only; no external actions supported." };
  }

  async disconnect(): Promise<void> {
    this.apiKey = "";
  }
}
