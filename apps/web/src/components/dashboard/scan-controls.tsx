'use client';

import type { ScanStatus } from '@warden/shared';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { requestScan } from '@/app/(dashboard)/actions';
import type { ScanSummary } from '@/lib/dashboard-types';
import styles from './dashboard.module.css';
import { formatDateTime } from './format';

const STATUS_LABELS: Record<ScanStatus, string> = {
  queued: 'En cola',
  running: 'En curso',
  completed: 'Completado',
  failed: 'Falló',
};

const STATUS_COLORS: Record<ScanStatus, string> = {
  queued: 'var(--muted)',
  running: 'var(--accent)',
  completed: 'var(--grade-a)',
  failed: 'var(--grade-f)',
};

// El worker procesa el escaneo fuera de la web: mientras siga activo se refresca la página.
const POLL_MS = 4000;

export function ScanControls({
  companyId,
  lastScan,
  disabled,
}: {
  companyId: string;
  lastScan: ScanSummary | null;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const active = lastScan?.status === 'queued' || lastScan?.status === 'running';

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => router.refresh(), POLL_MS);
    return () => clearInterval(id);
  }, [active, router]);

  function onClick() {
    setError(null);
    startTransition(async () => {
      const result = await requestScan(companyId);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className={styles.scanControls}>
      {lastScan && (
        <span className={styles.muted} title={lastScan.errorMessage ?? undefined}>
          Último escaneo{' '}
          <span className={styles.pill} style={{ color: STATUS_COLORS[lastScan.status] }}>
            {STATUS_LABELS[lastScan.status]}
          </span>{' '}
          {formatDateTime(lastScan.finishedAt ?? lastScan.createdAt)}
        </span>
      )}
      <button type="button" className={styles.button} onClick={onClick} disabled={disabled || pending || active}>
        {active ? 'Escaneando…' : pending ? 'Solicitando…' : 'Escanear ahora'}
      </button>
      {error && <span className={styles.error}>{error}</span>}
    </div>
  );
}
