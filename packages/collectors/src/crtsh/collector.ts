import type { Collector } from '../types';
import { mapSubdomains, type CrtshEntry } from './mapper';

// Consulta logs públicos de Certificate Transparency: no toca la infraestructura evaluada.
// Por ahora solo descubre subdominios; los hallazgos del dominio `certs` quedan pendientes.
export const crtshCollector: Collector = {
  sourceKey: 'crtsh',
  riskDomain: 'certs',
  isNoContact: true,

  async collect(target, ctx) {
    const url = `https://crt.sh/?q=${encodeURIComponent(`%.${target.primaryDomain}`)}&output=json`;
    const res = await fetch(url, { signal: ctx.signal });
    if (!res.ok) throw new Error(`crt.sh respondió ${res.status}`);

    const entries = (await res.json()) as CrtshEntry[];
    return { assets: mapSubdomains(entries, target.primaryDomain), findings: [] };
  },
};
