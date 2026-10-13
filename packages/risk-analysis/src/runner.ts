import { analysisModules } from './registry';
import type { AnalysisContext, AnalysisExecution, AnalysisSourcePolicy, AnalysisTarget, EvidenceProvider } from './types';

/** La política debe cargarse del servidor, nunca del body enviado por el navegador. */
export async function runRiskAnalysis(
  target: AnalysisTarget,
  providers: readonly EvidenceProvider[],
  policies: readonly AnalysisSourcePolicy[],
  context: AnalysisContext,
): Promise<AnalysisExecution[]> {
  const results: AnalysisExecution[] = [];
  for (const provider of providers) {
    context.signal.throwIfAborted();
    const policy = policies.find((v) => v.sourceKey === provider.sourceKey);
    if (!policy || provider.isNoContact !== true || !policy.isNoContact) {
      results.push({ sourceKey: provider.sourceKey, status: 'blocked', message: 'La fuente no tiene autorización no-contact.' });
      continue;
    }
    if (!policy.isEnabled) {
      results.push({ sourceKey: provider.sourceKey, status: 'skipped', message: 'La fuente está deshabilitada.' });
      continue;
    }
    try {
      const module = analysisModules.get(provider.moduleKey);
      if (!module) throw new Error('Módulo no registrado.');
      const evidence = await provider.collect(target, context);
      context.signal.throwIfAborted();
      const result = module.analyze(evidence, target);
      if (result.sourceKey !== provider.sourceKey) throw new Error('La fuente de la evidencia no coincide.');
      results.push({ sourceKey: provider.sourceKey, status: 'ok', result });
    } catch {
      context.signal.throwIfAborted();
      // No propagar errores de terceros: podrían contener cuentas, tokens o cuerpos HTTP.
      results.push({ sourceKey: provider.sourceKey, status: 'failed', message: 'No se pudo recolectar o validar la evidencia de la fuente.' });
    }
  }
  return results;
}
