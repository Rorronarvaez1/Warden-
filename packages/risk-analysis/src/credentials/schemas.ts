import { z } from 'zod';
import { evidenceEnvelope } from '../schemas';

export const credentialsEvidenceSchema = z.strictObject({
  ...evidenceEnvelope,
  attribution: z.literal('Have I Been Pwned — https://haveibeenpwned.com'),
  breaches: z.array(z.strictObject({
    breachId: z.string().regex(/^[a-zA-Z0-9_-]{1,128}$/),
    affectedAccounts: z.number().int().positive(),
    includesPasswords: z.boolean().nullable(),
    verified: z.boolean().nullable(),
  })).max(10000),
}).refine((v) => new Set(v.breaches.map((b) => b.breachId)).size === v.breaches.length,
  'Los identificadores de brecha deben ser únicos.');
export type CredentialsEvidence = z.infer<typeof credentialsEvidenceSchema>;
