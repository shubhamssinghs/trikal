import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import { PrismaClient, Prisma } from "@prisma/client";
import { AiService } from "../ai/ai.service";
import { KnowledgeService } from "../knowledge/knowledge.service";

/**
 * Diagram data shape (mirrors @trikal/diagram's DiagramSchema). Kept local so
 * the API has no extra workspace dependency and can hot-reload in dev.
 */
type DLink = { type: string; id: string; label: string };
type DNode = {
  id: string; type: string; label: string; layer?: string;
  x?: number; y?: number; width?: number; height?: number;
  color?: string; fontSize?: number; parentId?: string;
  link?: DLink;
  metadata?: Record<string, unknown>;
};
type DEdge = {
  id: string; from: string; to: string; label?: string;
  style?: "solid" | "dashed" | "dotted";
  shape?: "bezier" | "smooth" | "step" | "straight";
  color?: string; animated?: boolean;
};
type DLayer = { id: string; label: string; order?: number };
type DiagramData = { title: string; description?: string; style: string; layers: DLayer[]; nodes: DNode[]; edges: DEdge[]; mermaid?: string };

// React Flow (node/edge) kinds.
const RF_KINDS = ["architecture", "flowchart", "dfd", "erd", "mindmap"] as const;
// Mermaid (text) kinds.
const MERMAID_KINDS = ["sequence", "gantt", "state"] as const;
export const DIAGRAM_KINDS = [...RF_KINDS, ...MERMAID_KINDS] as const;
export type DiagramKind = (typeof DIAGRAM_KINDS)[number];
type RfKind = (typeof RF_KINDS)[number];
const isMermaidKind = (k: string): k is (typeof MERMAID_KINDS)[number] =>
  (MERMAID_KINDS as readonly string[]).includes(k);

// Node types the architecture generator may use (keys from the shared icon registry).
const ARCH_TYPES = [
  "generic.user", "generic.mobile", "generic.api", "generic.database",
  "generic.queue", "generic.lock",
  "aws.cloudfront", "aws.waf", "aws.ecs", "aws.rds", "aws.s3", "aws.kms", "aws.elasticache", "aws.alb",
  "azure.app-service", "azure.sql", "azure.devops",
  "tools.slack", "tools.jira", "tools.teams", "tools.zoom", "tools.outlook",
];

const BASE_JSON = `Output ONLY valid JSON:
{
  "title": "short title",
  "description": "one sentence",
  "style": "default",
  "layers": [],
  "nodes": [{"id": "n1", "type": "<type>", "label": "...", "color": "#hex (optional)"}],
  "edges": [{"id": "e1", "from": "n1", "to": "n2", "label": "...", "style": "solid|dashed|dotted"}]
}
Node ids unique; edges reference node ids. Base everything on the provided context; never invent unrelated systems.`;

// Per-kind system prompts. All emit the same DiagramData JSON; only the node
// vocabulary and intent differ.
const KIND_PROMPTS: Record<RfKind, string> = {
  architecture: `You are a solutions architect. Produce a clear cloud/system architecture diagram.
${BASE_JSON}
- "type" MUST be one of: ${ARCH_TYPES.join(", ")}.
- 5-12 nodes. Use dashed edges for async/eventing.`,

  flowchart: `You are a process analyst. Produce a flowchart of the process described.
${BASE_JSON}
- "type" MUST be one of: shape.rounded (start/end), shape.rectangle (process step), shape.diamond (decision).
- From each decision (diamond), label the outgoing edges "Yes"/"No" (or the conditions).
- 6-14 nodes, a single clear top-to-bottom flow.`,

  dfd: `You are a systems analyst. Produce a Data Flow Diagram (DFD).
${BASE_JSON}
- "type" MUST be one of: shape.circle (process), shape.cylinder (data store), shape.rectangle (external entity).
- Edge labels name the data that flows (e.g. "order details").
- 5-12 nodes.`,

  erd: `You are a data modeler. Produce an Entity-Relationship Diagram.
${BASE_JSON}
- Each entity is "type": "shape.rectangle". The "label" is the entity name followed by key fields, e.g. "Order\\n- id (PK)\\n- total\\n- customerId (FK)".
- Edge labels show cardinality: "1:N", "N:M", "1:1".
- 4-10 entities.`,

  mindmap: `You are a facilitator. Produce a mind map of the topic.
${BASE_JSON}
- One central node "type": "shape.rounded" with the main topic; first-level branches are "shape.rounded"; give branches distinct "color" hex values.
- Edges connect from the centre outward (no labels needed). 8-16 nodes.`,
};

