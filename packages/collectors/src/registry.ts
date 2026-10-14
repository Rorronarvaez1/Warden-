import { crtshCollector } from './crtsh/collector';
import { emailDnsCollector } from './email_dns/collector';
import { internetdbCollector } from './internetdb/collector';
import type { Collector } from './types';

// Para agregar una fuente: crear src/<source_key>/, registrarla aquí y en supabase/seed.sql.
export const collectors: ReadonlyMap<string, Collector> = new Map(
  [crtshCollector, internetdbCollector, emailDnsCollector].map((c) => [c.sourceKey, c]),
);
