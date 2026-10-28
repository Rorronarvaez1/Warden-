// Alertas que el worker registra al calificar (pipeline/alerts.ts).

import { ALERT_TYPES } from '@warden/shared';
import { asGrade, oneOf } from './dashboard-data';
import type { ReportAlert } from './reports';
import type { createClient } from './supabase/server';

type Supabase = Awaited<ReturnType<typeof createClient>>;

export interface AlertRow extends ReportAlert {
  id: string;
  /** Reporte (score) que la disparó. */
  scoreId: string;
  score: number;
  at: string;
}

/**
 * Alertas más recientes. alerts no tiene fecha propia: se parte de los puntajes con alerta
 * (alerts!inner), ordenados por computed_at, para que el límite corte por fecha.
 */
export async function loadRecentAlerts(supabase: Supabase, companyId: string, limit: number): Promise<AlertRow[]> {
  const { data, error } = await supabase
    .from('scores')
    .select('id, global_score, computed_at, alerts!inner(id, alert_type, previous_grade, new_grade)')
    .eq('company_id', companyId)
    .order('computed_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data.flatMap((s) =>
    s.alerts.map((a) => ({
      id: a.id,
      type: oneOf(ALERT_TYPES, a.alert_type, 'grade_drop'),
      previousGrade: a.previous_grade ? asGrade(a.previous_grade) : null,
      newGrade: asGrade(a.new_grade),
      scoreId: s.id,
      score: Number(s.global_score),
      at: s.computed_at,
    })),
  );
}
