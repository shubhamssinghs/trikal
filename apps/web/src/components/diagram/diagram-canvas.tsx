"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ReactFlow, ReactFlowProvider, Background, BackgroundVariant, Controls,
  MiniMap, addEdge, reconnectEdge, useNodesState, useEdgesState, useReactFlow, ConnectionMode,
  type Node, type Edge, type Connection, MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { toPng } from "html-to-image";
import { Trash2, Save, Download, Check, Wand2, ExternalLink, X, Plus, Search, Maximize, Minimize, Keyboard, Copy } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  type DiagramData, type DNode, type DEdge, type DLink, type EdgeLabelPos,
  ICON_TYPE_OPTIONS, SHAPE_TYPE_OPTIONS, EDGE_SHAPE_OPTIONS, EDGE_STYLE_OPTIONS, EDGE_LABELPOS_OPTIONS, BORDER_STYLE_OPTIONS,
  PALETTE, rfTypeFor, isIconNode, isShape, isText, isGroup, isNote, defaultLabelFor, iconFor,
  LINK_TYPES, linkTypeMeta, linkHref,
} from "@/lib/diagram";
import type { LayoutDir } from "./layout";
import { nodeTypes, type NodeData } from "./nodes";
import { edgeTypes } from "./edges";
import { autoLayout } from "./layout";
import { Button, inputClass, Modal } from "../ui";
import { Select } from "../select";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

// Shared toolbar button style — uniform height/padding for a symmetric toolbar.
const TOOLBTN = "inline-flex items-center gap-1 h-8 rounded-lg border border-border px-2.5 text-xs text-muted hover:text-foreground hover:bg-surface-2 transition-colors";

/* ── serialization helpers ──────────────────────────────────────────────── */

type EdgeData = {
  lineStyle: string; shape: string; color?: string; animated?: boolean;
  labelPos?: EdgeLabelPos; labelSize?: number; labelColor?: string; labelBg?: string;
};

const DEFAULT_EDGE_COLOR = "#94a3b8"; // slate-400 — reads on both light & dark canvases

function styledEdge(e: Edge): Edge {
  const d = (e.data ?? {}) as EdgeData;
  const color = d.color || DEFAULT_EDGE_COLOR;
  // The LabeledEdge component owns rendering (path, selection highlight, label).
  return {
    ...e,
    type: "labeled",
    animated: !!d.animated,
    markerEnd: { type: MarkerType.ArrowClosed, color },
    style: { stroke: color },
  };
}

