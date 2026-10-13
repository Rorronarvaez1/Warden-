import type { RiskDomainKey } from '@warden/shared';

export const ANALYSIS_MODULE_KEYS = ['email', 'credentials'] as const;
export type AnalysisModuleKey = (typeof ANALYSIS_MODULE_KEYS)[number];
export type ObservationState = 'observed' | 'absent' | 'unknown';

export interface AnalysisTarget {
  primaryDomain: string;
  /** Solo dominios cuya atribución haya sido confirmada. */
  confirmedDomains: readonly string[];
  /** Selectores proporcionados por el analista; no se enumeran por fuerza bruta. */
  dkimSelectors?: readonly string[];
}

export interface AnalysisObservation {
  ruleId: string;
  state: ObservationState;
  summary: string;
  /** Solo metadatos, nunca cuentas, contraseñas ni evidencia cruda. */
  details: Record<string, string | number | boolean>;
}

export interface AnalysisResult {
  schemaVersion: 1;
  moduleKey: AnalysisModuleKey;
  /** credentials aún no tiene un dominio aprobado en el catálogo del KRI. */
  riskDomain: RiskDomainKey | null;
  sourceKey: string;
  subjectDomain: string;
  observedAt: string;
  coverage: 'complete' | 'partial';
  observations: AnalysisObservation[];
}

export interface AnalysisModule {
  key: AnalysisModuleKey;
  analyze(evidence: unknown, target: AnalysisTarget): AnalysisResult;
}

export interface AnalysisContext {
  signal: AbortSignal;
  getSecret(secretRef: string): string | undefined;
}

export interface EvidenceProvider {
  sourceKey: string;
  moduleKey: AnalysisModuleKey;
  isNoContact: true;
  collect(target: AnalysisTarget, context: AnalysisContext): Promise<unknown>;
}

export interface AnalysisSourcePolicy {
  sourceKey: string;
  isEnabled: boolean;
  isNoContact: boolean;
}

export type AnalysisExecution =
  | { sourceKey: string; status: 'ok'; result: AnalysisResult }
  | { sourceKey: string; status: 'skipped' | 'blocked' | 'failed'; message: string };
