import type { Db } from '../supabase';
import type { SourceResult } from './collect';

interface ScanRow {
  id: string;
  company_id: string;
}

/**
 * Guarda activos descubiertos (quedan 'pending' hasta que un analista los confirme)
 * y hace upsert de hallazgos por (company_id, fingerprint), sin tocar su estado de triage.
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
  const domainIdByKey = new Map((domains ?? []).map((d: { id: number; key: string }) => [d.key, d.id]));

  const { data: assets } = await db
    .from('assets')
    .select('id, value')
    .eq('company_id', scan.company_id);
  const assetIdByValue = new Map((assets ?? []).map((a: { id: string; value: string }) => [a.value, a.id]));

  for (const { sourceKey, result } of results) {
    if (result.findings.length === 0) continue;

    const rows = result.findings.map((f) => ({
      company_id: scan.company_id,
      scan_id: scan.id,
      asset_id: f.assetValue ? (assetIdByValue.get(f.assetValue) ?? null) : null,
      risk_domain_id: domainIdByKey.get(f.riskDomain),
      fingerprint: f.fingerprint,
      title: f.title,
      severity: f.severity,
      confidence: f.confidence,
      observed_at: f.observedAt.toISOString(),
      evidence: f.evidence,
    }));

    const { data: saved, error } = await db
      .from('findings')
      .upsert(rows, { onConflict: 'company_id,fingerprint' })
      .select('id, fingerprint');
    if (error) throw error;

    const rawByFingerprint = new Map(result.findings.map((f) => [f.fingerprint, f.rawReference]));
    await db.from('finding_sources').upsert(
      (saved ?? []).map((s: { id: string; fingerprint: string }) => ({
        finding_id: s.id,
        source_key: sourceKey,
        raw_reference: rawByFingerprint.get(s.fingerprint) ?? null,
      })),
      { onConflict: 'finding_id,source_key' },
    );
  }
}
