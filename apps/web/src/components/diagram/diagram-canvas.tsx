"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ReactFlow, ReactFlowProvider, Background, BackgroundVariant, Controls,
  MiniMap, addEdge, useNodesState, useEdgesState, useReactFlow,
  type Node, type Edge, type Connection, MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { toPng } from "html-to-image";
import { Trash2, Save, Download, Check, Wand2, ExternalLink, X } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  type DiagramData, type DNode, type DEdge, type DLink,
  ICON_TYPE_OPTIONS, SHAPE_TYPE_OPTIONS, EDGE_SHAPE_OPTIONS, EDGE_STYLE_OPTIONS,
  PALETTE, rfTypeFor, isIconNode, isShape, isText, isGroup, defaultLabelFor,
  LINK_TYPES, linkTypeMeta, linkHref,
} from "@/lib/diagram";
import { nodeTypes, type NodeData } from "./nodes";
import { autoLayout } from "./layout";
import { Button, inputClass } from "../ui";
import { Select } from "../select";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

/* ── serialization helpers ──────────────────────────────────────────────── */

function edgeStyleToDash(style?: string) {
  if (style === "dashed") return "6 4";
  if (style === "dotted") return "2 3";
  return undefined;
}
function edgeShapeToFlow(shape?: string) {
  if (shape === "bezier") return "default";
  if (shape === "step") return "step";
  if (shape === "straight") return "straight";
  return "smoothstep";
}
type EdgeData = { lineStyle: string; shape: string; color?: string; animated?: boolean };

const DEFAULT_EDGE_COLOR = "#94a3b8"; // slate-400 — reads on both light & dark canvases

function styledEdge(e: Edge): Edge {
  const d = (e.data ?? {}) as EdgeData;
  const color = d.color || DEFAULT_EDGE_COLOR;
  return {
    ...e,
    type: edgeShapeToFlow(d.shape),
    animated: !!d.animated,
    markerEnd: { type: MarkerType.ArrowClosed, color },
    // Inline stroke + label styles (not CSS classes) so PNG export renders
    // the lines and label pills instead of dropping them / filling them black.
    style: { strokeDasharray: edgeStyleToDash(d.lineStyle), stroke: color, strokeWidth: 1.5 },
    labelStyle: { fill: "#1e293b", fontSize: 12, fontWeight: 600 },
    labelBgStyle: { fill: "#ffffff", fillOpacity: 0.92, stroke: "#e2e8f0", strokeWidth: 1 },
    labelBgPadding: [6, 3],
    labelBgBorderRadius: 4,
  };
}

function toFlow(data: DiagramData): { nodes: Node<NodeData>[]; edges: Edge[] } {
  const nodes: Node<NodeData>[] = data.nodes.map((n, i) => {
    const rfType = rfTypeFor(n.type);
    const node: Node<NodeData> = {
      id: n.id,
      type: rfType,
      position: { x: n.x ?? 80 + (i % 4) * 240, y: n.y ?? 80 + Math.floor(i / 4) * 160 },
      data: { label: n.label, ntype: n.type, color: n.color, fontSize: n.fontSize, link: n.link },
    };
    if (typeof n.width === "number") node.width = n.width;
    if (typeof n.height === "number") node.height = n.height;
    if (rfType === "group") node.zIndex = -1;
    return node;
  });
  const edges: Edge[] = data.edges.map((e) =>
    styledEdge({
      id: e.id, source: e.from, target: e.to, label: e.label,
      data: { lineStyle: e.style ?? "solid", shape: e.shape ?? "smooth", color: e.color, animated: e.animated },
    }),
  );
  return { nodes, edges };
}

function fromFlow(title: string, description: string, nodes: Node<NodeData>[], edges: Edge[]): DiagramData {
  const dnodes: DNode[] = nodes.map((n) => ({
    id: n.id, type: n.data.ntype, label: n.data.label,
    x: Math.round(n.position.x), y: Math.round(n.position.y),
    width: typeof n.width === "number" ? Math.round(n.width) : undefined,
    height: typeof n.height === "number" ? Math.round(n.height) : undefined,
    color: n.data.color, fontSize: n.data.fontSize, link: n.data.link,
  }));
  const dedges: DEdge[] = edges.map((e) => {
    const d = (e.data ?? {}) as EdgeData;
    return {
      id: e.id, from: e.source, to: e.target,
      label: typeof e.label === "string" ? e.label : undefined,
      style: (d.lineStyle as DEdge["style"]) ?? "solid",
      shape: d.shape as DEdge["shape"],
      color: d.color,
      animated: d.animated || undefined,
    };
  });
  return { title, description, style: "default", layers: [], nodes: dnodes, edges: dedges };
}

