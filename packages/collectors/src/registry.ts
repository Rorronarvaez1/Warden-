import { crtshCollector } from './crtsh/collector';
import type { Collector } from './types';

// Para agregar una fuente: crear src/<source_key>/, registrarla aquí y en supabase/seed.sql.
export const collectors: ReadonlyMap<string, Collector> = new Map(
  [crtshCollector].map((c) => [c.sourceKey, c]),
);
