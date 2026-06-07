import { z } from "zod";

export const CreateCompanySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  website: z.string().url().optional(),
  complianceProfileId: z.string().optional(),
});

export type CreateCompanyInput = z.infer<typeof CreateCompanySchema>;