/* ── editor ─────────────────────────────────────────────────────────────── */

type LinkOption = { id: string; label: string };
type LinkTargets = Record<string, LinkOption[]>;

function Editor({ projectId, diagramId, initial }: { projectId: string; diagramId: string; initial: DiagramData }) {
  const router = useRouter();
  const flow = useMemo(() => toFlow(initial), [initial]);
  const [nodes, setNodes, onNodesChange] = useNodesState(flow.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(flow.edges);
  const [title, setTitle] = useState(initial.title);
  const [selNode, setSelNode] = useState<string | null>(null);
  const [selEdge, setSelEdge] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [linkType, setLinkType] = useState("knowledge");
  const [targets, setTargets] = useState<LinkTargets>({});
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const idRef = useRef(initial.nodes.length + initial.edges.length + 1);
  const { screenToFlowPosition, fitView } = useReactFlow();

  useEffect(() => {
    if (!projectId) return; // standalone diagrams have no project entities to link
    fetch(`${API_BASE}/diagrams/link-targets?projectId=${projectId}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : {}))
      .then(setTargets)
      .catch(() => {});
  }, [projectId]);

  // Freshly AI-generated diagrams ship with raw grid coordinates that overlap
  // edges/labels — tidy them once on first open so the diagram reads cleanly.
  const didAutoLayout = useRef(false);
  useEffect(() => {
    if (!initial.autoLayout || didAutoLayout.current) return;
    didAutoLayout.current = true;
    setNodes((nds) => autoLayout(nds, edges));
    setTimeout(() => fitView({ duration: 300 }), 80);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const node = nodes.find((n) => n.id === selNode) ?? null;
  const edge = edges.find((e) => e.id === selEdge) ?? null;

  const onConnect = useCallback(
    (c: Connection) =>
      setEdges((eds) =>
        addEdge(
          styledEdge({ ...c, id: `e${Date.now()}`, data: { lineStyle: "solid", shape: "smooth" } } as Edge),
          eds,
        ),
      ),
    [setEdges],
  );

  const addNode = (type: string) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    const center = rect
      ? screenToFlowPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
      : { x: 200, y: 160 };
    const id = `n${idRef.current++}`;
    const n: Node<NodeData> = {
      id,
      type: rfTypeFor(type),
      position: { x: Math.round(center.x - 70), y: Math.round(center.y - 30) },
      data: { label: defaultLabelFor(type), ntype: type },
    };
    if (isGroup(type)) { n.width = 260; n.height = 170; n.zIndex = -1; }
    else if (isShape(type)) { n.width = 130; n.height = 64; }
    setNodes((nds) => [...nds, n]);
    setSelEdge(null); setSelNode(id);
  };

  const patchNode = (patch: Partial<NodeData>) => {
    if (!selNode) return;
    setNodes((nds) => nds.map((n) => (n.id === selNode ? { ...n, data: { ...n.data, ...patch } } : n)));
  };
  const changeNodeType = (newType: string) => {
    if (!selNode) return;
    setNodes((nds) => nds.map((n) => (n.id === selNode ? { ...n, type: rfTypeFor(newType), data: { ...n.data, ntype: newType } } : n)));
  };
  const deleteNode = () => {
    if (!selNode) return;
    setNodes((nds) => nds.filter((n) => n.id !== selNode));
    setEdges((eds) => eds.filter((e) => e.source !== selNode && e.target !== selNode));
    setSelNode(null);
  };

  const patchEdge = (patch: Partial<EdgeData> & { label?: string }) => {
    if (!selEdge) return;
    setEdges((eds) =>
      eds.map((e) => {
        if (e.id !== selEdge) return e;
        const label = patch.label !== undefined ? patch.label : (e.label as string | undefined);
        const data = { ...(e.data as EdgeData), ...patch };
        return styledEdge({ ...e, label, data });
      }),
    );
  };
  const deleteEdge = () => {
    if (!selEdge) return;
    setEdges((eds) => eds.filter((e) => e.id !== selEdge));
    setSelEdge(null);
  };

  const tidy = () => {
    setNodes((nds) => autoLayout(nds, edges));
    setTimeout(() => fitView({ duration: 300 }), 60);
  };

  const save = async () => {
    setSaving(true); setSaved(false);
    const schemaJson = fromFlow(title.trim() || "Untitled diagram", initial.description ?? "", nodes, edges);
    const res = await fetch(`${API_BASE}/diagrams/${diagramId}`, {
      credentials: "include", method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: schemaJson.title, schemaJson }),
    }).catch(() => null);
    setSaving(false);
    if (res?.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000); router.refresh(); }
  };

  const exportPng = async () => {
    const vp = wrapRef.current?.querySelector(".react-flow__viewport") as HTMLElement | null;
    if (!vp) return;
    const url = await toPng(vp, { backgroundColor: getComputedStyle(document.body).backgroundColor || "#0b0f17", cacheBust: true, pixelRatio: 2 }).catch(() => null);
    if (!url) return;
    const a = document.createElement("a");
    a.href = url; a.download = `${title.replace(/\s+/g, "-").toLowerCase() || "diagram"}.png`; a.click();
  };
  const exportJson = () => {
    const schema = fromFlow(title, initial.description ?? "", nodes, edges);
    const blob = new Blob([JSON.stringify(schema, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `${title.replace(/\s+/g, "-").toLowerCase() || "diagram"}.json`; a.click();
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] min-h-[560px] rounded-xl border border-border bg-surface overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-2 shrink-0">
        <input value={title} onChange={(e) => setTitle(e.target.value)} className={`${inputClass} max-w-xs`} placeholder="Diagram title" />
        <button onClick={tidy} title="Auto-layout" className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-2 text-xs text-foreground hover:bg-surface-2">
          <Wand2 size={13} /> Tidy
        </button>
        <div className="flex-1" />
        <button onClick={exportJson} className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-2 text-xs text-muted hover:text-foreground hover:bg-surface-2">
          <Download size={13} /> JSON
        </button>
        <button onClick={exportPng} className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-2 text-xs text-muted hover:text-foreground hover:bg-surface-2">
          <Download size={13} /> PNG
        </button>
        <Button onClick={save} disabled={saving}>
          {saved ? <><Check size={14} /> Saved</> : <><Save size={14} /> {saving ? "Saving…" : "Save"}</>}
        </Button>
      </div>

      <div className="relative flex-1 flex min-h-0">
        {/* Palette */}
        <div className="w-44 shrink-0 border-r border-border bg-surface overflow-y-auto p-2">
          {PALETTE.map((cat) => (
            <div key={cat.category} className="mb-3">
              <p className="px-1 mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted">{cat.category}</p>
              <div className="space-y-0.5">
                {cat.items.map((it) => (
                  <button
                    key={it.type}
                    onClick={() => addNode(it.type)}
                    className="w-full text-left text-xs text-foreground rounded-md px-2 py-1.5 hover:bg-surface-2 transition-colors"
                  >
                    {it.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Canvas */}
        <div ref={wrapRef} className="flex-1 min-w-0">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onSelectionChange={({ nodes: sn, edges: se }) => { setSelNode(sn[0]?.id ?? null); setSelEdge(se[0]?.id ?? null); }}
            deleteKeyCode={["Backspace", "Delete"]}
            fitView
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="rgb(var(--border))" />
            <Controls className="!bg-surface !border-border" />
            <MiniMap pannable zoomable className="!bg-surface-2 !border !border-border" maskColor="rgba(0,0,0,0.4)" />
          </ReactFlow>
        </div>

        {/* Inspector */}
        {node && (
          <Inspector title={isGroup(node.data.ntype) ? "Group" : isText(node.data.ntype) ? "Text" : "Node"} onDelete={deleteNode}>
            <Labeled label={isText(node.data.ntype) ? "Text" : "Label"}>
              {isText(node.data.ntype) ? (
                <textarea value={node.data.label} onChange={(e) => patchNode({ label: e.target.value })} rows={3} className={inputClass} />
              ) : (
                <input value={node.data.label} onChange={(e) => patchNode({ label: e.target.value })} className={inputClass} />
              )}
            </Labeled>

            {isIconNode(node.data.ntype) && (
              <Labeled label="Type"><Select value={node.data.ntype} onChange={changeNodeType} options={ICON_TYPE_OPTIONS} placeholder="type" /></Labeled>
            )}
            {isShape(node.data.ntype) && (
              <Labeled label="Shape"><Select value={node.data.ntype} onChange={changeNodeType} options={SHAPE_TYPE_OPTIONS} placeholder="shape" /></Labeled>
            )}
            {isText(node.data.ntype) && (
              <Labeled label="Font size">
                <Select
                  value={String(node.data.fontSize ?? 14)}
                  onChange={(v) => patchNode({ fontSize: Number(v) })}
                  options={[12, 14, 16, 20, 24, 32].map((s) => ({ value: String(s), label: `${s}px` }))}
                  placeholder="size"
                />
              </Labeled>
            )}

            <Labeled label="Color">
              <ColorRow value={node.data.color ?? ""} onChange={(c) => patchNode({ color: c || undefined })} />
            </Labeled>

            {projectId && (
            <Labeled label="Link to project">
              {node.data.link ? (
                <div className="flex items-center gap-1.5">
                  <Link
                    href={linkHref(projectId, node.data.link)}
                    className="flex-1 min-w-0 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs truncate"
                    style={{ color: linkTypeMeta(node.data.link.type).color, backgroundColor: `${linkTypeMeta(node.data.link.type).color}14` }}
                  >
                    <ExternalLink size={11} className="shrink-0" />
                    <span className="truncate">{node.data.link.label}</span>
                  </Link>
                  <button onClick={() => patchNode({ link: undefined })} title="Unlink" className="p-1 rounded text-muted hover:text-foreground hover:bg-surface-2"><X size={13} /></button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Select value={linkType} onChange={setLinkType} options={LINK_TYPES.map((t) => ({ value: t.value, label: t.label }))} placeholder="type" />
                  <Select
                    value=""
                    onChange={(id) => {
                      const opt = (targets[linkType] ?? []).find((t) => t.id === id);
                      if (opt) patchNode({ link: { type: linkType, id: opt.id, label: opt.label } });
                    }}
                    options={(targets[linkType] ?? []).map((t) => ({ value: t.id, label: t.label }))}
                    placeholder={(targets[linkType] ?? []).length ? `Select ${linkTypeMeta(linkType).label.toLowerCase()}…` : "None in this project"}
                  />
                </div>
              )}
            </Labeled>
            )}

            {!isText(node.data.ntype) && (
              <p className="text-[11px] text-muted">Drag the right dot to another node&apos;s left dot to connect. {!isIconNode(node.data.ntype) && "Drag a corner to resize."}</p>
            )}
          </Inspector>
        )}

        {!node && edge && (
          <Inspector title="Connection" onDelete={deleteEdge}>
            <Labeled label="Label">
              <input value={(edge.label as string) ?? ""} onChange={(e) => patchEdge({ label: e.target.value })} className={inputClass} placeholder="e.g. HTTPS" />
            </Labeled>
            <Labeled label="Line"><Select value={(edge.data as EdgeData).lineStyle} onChange={(v) => patchEdge({ lineStyle: v })} options={EDGE_STYLE_OPTIONS} placeholder="style" /></Labeled>
            <Labeled label="Routing"><Select value={(edge.data as EdgeData).shape} onChange={(v) => patchEdge({ shape: v })} options={EDGE_SHAPE_OPTIONS} placeholder="routing" /></Labeled>
            <Labeled label="Color"><ColorRow value={(edge.data as EdgeData).color ?? ""} onChange={(c) => patchEdge({ color: c || undefined })} /></Labeled>
            <label className="flex items-center gap-2 text-xs text-foreground">
              <input type="checkbox" checked={!!(edge.data as EdgeData).animated} onChange={(e) => patchEdge({ animated: e.target.checked })} />
              Animated flow
            </label>
          </Inspector>
        )}
      </div>
    </div>
  );
}

function Inspector({ title, onDelete, children }: { title: string; onDelete: () => void; children: React.ReactNode }) {
  return (
    <div className="w-64 shrink-0 border-l border-border bg-surface p-3 space-y-3 overflow-y-auto">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-foreground">{title}</h4>
        <button onClick={onDelete} title="Delete" className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-red-500/10"><Trash2 size={13} /></button>
      </div>
      {children}
    </div>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-muted mb-1">{label}</label>
      {children}
    </div>
  );
}

function ColorRow({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <input type="color" value={value || "#64748b"} onChange={(e) => onChange(e.target.value)} className="h-8 w-9 shrink-0 rounded-md border border-border bg-surface cursor-pointer p-0.5" />
      {value ? (
        <button onClick={() => onChange("")} className="text-[11px] text-muted hover:text-foreground">Reset</button>
      ) : (
        <span className="text-[11px] text-muted">Default</span>
      )}
    </div>
  );
}

export function DiagramCanvas({ projectId, diagramId, initial }: { projectId: string; diagramId: string; initial: DiagramData }) {
  return (
    <ReactFlowProvider>
      <Editor projectId={projectId} diagramId={diagramId} initial={initial} />
    </ReactFlowProvider>
  );
}
