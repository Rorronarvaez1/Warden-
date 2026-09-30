import { createHash } from 'node:crypto';

/**
 * Huella estable de un hallazgo: fuente + regla + activo. No incluir datos que
 * cambien entre escaneos (fechas, conteos) o se duplicarán los hallazgos.
 */
export function fingerprint(sourceKey: string, ruleId: string, assetValue: string): string {
  return createHash('sha256')
    .update([sourceKey, ruleId, assetValue.toLowerCase()].join('|'))
    .digest('hex');
}
