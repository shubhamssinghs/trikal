import { z } from "zod";

export const TranscriptAnalysisOutputSchema = z.object({
  summary: z.string(),
  decisions: z.array(z.object({
    text: z.string(),
    owner: z.string().optional(),
  })),
  actionItems: z.array(z.object({
    text: z.string(),
    owner: z.string().optional(),
    dueDate: z.string().optional(),
  })),
  openQuestions: z.array(z.string()),
  risks: z.array(z.object({
    text: z.string(),
    severity: z.enum(["low", "medium", "high"]).default("medium"),
  })),
  scopeChanges: z.array(z.string()),
  suggestedTickets: z.array(z.object({
    title: z.string(),
    description: z.string(),
    priority: z.enum(["low", "medium", "high"]).default("medium"),
  })),
});

export type TranscriptAnalysisOutput = z.infer<typeof TranscriptAnalysisOutputSchema>;
