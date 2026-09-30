import type { ChatMessage } from '../client';

// Cambiar el texto del prompt implica crear executive-summary.v2.ts, no editar este:
// reports.prompt_version debe seguir apuntando a lo que realmente se usó.

export const PROMPT_ID = 'executive-summary';
export const PROMPT_VERSION = 'executive-summary.v1';

export interface ExecutiveSummaryContext {
  companyName: string;
  grade: string;
  globalScore: number;
  domains: { name: string; grade: string; findingsCount: number }[];
  topFindings: { title: string; severity: string; domain: string }[];
}

export function buildMessages(ctx: ExecutiveSummaryContext): ChatMessage[] {
  return [
    {
      role: 'system',
      content:
        'Eres un analista de riesgo cibernético. Redactas resúmenes ejecutivos en español, ' +
        'claros para una audiencia no técnica. Usa solo los datos proporcionados; no inventes ' +
        'hallazgos ni cifras. Responde únicamente con JSON con las claves ' +
        '"summary" (string), "key_risks" (string[]) y "recommendations" (string[]).',
    },
    { role: 'user', content: JSON.stringify(ctx) },
  ];
}
