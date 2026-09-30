import { z } from 'zod';

const envSchema = z.object({
  SUPABASE_URL: z.url(),
  SUPABASE_SECRET_KEY: z.string().min(1),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_MODEL: z.string().optional(),
  SPIDERFOOT_URL: z.url().optional(),
  QUEUE_VISIBILITY_TIMEOUT: z.coerce.number().int().positive().default(900),
});

export const config = envSchema.parse(process.env);
