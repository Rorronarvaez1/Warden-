// Carga los datos del dashboard desde Supabase con la sesión del usuario (RLS).
// Warden evalúa a una sola empresa, así que se usa la única empresa activa.

import {
  CONFIDENCES,
  GRADES,
  RISK_DOMAIN_KEYS,
  SCAN_SOURCE_STATUSES,
  SCAN_STATUSES,
  SEVERITIES,
  type AssetType,
  type Confidence,
  type Grade,
  type RiskDomainKey,
  type Severity,
} from '@warden/shared';
import type { Json } from '@warden/db';
import {
  DOMAIN_LABELS,
  type AssetRow,
  type AttributionStatus,
  type DashboardData,
  type DomainScoreRow,
  type ExposureHost,
  type ExposureOverview,
  type ExposureSource,
  type FindingRow,
  type ScanSummary,
  type TrendPoint,
} from './dashboard-types';
import { mockDashboard } from './mock-dashboard';
import { createClient } from './supabase/server';

/** Fuente del dominio `exposure` con colector implementado (packages/collectors/src/internetdb). */
export const EXPOSURE_SOURCE_KEY = 'internetdb';

const RECENT_FINDINGS = 8;
const TREND_POINTS = 12;

export type DashboardState =
  | { kind: 'ready'; data: DashboardData }
  /** Aún no se registra la empresa a evaluar. */
  | { kind: 'no-company'; isAdmin: boolean };

export type Supabase = Awaited<ReturnType<typeof createClient>>;

export async function loadDashboard(): Promise<DashboardState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Sin sesión solo se llega aquí con WARDEN_DEV_SKIP_AUTH (el proxy redirige a /login).
    if (process.env.NODE_ENV !== 'production' && process.env.WARDEN_DEV_SKIP_AUTH === 'true') {
      return { kind: 'ready', data: mockDashboard };
    }
    throw new Error('Sesión requerida');
  }

  const [{ data: isAdmin }, company] = await Promise.all([
    supabase.rpc('is_admin'),
    loadActiveCompany(supabase),
  ]);
  if (!company) return { kind: 'no-company', isAdmin: isAdmin === true };

  const [assets, openFindings, recent, scores, lastScan, schedule, weights, exposure] = await Promise.all([
    loadAssets(supabase, company.id),
    loadOpenFindingCounts(supabase, company.id),
    loadRecentFindings(supabase, company.id),
    loadScores(supabase, company.id),
    loadLastScan(supabase, company.id),
    supabase.from('schedules').select('next_run_at, is_active').eq('company_id', company.id).maybeSingle(),
    loadActiveWeights(supabase),
    loadExposure(supabase, company.id),
  ]);

  const latest = scores.latest;
  const domains: DomainScoreRow[] = RISK_DOMAIN_KEYS.map((key) => {
    const scored = latest?.domains.get(key);
    return {
      key,
      name: DOMAIN_LABELS[key],
      weight: weights.get(key) ?? null,
      score: scored?.score ?? null,
      grade: scored?.grade ?? null,
      findingsCount: openFindings.byDomain.get(key) ?? 0,
    };
  });

  return {
    kind: 'ready',
    data: {
      mode: 'live',
      isAdmin: isAdmin === true,
      company: {
        id: company.id,
        name: company.name,
        primaryDomain: company.primary_domain,
        score: latest?.score ?? null,
        grade: latest?.grade ?? null,
        previousScore: scores.trend.at(-2)?.score ?? null,
        lastScanAt: lastScan.lastCompletedAt,
        nextScanAt: schedule.data?.is_active ? schedule.data.next_run_at : null,
        openFindings: openFindings.total,
        openCriticalFindings: openFindings.critical,
      },
      domains,
      assets,
      recentFindings: recent,
      trend: scores.trend,
      exposure,
      lastScan: lastScan.latest,
    },
  };
}

