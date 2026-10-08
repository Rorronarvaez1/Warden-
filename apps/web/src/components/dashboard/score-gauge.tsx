import type { Grade } from '@warden/shared';
import { GRADE_COLORS } from './grade-badge';

// Anillo con la nota al centro; el arco llena según el puntaje (0–100).
export function ScoreGauge({ grade, score, size = 72 }: { grade: Grade; score: number; size?: number }) {
  const stroke = 7;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const filled = (Math.min(Math.max(score, 0), 100) / 100) * circumference;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Nota ${grade}, ${score.toFixed(1)} de 100`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={GRADE_COLORS[grade]}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${filled} ${circumference}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x="50%"
        y="50%"
        dominantBaseline="central"
        textAnchor="middle"
        fill="var(--text)"
        fontSize={size * 0.36}
        fontWeight={700}
      >
        {grade}
      </text>
    </svg>
  );
}
