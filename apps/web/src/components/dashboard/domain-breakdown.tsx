import type { DomainScoreRow } from '@/lib/dashboard-types';
import styles from './dashboard.module.css';
import { GRADE_COLORS, GradeBadge } from './grade-badge';

export function DomainBreakdown({ domains }: { domains: DomainScoreRow[] }) {
  const scored = domains.some((d) => d.score !== null);
  return (
    <section className={styles.card}>
      <header className={styles.cardHeader}>
        <div>
          <h2 className={styles.cardTitle}>Riesgo por dominio</h2>
          <p className={styles.cardHint}>
            {scored ? 'Último escaneo · peso en el KRI' : 'Hallazgos abiertos · notas pendientes del modelo de scoring'}
          </p>
        </div>
      </header>

      <ul className={styles.domainList}>
        {domains.map((d) => (
          <li key={d.key}>
            <div className={styles.domainTop}>
              <span>
                {d.name} {d.weight !== null && <span className={styles.domainMeta}>· {d.weight}%</span>}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className={styles.domainMeta}>{d.findingsCount} hallazgos</span>
                {d.grade ? <GradeBadge grade={d.grade} /> : <span className={styles.domainMeta}>sin nota</span>}
              </span>
            </div>
            <div className={styles.bar}>
              {d.score !== null && d.grade !== null && (
                <div className={styles.barFill} style={{ width: `${d.score}%`, background: GRADE_COLORS[d.grade] }} />
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
