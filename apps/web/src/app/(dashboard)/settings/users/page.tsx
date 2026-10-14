import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isLocalUserAdminEnabled } from '@/lib/local-user-admin';
import { UserManagement } from '@/components/users/user-management';
import { loadUsers } from './actions';

export default async function UsersPage() {
  if (!isLocalUserAdminEnabled()) return <><h1>Usuarios</h1><p>Esta función requiere Supabase local y una sesión real de administrador. No está habilitada en producción.</p></>;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('role, is_active').eq('id', user.id).single();
  if (profile?.role !== 'admin' || !profile.is_active) {
    return <><h1>Acceso restringido</h1><p>Solo un administrador activo puede gestionar usuarios.</p></>;
  }
  const result = await loadUsers(1);
  return <UserManagement currentUserId={user.id} initialUsers={result.users ?? []}
    initialHasMore={result.hasMore ?? false} initialError={result.error} />;
}
