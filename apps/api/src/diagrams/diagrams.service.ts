import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import { PrismaClient, Prisma } from "@prisma/client";
import { AiService } from "../ai/ai.service";
import { KnowledgeService } from "../knowledge/knowledge.service";

/**
 * Diagram data shape (mirrors @trikal/diagram's DiagramSchema). Kept local so
 * the API has no extra workspace dependency and can hot-reload in dev.
 */
type DNode = { id: string; type: string; label: string; layer?: string; x?: number; y?: number; metadata?: Record<string, unknown> };
type DEdge = { id: string; from: string; to: string; label?: string; style?: "solid" | "dashed" | "dotted" };
type DLayer = { id: string; label: string; order?: number };
type DiagramData = { title: string; description?: string; style: string; layers: DLayer[]; nodes: DNode[]; edges: DEdge[] };

// Node types the generator may use (keys from the shared icon registry).
const NODE_TYPES = [
  "generic.user", "generic.mobile", "generic.api", "generic.database",
  "generic.queue", "generic.lock",
  "aws.cloudfront", "aws.waf", "aws.ecs", "aws.rds", "aws.s3", "aws.kms", "aws.elasticache", "aws.alb",
  "azure.app-service", "azure.sql", "azure.devops",
  "tools.slack", "tools.jira", "tools.teams", "tools.zoom", "tools.outlook",
];

const SYSTEM_PROMPT = `You are a solutions architect. From the project context, produce a clear architecture/system diagram as JSON.

Output ONLY valid JSON with this exact structure:
{
  "title": "short diagram title",
  "description": "one sentence describing the diagram",
  "style": "default",
  "layers": [{"id": "client", "label": "Client", "order": 0}],
  "nodes": [{"id": "n1", "type": "generic.user", "label": "End User", "layer": "client"}],
  "edges": [{"id": "e1", "from": "n1", "to": "n2", "label": "HTTPS", "style": "solid"}]
}

Rules:
- "type" MUST be one of: ${NODE_TYPES.join(", ")}.
- Use 5-12 nodes. Group related nodes with layers (e.g. client, edge, application, data, external).
- Node ids must be unique short strings; edges reference node ids in "from"/"to".
- edge "style" is one of solid|dashed|dotted. Use dashed for async/eventing.
- Base everything on the provided context. Never invent unrelated systems.`;

@Injectable()
export class DiagramsService {
  private readonly logger = new Logger(DiagramsService.name);

  constructor(
    private readonly prisma: PrismaClient,
    private readonly ai: AiService,
    private readonly knowledge: KnowledgeService,
  ) {}

  private async assertProject(projectId: string, organizationId: string) {
    const project = await this.prisma.project.findFirst({ where: { id: projectId, organizationId } });
    if (!project) throw new NotFoundException("Project not found");
    return project;
  }

