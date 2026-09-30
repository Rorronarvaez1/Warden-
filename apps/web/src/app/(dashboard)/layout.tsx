import Link from 'next/link';
import type { ReactNode } from 'react';

const NAV = [
  { href: '/', label: 'Dashboard' },
  { href: '/companies', label: 'Empresas' },
  { href: '/findings', label: 'Hallazgos' },
  { href: '/scans', label: 'Escaneos' },
  { href: '/reports', label: 'Reportes' },
  { href: '/settings', label: 'Configuración' },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <nav style={{ width: 200, padding: 16, borderRight: '1px solid var(--border)' }}>
        <strong>Warden</strong>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {NAV.map((item) => (
            <li key={item.href} style={{ margin: '8px 0' }}>
              <Link href={item.href} style={{ color: 'var(--text)' }}>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <main style={{ flex: 1, padding: 32 }}>{children}</main>
    </div>
  );
}
