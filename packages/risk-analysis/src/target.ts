import { domainSchema } from './schemas';
import type { AnalysisTarget } from './types';

export function assertSubjectDomain(subjectDomain: string, target: AnalysisTarget): void {
  const approved = [target.primaryDomain, ...target.confirmedDomains].map((v) => domainSchema.parse(v));
  if (!approved.includes(domainSchema.parse(subjectDomain))) {
    throw new Error('La evidencia no corresponde a un dominio confirmado de la empresa.');
  }
}
