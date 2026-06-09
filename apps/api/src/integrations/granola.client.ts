const BASE_URL = "https://public-api.granola.ai/v1";

export interface GranolaNote {
  id: string;
  title?: string;
  summary?: string;
  owner?: { name?: string; email?: string };
  created?: string;
  updated?: string;
  folder_id?: string;
  folderId?: string;
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

  /** Probe the key — used for "Test connection". */
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

  /** List notes created after `since`, following the cursor. */
  async listNotes(since?: Date | null, max = 200): Promise<GranolaNote[]> {
    const out: GranolaNote[] = [];
    let cursor: string | undefined;
    for (let page = 0; page < 25 && out.length < max; page++) {
      const params = new URLSearchParams();
      if (since) params.set("created_after", since.toISOString());
      if (cursor) params.set("cursor", cursor);
      const res = await fetch(`${BASE_URL}/notes?${params.toString()}`, { headers: this.headers });
      if (!res.ok) throw new Error(`Granola /notes ${res.status}`);
      const body = (await res.json()) as { notes?: GranolaNote[]; data?: GranolaNote[]; hasMore?: boolean; cursor?: string };
      out.push(...(body.notes ?? body.data ?? []));
      if (!body.hasMore || !body.cursor) break;
      cursor = body.cursor;
      await sleep(220);
    }
    return out;
  }

  /** Fetch a note's transcript, flattened to plain text (summary header + lines). */
  async getTranscriptText(noteId: string): Promise<string> {
    const res = await fetch(`${BASE_URL}/notes/${noteId}?include=transcript`, { headers: this.headers });
    if (!res.ok) throw new Error(`Granola /notes/${noteId} ${res.status}`);
    const note = (await res.json()) as GranolaNote & { transcript?: Array<{ speaker?: { source?: string; diarization_label?: string }; text?: string }> };
    const lines = (note.transcript ?? []).map((t) => {
      const who = t.speaker?.diarization_label || (t.speaker?.source === "microphone" ? "Me" : "Speaker");
      return `${who}: ${(t.text ?? "").trim()}`;
    });
    return (note.summary ? `Summary:\n${note.summary}\n\nTranscript:\n` : "") + lines.join("\n");
  }
}

/** Whether a note matches a project's scope rules (default: include everything). */
export function noteMatchesScope(note: GranolaNote, scope: GranolaScope | undefined | null): boolean {
  if (!scope || scope.mode !== "selective") return true;
  const hay = `${note.title ?? ""} ${note.summary ?? ""}`.toLowerCase();
  const kw = (scope.keywords ?? []).some((k) => k && hay.includes(k.toLowerCase()));
  const dom = (scope.ownerDomains ?? []).some((d) => d && (note.owner?.email ?? "").toLowerCase().endsWith(`@${d.toLowerCase().replace(/^@/, "")}`));
  const folder = (scope.folderIds ?? []).some((f) => f && (note.folder_id === f || note.folderId === f));
  const picked = (scope.noteIds ?? []).includes(note.id);
  return kw || dom || folder || picked;
}
