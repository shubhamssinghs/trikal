import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaClient, Prisma } from "@prisma/client";

export type ChartSeries = { label: string; data: number[]; color?: string };
export interface ChartSpec {
  type: "bar" | "line" | "area" | "pie" | "doughnut";
  title: string;
  labels: string[];
  series: ChartSeries[];
  stacked?: boolean;
  valueLabel?: string; // y-axis / value unit label, e.g. "Credits"
}

const TYPES = ["bar", "line", "area", "pie", "doughnut"] as const;

@Injectable()
export class ChartsService {
  constructor(private readonly prisma: PrismaClient) {}

  /** Validate + normalize an AI-provided chart spec. */
  private normalize(input: Partial<ChartSpec>): ChartSpec {
    const type = (TYPES as readonly string[]).includes(String(input.type)) ? (input.type as ChartSpec["type"]) : "bar";
    const title = String(input.title ?? "Chart").slice(0, 200);
    const labels = (input.labels ?? []).map((l) => String(l)).slice(0, 50);
    const series = (input.series ?? [])
      .slice(0, 8)
      .map((s) => ({
        label: String(s.label ?? "Series").slice(0, 80),
        data: (s.data ?? []).map((n) => Number(n) || 0).slice(0, 50),
        color: typeof s.color === "string" ? s.color : undefined,
      }))
      .filter((s) => s.data.length);
    return { type, title, labels, series, stacked: Boolean(input.stacked), valueLabel: input.valueLabel ? String(input.valueLabel).slice(0, 40) : undefined };
  }

  async create(organizationId: string, data: { projectId?: string | null; spec: Partial<ChartSpec> }) {
    const spec = this.normalize(data.spec);
    return this.prisma.chart.create({
      data: {
        organizationId,
        projectId: data.projectId ?? null,
        title: spec.title,
        type: spec.type,
        spec: spec as unknown as Prisma.InputJsonValue,
      },
    });
  }

  async findOne(id: string, organizationId: string) {
    const chart = await this.prisma.chart.findFirst({ where: { id, OR: [{ organizationId }, { project: { organizationId } }] } });
    if (!chart) throw new NotFoundException("Chart not found");
    return chart;
  }

  listByProject(projectId: string, organizationId: string) {
    return this.prisma.chart.findMany({
      where: { projectId, project: { organizationId } },
      select: { id: true, title: true, type: true, createdAt: true },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });
  }
}
