'use client';

import { CONFIDENCES, RISK_DOMAIN_KEYS, SEVERITIES, type Confidence, type Severity } from '@warden/shared';
import { useActionState, useState, useTransition } from 'react';
import { activateWeightVersion, createWeightVersion, type ActionResult } from '@/app/(dashboard)/settings/actions';
import styles from '@/components/dashboard/dashboard.module.css';
import { formatDateTime } from '@/components/dashboard/format';
import { DOMAIN_LABELS } from '@/lib/dashboard-types';
import type { WeightVersion } from '@/lib/scoring-settings';

const SEVERITY_LABELS: Record<Severity, string> = { critical: 'Crítica', high: 'Alta', medium: 'Media', low: 'Baja', info: 'Info' };
const CONFIDENCE_LABELS: Record<Confidence, string> = { high: 'Alta', medium: 'Media', low: 'Baja' };

export function ScoringWeights({ versions, isAdmin }: { versions: WeightVersion[]; isAdmin: boolean }) {
  const active = versions.find((v) => v.isActive) ?? versions[0];
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(createWeightVersion, {});
  const [activation, setActivation] = useState<ActionResult>({});
  const [activating, startActivation] = useTransition();
  const [weights, setWeights] = useState(() =>
    Object.fromEntries(RISK_DOMAIN_KEYS.map((k) => [k, String(active?.weights[k] ?? 0)])),
  );
  const total = RISK_DOMAIN_KEYS.reduce((sum, k) => sum + (Number(weights[k]) || 0), 0);

  return (
    <>
      <section className={styles.card}>
        <header className={styles.cardHeader}>
          <div>
            <h2 className={styles.cardTitle}>Versiones de pesos</h2>
            <p className={styles.cardHint}>
              Cada escaneo guarda la versión con la que se encoló; activar otra solo afecta a los escaneos nuevos
            </p>
          </div>
        </header>
        {activation.error && <p className={styles.error}>{activation.error}</p>}
        {activation.ok && <p className={styles.notice}>{activation.ok}</p>}
        {versions.length === 0 ? (
          <p className={styles.empty}>No hay versiones de pesos: los escaneos no se califican.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Versión</th>
                  {RISK_DOMAIN_KEYS.map((k) => <th key={k}>{DOMAIN_LABELS[k]}</th>)}
                  <th>Puntos (C/A/M/B/I)</th>
                  <th>Factores (A/M/B)</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {versions.map((v) => (
                  <tr key={v.id}>
                    <td>
                      v{v.version}{' '}
                      {v.isActive && <span className={styles.pill} style={{ color: 'var(--grade-a)' }}>Activa</span>}
                      <div className={styles.subText}>{formatDateTime(v.effectiveFrom)}</div>
                    </td>
                    {RISK_DOMAIN_KEYS.map((k) => <td key={k} className={styles.num}>{v.weights[k]}%</td>)}
                    <td className={styles.muted}>{SEVERITIES.map((s) => v.severityPoints[s]).join(' / ')}</td>
                    <td className={styles.muted}>{CONFIDENCES.map((c) => v.confidenceFactors[c]).join(' / ')}</td>
                    <td>
                      {isAdmin && !v.isActive && (
                        <button
                          type="button"
                          className={styles.buttonGhost}
                          disabled={activating}
                          onClick={() => startActivation(async () => setActivation(await activateWeightVersion(v.id)))}
                        >
                          Activar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {isAdmin && (
        <section className={styles.card}>
          <header className={styles.cardHeader}>
            <div>
              <h2 className={styles.cardTitle}>Nueva versión</h2>
              <p className={styles.cardHint}>
                Parte de la versión activa. Los puntos y factores aplican igual a todos los dominios (docs/scoring-model.md)
              </p>
            </div>
          </header>
          <form action={formAction} className={styles.form} style={{ marginTop: 0 }}>
            {state.error && <p className={styles.error}>{state.error}</p>}
            {state.ok && <p className={styles.notice}>{state.ok}</p>}

            <fieldset className={styles.field} style={{ border: 0, padding: 0 }}>
              <legend>
                Peso por dominio (%) · suma{' '}
                <strong style={{ color: Math.abs(total - 100) < 0.01 ? 'var(--grade-a)' : 'var(--grade-f)' }}>{total}</strong> / 100
              </legend>
              <div className={styles.inlineActions} style={{ flexWrap: 'wrap' }}>
                {RISK_DOMAIN_KEYS.map((k) => (
                  <label key={k} className={styles.field}>
                    {DOMAIN_LABELS[k]}
                    <input
                      className={styles.input}
                      name={`weight.${k}`}
                      type="number"
                      min={0}
                      max={100}
                      step="0.01"
                      value={weights[k]}
                      onChange={(e) => setWeights({ ...weights, [k]: e.target.value })}
                      required
                    />
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className={styles.field} style={{ border: 0, padding: 0 }}>
              <legend>Puntos por severidad</legend>
              <div className={styles.inlineActions} style={{ flexWrap: 'wrap' }}>
                {SEVERITIES.map((s) => (
                  <label key={s} className={styles.field}>
                    {SEVERITY_LABELS[s]}
                    <input className={styles.input} name={`points.${s}`} type="number" min={0} step="0.1" defaultValue={active?.severityPoints[s] ?? 0} required />
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className={styles.field} style={{ border: 0, padding: 0 }}>
              <legend>Factor por confianza (0–1)</legend>
              <div className={styles.inlineActions} style={{ flexWrap: 'wrap' }}>
                {CONFIDENCES.map((c) => (
                  <label key={c} className={styles.field}>
                    {CONFIDENCE_LABELS[c]}
                    <input className={styles.input} name={`factor.${c}`} type="number" min={0} max={1} step="0.05" defaultValue={active?.confidenceFactors[c] ?? 1} required />
                  </label>
                ))}
              </div>
            </fieldset>

            <label className={styles.field} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" name="activate" /> Activar al crear
            </label>
            <div>
              <button type="submit" className={styles.button} disabled={pending || Math.abs(total - 100) > 0.01}>
                {pending ? 'Guardando…' : 'Crear versión'}
              </button>
            </div>
          </form>
        </section>
      )}
    </>
  );
}
