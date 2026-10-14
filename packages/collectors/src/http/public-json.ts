const ALLOWED_HOSTS = new Set([
  'dns.google', 'haveibeenpwned.com', 'internetdb.shodan.io', 'www.cisa.gov', 'api.first.org',
]);
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024;

export class SourceHttpError extends Error {
  constructor(public readonly status: number, public readonly retryAfter: string | null) {
    super(`La fuente pública devolvió HTTP ${status}.`);
  }
}

/** Destinos fijos y redirects bloqueados para no seguir enlaces a activos evaluados. */
export async function fetchPublicJson(
  url: URL,
  signal: AbortSignal,
  headers: Record<string, string> = {},
): Promise<unknown> {
  if (url.protocol !== 'https:' || !ALLOWED_HOSTS.has(url.hostname) || url.port || url.username || url.password) {
    throw new Error('Destino no autorizado para recolección pasiva.');
  }
  const response = await fetch(url, {
    signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]),
    redirect: 'error', headers: { accept: 'application/json', 'user-agent': 'Warden-OSINT/1.0', ...headers },
  });
  if (!response.ok) {
    await response.body?.cancel();
    throw new SourceHttpError(response.status, response.headers.get('retry-after'));
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error('La fuente devolvió una respuesta vacía.');
  const decoder = new TextDecoder();
  let size = 0;
  let body = '';
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > MAX_RESPONSE_BYTES) throw new Error('La respuesta de la fuente excede el límite permitido.');
      body += decoder.decode(chunk.value, { stream: true });
    }
    body += decoder.decode();
    return JSON.parse(body) as unknown;
  } finally {
    await reader.cancel();
    reader.releaseLock();
  }
}
