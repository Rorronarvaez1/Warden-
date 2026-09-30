// Motor del KRI. Solo funciones puras: recibe hallazgos y una versión de pesos,
// devuelve la calificación. Sin acceso a BD ni red, para que sea testeable y
// para poder recalcular calificaciones históricas.
//
// La fórmula está pendiente de definir: ver docs/scoring-model.md.

import type { Confidence, Grade, RiskDomainKey, Severity } from '@warden/shared';

export interface ScoringFinding {
  riskDomain: RiskDomainKey;
  severity: Severity;
  confidence: Confidence;
}

/** Espejo de scoring_weight_items para una versión de pesos. */
export interface WeightItem {
  riskDomain: RiskDomainKey;
  /** Porcentaje; la suma de todos los dominios es 100. */
  weight: number;
  severityPoints: Partial<Record<Severity, number>>;
  confidenceFactors: Partial<Record<Confidence, number>>;
}

export interface DomainScore {
  riskDomain: RiskDomainKey;
  score: number;
  grade: Grade;
  findingsCount: number;
}

export interface ScoreResult {
  globalScore: number;
  grade: Grade;
  domains: DomainScore[];
}

export class ScoringModelNotDefinedError extends Error {
  constructor() {
    super('El modelo de scoring del KRI aún no está definido (docs/scoring-model.md).');
    this.name = 'ScoringModelNotDefinedError';
  }
}

export function computeScore(_findings: ScoringFinding[], _weights: WeightItem[]): ScoreResult {
  throw new ScoringModelNotDefinedError();
}
