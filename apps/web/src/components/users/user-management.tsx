'use client';

import Link from 'next/link';
import { useActionState, useEffect, useRef, useState, useTransition } from 'react';
import { changeUserPassword, createUser, loadUsers, updateUser, type UserActionResult } from '@/app/(dashboard)/settings/users/actions';
import type { ManagedUser } from '../../../../../supabase/functions/manage-users/handler';
import styles from './users.module.css';

function Feedback({ state }: { state: UserActionResult }) {
  return <div aria-live="polite">
    {state.error && <p className={styles.error} role="alert">{state.error}</p>}
    {state.message && <p className={styles.success}>{state.message}</p>}
    {state.warning && <p className={styles.error}>{state.warning}</p>}
  </div>;
}

function PasswordFields({ prefix }: { prefix: string }) {
  return <>
    <label>Contraseña<input id={`${prefix}-password`} name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={72} /></label>
    <label>Confirmar contraseña<input name="confirmPassword" type="password" autoComplete="new-password" required minLength={12} maxLength={72} /></label>
  </>;
}

function CreateUserForm() {
  const [state, action, pending] = useActionState(createUser, {});
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.message) formRef.current?.reset(); }, [state]);
  return <section className={styles.card}>
    <h2>Crear usuario</h2>
    <p className={styles.muted}>Usa un nombre como analista, sin correo real. Las cuentas nuevas quedan inactivas hasta que las habilites.</p>
    <form ref={formRef} action={action}>
      <fieldset disabled={pending} className={styles.form}>
        <label>Nombre completo<input name="fullName" required maxLength={120} autoComplete="off" /></label>
        <label>Usuario o correo de acceso<input name="email" type="text" required maxLength={254} autoComplete="off" placeholder="analista" /></label>
        <label>Rol<select name="role" defaultValue="analyst"><option value="analyst">Analista</option><option value="admin">Administrador</option></select></label>
        <PasswordFields prefix="create" />
        <p className={styles.muted}>Usa al menos 12 caracteres (máximo 72 bytes).</p>
        <button type="submit">{pending ? 'Creando…' : 'Crear usuario'}</button>
      </fieldset>
      <Feedback state={state} />
    </form>
  </section>;
}

function UserCard({ user, currentUserId }: { user: ManagedUser; currentUserId: string }) {
  const [state, action, pending] = useActionState(updateUser, {});
  const [passwordState, passwordAction, passwordPending] = useActionState(changeUserPassword, {});
  const passwordForm = useRef<HTMLFormElement>(null);
  const isSelf = user.id === currentUserId;
  useEffect(() => { if (passwordState.message) passwordForm.current?.reset(); }, [passwordState]);
  return <article className={styles.card}>
    <div className={styles.userHeading}><h3>{user.email.endsWith('@warden.test') ? user.email.slice(0, -12) : user.email}</h3><span className={user.isActive ? styles.active : styles.inactive}>{user.isActive ? 'Activo' : 'Inactivo'}</span></div>
    <p className={styles.muted}>{isSelf ? 'Tu cuenta · ' : ''}Creado el {new Date(user.createdAt).toLocaleDateString('es-MX')}</p>
    <form action={action}>
      <input type="hidden" name="id" value={user.id} />
      <fieldset disabled={pending} className={styles.form}>
        <label>Nombre completo<input name="fullName" defaultValue={user.fullName} required maxLength={120} /></label>
        <label>Rol<select name="role" defaultValue={user.role} disabled={isSelf}><option value="analyst">Analista</option><option value="admin">Administrador</option></select></label>
        {isSelf && <input type="hidden" name="role" value="admin" />}
        <label className={styles.checkbox}><input name="isActive" type="checkbox" defaultChecked={user.isActive} disabled={isSelf} />Acceso activo</label>
        {isSelf && <input type="hidden" name="isActive" value="on" />}
        <button type="submit">{pending ? 'Guardando…' : 'Guardar cambios'}</button>
      </fieldset>
      <Feedback state={state} />
    </form>
    <details className={styles.passwordDetails}>
      <summary>Cambiar contraseña</summary>
      <form ref={passwordForm} action={passwordAction}>
        <input type="hidden" name="id" value={user.id} />
        <fieldset disabled={passwordPending} className={styles.form}>
          <PasswordFields prefix={user.id} />
          <button type="submit">{passwordPending ? 'Actualizando…' : 'Actualizar contraseña'}</button>
        </fieldset>
        <Feedback state={passwordState} />
      </form>
    </details>
  </article>;
}

export function UserManagement({ currentUserId, initialUsers, initialHasMore, initialError }: {
  currentUserId: string; initialUsers: ManagedUser[]; initialHasMore: boolean; initialError?: string;
}) {
  const [users, setUsers] = useState(initialUsers);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [page, setPage] = useState(1);
  const [error, setError] = useState(initialError);
  const [pending, startTransition] = useTransition();
  useEffect(() => { setUsers(initialUsers); setHasMore(initialHasMore); setPage(1); setError(initialError); }, [initialUsers, initialHasMore, initialError]);
  function navigate(nextPage: number) {
    startTransition(async () => {
      const result = await loadUsers(nextPage);
      setError(result.error);
      if (!result.error) { setUsers(result.users ?? []); setHasMore(result.hasMore ?? false); setPage(nextPage); }
    });
  }
  return <div className={styles.page}>
    <header><Link href="/settings">Configuración</Link><h1>Administración de usuarios</h1>
      <p className={styles.muted}>Cuentas locales con contraseña. La verificación por correo y MFA quedan pendientes.</p></header>
    {error && <p className={styles.error} role="alert">{error}</p>}
    <div className={styles.layout}>
      <CreateUserForm />
      <section className={styles.list} aria-label="Usuarios registrados">
        <div className={styles.userHeading}><h2>Usuarios registrados</h2><button disabled={pending} onClick={() => navigate(page)}>Actualizar</button></div>
        {users.length === 0 && !error && <p>No hay usuarios en esta página.</p>}
        {users.map((user) => <UserCard key={`${user.id}-${user.fullName}-${user.role}-${user.isActive}`} user={user} currentUserId={currentUserId} />)}
        <div className={styles.pagination}><button disabled={pending || page === 1} onClick={() => navigate(page - 1)}>Anterior</button>
          <span>Página {page}</span><button disabled={pending || !hasMore} onClick={() => navigate(page + 1)}>Siguiente</button></div>
      </section>
    </div>
  </div>;
}
