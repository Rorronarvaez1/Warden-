import Link from 'next/link';

export default function SettingsPage() {
  return <><h1>Configuración</h1><p><Link href="/settings/users">Administrar usuarios y contraseñas</Link></p>
    <p>Creación de cuentas locales, roles y control de acceso. Solo para administradores.</p></>;
}
