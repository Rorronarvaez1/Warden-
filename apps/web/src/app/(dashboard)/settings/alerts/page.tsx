import Link from 'next/link';
import styles from '@/components/dashboard/dashboard.module.css';
import { AlertList } from '@/components/reports/alert-list';
import { AlertSettingsForm } from '@/components/settings/alert-settings-form';
import { loadRecentAlerts } from '@/lib/alerts';
import { loadActiveCompany } from '@/lib/dashboard-data';
import { loadAlertSettings } from '@/lib/scoring-settings';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function AlertSettingsPage() {
  const state = await loadAlertSettings();
  if (state.kind !== 'ready') {
    return (
      <div className={styles.page}>
        <h1 className={styles.pageTitle}>Alertas</h1>
        <p className={styles.notice}>Inicia sesión para ver las alertas.</p>
      </div>
    );
  }
  const supabase = await createClient();
  const company = await loadActiveCompany(supabase);
  const alerts = company ? await loadRecentAlerts(supabase, company.id, 50) : [];

  return (
    <div className={styles.page}>
      <div>
        <Link href="/settings" className={styles.linkButton}>← Configuración</Link>
        <h1 className={styles.pageTitle}>Alertas</h1>
        <p className={styles.subtitle}>Se registran al calificar cada escaneo · el envío por correo está pendiente</p>
      </div>
      {state.isAdmin ? (
        <AlertSettingsForm settings={state.settings} />
      ) : (
        <p className={styles.notice}>Solo un administrador puede cambiar las reglas de alerta.</p>
      )}
      <AlertList alerts={alerts} title="Historial de alertas" hint="Últimas 50, de la más reciente a la más antigua" />
    </div>
  );
}
