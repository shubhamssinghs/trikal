import { z } from "zod";

export const RecommendationTypeValues = [
  "CREATE_TICKET",
  "SEND_MESSAGE",
  "UPDATE_DOCUMENT",
  "CREATE_DIAGRAM",
  "SCHEDULE_MEETING",
  "ESCALATE_RISK",
] as const;

export const RecommendationSchema = z.object({
  type: z.enum(RecommendationTypeValues),
  title: z.string(),
  description: z.string().optional(),
  payload: z.record(z.unknown()).optional(),
});

export type RecommendationType = typeof RecommendationTypeValues[number];
export type RecommendationInput = z.infer<typeof RecommendationSchema>;
