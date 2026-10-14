import type { TrendPoint } from '@/lib/dashboard-types';
import styles from './dashboard.module.css';
import { formatDate } from './format';

// Barras en CSS: la altura es relativa al rango de los datos para que el cambio se note.
export function TrendChart({ points }: { points: TrendPoint[] }) {
  const scores = points.map((p) => p.score);
  const min = Math.min(...scores) - 5;
  const max = Math.max(...scores);
  const first = points[0]?.score ?? 0;
  const last = points.at(-1)?.score ?? 0;
  const delta = last - first;

  return (
    <section className={styles.card}>
      <header className={styles.cardHeader}>
        <div>
          <h2 className={styles.cardTitle}>Tendencia del KRI</h2>
          <p className={styles.cardHint}>KRI de la empresa, últimos {points.length} escaneos</p>
        </div>
        {points.length > 1 && <span className={styles.chip} style={{ color: delta >= 0 ? 'var(--grade-a)' : 'var(--grade-f)' }}>
          {delta >= 0 ? '+' : ''}
          {delta.toFixed(1)} pts
        </span>}
      </header>

      {points.length === 0 && (
        <p className={styles.empty}>Sin puntajes todavía: el modelo de scoring está pendiente (docs/scoring-model.md).</p>
      )}
      {points.length > 0 && <div className={styles.trend}>
        {points.map((p) => (
          <div key={p.scannedAt} className={styles.trendCol} title={`${formatDate(p.scannedAt)}: ${p.score.toFixed(1)}`}>
            <div className={styles.trendTrack}>
              <div className={styles.trendBar} style={{ height: `${((p.score - min) / (max - min)) * 100}%` }} />
            </div>
            <span className={styles.trendLabel}>{formatDate(p.scannedAt)}</span>
          </div>
        ))}
      </div>}
    </section>
  );
}
