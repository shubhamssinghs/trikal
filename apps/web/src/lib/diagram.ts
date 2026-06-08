import {
  User, Smartphone, Server, Database, ListOrdered, Lock, Cloud, ShieldAlert,
  Boxes, HardDrive, KeyRound, Network, AppWindow, GitBranch, MessageSquare,
  Ticket, Users, Video, Mail, Box, Workflow, Share2, type LucideIcon,
} from "lucide-react";

export type DNode = {
  id: string; type: string; label: string; layer?: string;
  x?: number; y?: number;
  width?: number; height?: number;
  color?: string; fontSize?: number;
  parentId?: string;
  metadata?: Record<string, unknown>;
};
export type DEdge = {
  id: string; from: string; to: string; label?: string;
  style?: "solid" | "dashed" | "dotted";
  shape?: "bezier" | "smooth" | "step" | "straight";
  color?: string;
  animated?: boolean;
};
export type DLayer = { id: string; label: string; order?: number };
export type DiagramData = {
  title: string; description?: string; style: string;
  layers: DLayer[]; nodes: DNode[]; edges: DEdge[];
};

export type DiagramSummary = {
  id: string; title: string; description?: string | null;
  kind?: string;
  createdAt: string; updatedAt: string;
};

/**
 * node type key -> icon definition.
 *  - `svg`   : path to a real service/brand SVG bundled in /public/icons (preferred render).
 *  - `icon`  : lucide fallback used for generic concepts or if the SVG is missing.
 *  - `color` : accent color used to tint the lucide fallback box.
 */
type IconDef = { icon: LucideIcon; color: string; svg?: string };

const ICON_MAP: Record<string, IconDef> = {
  // Generic concepts — no brand, keep clean lucide glyphs.
  "generic.user": { icon: User, color: "#64748b" },
  "generic.mobile": { icon: Smartphone, color: "#64748b" },
  "generic.api": { icon: Server, color: "#2563eb" },
  "generic.database": { icon: Database, color: "#16a34a" },
  "generic.queue": { icon: ListOrdered, color: "#d97706" },
  "generic.lock": { icon: Lock, color: "#dc2626" },
  // AWS — official service icons.
  "aws.cloudfront": { icon: Cloud, color: "#ea580c", svg: "/icons/aws/cloudfront.svg" },
  "aws.waf": { icon: ShieldAlert, color: "#dc2626", svg: "/icons/aws/waf.svg" },
  "aws.ecs": { icon: Boxes, color: "#ea580c", svg: "/icons/aws/ecs.svg" },
  "aws.rds": { icon: Database, color: "#2563eb", svg: "/icons/aws/rds.svg" },
  "aws.s3": { icon: HardDrive, color: "#16a34a", svg: "/icons/aws/s3.svg" },
  "aws.kms": { icon: KeyRound, color: "#dc2626", svg: "/icons/aws/kms.svg" },
  "aws.elasticache": { icon: Database, color: "#dc2626", svg: "/icons/aws/elasticache.svg" },
  "aws.alb": { icon: Network, color: "#7c3aed", svg: "/icons/aws/alb.svg" },
  // Azure — service icons.
  "azure.app-service": { icon: AppWindow, color: "#0891b2", svg: "/icons/azure/app-service.svg" },
  "azure.sql": { icon: Database, color: "#0891b2", svg: "/icons/azure/sql-database.svg" },
  "azure.devops": { icon: GitBranch, color: "#0891b2", svg: "/icons/azure/devops.svg" },
  // Tools — brand logos.
  "tools.slack": { icon: MessageSquare, color: "#7c3aed", svg: "/icons/tools/slack.svg" },
  "tools.jira": { icon: Ticket, color: "#2563eb", svg: "/icons/tools/jira.svg" },
  "tools.teams": { icon: Users, color: "#7c3aed", svg: "/icons/tools/teams.svg" },
  "tools.zoom": { icon: Video, color: "#2563eb", svg: "/icons/tools/zoom.svg" },
  "tools.outlook": { icon: Mail, color: "#0891b2", svg: "/icons/tools/outlook.svg" },
};

export function iconFor(type: string): IconDef {
  return ICON_MAP[type] ?? { icon: Box, color: "#64748b" };
}

/** Service/brand icon node types, for the type picker in the inspector. */
export const ICON_TYPE_OPTIONS = Object.keys(ICON_MAP).map((value) => ({ value, label: value }));
// Back-compat alias.
export const NODE_TYPE_OPTIONS = ICON_TYPE_OPTIONS;

