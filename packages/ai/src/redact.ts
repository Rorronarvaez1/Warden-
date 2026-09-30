// Limpia el contexto antes de enviarlo a un modelo externo. La evidencia cruda
// (p. ej. secretos encontrados por gitleaks) nunca debe salir de Warden.

const PATTERNS: [RegExp, string][] = [
  [/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]'],
  [/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g, '[aws-key]'],
  [/\bgh[pousr]_[A-Za-z0-9]{36,}\b/g, '[github-token]'],
  [/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[jwt]'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, '[private-key]'],
];

export function redact(text: string): string {
  return PATTERNS.reduce((acc, [pattern, label]) => acc.replace(pattern, label), text);
}
