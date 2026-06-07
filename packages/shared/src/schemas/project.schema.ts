import { z } from "zod";

export const ProjectStatusValues = ["ACTIVE", "AT_RISK", "ON_HOLD", "COMPLETED", "ARCHIVED"] as const;
export const ProjectStatusSchema = z.enum(ProjectStatusValues);
export type ProjectStatus = z.infer<typeof ProjectStatusSchema>;

export const CreateProjectSchema = z.object({
  name: z.string().min(1),
  companyId: z.string(),
  description: z.string().optional(),
  programId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  targetEndDate: z.string().datetime().optional(),
  complianceProfileId: z.string().optional(),
});

export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
