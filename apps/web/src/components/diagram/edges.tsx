"use client";

import {
  BaseEdge, EdgeLabelRenderer, getBezierPath, getSmoothStepPath, getStraightPath,
  type EdgeProps,
} from "@xyflow/react";

const DEFAULT_EDGE_COLOR = "#94a3b8";
const SELECTED = "#3b82f6";

type EData = {
  lineStyle?: string; shape?: string; color?: string;
  labelPos?: "top" | "center" | "bottom"; labelSize?: number; labelColor?: string; labelBg?: string;
};

function dash(style?: string) {
  if (style === "dashed") return "6 4";
  if (style === "dotted") return "2 3";
  return undefined;
}

/**
 * Custom edge: highlights when selected, and renders its label as an inline-
 * styled pill that can sit above / on / below the line (and export cleanly).
 */
export function LabeledEdge({
  id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerEnd, data, label, selected,
}: EdgeProps) {
  const d = (data ?? {}) as EData;
  const p = { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition };
  let path: string, lx: number, ly: number;
  if (d.shape === "straight") [path, lx, ly] = getStraightPath(p);
  else if (d.shape === "bezier") [path, lx, ly] = getBezierPath(p);
  else if (d.shape === "step") [path, lx, ly] = getSmoothStepPath({ ...p, borderRadius: 0 });
  else [path, lx, ly] = getSmoothStepPath(p);

  const stroke = selected ? SELECTED : d.color || DEFAULT_EDGE_COLOR;
  const strokeWidth = selected ? 2.5 : 1.5;
  const offset = d.labelPos === "top" ? -14 : d.labelPos === "bottom" ? 14 : 0;

  return (
    <>
      <BaseEdge id={id} path={path} markerEnd={markerEnd} style={{ stroke, strokeWidth, strokeDasharray: dash(d.lineStyle) }} />
      {label ? (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan"
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${lx}px, ${ly + offset}px)`,
              fontSize: d.labelSize ?? 12,
              fontWeight: 600,
              color: d.labelColor ?? "#1e293b",
              background: d.labelBg ?? "#ffffff",
              padding: "1px 6px",
              borderRadius: 4,
              border: `1px solid ${selected ? SELECTED : "#e2e8f0"}`,
              pointerEvents: "all",
            }}
          >
            {label as string}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}

export const edgeTypes = { labeled: LabeledEdge };