// Mermaid (text) prompts — output raw Mermaid source, no markdown fences.
const MERMAID_PROMPTS: Record<(typeof MERMAID_KINDS)[number], string> = {
  sequence: `You are a technical analyst. Output ONLY valid Mermaid \`sequenceDiagram\` source (no markdown fences, no prose).
Use participants and ->> (sync) / -->> (response) messages, and opt/alt/loop where useful. Base it on the provided context.`,
  gantt: `You are a project manager. Output ONLY valid Mermaid \`gantt\` source (no markdown fences, no prose).
Include "dateFormat YYYY-MM-DD", a title, sections, and tasks with ids/durations/dependencies. Base it on the provided context and timelines.`,
  state: `You are a systems analyst. Output ONLY valid Mermaid \`stateDiagram-v2\` source (no markdown fences, no prose).
Use [*] for start/end, states, and labeled transitions. Base it on the provided context.`,
};

function normalizeKind(k?: string): DiagramKind {
  return (DIAGRAM_KINDS as readonly string[]).includes(String(k)) ? (k as DiagramKind) : "architecture";
}

function stripFences(s: string): string {
  return s.trim().replace(/^```(?:mermaid)?\s*/i, "").replace(/\s*```$/, "").trim();
}

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

  private readonly LIST_SELECT = { id: true, title: true, description: true, kind: true, createdAt: true, updatedAt: true } as const;

  listByProject(projectId: string, organizationId: string) {
    return this.prisma.diagram.findMany({
      where: { projectId, project: { organizationId } },
      select: this.LIST_SELECT,
      orderBy: { updatedAt: "desc" },
    });
  }

  /** Standalone diagrams (not tied to a project), owned by the organization. */
  listStandalone(organizationId: string) {
    return this.prisma.diagram.findMany({
      where: { projectId: null, organizationId },
      select: this.LIST_SELECT,
      orderBy: { updatedAt: "desc" },
    });
  }

  async findOne(id: string, organizationId: string) {
    const diagram = await this.prisma.diagram.findFirst({
      // Owned either directly (standalone) or via its project.
      where: { id, OR: [{ organizationId }, { project: { organizationId } }] },
      include: { versions: { orderBy: { version: "desc" }, take: 1, select: { version: true } } },
    });
    if (!diagram) throw new NotFoundException("Diagram not found");
    return diagram;
  }

  async create(organizationId: string, data: { title?: string; description?: string; kind?: string; schemaJson?: DiagramData; projectId?: string | null }) {
    const projectId = data.projectId || null;
    if (projectId) await this.assertProject(projectId, organizationId);
    const schema = this.normalize(data.schemaJson, data.title || "Untitled diagram", data.description);
    return this.prisma.diagram.create({
      data: {
        projectId,
        organizationId: projectId ? null : organizationId,
        title: schema.title,
        description: schema.description,
        kind: normalizeKind(data.kind),
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

  /** Project entities a diagram node can be linked to. */
  async linkTargets(projectId: string, organizationId: string) {
    await this.assertProject(projectId, organizationId);
    const [knowledge, risks, members, milestones] = await Promise.all([
      this.prisma.knowledgeItem.findMany({ where: { projectId }, select: { id: true, title: true }, orderBy: { createdAt: "desc" }, take: 100 }),
      this.prisma.risk.findMany({ where: { projectId }, select: { id: true, title: true }, orderBy: { createdAt: "desc" } }),
      this.prisma.member.findMany({ where: { projectId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
      this.prisma.milestone.findMany({ where: { projectId }, select: { id: true, name: true }, orderBy: { dueDate: "asc" } }),
    ]);
    return {
      knowledge: knowledge.map((k) => ({ id: k.id, label: k.title })),
      risk: risks.map((r) => ({ id: r.id, label: r.title })),
      member: members.map((m) => ({ id: m.id, label: m.name })),
      milestone: milestones.map((m) => ({ id: m.id, label: m.name })),
    };
  }

  /**
   * Generate a diagram of a given kind. When projectId is given, the project's
   * knowledge base is used as context; otherwise it's a standalone quick diagram
   * driven purely by the prompt.
   */
  async generate(organizationId: string, opts: { prompt?: string; kind?: string; projectId?: string | null }) {
    const { prompt, kind: kindInput } = opts;
    const projectId = opts.projectId || null;
    const kind = normalizeKind(kindInput);

    const project = projectId ? await this.assertProject(projectId, organizationId) : null;
    const baseName = project?.name || (prompt?.trim()?.slice(0, 40)) || "Quick";

    let context = "";
    if (projectId) {
      const query = prompt?.trim() || `${kind} diagram: components, steps, data, relationships, integrations`;
      try {
        const hits = await this.knowledge.searchProject(projectId, query, organizationId);
        context = hits.map((h, i) => `[${i + 1}] (${h.source?.title ?? "source"}) ${h.content}`).join("\n\n").slice(0, 6000);
      } catch {
        context = "";
      }
    }

    const userPrompt = [
      project ? `Project: ${project.name}` : "Standalone quick diagram.",
      project?.description ? `Description: ${project.description}` : "",
      prompt ? `Request: ${prompt}` : "",
      context ? `\nProject knowledge:\n${context}` : (projectId ? "\n(No knowledge base content yet — produce a sensible default.)" : ""),
    ].filter(Boolean).join("\n");

    const systemPrompt = isMermaidKind(kind) ? MERMAID_PROMPTS[kind] : KIND_PROMPTS[kind];
    const raw = await this.ai.complete(systemPrompt, userPrompt, 4096, organizationId);
    const isRealAi = await this.ai.isConfigured(organizationId);

    let schema: DiagramData;
    if (isMermaidKind(kind)) {
      // Text diagram — store the Mermaid source. Fall back to a stub if the AI
      // returned an error/plain notice rather than usable Mermaid.
      const mermaid = stripFences(raw);
      const looksValid = /^(sequenceDiagram|gantt|stateDiagram)/m.test(mermaid);
      schema = this.normalize(
        { title: `${baseName} ${kind}`, mermaid: looksValid ? mermaid : `%% ${raw.replace(/\n/g, " ").slice(0, 200)}` },
        `${baseName} ${kind}`,
      );
    } else {
      let parsed: Partial<DiagramData> | null = null;
      try {
        const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
        parsed = JSON.parse(cleaned);
      } catch {
        this.logger.warn(`Diagram AI response was not JSON: ${raw.substring(0, 120)}`);
      }
      schema = this.normalize(parsed ?? undefined, parsed?.title || `${baseName} ${kind}`, parsed?.description);
    }

    const diagram = await this.prisma.diagram.create({
      data: {
        projectId,
        organizationId: projectId ? null : organizationId,
        title: schema.title,
        description: schema.description,
        kind,
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
        width: typeof n.width === "number" ? n.width : undefined,
        height: typeof n.height === "number" ? n.height : undefined,
        color: typeof n.color === "string" ? n.color : undefined,
        fontSize: typeof n.fontSize === "number" ? n.fontSize : undefined,
        parentId: typeof n.parentId === "string" ? n.parentId : undefined,
        link:
          n.link && typeof n.link.type === "string" && typeof n.link.id === "string"
            ? { type: n.link.type, id: n.link.id, label: String(n.link.label ?? "") }
            : undefined,
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
        shape: ["bezier", "smooth", "step", "straight"].includes(String(e.shape)) ? e.shape : undefined,
        color: typeof e.color === "string" ? e.color : undefined,
        animated: typeof e.animated === "boolean" ? e.animated : undefined,
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
      mermaid: typeof input?.mermaid === "string" ? input.mermaid : undefined,
    };
  }
}
