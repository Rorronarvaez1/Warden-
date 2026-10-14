import Link from 'next/link';
import styles from '@/components/dashboard/dashboard.module.css';

export default function SettingsPage() {
  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Configuración</h1>
      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <h2 className={styles.cardTitle}>Usuarios</h2>
            <p className={styles.cardHint}>Crear cuentas locales, asignar roles, activar accesos y cambiar contraseñas. Solo administradores.</p>
          </div>
          <Link href="/settings/users" className={styles.button}>
            Administrar
          </Link>
        </div>
      </section>
    </div>
  );
}
