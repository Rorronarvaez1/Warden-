'use client';

import { GRADES, type Grade } from '@warden/shared';
import { useState } from 'react';
import type { CompanyRow } from '@/lib/mock-dashboard';
import styles from './dashboard.module.css';
import { formatDate } from './format';
import { GradeBadge } from './grade-badge';

export function CompaniesTable({ companies }: { companies: CompanyRow[] }) {
  const [query, setQuery] = useState('');
  const [grade, setGrade] = useState<Grade | ''>('');

  const q = query.trim().toLowerCase();
  const rows = companies
    .filter((c) => !q || c.name.toLowerCase().includes(q) || c.primaryDomain.includes(q))
    .filter((c) => !grade || c.grade === grade)
    .sort((a, b) => a.score - b.score);

  return (
    <section className={styles.card}>
      <header className={styles.cardHeader}>
        <div>
          <h2 className={styles.cardTitle}>Empresas</h2>
          <p className={styles.cardHint}>Ordenadas de mayor a menor riesgo</p>
        </div>
        <span className={styles.chip}>{rows.length} {rows.length === 1 ? 'resultado' : 'resultados'}</span>
      </header>

      <div className={styles.filters}>
        <input
          className={styles.input}
          type="search"
          placeholder="Buscar empresa o dominio…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select className={styles.select} value={grade} onChange={(e) => setGrade(e.target.value as Grade | '')}>
          <option value="">Todas las notas</option>
          {GRADES.map((g) => (
            <option key={g} value={g}>
              Nota {g}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Empresa</th>
              <th>Dominio</th>
              <th>Nota</th>
              <th className={styles.num}>Puntaje</th>
              <th className={styles.num}>Críticos</th>
              <th>Último escaneo</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td className={styles.muted}>{c.primaryDomain}</td>
                <td>
                  <GradeBadge grade={c.grade} />
                </td>
                <td className={styles.num}>{c.score.toFixed(1)}</td>
                <td className={styles.num} style={c.criticalFindings > 0 ? { color: 'var(--grade-f)' } : undefined}>
                  {c.criticalFindings}
                </td>
                <td className={styles.muted}>{formatDate(c.lastScanAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className={styles.empty}>Ninguna empresa coincide con los filtros.</p>}
      </div>
    </section>
  );
}
