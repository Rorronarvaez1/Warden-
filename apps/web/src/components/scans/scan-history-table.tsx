import { formatDateTime } from '@/components/dashboard/format';
import styles from '@/components/dashboard/dashboard.module.css';
import {
  SCAN_STATUS_COLORS,
  SCAN_STATUS_LABELS,
  SOURCE_RUN_COLORS,
  SOURCE_RUN_LABELS,
} from '@/components/dashboard/scan-status';
import type { ScanHistoryRow } from '@/lib/scan-history';

export function ScanHistoryTable({ scans }: { scans: ScanHistoryRow[] }) {
  const failed = scans.filter((s) => s.status === 'failed' || s.sources.some((r) => r.status === 'failed')).length;

  return (
    <section className={styles.card}>
      <header className={styles.cardHeader}>
        <div>
          <h2 className={styles.cardTitle}>Historial</h2>
          <p className={styles.cardHint}>
            Últimos {scans.length} escaneos · una fuente que falla no tumba el escaneo, pero no aporta datos
          </p>
        </div>
        {failed > 0 && (
          <span className={styles.chip} style={{ color: 'var(--grade-f)' }}>
            {failed} con fallos
          </span>
        )}
      </header>

      {scans.length === 0 ? (
        <p className={styles.empty}>Todavía no hay escaneos.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Solicitado</th>
                <th>Origen</th>
                <th>Estado</th>
                <th className={styles.num}>Duración</th>
                <th>Fuentes</th>
              </tr>
            </thead>
            <tbody>
              {scans.map((s) => (
                <tr key={s.id}>
                  <td>{formatDateTime(s.createdAt)}</td>
                  <td className={styles.muted}>{s.trigger === 'scheduled' ? 'Programado' : 'Manual'}</td>
                  <td>
                    <span className={styles.pill} style={{ color: SCAN_STATUS_COLORS[s.status] }}>
                      {SCAN_STATUS_LABELS[s.status]}
                    </span>
                    {s.errorMessage && <div className={styles.errorText}>{s.errorMessage}</div>}
                  </td>
                  <td className={`${styles.num} ${styles.muted}`}>{duration(s.startedAt, s.finishedAt)}</td>
                  <td className={styles.wrap}>
                    {s.sources.length === 0 ? (
                      <span className={styles.muted}>—</span>
                    ) : (
                      <ul className={styles.sourceRuns}>
                        {s.sources.map((r) => (
                          <li key={r.sourceKey}>
                            <span className={styles.tag} style={{ color: SOURCE_RUN_COLORS[r.status] }}>
                              {r.name} · {SOURCE_RUN_LABELS[r.status]}
                            </span>
                            {r.status === 'ok' && (
                              <span className={styles.subText}>
                                {' '}
                                {r.itemsReturned} resultados
                                {r.latencyMs !== null && ` en ${(r.latencyMs / 1000).toFixed(1)} s`}
                              </span>
                            )}
                            {r.message && (
                              <div className={r.status === 'failed' ? styles.errorText : styles.subText}>{r.message}</div>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function duration(startedAt: string | null, finishedAt: string | null): string {
  if (!startedAt || !finishedAt) return '—';
  const seconds = (new Date(finishedAt).getTime() - new Date(startedAt).getTime()) / 1000;
  return seconds < 60 ? `${seconds.toFixed(1)} s` : `${Math.floor(seconds / 60)} min ${Math.round(seconds % 60)} s`;
}
