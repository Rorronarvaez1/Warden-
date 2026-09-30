import { DomainBreakdown } from '@/components/dashboard/domain-breakdown';
import { ScoreGauge } from '@/components/dashboard/score-gauge';
import { createClient } from '@/lib/supabase/server';

interface LatestScore {
  global_score: number;
  grade: string;
  companies: { name: string };
  score_domains: {
    domain_score: number;
    grade: string;
    findings_count: number;
    risk_domains: { name: string };
  }[];
}

export default async function DashboardPage() {
  const supabase = await createClient();

  // TODO: quitar el cast cuando database.types.ts se genere con `pnpm db:types`.
  const { data } = await supabase
    .from('scores')
    .select(
      'global_score, grade, companies(name), score_domains(domain_score, grade, findings_count, risk_domains(name))',
    )
    .order('computed_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const score = data as unknown as LatestScore | null;

  if (!score) {
    return (
      <>
        <h1>Dashboard</h1>
        <p style={{ color: 'var(--muted)' }}>Aún no hay calificaciones. Lanza un escaneo desde Empresas.</p>
      </>
    );
  }

  return (
    <>
      <h1>{score.companies.name}</h1>
      <ScoreGauge grade={score.grade} score={Number(score.global_score)} />
      <DomainBreakdown
        domains={score.score_domains.map((d) => ({
          name: d.risk_domains.name,
          grade: d.grade,
          score: Number(d.domain_score),
          findingsCount: d.findings_count,
        }))}
      />
    </>
  );
}
