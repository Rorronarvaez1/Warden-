import { credentialsEvidenceSchema, type CredentialsEvidence } from '@warden/risk-analysis';
import { z } from 'zod';

export const hibpDomainResponseSchema = z.record(z.string(), z.array(z.string().regex(/^[a-zA-Z0-9_-]{1,128}$/)));
export const hibpBreachCatalogSchema = z.array(z.object({
  Name: z.string(), DataClasses: z.array(z.string()), IsVerified: z.boolean(),
}));

/** Descarta aliases inmediatamente: solo salen conteos por brecha. */
export function mapHibpDomain(
  input: unknown,
  catalog: unknown,
  domain: string,
  observedAt: string,
): CredentialsEvidence {
  const accounts = hibpDomainResponseSchema.parse(input);
  const metadata = new Map(hibpBreachCatalogSchema.parse(catalog).map((v) => [v.Name, v]));
  const counts = new Map<string, number>();
  for (const breaches of Object.values(accounts)) {
    for (const name of new Set(breaches)) counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return credentialsEvidenceSchema.parse({
    schemaVersion: 1, sourceKey: 'hibp', subjectDomain: domain, observedAt,
    attribution: 'Have I Been Pwned — https://haveibeenpwned.com',
    breaches: [...counts].sort(([a], [b]) => a.localeCompare(b)).map(([breachId, affectedAccounts]) => {
      const breach = metadata.get(breachId);
      return { breachId, affectedAccounts,
        includesPasswords: breach ? breach.DataClasses.includes('Passwords') : null,
        verified: breach?.IsVerified ?? null };
    }),
  });
}
