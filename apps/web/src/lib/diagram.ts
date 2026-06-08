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

/** node type key -> { icon, accent color }. Accent tints the node card. */
const ICON_MAP: Record<string, { icon: LucideIcon; color: string }> = {
  "generic.user": { icon: User, color: "#64748b" },
  "generic.mobile": { icon: Smartphone, color: "#64748b" },
  "generic.api": { icon: Server, color: "#2563eb" },
  "generic.database": { icon: Database, color: "#16a34a" },
  "generic.queue": { icon: ListOrdered, color: "#d97706" },
  "generic.lock": { icon: Lock, color: "#dc2626" },
  "aws.cloudfront": { icon: Cloud, color: "#ea580c" },
  "aws.waf": { icon: ShieldAlert, color: "#dc2626" },
  "aws.ecs": { icon: Boxes, color: "#ea580c" },
  "aws.rds": { icon: Database, color: "#2563eb" },
  "aws.s3": { icon: HardDrive, color: "#16a34a" },
  "aws.kms": { icon: KeyRound, color: "#dc2626" },
  "aws.elasticache": { icon: Database, color: "#dc2626" },
  "aws.alb": { icon: Network, color: "#7c3aed" },
  "azure.app-service": { icon: AppWindow, color: "#0891b2" },
  "azure.sql": { icon: Database, color: "#0891b2" },
  "azure.devops": { icon: GitBranch, color: "#0891b2" },
  "tools.slack": { icon: MessageSquare, color: "#7c3aed" },
  "tools.jira": { icon: Ticket, color: "#2563eb" },
  "tools.teams": { icon: Users, color: "#7c3aed" },
  "tools.zoom": { icon: Video, color: "#2563eb" },
  "tools.outlook": { icon: Mail, color: "#0891b2" },
};

export function iconFor(type: string): { icon: LucideIcon; color: string } {
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
