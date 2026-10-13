// Datos de ejemplo para el dashboard mientras no hay escaneos reales.
// Las formas imitan las tablas de Supabase (companies, scores, score_domains,
// findings) para que cambiar a datos reales sea reemplazar este import por queries.
//
// Supuesto: puntaje 0–100 (más alto es mejor). El modelo real está pendiente:
// ver docs/scoring-model.md.

import type { Confidence, Grade, RiskDomainKey, Severity } from '@warden/shared';

export interface DashboardStats {
  companiesCount: number;
  scansLast30d: number;
  avgScore: number;
  avgGrade: Grade;
  openCriticalFindings: number;
}

export interface CompanyRow {
  id: string;
  name: string;
  primaryDomain: string;
  grade: Grade;
  score: number;
  criticalFindings: number;
  lastScanAt: string;
}

export interface DomainScoreRow {
  key: RiskDomainKey;
  name: string;
  weight: number;
  score: number;
  grade: Grade;
  findingsCount: number;
}

export interface FindingRow {
  id: string;
  company: string;
  indicator: string;
  domain: RiskDomainKey;
  severity: Severity;
  confidence: Confidence;
  source: string;
  observedAt: string;
}

export interface TrendPoint {
  label: string;
  score: number;
}

export const DOMAIN_LABELS: Record<RiskDomainKey, string> = {
  exposure: 'Exposición de servicios',
  email: 'Seguridad de correo',
  certs: 'Certificados',
  secrets: 'Secretos filtrados',
  reputation: 'Reputación',
  impersonation: 'Suplantación',
};

export const stats: DashboardStats = {
  companiesCount: 8,
  scansLast30d: 23,
  avgScore: 74.6,
  avgGrade: 'C',
  openCriticalFindings: 5,
};

export const companies: CompanyRow[] = [
  { id: 'c1', name: 'Banco Andino', primaryDomain: 'bancoandino.com', grade: 'B', score: 84.2, criticalFindings: 0, lastScanAt: '2026-10-06T14:10:00Z' },
  { id: 'c2', name: 'Logística Norte', primaryDomain: 'lognorte.mx', grade: 'D', score: 61.5, criticalFindings: 2, lastScanAt: '2026-10-05T09:30:00Z' },
  { id: 'c3', name: 'Seguros Atlas', primaryDomain: 'segurosatlas.com', grade: 'A', score: 92.8, criticalFindings: 0, lastScanAt: '2026-10-07T08:00:00Z' },
  { id: 'c4', name: 'Clínica San Rafael', primaryDomain: 'clinicasanrafael.org', grade: 'C', score: 73.1, criticalFindings: 1, lastScanAt: '2026-10-03T17:45:00Z' },
  { id: 'c5', name: 'Retail Express', primaryDomain: 'retailexpress.com', grade: 'F', score: 42.9, criticalFindings: 2, lastScanAt: '2026-10-06T11:20:00Z' },
  { id: 'c6', name: 'Grupo Minero Sur', primaryDomain: 'gminerosur.cl', grade: 'C', score: 70.4, criticalFindings: 0, lastScanAt: '2026-09-30T13:00:00Z' },
  { id: 'c7', name: 'Telecom Pacífico', primaryDomain: 'telpacifico.net', grade: 'B', score: 81.0, criticalFindings: 0, lastScanAt: '2026-10-04T10:15:00Z' },
  { id: 'c8', name: 'Universidad Central', primaryDomain: 'ucentral.edu', grade: 'C', score: 70.9, criticalFindings: 0, lastScanAt: '2026-10-02T16:40:00Z' },
];

// Promedio de todas las empresas por dominio. Los pesos vienen del diagrama de arquitectura.
export const domainScores: DomainScoreRow[] = [
  { key: 'exposure', name: DOMAIN_LABELS.exposure, weight: 25, score: 68.0, grade: 'D', findingsCount: 14 },
  { key: 'email', name: DOMAIN_LABELS.email, weight: 20, score: 77.5, grade: 'C', findingsCount: 9 },
  { key: 'certs', name: DOMAIN_LABELS.certs, weight: 15, score: 88.0, grade: 'B', findingsCount: 4 },
  { key: 'secrets', name: DOMAIN_LABELS.secrets, weight: 15, score: 71.0, grade: 'C', findingsCount: 3 },
  { key: 'reputation', name: DOMAIN_LABELS.reputation, weight: 15, score: 91.5, grade: 'A', findingsCount: 1 },
  { key: 'impersonation', name: DOMAIN_LABELS.impersonation, weight: 10, score: 58.0, grade: 'F', findingsCount: 7 },
];

export const recentFindings: FindingRow[] = [
  { id: 'f1', company: 'Retail Express', indicator: 'RDP (3389) expuesto en 201.140.22.8', domain: 'exposure', severity: 'critical', confidence: 'high', source: 'Shodan', observedAt: '2026-10-06T11:20:00Z' },
  { id: 'f2', company: 'Logística Norte', indicator: 'Llave de AWS en repositorio público', domain: 'secrets', severity: 'critical', confidence: 'medium', source: 'GitHub', observedAt: '2026-10-05T09:30:00Z' },
  { id: 'f3', company: 'Clínica San Rafael', indicator: 'DMARC con política p=none', domain: 'email', severity: 'medium', confidence: 'high', source: 'DNS público', observedAt: '2026-10-03T17:45:00Z' },
  { id: 'f4', company: 'Retail Express', indicator: 'Dominio parecido: retai1express.com', domain: 'impersonation', severity: 'high', confidence: 'medium', source: 'dnstwist', observedAt: '2026-10-06T11:20:00Z' },
  { id: 'f5', company: 'Grupo Minero Sur', indicator: 'Certificado vence en 6 días', domain: 'certs', severity: 'low', confidence: 'high', source: 'crt.sh', observedAt: '2026-09-30T13:00:00Z' },
  { id: 'f6', company: 'Logística Norte', indicator: 'IP en lista de botnets', domain: 'reputation', severity: 'high', confidence: 'low', source: 'abuse.ch', observedAt: '2026-10-05T09:30:00Z' },
];

// Puntaje promedio semanal de las últimas 12 semanas.
export const trend: TrendPoint[] = [
  { label: 'S30', score: 66.2 },
  { label: 'S31', score: 67.0 },
  { label: 'S32', score: 66.4 },
  { label: 'S33', score: 68.1 },
  { label: 'S34', score: 69.5 },
  { label: 'S35', score: 69.0 },
  { label: 'S36', score: 70.8 },
  { label: 'S37', score: 71.6 },
  { label: 'S38', score: 72.3 },
  { label: 'S39', score: 73.0 },
  { label: 'S40', score: 73.9 },
  { label: 'S41', score: 74.6 },
];
