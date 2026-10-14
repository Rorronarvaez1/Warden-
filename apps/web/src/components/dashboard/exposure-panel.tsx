import type { ScanSourceStatus, Severity } from '@warden/shared';
import type { ReactNode } from 'react';
import type { ExposureOverview } from '@/lib/dashboard-types';
import styles from './dashboard.module.css';
import { formatDate } from './format';
import { SEVERITY_COLORS, SeverityPill } from './grade-badge';
import { SourceToggle } from './source-toggle';

const RUN_LABELS: Record<ScanSourceStatus, string> = {
  ok: 'Último escaneo correcto',
  failed: 'Falló en el último escaneo',
  skipped: 'Omitida en el último escaneo',
  blocked: 'Bloqueada por la compuerta no-contact',
};

const RUN_COLORS: Record<ScanSourceStatus, string> = {
  ok: 'var(--grade-a)',
  failed: 'var(--grade-f)',
  skipped: 'var(--muted)',
  blocked: 'var(--grade-f)',
};

const MAX_CVES = 4;

export function ExposurePanel({ exposure, isAdmin }: { exposure: ExposureOverview; isAdmin: boolean }) {
  const { source, hosts } = exposure;
  const services = hosts.reduce((n, h) => n + h.services.length, 0);
  const cves = hosts.reduce((n, h) => n + h.cves.length, 0);

  return (
    <section className={styles.card}>
      <header className={styles.cardHeader}>
        <div>
          <h2 className={styles.cardTitle}>Exposición de servicios</h2>
          <p className={styles.cardHint}>
            Puertos y CVE que {source?.name ?? 'la fuente'} ya observó en las IPs de tus dominios confirmados.
            Warden no contacta tus servidores.
          </p>
        </div>
        {source && (
          <span className={styles.inlineActions}>
            {source.lastRun && (
              <span
                className={styles.chip}
                style={{ color: RUN_COLORS[source.lastRun.status] }}
                title={source.lastRun.message ?? undefined}
              >
                {RUN_LABELS[source.lastRun.status]}
              </span>
            )}
            {isAdmin && <SourceToggle enabled={source.enabled} />}
          </span>
        )}
      </header>

      {!source ? (
        <p className={styles.notice}>La fuente de exposición no está registrada en la BD (¿falta el seed?).</p>
      ) : !source.enabled ? (
        <p className={styles.notice}>
          La fuente está deshabilitada.{' '}
          {isAdmin ? 'Habilítala y lanza un escaneo.' : 'Pide a un admin que la habilite.'} Su uso gratuito es
          solo no comercial.
        </p>
      ) : null}

      {source?.lastRun?.status === 'failed' && source.lastRun.message && (
        <p className={styles.notice} style={{ color: 'var(--grade-f)' }}>
          {source.lastRun.message}
        </p>
      )}

      {hosts.length === 0 ? (
        <p className={styles.empty}>
          {source?.lastRun?.status === 'ok'
            ? 'Sin servicios expuestos observados. Ausencia de datos no garantiza ausencia de riesgo.'
            : source?.lastRun?.status === 'failed'
              ? 'Sin datos: la fuente falló. Revisa el error y vuelve a escanear.'
              : 'Sin datos todavía: lanza un escaneo con la fuente habilitada.'}
        </p>
      ) : (
        <>
          <p className={styles.cardHint} style={{ marginTop: 0 }}>
            {hosts.length} IPs · {services} servicios · {cves} posibles CVE abiertos
          </p>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>IP</th>
                  <th>Servicios expuestos</th>
                  <th>Posibles CVE</th>
                  <th>Máxima</th>
                  <th>Observado</th>
                </tr>
              </thead>
              <tbody>
                {hosts.map((h) => (
                  <tr key={h.ip}>
                    <td>
                      <div>{h.ip}</div>
                      {h.resolvedFrom.length > 0 && (
                        <div className={styles.subText}>{h.resolvedFrom.join(', ')}</div>
                      )}
                    </td>
                    <td className={styles.wrap}>
                      <span className={styles.tagList}>
                        {h.services.map((s) => (
                          <Tag
                            key={s.findingId}
                            severity={s.severity}
                            title={`Confianza ${s.confidence === 'high' ? 'alta (CPE)' : 'media (por puerto)'}`}
                          >
                            {s.service} {s.port}
                          </Tag>
                        ))}
                        {h.services.length === 0 && <span className={styles.muted}>—</span>}
                      </span>
                    </td>
                    <td className={styles.wrap}>
                      <span className={styles.tagList}>
                        {h.cves.slice(0, MAX_CVES).map((c) => (
                          <Tag
                            key={c.findingId}
                            severity={c.severity}
                            title={`${c.inKev ? 'En CISA KEV · ' : ''}EPSS ${c.epss === null ? 'n/d' : `${(c.epss * 100).toFixed(1)}%`}`}
                          >
                            {c.cve}
                            {c.inKev && ' · KEV'}
                          </Tag>
                        ))}
                        {h.cves.length > MAX_CVES && (
                          <span className={styles.muted}>+{h.cves.length - MAX_CVES}</span>
                        )}
                        {h.cves.length === 0 && <span className={styles.muted}>—</span>}
                      </span>
                    </td>
                    <td>
                      <SeverityPill severity={h.worstSeverity} />
                    </td>
                    <td className={styles.muted}>{formatDate(h.observedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={styles.attribution}>
            Datos de{' '}
            <a href="https://internetdb.shodan.io" target="_blank" rel="noreferrer">
              Shodan InternetDB
            </a>
            , CISA KEV y FIRST EPSS. Los CVE se infieren por versión de software y no están verificados.
          </p>
        </>
      )}
    </section>
  );
}

function Tag({ severity, title, children }: { severity: Severity; title?: string; children: ReactNode }) {
  return (
    <span className={styles.tag} style={{ color: SEVERITY_COLORS[severity] }} title={title}>
      {children}
    </span>
  );
}
