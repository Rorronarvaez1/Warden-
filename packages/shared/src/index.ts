// Valores compartidos entre web, worker y paquetes. Deben coincidir con los
// CHECK constraints y el seed de supabase/.

export const RISK_DOMAIN_KEYS = [
  'exposure',
  'email',
  'certs',
  'secrets',
  'reputation',
  'impersonation',
] as const;
export type RiskDomainKey = (typeof RISK_DOMAIN_KEYS)[number];

export const SEVERITIES = ['critical', 'high', 'medium', 'low', 'info'] as const;
export type Severity = (typeof SEVERITIES)[number];

export const CONFIDENCES = ['high', 'medium', 'low'] as const;
export type Confidence = (typeof CONFIDENCES)[number];

export const GRADES = ['A', 'B', 'C', 'D', 'E', 'F'] as const;
export type Grade = (typeof GRADES)[number];

export const ASSET_TYPES = ['domain', 'subdomain', 'ip', 'ip_range', 'asn'] as const;
export type AssetType = (typeof ASSET_TYPES)[number];

export const FINDING_STATUSES = ['open', 'false_positive', 'accepted', 'resolved'] as const;
export type FindingStatus = (typeof FINDING_STATUSES)[number];

export const SCAN_STATUSES = ['queued', 'running', 'completed', 'failed'] as const;
export type ScanStatus = (typeof SCAN_STATUSES)[number];

export const SCAN_SOURCE_STATUSES = ['ok', 'failed', 'skipped', 'blocked'] as const;
export type ScanSourceStatus = (typeof SCAN_SOURCE_STATUSES)[number];

export const QUEUES = {
  scanRequests: 'scan_requests',
  reportRequests: 'report_requests',
} as const;

export interface ScanRequestMessage {
  scan_id: string;
}
