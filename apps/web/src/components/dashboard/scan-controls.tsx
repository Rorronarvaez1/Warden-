'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { requestScan } from '@/app/(dashboard)/actions';
import type { ScanSummary } from '@/lib/dashboard-types';
import styles from './dashboard.module.css';
import { formatDateTime } from './format';
import { SCAN_STATUS_COLORS, SCAN_STATUS_LABELS } from './scan-status';

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
          <span className={styles.pill} style={{ color: SCAN_STATUS_COLORS[lastScan.status] }}>
            {SCAN_STATUS_LABELS[lastScan.status]}
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
