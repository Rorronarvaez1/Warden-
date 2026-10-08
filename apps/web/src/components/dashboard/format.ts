// Fecha corta fija (UTC) para que el render del servidor y del cliente coincidan.
const dateFormat = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', timeZone: 'UTC' });

export function formatDate(iso: string): string {
  return dateFormat.format(new Date(iso));
}
