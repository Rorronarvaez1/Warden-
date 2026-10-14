import { AssetsTable } from '@/components/dashboard/assets-table';
import styles from '@/components/dashboard/dashboard.module.css';
import { DomainBreakdown } from '@/components/dashboard/domain-breakdown';
import { formatDate } from '@/components/dashboard/format';
import { RecentFindings } from '@/components/dashboard/recent-findings';
import { ScoreGauge } from '@/components/dashboard/score-gauge';
import { StatCard } from '@/components/dashboard/stat-card';
import { TrendChart } from '@/components/dashboard/trend-chart';
import { assets, company, domainScores, recentFindings, trend } from '@/lib/mock-dashboard';

// TODO: reemplazar los datos de ejemplo por queries a Supabase (companies, scores,
// score_domains, assets, findings) cuando haya escaneos reales. Warden evalúa a una
// sola empresa, así que basta con la única fila activa de `companies`.
export default function DashboardPage() {
  const delta = company.previousScore === null ? null : company.score - company.previousScore;
  const confirmedAssets = assets.filter((a) => a.status === 'confirmed').length;
  const pendingAssets = assets.filter((a) => a.status === 'pending').length;
  const affectedDomains = domainScores.filter((d) => d.findingsCount > 0).length;

  return (
    <div className={styles.page}>
      <div>
        <h1 className={styles.pageTitle}>{company.name}</h1>
        <p className={styles.subtitle}>
          {company.primaryDomain} · último escaneo {formatDate(company.lastScanAt)}
          {company.nextScanAt && ` · próximo ${formatDate(company.nextScanAt)}`} · datos de ejemplo
        </p>
      </div>

      <div className={styles.statsGrid}>
        <StatCard
          label="KRI"
          value={company.score.toFixed(1)}
          hint={delta === null ? 'de 100' : `${delta >= 0 ? '+' : ''}${delta.toFixed(1)} vs. escaneo anterior`}
          aside={<ScoreGauge grade={company.grade} score={company.score} />}
        />
        <StatCard
          label="Hallazgos abiertos"
          value={company.openFindings}
          hint={`en ${affectedDomains} de ${domainScores.length} dominios`}
        />
        <StatCard label="Críticos abiertos" value={company.openCriticalFindings} hint="hallazgos sin resolver" />
        <StatCard
          label="Activos"
          value={confirmedAssets}
          hint={pendingAssets > 0 ? `confirmados · ${pendingAssets} por confirmar` : 'confirmados'}
        />
      </div>

      <div className={styles.rowHalf}>
        <DomainBreakdown domains={domainScores} />
        <TrendChart points={trend} />
      </div>

      <div className={styles.rowWide}>
        <AssetsTable assets={assets} />
        <RecentFindings findings={recentFindings} />
      </div>
    </div>
  );
}
