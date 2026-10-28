import Link from 'next/link';
import styles from '@/components/dashboard/dashboard.module.css';
import { formatDateTime } from '@/components/dashboard/format';
import { GradeBadge } from '@/components/dashboard/grade-badge';
import type { AlertRow } from '@/lib/alerts';
import { alertText } from './alert-text';

export function AlertList({ alerts, title, hint }: { alerts: AlertRow[]; title: string; hint: string }) {
  return (
    <section className={styles.card}>
      <header className={styles.cardHeader}>
        <div>
          <h2 className={styles.cardTitle}>{title}</h2>
          <p className={styles.cardHint}>{hint}</p>
        </div>
        {alerts.length > 0 && (
          <span className={styles.chip} style={{ color: 'var(--grade-f)' }}>
            {alerts.length}
          </span>
        )}
      </header>
      {alerts.length === 0 ? (
        <p className={styles.empty}>Sin alertas: la nota no ha bajado.</p>
      ) : (
        <ul className={styles.findingList}>
          {alerts.map((a) => (
            <li key={a.id} className={styles.finding}>
              <div className={styles.findingTop}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <GradeBadge grade={a.newGrade} /> {alertText(a)}
                </span>
                <Link href={`/reports/${a.scoreId}`} className={styles.linkButton}>
                  Ver reporte
                </Link>
              </div>
              <p className={styles.findingMeta}>
                KRI {a.score.toFixed(1)} · {formatDateTime(a.at)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
