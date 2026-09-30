# Warden

Plataforma que califica el riesgo cibernético de una empresa mediante un KRI, usando solo información pasiva (OSINT, sin contacto con la infraestructura evaluada).

## Estructura

```
apps/web            Next.js (Vercel): dashboard y API ligera
apps/worker         Node en contenedor: cola → colectores → hallazgos → score → reporte
packages/collectors Integraciones OSINT, una carpeta por fuente + compuerta no-contact
packages/scoring    Motor del KRI (funciones puras)
packages/ai         Cliente OpenRouter, prompts versionados, validación y redacción
packages/db         Tipos generados de Supabase
packages/shared     Enums y tipos compartidos
packages/config     tsconfig base
supabase/           Migraciones, seed y config local
infra/              docker-compose (worker + SpiderFoot)
docs/               Arquitectura, ADRs, modelo de scoring, fuentes, diagrama ER
```

Más detalle en [docs/architecture.md](docs/architecture.md).

## Desarrollo local

Requisitos: Node 24, Docker Desktop y Supabase CLI.

```bash
corepack enable
pnpm install
cp .env.example .env    # completar con las llaves que imprime `pnpm db:start`
cp .env apps/web/.env.local   # Next.js solo lee variables de su propia carpeta
pnpm db:start           # Supabase local, aplica migraciones y seed
pnpm db:types           # genera packages/db/src/database.types.ts
pnpm dev                # web + worker
```

Para crear el primer admin, regístrate y luego ejecuta en SQL:

```sql
update public.profiles set role = 'admin', is_active = true where id = '<tu-user-id>';
```

## Convenciones

| Elemento | Convención | Ejemplo |
|---|---|---|
| Archivos y carpetas | kebab-case | `score-gauge.tsx`, `run-scan.ts` |
| Componentes y tipos | PascalCase | `ScoreGauge`, `CollectorResult` |
| Paquetes internos | `@warden/*` | `@warden/scoring` |
| Tablas y columnas | snake_case, tablas en plural | `scan_sources` |
| Migraciones | `YYYYMMDDHHMMSS_verbo_objeto.sql` | `20261001000500_create_scans_findings.sql` |
| Carpeta de colector | igual a `sources.source_key` | `collectors/src/crtsh/` |
| Prompts | `nombre.vN.ts`, nunca editar una versión publicada | `executive-summary.v1.ts` |
| Colas | snake_case | `scan_requests` |
