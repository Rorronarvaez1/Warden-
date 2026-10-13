import { domainSchema, type EvidenceProvider } from '@warden/risk-analysis';
import { fetchPublicJson, SourceHttpError } from '../http/public-json';
import { mapHibpDomain } from './mapper';

export const hibpProvider: EvidenceProvider = {
  sourceKey: 'hibp', moduleKey: 'credentials', isNoContact: true,
  async collect(target, context) {
    const domain = domainSchema.parse(target.primaryDomain);
    const key = context.getSecret('HIBP_API_KEY');
    if (!key || !/^[a-fA-F0-9]{32}$/.test(key)) throw new Error('Falta una HIBP_API_KEY válida en el worker.');
    let accounts: unknown;
    try {
      // HIBP exige verificación previa; no iniciamos verificaciones por correo ni DNS.
      accounts = await fetchPublicJson(new URL(`https://haveibeenpwned.com/api/v3/breachedDomain/${domain}`),
        context.signal, { 'hibp-api-key': key });
    } catch (error) {
      if (!(error instanceof SourceHttpError) || error.status !== 404) throw error;
      accounts = {};
    }
    let catalog: unknown = [];
    // Si falla el catálogo, las exposiciones siguen disponibles con metadatos desconocidos.
    try {
      catalog = await fetchPublicJson(new URL('https://haveibeenpwned.com/api/v3/breaches'), context.signal);
    } catch {
      context.signal.throwIfAborted();
    }
    return mapHibpDomain(accounts, catalog, domain, new Date().toISOString());
  },
};
