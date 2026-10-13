import { assertSubjectDomain } from '../target';
import type { AnalysisModule, AnalysisObservation } from '../types';
import { emailEvidenceSchema } from './schemas';

export const emailModule: AnalysisModule = {
  key: 'email',
  analyze(input, target) {
    const evidence = emailEvidenceSchema.parse(input);
    assertSubjectDomain(evidence.subjectDomain, target);
    const observations: AnalysisObservation[] = [];

    for (const protocol of ['spf', 'dmarc', 'mx'] as const) {
      const query = evidence[protocol];
      if (query.status !== 'ok') {
        observations.push({ ruleId: `email.${protocol}.records`, state: 'unknown',
          summary: `No se pudo consultar ${protocol.toUpperCase()}.`, details: {} });
        continue;
      }
      const records = protocol === 'spf'
        ? query.records.filter((v) => /^v=spf1(?:\s|$)/i.test(v))
        : protocol === 'dmarc'
          ? query.records.filter((v) => /^v=DMARC1(?:;|$)/.test(v)) : query.records;
      observations.push({ ruleId: `email.${protocol}.records`,
        state: records.length ? 'observed' : 'absent',
        summary: records.length ? `Se observaron registros ${protocol.toUpperCase()}.`
          : `No se observaron registros ${protocol.toUpperCase()} en el nombre consultado.`,
        details: { recordCount: records.length } });

      if (protocol !== 'mx' && records.length > 1) {
        observations.push({ ruleId: `email.${protocol}.multiple-records`, state: 'observed',
          summary: `Se observaron múltiples registros ${protocol.toUpperCase()}.`, details: {} });
      }
      if (protocol === 'spf' && records.length === 1) {
        const allowsAll = /(?:^|\s)\+?all(?:\s|$)/i.test(records[0]!);
        observations.push({ ruleId: 'email.spf.allows-all', state: allowsAll ? 'observed' : 'absent',
          summary: allowsAll ? 'SPF contiene un mecanismo all que permite cualquier emisor.'
            : 'No se observó un mecanismo all permisivo; no se evaluaron includes ni redirects.', details: {} });
      }
      if (protocol === 'dmarc' && records.length === 1) {
        const policies = [...records[0]!.matchAll(/(?:^|;)\s*p\s*=\s*([^;\s]+)\s*(?=;|$)/g)];
        const policy = policies[0]?.[1];
        const known = policies.length === 1 && ['none', 'quarantine', 'reject'].includes(policy ?? '');
        observations.push({ ruleId: 'email.dmarc.policy', state: known ? 'observed' : 'unknown',
          summary: known ? `La política DMARC publicada es ${policy}.`
            : 'No se pudo identificar una política DMARC única y reconocida.',
          details: known ? { policy: policy! } : {} });
      }
      if (protocol === 'mx' && records.some((v) => /^0\s+\.$/.test(v))) {
        observations.push({ ruleId: 'email.mx.null', state: 'observed',
          summary: 'Se publicó Null MX: el dominio declara que no recibe correo.',
          details: { conflictingRecords: records.length > 1 } });
      }
    }

    if (!evidence.dkim.length) {
      observations.push({ ruleId: 'email.dkim.selectors', state: 'unknown',
        summary: 'No hay selectores DKIM conocidos; no se puede inferir ausencia de DKIM.', details: {} });
    }
    for (const { selector, observation } of evidence.dkim) {
      observations.push({ ruleId: `email.dkim.selector.${selector}`,
        state: observation.status !== 'ok' ? 'unknown' : observation.records.length ? 'observed' : 'absent',
        summary: `Observación DNS del selector DKIM ${selector}; no valida firmas de mensajes.`,
        details: { recordCount: observation.status === 'ok' ? observation.records.length : 0 } });
    }

    return { schemaVersion: 1, moduleKey: 'email', riskDomain: 'email',
      sourceKey: evidence.sourceKey, subjectDomain: evidence.subjectDomain, observedAt: evidence.observedAt,
      // Es inspección de publicación DNS; no es una validación completa de los protocolos.
      coverage: 'partial', observations };
  },
};
