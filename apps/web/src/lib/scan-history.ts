// Historial de escaneos de la empresa evaluada con el resultado de cada fuente
// (tablas scans + scan_sources), para diagnosticar fallos sin ir a la BD.

import { SCAN_SOURCE_STATUSES, SCAN_STATUSES, type ScanSourceStatus, type ScanStatus } from '@warden/shared';
import { isSourceFailure, loadActiveCompany, oneOf, parseCdnHosts } from './dashboard-data';
import type { ScanSummary } from './dashboard-types';
import { createClient } from './supabase/server';

const HISTORY_LIMIT = 50;

export interface ScanSourceRun {
  sourceKey: string;
  name: string;
  status: ScanSourceStatus;
  /** Total previo a la migración del desglose; sirve para filas antiguas. */
  itemsReturned: number;
  assetsReturned: number;
  findingsReturned: number;
  /** IPs omitidas por ser de un CDN. */
  cdnCount: number;
  latencyMs: number | null;
  message: string | null;
}

export interface ScanHistoryRow {
  id: string;
  status: ScanStatus;
  trigger: 'manual' | 'scheduled';
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  errorMessage: string | null;
  sources: ScanSourceRun[];
}

export type ScanHistoryState =
  | { kind: 'ready'; company: { id: string; name: string; primaryDomain: string }; scans: ScanHistoryRow[] }
  | { kind: 'no-company' }
  /** Dev con WARDEN_DEV_SKIP_AUTH y sin sesión: no hay datos que consultar. */
  | { kind: 'no-session' };

export async function loadScanHistory(): Promise<ScanHistoryState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { kind: 'no-session' };

  const company = await loadActiveCompany(supabase);
  if (!company) return { kind: 'no-company' };

  const [scansRes, { data: sources }] = await Promise.all([
    supabase
      .from('scans')
      .select(
        'id, status, trigger_type, created_at, started_at, finished_at, error_message, scan_sources(source_key, status, items_returned, assets_returned, findings_returned, notices, latency_ms, message)',
      )
      .eq('company_id', company.id)
      .order('created_at', { ascending: false })
      .limit(HISTORY_LIMIT),
    supabase.from('sources').select('source_key, name'),
  ]);
  if (scansRes.error) throw scansRes.error;
  const sourceName = new Map((sources ?? []).map((s) => [s.source_key, s.name]));

  return {
    kind: 'ready',
    company: { id: company.id, name: company.name, primaryDomain: company.primary_domain },
    scans: scansRes.data.map((s) => ({
      id: s.id,
      status: oneOf(SCAN_STATUSES, s.status, 'failed'),
      trigger: s.trigger_type === 'scheduled' ? 'scheduled' : 'manual',
      createdAt: s.created_at,
      startedAt: s.started_at,
      finishedAt: s.finished_at,
      errorMessage: s.error_message,
      sources: s.scan_sources
        .map((r) => ({
          sourceKey: r.source_key,
          name: sourceName.get(r.source_key) ?? r.source_key,
          status: oneOf(SCAN_SOURCE_STATUSES, r.status, 'failed'),
          itemsReturned: r.items_returned,
          assetsReturned: r.assets_returned,
          findingsReturned: r.findings_returned,
          cdnCount: parseCdnHosts(r.notices).length,
          latencyMs: r.latency_ms,
          message: r.message,
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    })),
  };
}

/** Resumen del escaneo más reciente, en la forma que usa ScanControls. */
export function latestScanSummary(scans: ScanHistoryRow[]): ScanSummary | null {
  const s = scans[0];
  return s
    ? {
        id: s.id,
        status: s.status,
        createdAt: s.createdAt,
        finishedAt: s.finishedAt,
        errorMessage: s.errorMessage,
        sourceFailures: s.sources.some((r) => isSourceFailure(r.status)),
      }
    : null;
}
