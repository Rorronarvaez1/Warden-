// Formas que consumen los componentes del dashboard. Las llenan los datos reales
// (dashboard-data.ts) o los de ejemplo (mock-dashboard.ts) cuando no hay sesión en dev.
//
// El KRI y las notas son null mientras no exista el modelo de scoring
// (docs/scoring-model.md): no hay filas en `scores` que mostrar.

import type { AssetType, Confidence, Grade, RiskDomainKey, ScanSourceStatus, ScanStatus, Severity } from '@warden/shared';

export interface CompanyOverview {
  id: string;
  name: string;
  primaryDomain: string;
  score: number | null;
  grade: Grade | null;
  /** Puntaje del escaneo anterior, para mostrar la variación. */
  previousScore: number | null;
  lastScanAt: string | null;
  /** Próxima ejecución programada (schedules.next_run_at). */
  nextScanAt: string | null;
  openFindings: number;
  openCriticalFindings: number;
}

export type AttributionStatus = 'pending' | 'confirmed' | 'discarded';

export interface AssetRow {
  id: string;
  type: AssetType;
  value: string;
  status: AttributionStatus;
  discoverySource: 'auto' | 'manual';
  lastSeen: string;
}

export interface DomainScoreRow {
  key: RiskDomainKey;
  name: string;
  /** Peso en el KRI según la versión activa; null si no hay pesos definidos. */
  weight: number | null;
  score: number | null;
  grade: Grade | null;
  findingsCount: number;
}

export interface FindingRow {
  id: string;
  indicator: string;
  domain: RiskDomainKey;
  severity: Severity;
  confidence: Confidence;
  source: string;
  observedAt: string;
}

export interface TrendPoint {
  scannedAt: string;
  score: number;
}

export interface ScanSummary {
  id: string;
  status: ScanStatus;
  createdAt: string;
  finishedAt: string | null;
  errorMessage: string | null;
}

/** Estado de una fuente del dominio `exposure` y su resultado en el último escaneo. */
export interface ExposureSource {
  sourceKey: string;
  name: string;
  enabled: boolean;
  lastRun: { status: ScanSourceStatus; itemsReturned: number; message: string | null } | null;
}

export interface ExposureService {
  findingId: string;
  port: number;
  service: string;
  severity: Severity;
  confidence: Confidence;
}

export interface ExposureCve {
  findingId: string;
  cve: string;
  severity: Severity;
  inKev: boolean;
  epss: number | null;
}

/** Hallazgos abiertos de exposición agrupados por IP. */
export interface ExposureHost {
  ip: string;
  /** Dominios confirmados que resolvieron a la IP. */
  resolvedFrom: string[];
  worstSeverity: Severity;
  services: ExposureService[];
  cves: ExposureCve[];
  observedAt: string;
}

export interface ExposureOverview {
  source: ExposureSource | null;
  hosts: ExposureHost[];
}

export interface DashboardData {
  /** 'mock' solo en desarrollo, sin sesión y con WARDEN_DEV_SKIP_AUTH. */
  mode: 'live' | 'mock';
  isAdmin: boolean;
  company: CompanyOverview;
  domains: DomainScoreRow[];
  assets: AssetRow[];
  recentFindings: FindingRow[];
  trend: TrendPoint[];
  exposure: ExposureOverview;
  lastScan: ScanSummary | null;
}

export const DOMAIN_LABELS: Record<RiskDomainKey, string> = {
  exposure: 'Exposición de servicios',
  email: 'Seguridad de correo',
  certs: 'Certificados',
  secrets: 'Secretos filtrados',
  reputation: 'Reputación',
  impersonation: 'Suplantación',
};
