'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import styles from './top-nav.module.css';

// Solo Dashboard existe por ahora; el resto de rutas está pendiente.
const NAV = [
  { href: '/', label: 'Dashboard' },
  { href: '/assets', label: 'Activos' },
  { href: '/findings', label: 'Hallazgos' },
  { href: '/scans', label: 'Escaneos' },
  { href: '/reports', label: 'Reportes' },
  { href: '/settings', label: 'Configuración' },
];

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    try {
      await createClient().auth.signOut();
    } catch {
      // Sin Supabase configurado (modo WARDEN_DEV_SKIP_AUTH) no hay sesión que cerrar.
    }
    router.push('/login');
    router.refresh();
  }

  return (
    <nav className={styles.nav}>
      <span className={styles.brand}>Warden</span>
      <ul className={styles.tabs}>
        {NAV.map((item) => {
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link href={item.href} className={`${styles.tab} ${active ? styles.active : ''}`}>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
      <button type="button" className={styles.logout} onClick={logout}>
        Cerrar sesión
      </button>
    </nav>
  );
}
