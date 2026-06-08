import dagre from "@dagrejs/dagre";
import type { Node, Edge } from "@xyflow/react";

/**
 * Tidy a graph left-to-right with dagre. Group and text nodes are left in
 * place (they're containers/annotations, not part of the flow).
 */
export function autoLayout<T extends Node>(nodes: T[], edges: Edge[], rankdir: "LR" | "TB" = "LR"): T[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir, nodesep: 60, ranksep: 90, marginx: 40, marginy: 40 });

  const flowNodes = nodes.filter((n) => n.type !== "group" && n.type !== "text");
  const inFlow = new Set(flowNodes.map((n) => n.id));

  for (const n of flowNodes) {
    g.setNode(n.id, { width: n.width ?? 180, height: n.height ?? 60 });
  }
  for (const e of edges) {
    if (inFlow.has(e.source) && inFlow.has(e.target)) g.setEdge(e.source, e.target);
  }

  dagre.layout(g);

  return nodes.map((n) => {
    const pos = g.node(n.id);
    if (!pos) return n;
    return { ...n, position: { x: pos.x - (n.width ?? 180) / 2, y: pos.y - (n.height ?? 60) / 2 } };
  });
}
