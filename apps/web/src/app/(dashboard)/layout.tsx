import type { ReactNode } from 'react';
import { TopNav } from '@/components/top-nav';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ minHeight: '100vh' }}>
      <TopNav />
      <main style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 16px 48px' }}>{children}</main>
    </div>
  );
}
