import { isPublicIpv4, resolveIpv4 } from '../dns/resolve-ipv4';
import { fetchPublicJson, SourceHttpError } from '../http/public-json';
import type { Collector, CollectorTarget } from '../types';
import { fetchCveEnrichment } from './cve-enrichment';
import { internetDbHostSchema, mapExposure, SOURCE_KEY, type ObservedHost } from './mapper';

const MAX_IPS = 256;
const CONCURRENCY = 4;

/** Nombres a resolver: dominio principal y dominios/subdominios confirmados. */
export function exposureNames(target: CollectorTarget): string[] {
  const names = target.assets
    .filter((a) => a.type === 'domain' || a.type === 'subdomain')
    .map((a) => a.value);
  return [target.primaryDomain, ...names];
}

// Consulta la base de datos de Shodan InternetDB (escaneos propios de Shodan), el
// resolvedor público dns.google y los catálogos KEV (CISA) y EPSS (FIRST) para los CVE:
// ninguna petición llega a la infraestructura evaluada.
// Uso gratuito solo no comercial (docs/sources.md). Solo IPv4: InternetDB no indexa IPv6.
export const internetdbCollector: Collector = {
  sourceKey: SOURCE_KEY,
  riskDomain: 'exposure',
  isNoContact: true,

  async collect(target, ctx) {
    const { ips: resolved } = await resolveIpv4(exposureNames(target), ctx.signal);
    for (const asset of target.assets) {
      if (asset.type === 'ip' && isPublicIpv4(asset.value) && !resolved.has(asset.value)) {
        resolved.set(asset.value, []);
      }
    }
    const ips = [...resolved.keys()].sort().slice(0, MAX_IPS);

    const hosts: ObservedHost[] = [];
    let failures = 0;
    let lastError: unknown;
    for (let i = 0; i < ips.length; i += CONCURRENCY) {
      ctx.signal.throwIfAborted();
      const batch = ips.slice(i, i + CONCURRENCY);
      const settled = await Promise.allSettled(batch.map((ip) => lookup(ip, ctx.signal)));
      settled.forEach((outcome, index) => {
        const ip = batch[index]!;
        if (outcome.status === 'fulfilled') {
          hosts.push({ ip, resolvedFrom: resolved.get(ip) ?? [], data: outcome.value });
        } else {
          failures += 1;
          lastError = outcome.reason;
        }
      });
    }
    // Un fallo parcial no es ausencia de riesgo, pero lo observado sí es válido.
    // Si todo falló, se reporta como fallo de la fuente en scan_sources.
    if (ips.length > 0 && failures === ips.length) throw lastError;

    // KEV y EPSS solo se consultan si hay CVE que clasificar.
    const enrichment = await fetchCveEnrichment(hosts.flatMap((h) => h.data?.vulns ?? []), ctx.signal);

    return {
      assets: ips.map((value) => ({ type: 'ip', value })),
      findings: mapExposure(hosts, new Date(), enrichment),
    };
  },
};

async function lookup(ip: string, signal: AbortSignal) {
  try {
    const url = new URL(`https://internetdb.shodan.io/${ip}`);
    return internetDbHostSchema.parse(await fetchPublicJson(url, signal));
  } catch (err) {
    // 404 = InternetDB no tiene datos de esa IP; no garantiza que no tenga servicios expuestos.
    if (err instanceof SourceHttpError && err.status === 404) return null;
    throw err;
  }
}
