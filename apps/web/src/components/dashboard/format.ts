// Fecha corta fija (UTC) para que el render del servidor y del cliente coincidan.
const dateFormat = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', timeZone: 'UTC' });

export function formatDate(iso: string): string {
  return dateFormat.format(new Date(iso));
}

const dateTimeFormat = new Intl.DateTimeFormat('es', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'UTC',
});

/** Fecha y hora en UTC, para el estado de escaneos. */
export function formatDateTime(iso: string): string {
  return `${dateTimeFormat.format(new Date(iso))} UTC`;
}
