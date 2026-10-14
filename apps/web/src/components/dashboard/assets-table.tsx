'use client';

import type { AssetType } from '@warden/shared';
import { useState } from 'react';
import type { AssetRow, AttributionStatus } from '@/lib/mock-dashboard';
import styles from './dashboard.module.css';
import { formatDate } from './format';

const TYPE_LABELS: Record<AssetType, string> = {
  domain: 'Dominio',
  subdomain: 'Subdominio',
  ip: 'IP',
  ip_range: 'Rango IP',
  asn: 'ASN',
};

const STATUS_LABELS: Record<AttributionStatus, string> = {
  pending: 'Por confirmar',
  confirmed: 'Confirmado',
  discarded: 'Descartado',
};

const STATUS_COLORS: Record<AttributionStatus, string> = {
  pending: 'var(--grade-c)',
  confirmed: 'var(--grade-a)',
  discarded: 'var(--muted)',
};

// Los pendientes van primero: solo los confirmados se escanean (ver run-scan.ts).
const STATUS_ORDER: Record<AttributionStatus, number> = { pending: 0, confirmed: 1, discarded: 2 };

export function AssetsTable({ assets }: { assets: AssetRow[] }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<AttributionStatus | ''>('');

  const q = query.trim().toLowerCase();
  const rows = assets
    .filter((a) => !q || a.value.toLowerCase().includes(q))
    .filter((a) => !status || a.status === status)
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.value.localeCompare(b.value));
  const pendingCount = assets.filter((a) => a.status === 'pending').length;

  return (
    <section className={styles.card}>
      <header className={styles.cardHeader}>
        <div>
          <h2 className={styles.cardTitle}>Activos</h2>
          <p className={styles.cardHint}>Solo los confirmados entran en los escaneos</p>
        </div>
        {pendingCount > 0 && (
          <span className={styles.chip} style={{ color: STATUS_COLORS.pending }}>
            {pendingCount} por confirmar
          </span>
        )}
      </header>

      <div className={styles.filters}>
        <input
          className={styles.input}
          type="search"
          placeholder="Buscar activo…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className={styles.select}
          value={status}
          onChange={(e) => setStatus(e.target.value as AttributionStatus | '')}
        >
          <option value="">Todos los estados</option>
          {(Object.keys(STATUS_LABELS) as AttributionStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Activo</th>
              <th>Tipo</th>
              <th>Estado</th>
              <th>Origen</th>
              <th>Visto por última vez</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id}>
                <td>{a.value}</td>
                <td className={styles.muted}>{TYPE_LABELS[a.type]}</td>
                <td>
                  <span className={styles.pill} style={{ color: STATUS_COLORS[a.status] }}>
                    {STATUS_LABELS[a.status]}
                  </span>
                </td>
                <td className={styles.muted}>{a.discoverySource === 'auto' ? 'Descubierto' : 'Manual'}</td>
                <td className={styles.muted}>{formatDate(a.lastSeen)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className={styles.empty}>Ningún activo coincide con los filtros.</p>}
      </div>
    </section>
  );
}