function toFlow(data: DiagramData): { nodes: Node<NodeData>[]; edges: Edge[] } {
  const nodes: Node<NodeData>[] = data.nodes.map((n, i) => {
    const rfType = rfTypeFor(n.type);
    const node: Node<NodeData> = {
      id: n.id,
      type: rfType,
      position: { x: n.x ?? 80 + (i % 4) * 240, y: n.y ?? 80 + Math.floor(i / 4) * 160 },
      data: {
        label: n.label, ntype: n.type, color: n.color, fontSize: n.fontSize, body: n.body, link: n.link,
        fillColor: n.fillColor, borderColor: n.borderColor, borderWidth: n.borderWidth, borderStyle: n.borderStyle, textColor: n.textColor,
      },
    };
    if (typeof n.width === "number") node.width = n.width;
    if (typeof n.height === "number") node.height = n.height;
    // Icon/service nodes need an explicit size so they're resizable (fill their box).
    if (rfType === "service") { node.width = n.width ?? 168; node.height = n.height ?? 56; }
    if (rfType === "container") node.zIndex = -1;
    return node;
  });
  const edges: Edge[] = data.edges.map((e) =>
    styledEdge({
      id: e.id, source: e.from, target: e.to, label: e.label,
      data: {
        lineStyle: e.style ?? "solid", shape: e.shape ?? "smooth", color: e.color, animated: e.animated,
        labelPos: e.labelPos ?? "center", labelSize: e.labelSize, labelColor: e.labelColor, labelBg: e.labelBg,
      },
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
    color: n.data.color, fontSize: n.data.fontSize, body: n.data.body, link: n.data.link,
    fillColor: n.data.fillColor, borderColor: n.data.borderColor, borderWidth: n.data.borderWidth, borderStyle: n.data.borderStyle, textColor: n.data.textColor,
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
      labelPos: d.labelPos, labelSize: d.labelSize, labelColor: d.labelColor, labelBg: d.labelBg,
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
  const [layoutDir, setLayoutDir] = useState<LayoutDir>("LR");
  const [full, setFull] = useState(false);
  const [help, setHelp] = useState(false);
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

  /* ── undo / redo history ──────────────────────────────────────────────── */
  const past = useRef<{ nodes: Node<NodeData>[]; edges: Edge[] }[]>([]);
  const future = useRef<{ nodes: Node<NodeData>[]; edges: Edge[] }[]>([]);
  const snap = () => ({ nodes: JSON.parse(JSON.stringify(nodes)) as Node<NodeData>[], edges: JSON.parse(JSON.stringify(edges)) as Edge[] });
  const record = () => { past.current.push(snap()); if (past.current.length > 60) past.current.shift(); future.current = []; };
  const undo = () => {
    const prev = past.current.pop();
    if (!prev) return;
    future.current.push(snap());
    setNodes(prev.nodes); setEdges(prev.edges); setSelNode(null); setSelEdge(null);
  };
  const redo = () => {
    const nxt = future.current.pop();
    if (!nxt) return;
    past.current.push(snap());
    setNodes(nxt.nodes); setEdges(nxt.edges); setSelNode(null); setSelEdge(null);
  };

  const onConnect = (c: Connection) => {
    record();
    setEdges((eds) => addEdge(styledEdge({ ...c, id: `e${Date.now()}`, data: { lineStyle: "solid", shape: "smooth" } } as Edge), eds));
  };

  /* ── reconnect: drag an edge endpoint onto a different handle ──────────── */
  const reconnectOk = useRef(true);
  const onReconnectStart = () => { reconnectOk.current = false; };
  const onReconnect = (oldEdge: Edge, newConn: Connection) => {
    reconnectOk.current = true;
    record();
    setEdges((els) => reconnectEdge(oldEdge, newConn, els));
  };
  const onReconnectEnd = () => { reconnectOk.current = true; }; // dropped in empty space → keep edge

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
    else if (isNote(type)) { n.width = 190; n.height = 96; }
    else if (type === "shape.circle") { n.width = 96; n.height = 96; }
    else if (isShape(type)) { n.width = 130; n.height = 64; }
    else if (isIconNode(type)) { n.width = 168; n.height = 56; }
    record();
    setNodes((nds) => [...nds, n]);
    setSelEdge(null); setSelNode(id);
  };

  const duplicate = () => {
    if (!selNode) return;
    const src = nodes.find((n) => n.id === selNode);
    if (!src) return;
    record();
    const id = `n${idRef.current++}`;
    const copy: Node<NodeData> = { ...src, id, selected: false, position: { x: src.position.x + 28, y: src.position.y + 28 }, data: { ...src.data } };
    setNodes((nds) => [...nds.map((n) => ({ ...n, selected: false })), copy]);
    setSelNode(id); setSelEdge(null);
  };

  const patchNode = (patch: Partial<NodeData>) => {
    if (!selNode) return;
    setNodes((nds) => nds.map((n) => (n.id === selNode ? { ...n, data: { ...n.data, ...patch } } : n)));
  };
  const changeNodeType = (newType: string) => {
    if (!selNode) return;
    record();
    setNodes((nds) => nds.map((n) => (n.id === selNode ? { ...n, type: rfTypeFor(newType), data: { ...n.data, ntype: newType } } : n)));
  };
  const deleteNode = () => {
    if (!selNode) return;
    record();
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
    record();
    setEdges((eds) => eds.filter((e) => e.id !== selEdge));
    setSelEdge(null);
  };

  const deleteSelection = () => {
    if (selEdge) deleteEdge();
    else if (selNode) deleteNode();
  };

  const tidy = (dir: LayoutDir = layoutDir) => {
    record();
    setLayoutDir(dir);
    setNodes((nds) => autoLayout(nds, edges, dir));
    setTimeout(() => fitView({ duration: 300 }), 60);
  };

  // Keyboard shortcuts (see the ? help panel for the full list).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
      const mod = e.metaKey || e.ctrlKey;
      const k = e.key.toLowerCase();
      if (mod && k === "s") { e.preventDefault(); save(); return; }
      if (mod && k === "z") { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
      if (mod && k === "y") { e.preventDefault(); redo(); return; }
      if (typing) return;
      if (mod && k === "d") { e.preventDefault(); duplicate(); return; }
      if (k === "backspace" || k === "delete") { e.preventDefault(); deleteSelection(); return; }
      if (k === "f") { fitView({ duration: 300 }); return; }
      if (k === "escape") { setSelNode(null); setSelEdge(null); return; }
      if (k === "?" || (e.shiftKey && k === "/")) { setHelp(true); return; }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  });

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
    // Keep editor-only chrome (connection dots, controls, minimap, resize
    // handles, panels) out of the exported image.
    const SKIP = ["react-flow__handle", "react-flow__controls", "react-flow__minimap", "react-flow__panel", "react-flow__attribution", "react-flow__resize-control"];
    const url = await toPng(vp, {
      backgroundColor: getComputedStyle(document.body).backgroundColor || "#0b0f17",
      cacheBust: true,
      pixelRatio: 2,
      filter: (el) => !(el instanceof Element) || !SKIP.some((c) => el.classList?.contains(c)),
    }).catch(() => null);
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
    <div className={`flex flex-col border border-border bg-surface overflow-hidden ${full ? "fixed inset-0 z-[60] rounded-none" : "h-[calc(100vh-5.5rem)] min-h-[460px] rounded-xl"}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-2 shrink-0">
        <input value={title} onChange={(e) => setTitle(e.target.value)} className={`${inputClass} max-w-xs`} placeholder="Diagram title" />
        <PalettePopover onAdd={addNode} />
        <button onClick={() => tidy()} title="Auto-layout" className={TOOLBTN}>
          <Wand2 size={13} /> Tidy
        </button>
        <DirControl value={layoutDir} onChange={(d) => tidy(d)} />
        <div className="flex-1" />
        <button onClick={exportJson} title="Export JSON" className={TOOLBTN}>
          <Download size={13} /> JSON
        </button>
        <button onClick={exportPng} title="Export PNG" className={TOOLBTN}>
          <Download size={13} /> PNG
        </button>
        <button onClick={() => setHelp(true)} title="Keyboard shortcuts (?)" className={`${TOOLBTN} !px-2`}>
          <Keyboard size={14} />
        </button>
        <button onClick={() => { setFull((f) => !f); setTimeout(() => fitView({ duration: 200 }), 80); }} title={full ? "Exit full screen" : "Full screen"} className={`${TOOLBTN} !px-2`}>
          {full ? <Minimize size={14} /> : <Maximize size={14} />}
        </button>
        <Button onClick={save} disabled={saving} className="h-8">
          {saved ? <><Check size={14} /> Saved</> : <><Save size={14} /> {saving ? "Saving…" : "Save"}</>}
        </Button>
      </div>

      <div className="relative flex-1 flex min-h-0">
        {/* Canvas */}
        <div ref={wrapRef} className="flex-1 min-w-0">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            connectionMode={ConnectionMode.Loose}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onReconnectStart={onReconnectStart}
            onReconnect={onReconnect}
            onReconnectEnd={onReconnectEnd}
            onNodeDragStart={() => record()}
            onSelectionChange={({ nodes: sn, edges: se }) => { setSelNode(sn[0]?.id ?? null); setSelEdge(se[0]?.id ?? null); }}
            deleteKeyCode={null}
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
          <Inspector title={isGroup(node.data.ntype) ? "Group" : isText(node.data.ntype) ? "Text" : isNote(node.data.ntype) ? "Note" : "Node"} onDelete={deleteNode}>
            <Labeled label={isText(node.data.ntype) ? "Text" : isNote(node.data.ntype) ? "Title" : "Label"}>
              {isText(node.data.ntype) ? (
                <textarea value={node.data.label} onChange={(e) => patchNode({ label: e.target.value })} rows={3} className={inputClass} />
              ) : (
                <input value={node.data.label} onChange={(e) => patchNode({ label: e.target.value })} className={inputClass} />
              )}
            </Labeled>

            {/* Optional description — for everything except free text & groups. */}
            {!isText(node.data.ntype) && !isGroup(node.data.ntype) && (
              <Labeled label="Description (optional)">
                <textarea value={node.data.body ?? ""} onChange={(e) => patchNode({ body: e.target.value })} rows={isNote(node.data.ntype) ? 4 : 2} className={inputClass} placeholder={isNote(node.data.ntype) ? "Leave a note…" : "Extra detail shown under the label…"} />
              </Labeled>
            )}

            {isIconNode(node.data.ntype) && (
              <Labeled label="Type"><Select value={node.data.ntype} onChange={changeNodeType} options={ICON_TYPE_OPTIONS} placeholder="type" /></Labeled>
            )}
            {isShape(node.data.ntype) && (
              <Labeled label="Shape"><Select value={node.data.ntype} onChange={changeNodeType} options={SHAPE_TYPE_OPTIONS} placeholder="shape" /></Labeled>
            )}

            {/* Text — size (custom) + color, for any node that shows text. */}
            {!isGroup(node.data.ntype) && (
              <div className="grid grid-cols-2 gap-2">
                <Labeled label="Text size">
                  <input type="number" min={8} max={96} value={node.data.fontSize ?? (isText(node.data.ntype) ? 14 : 13)} onChange={(e) => patchNode({ fontSize: Number(e.target.value) || undefined })} className={inputClass} />
                </Labeled>
                <Labeled label="Text color"><ColorRow value={node.data.textColor ?? ""} onChange={(c) => patchNode({ textColor: c || undefined })} /></Labeled>
              </div>
            )}

            {/* Shapes: full fill / border styling. */}
            {isShape(node.data.ntype) ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <Labeled label="Fill color"><ColorRow value={node.data.fillColor ?? ""} onChange={(c) => patchNode({ fillColor: c || undefined })} /></Labeled>
                  <Labeled label="Border color"><ColorRow value={node.data.borderColor ?? node.data.color ?? ""} onChange={(c) => patchNode({ borderColor: c || undefined })} /></Labeled>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Labeled label="Border width">
                    <input type="number" min={0} max={12} value={node.data.borderWidth ?? 2} onChange={(e) => patchNode({ borderWidth: Number(e.target.value) })} className={inputClass} />
                  </Labeled>
                  <Labeled label="Border style"><Select value={node.data.borderStyle ?? "solid"} onChange={(v) => patchNode({ borderStyle: v as NodeData["borderStyle"] })} options={BORDER_STYLE_OPTIONS} placeholder="style" /></Labeled>
                </div>
              </>
            ) : (
              <Labeled label={isNote(node.data.ntype) ? "Accent / fill" : "Color"}>
                <ColorRow value={node.data.color ?? ""} onChange={(c) => patchNode({ color: c || undefined })} />
              </Labeled>
            )}

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
            {(edge.label as string) ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <Labeled label="Label position"><Select value={(edge.data as EdgeData).labelPos ?? "center"} onChange={(v) => patchEdge({ labelPos: v as EdgeLabelPos })} options={EDGE_LABELPOS_OPTIONS} placeholder="position" /></Labeled>
                  <Labeled label="Text size">
                    <Select value={String((edge.data as EdgeData).labelSize ?? 12)} onChange={(v) => patchEdge({ labelSize: Number(v) })} options={[10, 11, 12, 14, 16, 20].map((s) => ({ value: String(s), label: `${s}px` }))} placeholder="size" />
                  </Labeled>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Labeled label="Text color"><ColorRow value={(edge.data as EdgeData).labelColor ?? ""} onChange={(c) => patchEdge({ labelColor: c || undefined })} /></Labeled>
                  <Labeled label="Label fill"><ColorRow value={(edge.data as EdgeData).labelBg ?? ""} onChange={(c) => patchEdge({ labelBg: c || undefined })} /></Labeled>
                </div>
              </>
            ) : null}
            <Labeled label="Line"><Select value={(edge.data as EdgeData).lineStyle} onChange={(v) => patchEdge({ lineStyle: v })} options={EDGE_STYLE_OPTIONS} placeholder="style" /></Labeled>
            <Labeled label="Routing"><Select value={(edge.data as EdgeData).shape} onChange={(v) => patchEdge({ shape: v })} options={EDGE_SHAPE_OPTIONS} placeholder="routing" /></Labeled>
            <Labeled label="Color"><ColorRow value={(edge.data as EdgeData).color ?? ""} onChange={(c) => patchEdge({ color: c || undefined })} /></Labeled>
            <label className="flex items-center gap-2 text-xs text-foreground">
              <input type="checkbox" checked={!!(edge.data as EdgeData).animated} onChange={(e) => patchEdge({ animated: e.target.checked })} />
              Animated flow
            </label>
            <p className="text-[11px] text-muted">Drag either endpoint onto a different dot to reconnect.</p>
          </Inspector>
        )}
      </div>

      {help && <ShortcutsModal onClose={() => setHelp(false)} />}
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

/* ── Palette popover (searchable logo grid) ─────────────────────────────── */

function PaletteTile({ type, label, onClick }: { type: string; label: string; onClick: () => void }) {
  const { icon: Icon, color, svg } = iconFor(type);
  return (
    <button onClick={onClick} title={label} className="flex flex-col items-center gap-1 rounded-lg p-1.5 hover:bg-surface-2 transition-colors">
      <span className="grid place-items-center w-9 h-9 rounded-md bg-white border border-black/5 shrink-0">
        {svg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={svg} alt="" width={20} height={20} className="object-contain" draggable={false} />
        ) : (
          <Icon size={17} style={{ color }} />
        )}
      </span>
      <span className="w-full text-[10px] leading-tight text-center text-foreground truncate">{label}</span>
    </button>
  );
}

function PalettePopover({ onAdd }: { onAdd: (type: string) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as HTMLElement | null)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const ql = q.trim().toLowerCase();
  const cats = PALETTE
    .map((c) => ({ category: c.category, items: c.items.filter((it) => !ql || it.label.toLowerCase().includes(ql) || it.type.toLowerCase().includes(ql)) }))
    .filter((c) => c.items.length);

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="inline-flex items-center gap-1 h-8 rounded-lg bg-blue-600 px-2.5 text-xs font-medium text-white hover:bg-blue-500">
        <Plus size={13} /> Insert
      </button>
      {open && (
        <div className="absolute z-30 mt-1 left-0 w-[330px] max-h-[440px] flex flex-col rounded-xl border border-border bg-surface shadow-2xl">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search React, RDS, Postgres…" className={`${inputClass} pl-8`} />
            </div>
          </div>
          <div className="overflow-y-auto p-2">
            {cats.map((cat) => (
              <div key={cat.category} className="mb-2">
                <p className="px-1 mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted">{cat.category}</p>
                <div className="grid grid-cols-4 gap-0.5">
                  {cat.items.map((it) => (
                    <PaletteTile key={it.type} type={it.type} label={it.label} onClick={() => { onAdd(it.type); setOpen(false); }} />
                  ))}
                </div>
              </div>
            ))}
            {cats.length === 0 && <p className="text-xs text-muted px-1 py-6 text-center">No matches.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

const DIRS: { value: LayoutDir; label: string }[] = [
  { value: "LR", label: "→" },
  { value: "RL", label: "←" },
  { value: "TB", label: "↓" },
  { value: "BT", label: "↑" },
];

function DirControl({ value, onChange }: { value: LayoutDir; onChange: (d: LayoutDir) => void }) {
  return (
    <div className="inline-flex items-center h-8 rounded-lg border border-border overflow-hidden" title="Layout direction">
      {DIRS.map((d) => (
        <button
          key={d.value}
          onClick={() => onChange(d.value)}
          className={`h-full w-7 grid place-items-center text-xs transition-colors ${value === d.value ? "bg-blue-600/10 text-blue-500 font-semibold" : "text-muted hover:text-foreground hover:bg-surface-2"}`}
        >
          {d.label}
        </button>
      ))}
    </div>
  );
}

const SHORTCUTS: { keys: string; action: string }[] = [
  { keys: "⌘/Ctrl + S", action: "Save diagram" },
  { keys: "⌘/Ctrl + Z", action: "Undo" },
  { keys: "⌘/Ctrl + ⇧ + Z", action: "Redo" },
  { keys: "⌘/Ctrl + Y", action: "Redo" },
  { keys: "⌘/Ctrl + D", action: "Duplicate selected node" },
  { keys: "Delete / Backspace", action: "Delete selected node or connection" },
  { keys: "F", action: "Fit diagram to view" },
  { keys: "Esc", action: "Deselect" },
  { keys: "?", action: "Show this help" },
  { keys: "Drag dot → dot", action: "Connect two nodes" },
  { keys: "Drag an edge end", action: "Reconnect to a different dot" },
  { keys: "Scroll / pinch", action: "Zoom · drag canvas to pan" },
];

function ShortcutsModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Keyboard shortcuts" onClose={onClose}>
      <div className="space-y-1.5">
        {SHORTCUTS.map((s) => (
          <div key={s.keys + s.action} className="flex items-center justify-between gap-4 text-xs">
            <span className="text-muted">{s.action}</span>
            <kbd className="shrink-0 rounded border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-foreground">{s.keys}</kbd>
          </div>
        ))}
      </div>
    </Modal>
  );
}

export function DiagramCanvas({ projectId, diagramId, initial }: { projectId: string; diagramId: string; initial: DiagramData }) {
  return (
    <ReactFlowProvider>
      <Editor projectId={projectId} diagramId={diagramId} initial={initial} />
    </ReactFlowProvider>
  );
}
