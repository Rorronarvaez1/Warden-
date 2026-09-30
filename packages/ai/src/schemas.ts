import { z } from 'zod';

export const executiveSummarySchema = z.object({
  summary: z.string().min(1),
  key_risks: z.array(z.string()).max(10),
  recommendations: z.array(z.string()).max(10),
});

export type ExecutiveSummary = z.infer<typeof executiveSummarySchema>;
