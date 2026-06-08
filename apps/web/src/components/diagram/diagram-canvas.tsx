"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  ReactFlow, ReactFlowProvider, Background, BackgroundVariant, Controls,
  MiniMap, Handle, Position, addEdge, useNodesState, useEdgesState,
  type Node, type Edge, type Connection, type NodeProps, MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { toPng } from "html-to-image";
import { Plus, Trash2, Save, Download, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { iconFor, NODE_TYPE_OPTIONS, type DiagramData, type DNode, type DEdge } from "@/lib/diagram";
import { Button, inputClass } from "../ui";
import { Select } from "../select";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

type NodeData = { label: string; ntype: string };

/** Themed node card with input + output handles. */
function DiagramNode({ data, selected }: NodeProps<Node<NodeData>>) {
  const { icon: Icon, color } = iconFor(data.ntype);
  return (
    <div
      className="rounded-lg border bg-surface shadow-sm px-3 py-2 flex items-center gap-2 min-w-[120px]"
      style={{ borderColor: selected ? color : "rgb(var(--border))", boxShadow: selected ? `0 0 0 1px ${color}` : undefined }}
    >
      <Handle type="target" position={Position.Left} style={{ background: color, width: 8, height: 8 }} />
      <span className="grid place-items-center rounded-md shrink-0" style={{ width: 26, height: 26, backgroundColor: `${color}1f`, color }}>
        <Icon size={15} />
      </span>
      <span className="text-xs font-medium text-foreground truncate max-w-[160px]">{data.label}</span>
      <Handle type="source" position={Position.Right} style={{ background: color, width: 8, height: 8 }} />
    </div>
  );
}

const nodeTypes = { diagram: DiagramNode };

function edgeStyleToFlow(style?: string) {
  if (style === "dashed") return "6 4";
  if (style === "dotted") return "2 3";
  return undefined;
}

function toFlow(data: DiagramData): { nodes: Node<NodeData>[]; edges: Edge[] } {
  const nodes: Node<NodeData>[] = data.nodes.map((n, i) => ({
    id: n.id,
    type: "diagram",
    position: { x: n.x ?? 80 + (i % 4) * 240, y: n.y ?? 80 + Math.floor(i / 4) * 160 },
    data: { label: n.label, ntype: n.type },
  }));
  const edges: Edge[] = data.edges.map((e) => ({
    id: e.id,
    source: e.from,
    target: e.to,
    label: e.label,
    markerEnd: { type: MarkerType.ArrowClosed },
    style: { strokeDasharray: edgeStyleToFlow(e.style) },
    data: { lineStyle: e.style ?? "solid" },
  }));
  return { nodes, edges };
}

function fromFlow(title: string, description: string, nodes: Node<NodeData>[], edges: Edge[]): DiagramData {
  const dnodes: DNode[] = nodes.map((n) => ({
    id: n.id, type: n.data.ntype, label: n.data.label,
    x: Math.round(n.position.x), y: Math.round(n.position.y),
  }));
  const dedges: DEdge[] = edges.map((e) => ({
    id: e.id, from: e.source, to: e.target,
    label: typeof e.label === "string" ? e.label : undefined,
    style: (e.data?.lineStyle as DEdge["style"]) ?? "solid",
  }));
  return { title, description, style: "default", layers: [], nodes: dnodes, edges: dedges };
}

function Editor({ diagramId, initial }: { diagramId: string; initial: DiagramData }) {
  const router = useRouter();
  const flow = useMemo(() => toFlow(initial), [initial]);
  const [nodes, setNodes, onNodesChange] = useNodesState(flow.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(flow.edges);
  const [title, setTitle] = useState(initial.title);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const idRef = useRef(initial.nodes.length + 1);

  const selected = nodes.find((n) => n.id === selectedId) ?? null;

  const onConnect = useCallback(
    (c: Connection) => setEdges((eds) => addEdge({ ...c, markerEnd: { type: MarkerType.ArrowClosed }, data: { lineStyle: "solid" } }, eds)),
    [setEdges],
  );

  const addNode = () => {
    const id = `n${idRef.current++}`;
    setNodes((nds) => [
      ...nds,
      { id, type: "diagram", position: { x: 120 + Math.random() * 200, y: 120 + Math.random() * 160 }, data: { label: "New node", ntype: "generic.api" } },
    ]);
    setSelectedId(id);
  };

  const patchSelected = (patch: Partial<NodeData>) => {
    if (!selectedId) return;
    setNodes((nds) => nds.map((n) => (n.id === selectedId ? { ...n, data: { ...n.data, ...patch } } : n)));
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedId));
    setEdges((eds) => eds.filter((e) => e.source !== selectedId && e.target !== selectedId));
    setSelectedId(null);
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
    <div className="flex flex-col h-[calc(100vh-180px)] min-h-[520px] rounded-xl border border-border bg-surface overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-2 shrink-0">
        <input value={title} onChange={(e) => setTitle(e.target.value)} className={`${inputClass} max-w-xs`} placeholder="Diagram title" />
        <button onClick={addNode} className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-2 text-xs text-foreground hover:bg-surface-2">
          <Plus size={13} /> Node
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

      <div className="relative flex-1 flex">
        <div ref={wrapRef} className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onSelectionChange={({ nodes: sel }) => setSelectedId(sel[0]?.id ?? null)}
            fitView
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="rgb(var(--border))" />
            <Controls className="!bg-surface !border-border" />
            <MiniMap pannable zoomable className="!bg-surface-2 !border !border-border" maskColor="rgba(0,0,0,0.4)" />
          </ReactFlow>
        </div>

        {/* Inspector */}
        {selected && (
          <div className="w-60 shrink-0 border-l border-border bg-surface p-3 space-y-3 overflow-y-auto">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-foreground">Node</h4>
              <button onClick={deleteSelected} title="Delete node" className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-red-500/10"><Trash2 size={13} /></button>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-muted mb-1">Label</label>
              <input value={selected.data.label} onChange={(e) => patchSelected({ label: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-muted mb-1">Type</label>
              <Select value={selected.data.ntype} onChange={(v) => patchSelected({ ntype: v })} options={NODE_TYPE_OPTIONS} placeholder="type" />
            </div>
            <p className="text-[11px] text-muted">Drag from a node&apos;s right dot to another node&apos;s left dot to connect. Select an edge and press Backspace to remove it.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function DiagramCanvas({ diagramId, initial }: { diagramId: string; initial: DiagramData }) {
  return (
    <ReactFlowProvider>
      <Editor diagramId={diagramId} initial={initial} />
    </ReactFlowProvider>
  );
}
