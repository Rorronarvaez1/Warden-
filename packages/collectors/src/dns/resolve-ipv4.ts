import { z } from 'zod';
import { fetchPublicJson } from '../http/public-json';

const DNS_TYPE_A = 1;
const MAX_NAMES = 200;
const CONCURRENCY = 4;

const responseSchema = z.object({
  Status: z.number().int(),
  TC: z.boolean().optional(),
  Answer: z.array(z.object({ type: z.number().int(), data: z.string() })).optional(),
});

const IPV4 = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;

export function isIpv4(value: string): boolean {
  return IPV4.test(value);
}

/** Descarta rangos privados y reservados: no son exposición pública ni tienen datos en fuentes OSINT. */
export function isPublicIpv4(value: string): boolean {
  if (!isIpv4(value)) return false;
  const [a = 0, b = 0] = value.split('.').map(Number);
  return !(
    a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19))
  );
}

export interface ResolvedIps {
  /** IP pública → nombres que resolvieron a ella. */
  ips: Map<string, string[]>;
  /** Nombres cuya consulta falló: no significa que no resuelvan. */
  failed: string[];
}

/**
 * Resuelve registros A mediante el resolvedor público de Google (DoH). La consulta
 * llega a dns.google, no a los servidores de la empresa evaluada.
 */
export async function resolveIpv4(names: readonly string[], signal: AbortSignal): Promise<ResolvedIps> {
  const unique = [...new Set(names.map((n) => n.toLowerCase()))].slice(0, MAX_NAMES);
  const ips = new Map<string, string[]>();
  const failed: string[] = [];

  for (let i = 0; i < unique.length; i += CONCURRENCY) {
    signal.throwIfAborted();
    const batch = unique.slice(i, i + CONCURRENCY);
    const answers = await Promise.all(batch.map((name) => queryA(name, signal)));
    batch.forEach((name, index) => {
      const answer = answers[index];
      if (answer === undefined) {
        failed.push(name);
        return;
      }
      for (const ip of answer) {
        if (!isPublicIpv4(ip)) continue;
        const from = ips.get(ip) ?? [];
        if (!from.includes(name)) from.push(name);
        ips.set(ip, from);
      }
    });
  }

  return { ips, failed };
}

/** undefined = la consulta falló; [] = el nombre no tiene registros A. */
async function queryA(name: string, signal: AbortSignal): Promise<string[] | undefined> {
  try {
    const url = new URL('https://dns.google/resolve');
    url.searchParams.set('name', name);
    url.searchParams.set('type', 'A');
    url.searchParams.set('edns_client_subnet', '0.0.0.0/0');
    const response = responseSchema.parse(await fetchPublicJson(url, signal));
    if (response.TC || ![0, 3].includes(response.Status)) return undefined;
    // Las respuestas incluyen la cadena CNAME; solo interesan los registros A finales.
    return (response.Answer ?? []).filter((r) => r.type === DNS_TYPE_A).map((r) => r.data.trim());
  } catch {
    signal.throwIfAborted();
    return undefined;
  }
}
