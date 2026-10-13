import { assertSubjectDomain } from '../target';
import type { AnalysisModule } from '../types';
import { credentialsEvidenceSchema } from './schemas';

export const credentialsModule: AnalysisModule = {
  key: 'credentials',
  analyze(input, target) {
    const evidence = credentialsEvidenceSchema.parse(input);
    assertSubjectDomain(evidence.subjectDomain, target);
    return {
      schemaVersion: 1, moduleKey: 'credentials', riskDomain: null,
      sourceKey: evidence.sourceKey, subjectDomain: evidence.subjectDomain, observedAt: evidence.observedAt,
      // Un proveedor nunca garantiza que se hayan identificado todas las brechas existentes.
      coverage: 'partial',
      observations: evidence.breaches.length ? evidence.breaches.map((breach) => ({
        ruleId: `credentials.breach.${breach.breachId}`,
        state: 'observed' as const,
        summary: 'Cuentas del dominio aparecen en una brecha registrada por Have I Been Pwned.',
        details: { breachId: breach.breachId, affectedAccounts: breach.affectedAccounts,
          passwordExposure: breach.includesPasswords === null ? 'unknown'
            : breach.includesPasswords ? 'reported' : 'not-reported',
          verification: breach.verified === null ? 'unknown' : breach.verified ? 'verified' : 'unverified',
          attribution: evidence.attribution },
      })) : [{ ruleId: 'credentials.breaches', state: 'absent',
        summary: 'HIBP no devolvió brechas para este dominio; no demuestra ausencia de filtraciones.',
        details: { attribution: evidence.attribution } }],
    };
  },
};
