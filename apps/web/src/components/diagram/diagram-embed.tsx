"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ReactFlow, Background, BackgroundVariant, type Node, type Edge, MarkerType } from "@xyflow/react";
import { ExternalLink, Loader2, AlertTriangle } from "lucide-react";
import { nodeTypes, type NodeData } from "./nodes";
import { rfTypeFor, isMermaidKind, type DiagramData } from "@/lib/diagram";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

/** Render a Mermaid source string to inline SVG. */
export function MermaidBlock({ code }: { code: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const idRef = useRef(`md${Math.floor(performance.now())}`);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({ startOnLoad: false, theme: document.documentElement.classList.contains("dark") ? "dark" : "default", securityLevel: "strict" });
        const { svg } = await mermaid.render(idRef.current, code.trim());
        if (!cancelled && ref.current) ref.current.innerHTML = svg;
      } catch { if (!cancelled) setError(true); }
    })();
    return () => { cancelled = true; };
  }, [code]);

  if (error) return <pre className="text-[11px] text-muted whitespace-pre-wrap rounded-lg border border-border bg-surface-2/30 p-2 my-2">{code}</pre>;
  return <div ref={ref} className="my-2 grid place-items-center rounded-lg border border-border bg-surface-2/20 p-2 overflow-x-auto" />;
}

function toFlow(data: DiagramData): { nodes: Node<NodeData>[]; edges: Edge[] } {
  const nodes: Node<NodeData>[] = (data.nodes ?? []).map((n, i) => {
    const node: Node<NodeData> = {
      id: n.id, type: rfTypeFor(n.type),
      position: { x: n.x ?? 80 + (i % 4) * 220, y: n.y ?? 80 + Math.floor(i / 4) * 140 },
      data: { label: n.label, ntype: n.type, color: n.color, fontSize: n.fontSize, fillColor: n.fillColor, borderColor: n.borderColor, borderWidth: n.borderWidth, borderStyle: n.borderStyle, textColor: n.textColor, body: n.body, link: n.link },
    };
    if (typeof n.width === "number") node.width = n.width;
    if (typeof n.height === "number") node.height = n.height;
    return node;
  });
  const edges: Edge[] = (data.edges ?? []).map((e) => ({
    id: e.id, source: e.from, target: e.to, label: e.label,
    markerEnd: { type: MarkerType.ArrowClosed, color: e.color || "#94a3b8" },
    style: { stroke: e.color || "#94a3b8", strokeWidth: 1.5 },
  }));
  return { nodes, edges };
}

type Diagram = { id: string; title: string; kind?: string; schemaJson: DiagramData };

/** Inline preview of a project diagram referenced by id (live for graph diagrams, SVG for mermaid). */
export function DiagramEmbed({ diagramId, projectId }: { diagramId: string; projectId?: string }) {
  const [diagram, setDiagram] = useState<Diagram | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/diagrams/${diagramId}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setDiagram).catch(() => setMissing(true));
  }, [diagramId]);

  if (missing) return <div className="my-2 text-xs text-muted inline-flex items-center gap-1"><AlertTriangle size={12} /> Diagram not found ({diagramId}).</div>;
  if (!diagram) return <div className="my-2 text-xs text-muted inline-flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Loading diagram…</div>;

  const href = projectId ? `/projects/${projectId}/diagrams/${diagram.id}` : `/diagrams/${diagram.id}`;
  const header = (
    <div className="flex items-center justify-between mb-1">
      <span className="text-[11px] font-medium text-foreground">{diagram.title}</span>
      <Link href={href} className="text-[11px] text-blue-400 hover:text-blue-300 inline-flex items-center gap-0.5">Open <ExternalLink size={10} /></Link>
    </div>
  );

  if (isMermaidKind(diagram.kind) && diagram.schemaJson?.mermaid) {
    return <div className="my-2 rounded-lg border border-border bg-surface-2/20 p-2">{header}<MermaidBlock code={diagram.schemaJson.mermaid} /></div>;
  }

  const { nodes, edges } = toFlow(diagram.schemaJson);
  return (
    <div className="my-2 rounded-lg border border-border bg-surface-2/20 p-2">
      {header}
      <div className="h-64 rounded-md overflow-hidden border border-border">
        <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView nodesDraggable={false} nodesConnectable={false} elementsSelectable={false} proOptions={{ hideAttribution: true }} zoomOnScroll={false} preventScrolling={false}>
          <Background variant={BackgroundVariant.Dots} gap={18} size={1} color="rgb(var(--border))" />
        </ReactFlow>
      </div>
    </div>
  );
}
