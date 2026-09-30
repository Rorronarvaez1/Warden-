import type { Collector } from './types';

export interface SourceRow {
  source_key: string;
  is_no_contact: boolean;
  is_enabled: boolean;
}

export type GuardDecision =
  | { allowed: true }
  | { allowed: false; status: 'blocked' | 'skipped'; reason: string };

/**
 * Última compuerta antes de ejecutar un colector. Exige que el código y la
 * configuración en BD coincidan en que la fuente es pasiva y está habilitada.
 */
export function checkCollector(collector: Collector, source: SourceRow | undefined): GuardDecision {
  if (!source) {
    return { allowed: false, status: 'blocked', reason: 'fuente no registrada en BD' };
  }
  if (!source.is_no_contact || !collector.isNoContact) {
    return { allowed: false, status: 'blocked', reason: 'fuente no marcada como no-contact' };
  }
  if (!source.is_enabled) {
    return { allowed: false, status: 'skipped', reason: 'fuente deshabilitada' };
  }
  return { allowed: true };
}
