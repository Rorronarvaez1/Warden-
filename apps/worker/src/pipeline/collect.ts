import {
  checkCollector,
  collectors,
  type CollectorResult,
  type CollectorTarget,
  type SourceRow,
} from '@warden/collectors';
import type { Json } from '@warden/db';
import type { Db } from '../supabase';

export interface SourceResult {
  sourceKey: string;
  result: CollectorResult;
}

/** Ejecuta cada colector registrado que pase la compuerta no-contact y registra scan_sources. */
export async function collectAll(
  db: Db,
  scanId: string,
  target: CollectorTarget,
  signal: AbortSignal,
): Promise<SourceResult[]> {
  const { data: sources, error } = await db
    .from('sources')
    .select('source_key, is_no_contact, is_enabled');
  if (error) throw error;
  const sourceByKey = new Map((sources as SourceRow[]).map((s) => [s.source_key, s]));

  // secret_ref apunta a una variable de entorno del contenedor del worker.
  const ctx = { signal, getSecret: (ref: string) => process.env[ref] };

  const results: SourceResult[] = [];

  for (const collector of collectors.values()) {
    const decision = checkCollector(collector, sourceByKey.get(collector.sourceKey));
    if (!decision.allowed) {
      await recordSource(db, scanId, collector.sourceKey, decision.status, null, null, decision.reason);
      continue;
    }

    const started = performance.now();
    try {
      const result = await collector.collect(target, ctx);
      await recordSource(db, scanId, collector.sourceKey, 'ok', result, performance.now() - started);
      results.push({ sourceKey: collector.sourceKey, result });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await recordSource(db, scanId, collector.sourceKey, 'failed', null, performance.now() - started, message);
    }
  }

  return results;
}

async function recordSource(
  db: Db,
  scanId: string,
  sourceKey: string,
  status: 'ok' | 'failed' | 'skipped' | 'blocked',
  result: CollectorResult | null,
  latencyMs: number | null,
  message?: string,
) {
  const assets = result?.assets.length ?? 0;
  const findings = result?.findings.length ?? 0;
  await db.from('scan_sources').upsert(
    {
      scan_id: scanId,
      source_key: sourceKey,
      status,
      items_returned: assets + findings,
      assets_returned: assets,
      findings_returned: findings,
      // Los colectores producen avisos serializables a JSON.
      notices: (result?.notices ?? []) as unknown as Json,
      latency_ms: latencyMs === null ? null : Math.round(latencyMs),
      message: message ?? null,
    },
    { onConflict: 'scan_id,source_key' },
  );
}
