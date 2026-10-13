import { z } from 'zod';
import { dnsObservationSchema, evidenceEnvelope } from '../schemas';

export const emailEvidenceSchema = z.strictObject({
  ...evidenceEnvelope,
  spf: dnsObservationSchema,
  dmarc: dnsObservationSchema,
  mx: dnsObservationSchema,
  dkim: z.array(z.strictObject({
    selector: z.string().regex(/^[a-zA-Z0-9_-]{1,63}$/),
    observation: dnsObservationSchema,
  })).max(20),
});
export type EmailEvidence = z.infer<typeof emailEvidenceSchema>;
