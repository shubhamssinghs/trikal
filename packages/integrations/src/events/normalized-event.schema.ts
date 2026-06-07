import { z } from "zod";

export const NormalizedEventSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  companyId: z.string().optional(),
  projectId: z.string().optional(),
  source: z.string(),
  sourceType: z.string(),
  externalId: z.string(),
  title: z.string(),
  body: z.string().optional(),
  author: z.object({
    name: z.string(),
    email: z.string().optional(),
  }).optional(),
  occurredAt: z.coerce.date(),
  classification: z.string().default("internal"),
  metadata: z.record(z.unknown()).optional(),
});

export type NormalizedEventInput = z.infer<typeof NormalizedEventSchema>;