/* ── Shape / text / group node families ─────────────────────────────────── */

export type ShapeKind = "rectangle" | "rounded" | "circle" | "diamond" | "cylinder";

export const SHAPE_KINDS: { type: string; kind: ShapeKind; label: string }[] = [
  { type: "shape.rectangle", kind: "rectangle", label: "Rectangle" },
  { type: "shape.rounded", kind: "rounded", label: "Rounded" },
  { type: "shape.circle", kind: "circle", label: "Circle" },
  { type: "shape.diamond", kind: "diamond", label: "Decision" },
  { type: "shape.cylinder", kind: "cylinder", label: "Store" },
];

export const SHAPE_TYPE_OPTIONS = SHAPE_KINDS.map((s) => ({ value: s.type, label: s.label }));

export const EDGE_SHAPE_OPTIONS = [
  { value: "bezier", label: "Curved" },
  { value: "smooth", label: "Smoothstep" },
  { value: "step", label: "Step" },
  { value: "straight", label: "Straight" },
];

export const EDGE_STYLE_OPTIONS = [
  { value: "solid", label: "Solid" },
  { value: "dashed", label: "Dashed" },
  { value: "dotted", label: "Dotted" },
];

export const TEXT_TYPE = "text";
export const GROUP_TYPE = "group";

export function shapeKindOf(type: string): ShapeKind | null {
  const found = SHAPE_KINDS.find((s) => s.type === type);
  return found ? found.kind : null;
}
export const isShape = (type: string) => type.startsWith("shape.");
export const isText = (type: string) => type === TEXT_TYPE;
export const isGroup = (type: string) => type === GROUP_TYPE;
export const isIconNode = (type: string) => !isShape(type) && !isText(type) && !isGroup(type);

/** Which React Flow node renderer to use for a given diagram node type. */
export function rfTypeFor(type: string): "service" | "shape" | "text" | "group" {
  if (isGroup(type)) return "group";
  if (isText(type)) return "text";
  if (isShape(type)) return "shape";
  return "service";
}

/** Categorized palette for the editor sidebar. */
export const PALETTE: { category: string; items: { type: string; label: string }[] }[] = [
  {
    category: "Structure",
    items: [
      { type: GROUP_TYPE, label: "Group / container" },
      { type: TEXT_TYPE, label: "Text label" },
    ],
  },
  { category: "Shapes", items: SHAPE_KINDS.map((s) => ({ type: s.type, label: s.label })) },
  {
    category: "Generic",
    items: [
      { type: "generic.user", label: "User" },
      { type: "generic.mobile", label: "Mobile" },
      { type: "generic.api", label: "Service / API" },
      { type: "generic.database", label: "Database" },
      { type: "generic.queue", label: "Queue" },
      { type: "generic.lock", label: "Security" },
    ],
  },
  {
    category: "AWS",
    items: [
      { type: "aws.cloudfront", label: "CloudFront" },
      { type: "aws.alb", label: "Load Balancer" },
      { type: "aws.ecs", label: "ECS" },
      { type: "aws.rds", label: "RDS" },
      { type: "aws.s3", label: "S3" },
      { type: "aws.elasticache", label: "ElastiCache" },
      { type: "aws.waf", label: "WAF" },
      { type: "aws.kms", label: "KMS" },
    ],
  },
  {
    category: "Azure",
    items: [
      { type: "azure.app-service", label: "App Service" },
      { type: "azure.sql", label: "SQL Database" },
      { type: "azure.devops", label: "DevOps" },
    ],
  },
  {
    category: "Tools",
    items: [
      { type: "tools.slack", label: "Slack" },
      { type: "tools.jira", label: "Jira" },
      { type: "tools.teams", label: "Teams" },
      { type: "tools.zoom", label: "Zoom" },
      { type: "tools.outlook", label: "Outlook" },
    ],
  },
];

/** Default label when adding a node of a given type from the palette. */
export function defaultLabelFor(type: string): string {
  if (isGroup(type)) return "Group";
  if (isText(type)) return "Text";
  const shape = SHAPE_KINDS.find((s) => s.type === type);
  if (shape) return shape.label;
  for (const cat of PALETTE) {
    const item = cat.items.find((i) => i.type === type);
    if (item) return item.label;
  }
  return "Node";
}

export function emptyDiagram(title = "Untitled diagram"): DiagramData {
  return { title, description: "", style: "default", layers: [], nodes: [], edges: [] };
}

