import type { Json } from '@warden/db';
import type { Db } from '../supabase';
import type { SourceResult } from './collect';
import { reopenAutoResolved } from './resolve';

interface ScanRow {
  id: string;
  company_id: string;
}

/**
 * Guarda activos descubiertos (quedan 'pending' hasta que un analista los confirme)
 * y hace upsert de hallazgos por (company_id, fingerprint), sin tocar su estado de triage
 * (salvo reabrir los que el propio worker resolvió; ver resolve.ts).
 */
export async function persistResults(db: Db, scan: ScanRow, results: SourceResult[]) {
  const now = new Date().toISOString();

  const discovered = results.flatMap((r) => r.result.assets);
  if (discovered.length > 0) {
    const rows = discovered.map((a) => ({
      company_id: scan.company_id,
      asset_type: a.type,
      value: a.value,
      discovery_source: 'auto',
    }));
    const { error } = await db
      .from('assets')
      .upsert(rows, { onConflict: 'company_id,asset_type,value', ignoreDuplicates: true });
    if (error) throw error;

    await db
      .from('assets')
      .update({ last_seen: now })
      .eq('company_id', scan.company_id)
      .in('value', discovered.map((a) => a.value));
  }

  const { data: domains } = await db.from('risk_domains').select('id, key');
  const domainIdByKey = new Map((domains ?? []).map((d) => [d.key, d.id]));

  const { data: assets } = await db
    .from('assets')
    .select('id, value')
    .eq('company_id', scan.company_id);
  const assetIdByValue = new Map((assets ?? []).map((a) => [a.value, a.id]));

  for (const { sourceKey, result } of results) {
    if (result.findings.length === 0) continue;

    const rows = result.findings.map((f) => {
      const riskDomainId = domainIdByKey.get(f.riskDomain);
      if (riskDomainId === undefined) {
        throw new Error(`dominio de riesgo '${f.riskDomain}' no existe en risk_domains (¿falta el seed?)`);
      }
      return {
        company_id: scan.company_id,
        scan_id: scan.id,
        asset_id: f.assetValue ? (assetIdByValue.get(f.assetValue) ?? null) : null,
        risk_domain_id: riskDomainId,
        fingerprint: f.fingerprint,
        title: f.title,
        severity: f.severity,
        confidence: f.confidence,
        observed_at: f.observedAt.toISOString(),
        // Los colectores producen evidencia serializable a JSON.
        evidence: f.evidence as Json,
      };
    });

    const { data: saved, error } = await db
      .from('findings')
      .upsert(rows, { onConflict: 'company_id,fingerprint' })
      .select('id, fingerprint');
    if (error) throw error;

    const rawByFingerprint = new Map(result.findings.map((f) => [f.fingerprint, f.rawReference]));
    // last_seen_scan_id alimenta la resolución automática: si no se guarda, un hallazgo
    // vigente podría resolverse por error, así que el fallo debe tumbar el escaneo.
    const { error: sourcesError } = await db.from('finding_sources').upsert(
      (saved ?? []).map((s) => ({
        finding_id: s.id,
        source_key: sourceKey,
        raw_reference: (rawByFingerprint.get(s.fingerprint) ?? null) as Json,
        last_seen_scan_id: scan.id,
      })),
      { onConflict: 'finding_id,source_key' },
    );
    if (sourcesError) throw sourcesError;

    await reopenAutoResolved(db, (saved ?? []).map((s) => s.id));
  }
}