  listByProject(projectId: string, organizationId: string) {
    return this.prisma.diagram.findMany({
      where: { projectId, project: { organizationId } },
      select: { id: true, title: true, description: true, createdAt: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    });
  }

  async findOne(id: string, organizationId: string) {
    const diagram = await this.prisma.diagram.findFirst({
      where: { id, project: { organizationId } },
      include: { versions: { orderBy: { version: "desc" }, take: 1, select: { version: true } } },
    });
    if (!diagram) throw new NotFoundException("Diagram not found");
    return diagram;
  }

  async create(projectId: string, organizationId: string, data: { title?: string; description?: string; schemaJson?: DiagramData }) {
    await this.assertProject(projectId, organizationId);
    const schema = this.normalize(data.schemaJson, data.title || "Untitled diagram", data.description);
    return this.prisma.diagram.create({
      data: {
        projectId,
        title: schema.title,
        description: schema.description,
        schemaJson: schema as unknown as Prisma.InputJsonValue,
      },
    });
  }

  async update(id: string, organizationId: string, data: { title?: string; description?: string; schemaJson?: DiagramData }) {
    const existing = await this.findOne(id, organizationId);
    const schema = this.normalize(
      data.schemaJson ?? (existing.schemaJson as unknown as DiagramData),
      data.title ?? existing.title,
      data.description ?? existing.description ?? undefined,
    );

    // Snapshot the previous schema as a version before overwriting.
    const lastVersion = existing.versions[0]?.version ?? 0;
    await this.prisma.diagramVersion.create({
      data: {
        diagramId: id,
        version: lastVersion + 1,
        schemaJson: existing.schemaJson as unknown as Prisma.InputJsonValue,
      },
    });

    return this.prisma.diagram.update({
      where: { id },
      data: {
        title: schema.title,
        description: schema.description,
        schemaJson: schema as unknown as Prisma.InputJsonValue,
      },
    });
  }

  async remove(id: string, organizationId: string) {
    await this.findOne(id, organizationId);
    return this.prisma.diagram.delete({ where: { id } });
  }

  /** Generate a diagram from project knowledge + an optional focus prompt. */
  async generate(projectId: string, organizationId: string, prompt?: string) {
    const project = await this.assertProject(projectId, organizationId);

    const query = prompt?.trim() || "system architecture, components, infrastructure, integrations, data flow";
    let context = "";
    try {
      const hits = await this.knowledge.searchProject(projectId, query, organizationId);
      context = hits.map((h, i) => `[${i + 1}] (${h.source?.title ?? "source"}) ${h.content}`).join("\n\n").slice(0, 6000);
    } catch {
      context = "";
    }

    const userPrompt = [
      `Project: ${project.name}`,
      project.description ? `Description: ${project.description}` : "",
      prompt ? `Focus: ${prompt}` : "",
      context ? `\nProject knowledge:\n${context}` : "\n(No knowledge base content yet — produce a sensible default architecture for this kind of project.)",
    ].filter(Boolean).join("\n");

    const raw = await this.ai.complete(SYSTEM_PROMPT, userPrompt, 4096, organizationId);
    const isRealAi = await this.ai.isConfigured(organizationId);

    let parsed: Partial<DiagramData> | null = null;
    try {
      const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
      parsed = JSON.parse(cleaned);
    } catch {
      this.logger.warn(`Diagram AI response was not JSON: ${raw.substring(0, 120)}`);
    }

    const schema = this.normalize(parsed ?? undefined, parsed?.title || `${project.name} architecture`, parsed?.description);

    const diagram = await this.prisma.diagram.create({
      data: {
        projectId,
        title: schema.title,
        description: schema.description,
        schemaJson: schema as unknown as Prisma.InputJsonValue,
      },
    });

    return { diagram, isRealAi, nodeCount: schema.nodes.length };
  }

  /**
   * Coerce arbitrary/AI input into a valid DiagramData: drop malformed nodes,
   * keep only edges referencing real nodes, and lay out anything missing
   * coordinates on a simple grid so the canvas always renders.
   */
  private normalize(input: Partial<DiagramData> | undefined, fallbackTitle: string, fallbackDescription?: string): DiagramData {
    const rawNodes = Array.isArray(input?.nodes) ? input!.nodes! : [];
    const seen = new Set<string>();
    const nodes: DNode[] = [];
    rawNodes.forEach((n, i) => {
      const id = String(n?.id ?? `n${i + 1}`);
      if (!n || seen.has(id)) return;
      seen.add(id);
      const hasXY = typeof n.x === "number" && typeof n.y === "number";
      nodes.push({
        id,
        type: typeof n.type === "string" ? n.type : "generic.api",
        label: String(n.label ?? id),
        layer: typeof n.layer === "string" ? n.layer : undefined,
        x: hasXY ? n.x : 80 + (i % 4) * 240,
        y: hasXY ? n.y : 80 + Math.floor(i / 4) * 160,
        metadata: typeof n.metadata === "object" && n.metadata ? n.metadata : undefined,
      });
    });

    const ids = new Set(nodes.map((n) => n.id));
    const rawEdges = Array.isArray(input?.edges) ? input!.edges! : [];
    const edges: DEdge[] = [];
    rawEdges.forEach((e, i) => {
      if (!e || !ids.has(String(e.from)) || !ids.has(String(e.to))) return;
      edges.push({
        id: String(e.id ?? `e${i + 1}`),
        from: String(e.from),
        to: String(e.to),
        label: e.label ? String(e.label) : undefined,
        style: e.style === "dashed" || e.style === "dotted" ? e.style : "solid",
      });
    });

    const layers: DLayer[] = Array.isArray(input?.layers)
      ? input!.layers!.filter((l) => l && typeof l.id === "string").map((l, i) => ({ id: String(l.id), label: String(l.label ?? l.id), order: typeof l.order === "number" ? l.order : i }))
      : [];

    return {
      title: String(input?.title ?? fallbackTitle).slice(0, 200),
      description: input?.description ? String(input.description) : fallbackDescription,
      style: typeof input?.style === "string" ? input!.style! : "default",
      layers,
      nodes,
      edges,
    };
  }
}