/* ── Diagram kinds (type picker, badges, templates) ─────────────────────── */

export type DiagramKind = "architecture" | "flowchart" | "dfd" | "erd" | "mindmap";

export const DIAGRAM_KINDS: { value: DiagramKind; label: string; description: string; color: string; icon: LucideIcon }[] = [
  { value: "architecture", label: "Architecture", description: "Cloud / system components & connections", color: "#2563eb", icon: Network },
  { value: "flowchart", label: "Flowchart", description: "Process steps, decisions & branches", color: "#16a34a", icon: Workflow },
  { value: "dfd", label: "Data Flow", description: "Processes, data stores & flows", color: "#d97706", icon: Share2 },
  { value: "erd", label: "ER Diagram", description: "Entities, fields & relationships", color: "#7c3aed", icon: Database },
  { value: "mindmap", label: "Mind Map", description: "Central topic & branches", color: "#db2777", icon: GitBranch },
];

export function kindMeta(kind?: string) {
  return DIAGRAM_KINDS.find((k) => k.value === kind) ?? DIAGRAM_KINDS[0];
}

/** Starter content for a blank diagram of a given kind. */
export function templateFor(kind: string, title: string): DiagramData {
  const d = emptyDiagram(title);
  switch (kind) {
    case "flowchart":
      d.nodes = [
        { id: "s", type: "shape.rounded", label: "Start", x: 220, y: 40, width: 120, height: 54, color: "#16a34a" },
        { id: "p", type: "shape.rectangle", label: "Process step", x: 215, y: 150, width: 130, height: 60 },
        { id: "dec", type: "shape.diamond", label: "Decision?", x: 210, y: 290, width: 140, height: 92, color: "#d97706" },
        { id: "e", type: "shape.rounded", label: "End", x: 220, y: 450, width: 120, height: 54, color: "#dc2626" },
      ];
      d.edges = [
        { id: "e1", from: "s", to: "p", style: "solid", shape: "smooth" },
        { id: "e2", from: "p", to: "dec", style: "solid", shape: "smooth" },
        { id: "e3", from: "dec", to: "e", label: "Yes", style: "solid", shape: "smooth" },
      ];
      break;
    case "dfd":
      d.nodes = [
        { id: "ext", type: "shape.rectangle", label: "External Entity", x: 60, y: 120, width: 140, height: 60 },
        { id: "proc", type: "shape.circle", label: "Process", x: 320, y: 110, width: 110, height: 110, color: "#d97706" },
        { id: "store", type: "shape.cylinder", label: "Data Store", x: 320, y: 300, width: 140, height: 70, color: "#16a34a" },
      ];
      d.edges = [
        { id: "e1", from: "ext", to: "proc", label: "request", style: "solid", shape: "smooth" },
        { id: "e2", from: "proc", to: "store", label: "record", style: "solid", shape: "smooth" },
      ];
      break;
    case "erd":
      d.nodes = [
        { id: "a", type: "shape.rectangle", label: "Customer\n- id (PK)\n- name\n- email", x: 80, y: 80, width: 180, height: 110, color: "#7c3aed" },
        { id: "b", type: "shape.rectangle", label: "Order\n- id (PK)\n- total\n- customerId (FK)", x: 360, y: 80, width: 190, height: 120, color: "#7c3aed" },
      ];
      d.edges = [{ id: "e1", from: "a", to: "b", label: "1:N", style: "solid", shape: "smooth" }];
      break;
    case "mindmap":
      d.nodes = [
        { id: "c", type: "shape.rounded", label: "Central Topic", x: 280, y: 200, width: 150, height: 60, color: "#db2777" },
        { id: "b1", type: "shape.rounded", label: "Branch 1", x: 60, y: 80, width: 120, height: 50, color: "#2563eb" },
        { id: "b2", type: "shape.rounded", label: "Branch 2", x: 60, y: 320, width: 120, height: 50, color: "#16a34a" },
        { id: "b3", type: "shape.rounded", label: "Branch 3", x: 540, y: 200, width: 120, height: 50, color: "#d97706" },
      ];
      d.edges = [
        { id: "e1", from: "c", to: "b1", style: "solid", shape: "bezier" },
        { id: "e2", from: "c", to: "b2", style: "solid", shape: "bezier" },
        { id: "e3", from: "c", to: "b3", style: "solid", shape: "bezier" },
      ];
      break;
    // architecture starts empty — users generate or build from the palette.
  }
  return d;
}
