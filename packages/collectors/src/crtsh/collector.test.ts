import { afterEach, describe, expect, it, vi } from 'vitest';
import { crtshCollector } from './collector';

const ctx = { signal: new AbortController().signal, getSecret: () => undefined };
afterEach(() => vi.unstubAllGlobals());

describe('crtshCollector', () => {
  it('busca subdominios del dominio sin www.', async () => {
    const fetchMock = vi.fn(async (_url: string) => new Response(JSON.stringify([
      { name_value: 'shop.example.com\n*.example.com\nwww.example.com', not_before: '', not_after: '', issuer_name: '' },
    ])));
    vi.stubGlobal('fetch', fetchMock);

    const result = await crtshCollector.collect({ companyId: 'c1', primaryDomain: 'www.example.com', assets: [] }, ctx);

    expect(new URL(fetchMock.mock.calls[0]![0]).searchParams.get('q')).toBe('%.example.com');
    expect(result.assets).toEqual([
      { type: 'subdomain', value: 'shop.example.com' },
      { type: 'subdomain', value: 'www.example.com' },
    ]);
  });
});
