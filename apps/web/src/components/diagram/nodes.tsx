"use client";

import { Link2 } from "lucide-react";
import { Handle, Position, NodeResizer, type NodeProps, type Node } from "@xyflow/react";
import { iconFor, shapeKindOf, linkTypeMeta, type DLink } from "@/lib/diagram";

export type NodeData = {
  label: string;
  ntype: string;
  color?: string;
  fontSize?: number;
  link?: DLink;
};

/** Small badge shown on a node that's linked to a project entity. */
function LinkBadge({ link }: { link?: DLink }) {
  if (!link) return null;
  const c = linkTypeMeta(link.type).color;
  return (
    <span
      className="absolute -top-2 -right-2 grid place-items-center w-4 h-4 rounded-full border border-surface"
      style={{ backgroundColor: c, color: "#fff" }}
      title={`${linkTypeMeta(link.type).label}: ${link.label}`}
    >
      <Link2 size={9} />
    </span>
  );
}

const HSTYLE = { width: 9, height: 9 };

/**
 * Handles on all four sides. With ConnectionMode.Loose (set on the canvas)
 * every handle works as both source and target, so links can enter/leave from
 * the top, bottom, left or right — needed for top-to-bottom layouts.
 */
function Handles({ color }: { color: string }) {
  const s = { ...HSTYLE, background: color };
  return (
    <>
      <Handle id="t" type="source" position={Position.Top} style={s} />
      <Handle id="r" type="source" position={Position.Right} style={s} />
      <Handle id="b" type="source" position={Position.Bottom} style={s} />
      <Handle id="l" type="source" position={Position.Left} style={s} />
    </>
  );
}

/** Service / brand icon node. */
export function ServiceNode({ data, selected }: NodeProps<Node<NodeData>>) {
  const { icon: Icon, color, svg } = iconFor(data.ntype);
  const accent = data.color || color;
  return (
    <div
      className="rounded-lg border bg-surface shadow-sm px-3 py-2 flex items-center gap-2 min-w-[120px]"
      style={{ borderColor: selected ? accent : "rgb(var(--border))", boxShadow: selected ? `0 0 0 1px ${accent}` : undefined }}
    >
      <LinkBadge link={data.link} />
      <Handles color={accent} />
      {svg ? (
        // White chip keeps dark-glyph logos (Next.js, Vercel, Kafka…) visible on any theme.
        <span className="grid place-items-center rounded-md shrink-0 bg-white border border-black/5" style={{ width: 28, height: 28 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={svg} alt="" width={20} height={20} className="object-contain" draggable={false} />
        </span>
      ) : (
        <span className="grid place-items-center rounded-md shrink-0" style={{ width: 26, height: 26, backgroundColor: `${accent}1f`, color: accent }}>
          <Icon size={15} />
        </span>
      )}
      <span className="text-xs font-medium text-foreground truncate max-w-[180px]">{data.label}</span>
    </div>
  );
}

const SHAPE_CLIP: Partial<Record<string, string>> = {
  diamond: "polygon(50% 0, 100% 50%, 50% 100%, 0 50%)",
  hexagon: "polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%)",
  parallelogram: "polygon(18% 0, 100% 0, 82% 100%, 0 100%)",
  triangle: "polygon(50% 4%, 100% 100%, 0 100%)",
  note: "polygon(0 0, 82% 0, 100% 26%, 100% 100%, 0 100%)",
};
const SHAPE_LABEL_PAD: Partial<Record<string, string>> = {
  diamond: "0 18%",
  hexagon: "0 16%",
  parallelogram: "0 14%",
  triangle: "32% 8% 0",
};

/** Geometric shape node (rectangle / rounded / circle / diamond / cylinder / hexagon / parallelogram / triangle / note). */
export function ShapeNode({ data, selected }: NodeProps<Node<NodeData>>) {
  const kind = shapeKindOf(data.ntype) ?? "rectangle";
  const color = data.color || "#64748b";
  const radius =
    kind === "rounded" ? "0.6rem" : kind === "circle" ? "9999px" : kind === "cylinder" ? "50% / 16px" : "0";
  const clip = SHAPE_CLIP[kind];

  return (
    <div className="relative w-full h-full" style={{ minWidth: 90, minHeight: 56 }}>
      <NodeResizer color={color} isVisible={selected} minWidth={90} minHeight={56} keepAspectRatio={kind === "circle"} />
      <LinkBadge link={data.link} />
      <Handles color={color} />
      <div
        className="w-full h-full grid place-items-center text-center px-3"
        style={{
          border: `2px solid ${color}`,
          backgroundColor: `${color}14`,
          borderRadius: radius,
          clipPath: clip,
        }}
      >
        <span className="text-xs font-medium text-foreground leading-tight" style={{ padding: SHAPE_LABEL_PAD[kind] }}>
          {data.label}
        </span>
      </div>
    </div>
  );
}

/** Free text / annotation — no box, no handles. */
export function TextNode({ data, selected }: NodeProps<Node<NodeData>>) {
  return (
    <div
      className="px-1 py-0.5 rounded"
      style={{
        color: data.color || "rgb(var(--foreground))",
        fontSize: data.fontSize ?? 14,
        outline: selected ? "1px dashed rgb(var(--muted))" : "none",
        whiteSpace: "pre-wrap",
        maxWidth: 320,
      }}
    >
      {data.label || "Text"}
    </div>
  );
}

/** Resizable labeled container drawn behind other nodes (visual grouping). */
export function GroupNode({ data, selected }: NodeProps<Node<NodeData>>) {
  const color = data.color || "#64748b";
  return (
    <div className="relative w-full h-full" style={{ minWidth: 160, minHeight: 120 }}>
      <NodeResizer color={color} isVisible={selected} minWidth={160} minHeight={120} />
      <div
        className="w-full h-full rounded-xl"
        style={{ border: `1.5px dashed ${color}`, backgroundColor: `${color}0d` }}
      />
      <span
        className="absolute top-1.5 left-2.5 text-[11px] font-semibold uppercase tracking-wide rounded px-1.5 py-0.5"
        style={{ color, backgroundColor: "rgb(var(--surface))" }}
      >
        {data.label}
      </span>
    </div>
  );
}

export const nodeTypes = {
  service: ServiceNode,
  shape: ShapeNode,
  text: TextNode,
  group: GroupNode,
};
