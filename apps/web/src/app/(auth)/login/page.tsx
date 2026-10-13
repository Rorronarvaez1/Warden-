'use client';

// Formulario portado de frontend/frontend (Login.tsx), ahora contra Supabase Auth
// con email + contraseña. Los roles viven en public.profiles.

import { useRouter } from 'next/navigation';
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { createClient } from '@/lib/supabase/client';
import styles from './login.module.css';

interface LoginError {
  field: 'email' | 'password' | 'general';
  message: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [error, setError] = useState<LoginError | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setCredentials((prev) => ({ ...prev, [name]: value }));
    if (error?.field === name) setError(null);
  }

  function validate(): boolean {
    if (!credentials.email.trim()) {
      setError({ field: 'email', message: 'El email es obligatorio' });
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(credentials.email)) {
      setError({ field: 'email', message: 'Email inválido' });
      return false;
    }
    if (credentials.password.length < 6) {
      setError({ field: 'password', message: 'La contraseña debe tener al menos 6 caracteres' });
      return false;
    }
    return true;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!validate()) return;

    setIsLoading(true);
    try {
      const { error: authError } = await createClient().auth.signInWithPassword(credentials);
      if (authError) {
        setError({ field: 'general', message: 'Credenciales incorrectas' });
        return;
      }
      router.push('/');
      router.refresh();
    } catch {
      setError({ field: 'general', message: 'No se pudo conectar con el servidor' });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      <form onSubmit={handleSubmit} className={styles.form} noValidate>
        <h1 className={styles.brand}>Warden</h1>
        <h2 className={styles.title}>Iniciar sesión</h2>

        {error?.field === 'general' && <div className={styles.errorBox}>{error.message}</div>}

        <div className={styles.field}>
          <label htmlFor="email" className={styles.label}>
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={credentials.email}
            onChange={handleChange}
            placeholder="tu@email.com"
            className={`${styles.input} ${error?.field === 'email' ? styles.inputError : ''}`}
            disabled={isLoading}
            autoComplete="email"
          />
          {error?.field === 'email' && <span className={styles.errorText}>{error.message}</span>}
        </div>

        <div className={styles.field}>
          <label htmlFor="password" className={styles.label}>
            Contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            value={credentials.password}
            onChange={handleChange}
            placeholder="******"
            className={`${styles.input} ${error?.field === 'password' ? styles.inputError : ''}`}
            disabled={isLoading}
            autoComplete="current-password"
          />
          {error?.field === 'password' && <span className={styles.errorText}>{error.message}</span>}
        </div>

        <button type="submit" disabled={isLoading} className={styles.button}>
          {isLoading ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
    </div>
  );
}
