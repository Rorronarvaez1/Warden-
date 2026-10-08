import type { DomainScoreRow } from '@/lib/mock-dashboard';
import styles from './dashboard.module.css';
import { GRADE_COLORS, GradeBadge } from './grade-badge';

export function DomainBreakdown({ domains }: { domains: DomainScoreRow[] }) {
  return (
    <section className={styles.card}>
      <header className={styles.cardHeader}>
        <div>
          <h2 className={styles.cardTitle}>Riesgo por dominio</h2>
          <p className={styles.cardHint}>Promedio de la cartera · peso en el KRI</p>
        </div>
      </header>

      <ul className={styles.domainList}>
        {domains.map((d) => (
          <li key={d.key}>
            <div className={styles.domainTop}>
              <span>
                {d.name} <span className={styles.domainMeta}>· {d.weight}%</span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className={styles.domainMeta}>{d.findingsCount} hallazgos</span>
                <GradeBadge grade={d.grade} />
              </span>
            </div>
            <div className={styles.bar}>
              <div className={styles.barFill} style={{ width: `${d.score}%`, background: GRADE_COLORS[d.grade] }} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
