import type { CollectorTarget } from '@warden/collectors';
import type { AssetType } from '@warden/shared';
import { collectAll } from '../pipeline/collect';
import { persistResults } from '../pipeline/persist';
import type { Db } from '../supabase';

const MAX_ATTEMPTS = 3;

export async function runScan(
  db: Db,
  scanId: string,
  opts: { attempt: number; signal: AbortSignal },
): Promise<void> {
  const { data: scan, error } = await db
    .from('scans')
    .select('id, company_id, weight_version_id, status')
    .eq('id', scanId)
    .single();
  if (error) throw error;
  if (scan.status === 'completed' || scan.status === 'failed') return;

  if (opts.attempt > MAX_ATTEMPTS) {
    await markFailed(db, scanId, `abandonado tras ${MAX_ATTEMPTS} intentos`);
    return;
  }

  await db
    .from('scans')
    .update({ status: 'running', started_at: new Date().toISOString() })
    .eq('id', scanId);

  try {
    const { data: company, error: companyError } = await db
      .from('companies')
      .select('primary_domain')
      .eq('id', scan.company_id)
      .single();
    if (companyError) throw companyError;

    const { data: assets } = await db
      .from('assets')
      .select('asset_type, value')
      .eq('company_id', scan.company_id)
      .eq('attribution_status', 'confirmed');

    const target: CollectorTarget = {
      companyId: scan.company_id,
      primaryDomain: company.primary_domain,
      // asset_type es text en BD; el CHECK constraint garantiza que sea un AssetType.
      assets: (assets ?? []).map((a) => ({ type: a.asset_type as AssetType, value: a.value })),
    };

    const results = await collectAll(db, scanId, target, opts.signal);
    await persistResults(db, scan, results);

    // TODO: calcular y guardar el score con @warden/scoring cuando exista el modelo
    // (docs/scoring-model.md) y encolar report_requests para el resumen con IA.

    await db
      .from('scans')
      .update({ status: 'completed', finished_at: new Date().toISOString() })
      .eq('id', scanId);
  } catch (err) {
    console.error(`[run-scan] ${scanId} falló`, err);
    await markFailed(db, scanId, err instanceof Error ? err.message : String(err));
  }
}

async function markFailed(db: Db, scanId: string, message: string) {
  await db
    .from('scans')
    .update({ status: 'failed', finished_at: new Date().toISOString(), error_message: message })
    .eq('id', scanId);
}
