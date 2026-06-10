export type ArtifactType = "table" | "slides" | "sheet";

export interface GridSpec { title: string; columns: string[]; rows: (string | number)[][]; note?: string }
export interface SlideSpec { title: string; bullets?: string[]; chartId?: string; diagramId?: string; notes?: string }
export interface SlidesSpec { title: string; slides: SlideSpec[] }

export interface ArtifactRow {
  id: string;
  title: string;
  type: ArtifactType;
  spec: GridSpec | SlidesSpec;
}

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export async function fetchArtifact(id: string): Promise<ArtifactRow | null> {
  return fetch(`${API_BASE}/artifacts/${id}`, { credentials: "include" })
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);
}
