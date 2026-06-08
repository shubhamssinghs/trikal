import {
  User, Smartphone, Server, Database, ListOrdered, Lock, Cloud, ShieldAlert,
  Boxes, HardDrive, KeyRound, Network, AppWindow, GitBranch, MessageSquare,
  Ticket, Users, Video, Mail, Box, type LucideIcon,
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
