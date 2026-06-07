import { z } from "zod";

export const DiagramLayerSchema = z.object({
  id: z.string(),
  label: z.string(),
  order: z.number().optional(),
});

export const DiagramNodeSchema = z.object({
  id: z.string(),
  type: z.string(),
  label: z.string(),
  layer: z.string().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const DiagramEdgeSchema = z.object({
  id: z.string(),
  from: z.string(),
  to: z.string(),
  label: z.string().optional(),
  style: z.enum(["solid", "dashed", "dotted"]).default("solid"),
});

export const DiagramSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  style: z.string().default("default"),
  layers: z.array(DiagramLayerSchema).default([]),
  nodes: z.array(DiagramNodeSchema),
  edges: z.array(DiagramEdgeSchema).default([]),
});

export type DiagramLayer = z.infer<typeof DiagramLayerSchema>;
export type DiagramNode = z.infer<typeof DiagramNodeSchema>;
export type DiagramEdge = z.infer<typeof DiagramEdgeSchema>;
export type DiagramData = z.infer<typeof DiagramSchema>;
