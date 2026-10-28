import { z } from 'zod';
import { fetchPublicJson } from '../http/public-json';

export const DNS_TYPES = { A: 1, NS: 2, MX: 15, CAA: 257 } as const;
export type DnsType = keyof typeof DNS_TYPES;

const responseSchema = z.object({
  Status: z.number().int(),
  TC: z.boolean().optional(),
  Answer: z.array(z.object({ type: z.number().int(), data: z.string() })).optional(),
});

/** exists = false solo con NXDOMAIN: NOERROR sin registros del tipo pedido sigue siendo un nombre existente. */
export interface DohAnswer {
  exists: boolean;
  records: string[];
}

/**
 * Consulta un tipo de registro vía dns.google (DoH): la petición llega al resolvedor
 * público, nunca a servidores de la empresa evaluada. undefined = la consulta falló
 * (SERVFAIL, truncada, red); no significa que el nombre no exista.
 */
export async function queryDoh(name: string, type: DnsType, signal: AbortSignal): Promise<DohAnswer | undefined> {
  try {
    const url = new URL('https://dns.google/resolve');
    url.searchParams.set('name', name);
    url.searchParams.set('type', type);
    url.searchParams.set('edns_client_subnet', '0.0.0.0/0');
    const response = responseSchema.parse(await fetchPublicJson(url, signal));
    if (response.TC || ![0, 3].includes(response.Status)) return undefined;
    if (response.Status === 3) return { exists: false, records: [] };
    // Las respuestas incluyen la cadena CNAME; solo interesan los registros del tipo pedido.
    const records = (response.Answer ?? [])
      .filter((r) => r.type === DNS_TYPES[type])
      .map((r) => r.data.trim());
    return { exists: true, records };
  } catch {
    signal.throwIfAborted();
    return undefined;
  }
}
