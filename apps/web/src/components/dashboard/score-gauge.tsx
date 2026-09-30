export function ScoreGauge({ grade, score }: { grade: string; score: number }) {
  return (
    <section
      style={{ display: 'inline-flex', alignItems: 'baseline', gap: 12, padding: 24,
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }}
    >
      <span style={{ fontSize: 56, fontWeight: 700 }}>{grade}</span>
      <span style={{ color: 'var(--muted)' }}>{score.toFixed(1)} / 100</span>
    </section>
  );
}