/** La empresa evaluada: la activa más antigua (Warden evalúa a una sola empresa). */
export async function loadActiveCompany(supabase: Supabase) {
  const { data, error } = await supabase
    .from('companies')
    .select('id, name, primary_domain')
    .eq('status', 'active')
    .order('created_at')
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function loadAssets(supabase: Supabase, companyId: string): Promise<AssetRow[]> {
  const { data, error } = await supabase
    .from('assets')
    .select('id, asset_type, value, attribution_status, discovery_source, last_seen')
    .eq('company_id', companyId)
    .order('value')
    .limit(1000);
  if (error) throw error;
  // Los CHECK constraints garantizan los valores de los campos de texto.
  return data.map((a) => ({
    id: a.id,
    type: a.asset_type as AssetType,
    value: a.value,
    status: a.attribution_status as AttributionStatus,
    discoverySource: a.discovery_source as 'auto' | 'manual',
    lastSeen: a.last_seen,
  }));
}

async function loadOpenFindingCounts(supabase: Supabase, companyId: string) {
  const { data, error } = await supabase
    .from('findings')
    .select('severity, risk_domains!inner(key)')
    .eq('company_id', companyId)
    .eq('status', 'open');
  if (error) throw error;

  const byDomain = new Map<RiskDomainKey, number>();
  let critical = 0;
  for (const f of data) {
    const key = f.risk_domains.key as RiskDomainKey;
    byDomain.set(key, (byDomain.get(key) ?? 0) + 1);
    if (f.severity === 'critical') critical += 1;
  }
  return { total: data.length, critical, byDomain };
}

async function loadRecentFindings(supabase: Supabase, companyId: string): Promise<FindingRow[]> {
  const [{ data, error }, { data: sources }] = await Promise.all([
    supabase
      .from('findings')
      .select('id, title, severity, confidence, observed_at, risk_domains!inner(key), finding_sources(source_key)')
      .eq('company_id', companyId)
      .eq('status', 'open')
      .order('observed_at', { ascending: false })
      .order('severity')
      .limit(RECENT_FINDINGS),
    supabase.from('sources').select('source_key, name'),
  ]);
  if (error) throw error;
  const sourceName = new Map((sources ?? []).map((s) => [s.source_key, s.name]));

  return data.map((f) => ({
    id: f.id,
    indicator: f.title,
    domain: f.risk_domains.key as RiskDomainKey,
    severity: f.severity as Severity,
    confidence: f.confidence as Confidence,
    source: f.finding_sources.map((s) => sourceName.get(s.source_key) ?? s.source_key).join(', ') || '—',
    observedAt: f.observed_at,
  }));
}

/** Puntajes guardados por el worker. Hoy no hay ninguno: el modelo de scoring está pendiente. */
async function loadScores(supabase: Supabase, companyId: string) {
  const { data, error } = await supabase
    .from('scores')
    .select('global_score, grade, computed_at, score_domains(domain_score, grade, risk_domains!inner(key))')
    .eq('company_id', companyId)
    .order('computed_at', { ascending: false })
    .limit(TREND_POINTS);
  if (error) throw error;

  const trend: TrendPoint[] = data
    .map((s) => ({ scannedAt: s.computed_at, score: Number(s.global_score) }))
    .reverse();
  const first = data[0];
  const latest = first
    ? {
        score: Number(first.global_score),
        grade: asGrade(first.grade),
        domains: new Map(
          first.score_domains.map((d) => [
            d.risk_domains.key as RiskDomainKey,
            { score: Number(d.domain_score), grade: asGrade(d.grade) },
          ]),
        ),
      }
    : null;
  return { trend, latest };
}

async function loadActiveWeights(supabase: Supabase): Promise<Map<RiskDomainKey, number>> {
  const { data } = await supabase
    .from('scoring_weight_items')
    .select('weight, risk_domains!inner(key), scoring_weights!inner(is_active)')
    .eq('scoring_weights.is_active', true);
  return new Map((data ?? []).map((w) => [w.risk_domains.key as RiskDomainKey, Number(w.weight)]));
}

async function loadLastScan(supabase: Supabase, companyId: string) {
  const [latestRes, completedRes] = await Promise.all([
    supabase
      .from('scans')
      .select('id, status, created_at, finished_at, error_message')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('scans')
      .select('finished_at')
      .eq('company_id', companyId)
      .eq('status', 'completed')
      .order('finished_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (latestRes.error) throw latestRes.error;

  const s = latestRes.data;
  const latest: ScanSummary | null = s
    ? {
        id: s.id,
        status: oneOf(SCAN_STATUSES, s.status, 'failed'),
        createdAt: s.created_at,
        finishedAt: s.finished_at,
        errorMessage: s.error_message,
      }
    : null;
  return { latest, lastCompletedAt: completedRes.data?.finished_at ?? null };
}

/** Hallazgos abiertos de exposición agrupados por IP, más el estado de la fuente. */
async function loadExposure(supabase: Supabase, companyId: string): Promise<ExposureOverview> {
  const [findingsRes, sourceRes, lastRunRes] = await Promise.all([
    supabase
      .from('findings')
      .select('id, severity, confidence, observed_at, evidence, risk_domains!inner(key)')
      .eq('company_id', companyId)
      .eq('status', 'open')
      .eq('risk_domains.key', 'exposure')
      .limit(2000),
    supabase.from('sources').select('source_key, name, is_enabled').eq('source_key', EXPOSURE_SOURCE_KEY).maybeSingle(),
    // Resultado de la fuente en el escaneo más reciente que la registró.
    supabase
      .from('scan_sources')
      .select('status, items_returned, message, scans!inner(company_id, created_at)')
      .eq('source_key', EXPOSURE_SOURCE_KEY)
      .eq('scans.company_id', companyId)
      .order('scans(created_at)', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (findingsRes.error) throw findingsRes.error;

  const source: ExposureSource | null = sourceRes.data
    ? {
        sourceKey: sourceRes.data.source_key,
        name: sourceRes.data.name,
        enabled: sourceRes.data.is_enabled,
        lastRun: lastRunRes.data
          ? {
              status: oneOf(SCAN_SOURCE_STATUSES, lastRunRes.data.status, 'failed'),
              itemsReturned: lastRunRes.data.items_returned,
              message: lastRunRes.data.message,
            }
          : null,
      }
    : null;

  const hosts = new Map<string, ExposureHost>();
  for (const f of findingsRes.data) {
    const ev = asRecord(f.evidence);
    const ip = typeof ev.ip === 'string' ? ev.ip : null;
    if (!ip) continue;
    const severity = oneOf(SEVERITIES, f.severity, 'info');

    let host = hosts.get(ip);
    if (!host) {
      host = {
        ip,
        resolvedFrom: stringArray(ev.resolvedFrom),
        worstSeverity: severity,
        services: [],
        cves: [],
        observedAt: f.observed_at,
      };
      hosts.set(ip, host);
    }
    if (severityRank(severity) < severityRank(host.worstSeverity)) host.worstSeverity = severity;
    if (f.observed_at > host.observedAt) host.observedAt = f.observed_at;

    // Evidencia escrita por internetdb/mapper.ts: { port, service } o { cve, inKev, epss }.
    if (typeof ev.cve === 'string') {
      host.cves.push({
        findingId: f.id,
        cve: ev.cve,
        severity,
        inKev: ev.inKev === true,
        epss: typeof ev.epss === 'number' ? ev.epss : null,
      });
    } else if (typeof ev.port === 'number') {
      host.services.push({
        findingId: f.id,
        port: ev.port,
        service: typeof ev.service === 'string' ? ev.service : 'desconocido',
        severity,
        confidence: oneOf(CONFIDENCES, f.confidence, 'low'),
      });
    }
  }

  for (const host of hosts.values()) {
    host.services.sort((a, b) => severityRank(a.severity) - severityRank(b.severity) || a.port - b.port);
    host.cves.sort(
      (a, b) => severityRank(a.severity) - severityRank(b.severity) || (b.epss ?? 0) - (a.epss ?? 0),
    );
  }

  return {
    source,
    hosts: [...hosts.values()].sort(
      (a, b) => severityRank(a.worstSeverity) - severityRank(b.worstSeverity) || a.ip.localeCompare(b.ip),
    ),
  };
}

function severityRank(s: Severity): number {
  return SEVERITIES.indexOf(s);
}

function asGrade(value: string): Grade {
  return oneOf(GRADES, value.trim(), 'F');
}

/** Valor de un CHECK constraint de texto; `fallback` si la BD devolviera algo inesperado. */
export function oneOf<T extends string>(allowed: readonly T[], value: string, fallback: T): T {
  return (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

function asRecord(value: Json): Record<string, Json | undefined> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function stringArray(value: Json | undefined): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}
