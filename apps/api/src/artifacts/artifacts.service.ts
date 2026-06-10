import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaClient, Prisma } from "@prisma/client";

export type ArtifactType = "table" | "slides" | "sheet";

/** table/sheet share a grid shape; slides is a deck. */
export interface TableSpec { title: string; columns: string[]; rows: (string | number)[][]; note?: string }
export interface SheetSpec { title: string; columns: string[]; rows: (string | number)[][] }
export interface SlideSpec { title: string; bullets?: string[]; chartId?: string; diagramId?: string; notes?: string }
export interface SlidesSpec { title: string; slides: SlideSpec[] }

@Injectable()
export class ArtifactsService {
  constructor(private readonly prisma: PrismaClient) {}

  private normalize(type: ArtifactType, spec: Record<string, unknown>): { title: string; spec: Record<string, unknown> } {
    const title = String(spec.title ?? "Untitled").slice(0, 200);
    if (type === "table" || type === "sheet") {
      const columns = (Array.isArray(spec.columns) ? spec.columns : []).map(String).slice(0, 30);
      const rows = (Array.isArray(spec.rows) ? spec.rows : [])
        .slice(0, 500)
        .map((r) => (Array.isArray(r) ? r.map((c) => (typeof c === "number" ? c : String(c ?? ""))).slice(0, 30) : []));
      return { title, spec: { title, columns, rows, ...(type === "table" && spec.note ? { note: String(spec.note).slice(0, 300) } : {}) } };
    }
    // slides
    const slides = (Array.isArray(spec.slides) ? spec.slides : [])
      .slice(0, 40)
      .map((s) => {
        const sl = s as Record<string, unknown>;
        return {
          title: String(sl.title ?? "").slice(0, 160),
          bullets: (Array.isArray(sl.bullets) ? sl.bullets : []).map((b) => String(b).slice(0, 300)).slice(0, 12),
          chartId: typeof sl.chartId === "string" ? sl.chartId : undefined,
          diagramId: typeof sl.diagramId === "string" ? sl.diagramId : undefined,
          notes: typeof sl.notes === "string" ? String(sl.notes).slice(0, 500) : undefined,
        };
      });
    return { title, spec: { title, slides } };
  }

  async create(organizationId: string, data: { projectId?: string | null; type: ArtifactType; spec: Record<string, unknown> }) {
    const { title, spec } = this.normalize(data.type, data.spec);
    return this.prisma.artifact.create({
      data: { organizationId, projectId: data.projectId ?? null, type: data.type, title, spec: spec as unknown as Prisma.InputJsonValue },
    });
  }

  async findOne(id: string, organizationId: string) {
    const a = await this.prisma.artifact.findFirst({ where: { id, OR: [{ organizationId }, { project: { organizationId } }] } });
    if (!a) throw new NotFoundException("Artifact not found");
    return a;
  }

  listByProject(projectId: string, organizationId: string, type?: string) {
    return this.prisma.artifact.findMany({
      where: { projectId, project: { organizationId }, ...(type ? { type } : {}) },
      select: { id: true, title: true, type: true, createdAt: true },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });
  }
}
