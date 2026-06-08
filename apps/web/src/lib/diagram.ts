import {
  User, Smartphone, Server, Database, ListOrdered, Lock, Cloud, ShieldAlert,
  Boxes, HardDrive, KeyRound, Network, AppWindow, GitBranch, MessageSquare,
  Ticket, Users, Video, Mail, Box, type LucideIcon,
} from "lucide-react";

export type DNode = {
  id: string; type: string; label: string; layer?: string;
  x?: number; y?: number; metadata?: Record<string, unknown>;
};
export type DEdge = {
  id: string; from: string; to: string; label?: string;
  style?: "solid" | "dashed" | "dotted";
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

/** All selectable node types, for the editor's add/change-type menu. */
export const NODE_TYPE_OPTIONS = Object.keys(ICON_MAP).map((value) => ({
  value,
  label: value,
}));

export function emptyDiagram(title = "Untitled diagram"): DiagramData {
  return { title, description: "", style: "default", layers: [], nodes: [], edges: [] };
}
