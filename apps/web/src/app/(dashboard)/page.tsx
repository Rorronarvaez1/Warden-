import { CompaniesTable } from '@/components/dashboard/companies-table';
import styles from '@/components/dashboard/dashboard.module.css';
import { DomainBreakdown } from '@/components/dashboard/domain-breakdown';
import { RecentFindings } from '@/components/dashboard/recent-findings';
import { ScoreGauge } from '@/components/dashboard/score-gauge';
import { StatCard } from '@/components/dashboard/stat-card';
import { TrendChart } from '@/components/dashboard/trend-chart';
import { companies, domainScores, recentFindings, stats, trend } from '@/lib/mock-dashboard';

// TODO: reemplazar los datos de ejemplo por queries a Supabase (scores, score_domains,
// findings) cuando haya escaneos reales. Las formas de mock-dashboard.ts ya los imitan.
export default function DashboardPage() {
  return (
    <div className={styles.page}>
      <div>
        <h1 className={styles.pageTitle}>Dashboard</h1>
        <p className={styles.subtitle}>Resumen del riesgo de la cartera · datos de ejemplo</p>
      </div>

      <div className={styles.statsGrid}>
        <StatCard label="Empresas" value={stats.companiesCount} hint="monitoreadas" />
        <StatCard label="Evaluaciones" value={stats.scansLast30d} hint="últimos 30 días" />
        <StatCard
          label="KRI promedio"
          value={stats.avgScore.toFixed(1)}
          hint="de 100"
          aside={<ScoreGauge grade={stats.avgGrade} score={stats.avgScore} />}
        />
        <StatCard label="Críticos abiertos" value={stats.openCriticalFindings} hint="hallazgos sin resolver" />
      </div>

      <div className={styles.rowWide}>
        <CompaniesTable companies={companies} />
        <DomainBreakdown domains={domainScores} />
      </div>

      <div className={styles.rowHalf}>
        <TrendChart points={trend} />
        <RecentFindings findings={recentFindings} />
      </div>
    </div>
  );
}
