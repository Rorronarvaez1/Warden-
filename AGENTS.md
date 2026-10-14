# AGENTS.md — Contexto del proyecto Warden

Guía para developers y agentes de IA (Claude Code, Cursor, Copilot, Codex, etc.) que trabajen en este repositorio. Léela completa antes de hacer cambios. Si algo de aquí contradice el código, **el código manda**: actualiza este archivo en el mismo PR.

---

## 1. Qué es Warden

Warden es una plataforma que **califica el riesgo cibernético de una empresa** mediante un **KRI** (Key Risk Indicator): un puntaje numérico y una letra A–F, global y por dominio de riesgo.

La regla que define el producto: **solo se usa información pasiva (OSINT)**. Warden **nunca** envía tráfico a la infraestructura de la empresa evaluada. Consulta registros públicos (logs de Certificate Transparency, DNS público, feeds de reputación, repositorios públicos), pero no escanea puertos, no hace requests HTTP a sus servidores, no hace fuzzing.

> ⚠️ **Regla no negociable (no-contact):** cualquier código que contacte directamente activos de la empresa evaluada es un bug grave, no una feature. Está protegido en tres capas: tipo TypeScript, compuerta en runtime y CHECK constraint en la BD (ver §6).

### Usuarios y roles

| Rol | Puede |
|---|---|
| `analyst` | Leer todo lo operativo, registrar empresas y activos, clasificar (triage) hallazgos, solicitar escaneos. |
| `admin` | Todo lo anterior + configurar fuentes, pesos del KRI, programación, alertas y usuarios. |

Los usuarios nuevos se crean con `is_active = false`; un admin los activa en `public.profiles`.

### Los 6 dominios de riesgo

| key | Nombre | Fuente prevista |
|---|---|---|
| `exposure` | Exposición de servicios | SpiderFoot (pasivo) |
| `email` | Seguridad de correo (SPF/DKIM/DMARC/MX) | DNS público (adaptador implementado); checkdmarc previsto |
| `certs` | Certificados (CT logs) | crt.sh ✅ |
| `secrets` | Secretos filtrados en repos públicos | gitleaks |
| `reputation` | Listas de malware/phishing/botnets | abuse.ch |
| `impersonation` | Typosquatting | dnstwist |

Estos valores deben coincidir en tres lugares: `packages/shared/src/index.ts`, los CHECK constraints de las migraciones y `supabase/seed.sql`.

---

## 2. Estado actual (octubre 2026)

| Área | Estado |
|---|---|
| Esquema de BD, RLS, colas, cron | ✅ Completo (`supabase/migrations/`) |
| Login con Supabase Auth | ✅ `apps/web/src/app/(auth)/login` |
| Dashboard | 🟡 Vista de una sola empresa con **datos mock** (`apps/web/src/lib/mock-dashboard.ts`) |
| `POST /api/scans` | ✅ Encola escaneos manuales |
| Worker (cola → colectores → persistencia) | ✅ Funciona |
| Colectores del pipeline | 🟡 Solo `crtsh` registrado (descubre subdominios, aún no produce hallazgos); adaptadores `email-dns` y `hibp` disponibles por separado |
| Motor de scoring | 🔴 **Sin definir**: `computeScore()` lanza `ScoringModelNotDefinedError` |
| Resúmenes con IA | 🟡 Paquete listo (`@warden/ai`), aún no conectado al worker |
| Análisis de correo / credenciales en brechas | 🟡 `@warden/risk-analysis` y adaptadores DNS/HIBP implementados; aún fuera de `runScan` y del catálogo productivo (ver `docs/risk-analysis.md`) |
| Páginas Activos / Hallazgos / Escaneos / Reportes / Configuración | 🔴 Pendientes (ya están en la `TopNav`) |
| Alertas, outbox SIEM/SOAR, archivado | 🔴 Solo tablas |

**No inventes el modelo de scoring.** Las preguntas abiertas están en [docs/scoring-model.md](docs/scoring-model.md). Si una tarea lo necesita, pregunta al equipo o deja un supuesto explícito y comentado (como hace `mock-dashboard.ts`: "puntaje 0–100, más alto es mejor").

---

## 3. Stack

- **Lenguaje:** TypeScript en todo (ver [ADR 0001](docs/adr/0001-monorepo-typescript.md)). TS 7, `strict`, `noUncheckedIndexedAccess`.
- **Monorepo:** pnpm workspaces + Turborepo. Node 24. `pnpm@10`.
- **Web:** Next.js 16 (App Router) + React 19, CSS Modules (sin Tailwind ni librería de UI). Desplegada en Vercel.
- **Worker:** Node + `tsx`, en contenedor Docker (Railway/Fly/VM).
- **Datos:** Supabase — Postgres, Auth, Storage, colas (`pgmq`) y `pg_cron`.
- **IA:** OpenRouter (API compatible con OpenAI) para resúmenes ejecutivos.
- **Validación:** `zod` v4.
- **Tests:** `vitest`.
- **OSINT externo:** SpiderFoot (contenedor aparte, solo módulos pasivos).

---

## 4. Estructura del repositorio

```
Warden-/
├── apps/
│   ├── web/                    @warden/web — Next.js (Vercel)
│   │   └── src/
│   │       ├── app/
│   │       │   ├── (auth)/login/        Login (Client Component, Supabase Auth)
│   │       │   ├── (dashboard)/         Layout con TopNav + página principal
│   │       │   ├── api/scans/route.ts   POST → rpc('request_scan')
│   │       │   ├── layout.tsx           Root layout (lang="es")
│   │       │   └── globals.css          Tokens de color (--bg, --grade-a … --grade-f)
│   │       ├── components/              Componentes UI + *.module.css
│   │       │   └── dashboard/           Gauge, activos, dominios, tendencia, hallazgos
│   │       ├── lib/
│   │       │   ├── supabase/client.ts   Cliente para Client Components
│   │       │   ├── supabase/server.ts   Cliente para Server Components / Route Handlers
│   │       │   └── mock-dashboard.ts    Datos de ejemplo (temporal)
│   │       └── proxy.ts                 "Middleware" de Next 16: refresca sesión, redirige a /login
│   └── worker/                 @warden/worker — consumidor de colas
│       ├── Dockerfile          Construir desde la raíz: docker build -f apps/worker/Dockerfile .
│       └── src/
│           ├── index.ts        Loop: queue_read → runScan → queue_delete
│           ├── config.ts       Variables de entorno validadas con zod
│           ├── supabase.ts     Cliente con service role (omite RLS)
│           ├── jobs/run-scan.ts         Orquesta un escaneo (estados, reintentos)
│           └── pipeline/
│               ├── collect.ts  Ejecuta colectores tras la compuerta no-contact; registra scan_sources
│               └── persist.ts  Upsert de activos (pending) y hallazgos (por fingerprint)
├── packages/                   Lógica compartida, consumida como TS fuente (sin build)
│   ├── shared/                 @warden/shared — enums y tipos (dominios, severidades, colas…)
│   ├── db/                     @warden/db — tipos generados de Supabase (NO editar a mano)
│   ├── collectors/             @warden/collectors — un colector por carpeta + compuerta + registro
│   │   └── src/
│   │       ├── types.ts        Contrato Collector / NormalizedFinding
│   │       ├── registry.ts     Mapa de colectores activos
│   │       ├── no-contact-guard.ts
│   │       ├── fingerprint.ts  Huella estable para deduplicar hallazgos
│   │       ├── crtsh/          collector.ts + mapper.ts + mapper.test.ts
│   │       ├── email-dns/      provider.ts — consultas a Google Public DNS DoH
│   │       ├── hibp/           provider.ts + mapper.ts — brechas agregadas por dominio
│   │       ├── http/           public-json.ts — cliente HTTP restringido compartido
│   │       └── providers.test.ts
│   ├── risk-analysis/          @warden/risk-analysis — analizadores y ejecutor común
│   │   └── src/
│   │       ├── types.ts        Contratos de módulos, proveedores y resultados
│   │       ├── schemas.ts      Validación común de dominios y evidencia
│   │       ├── target.ts       Atribución a dominios confirmados
│   │       ├── registry.ts     Registro de módulos de análisis
│   │       ├── runner.ts       runRiskAnalysis: ejecuta proveedores y analiza evidencia
│   │       ├── email/          analyzer.ts + schemas.ts
│   │       ├── credentials/    analyzer.ts + schemas.ts
│   │       ├── index.ts        Exports públicos del paquete
│   │       └── analysis.test.ts
│   ├── scoring/                @warden/scoring — motor del KRI (funciones puras, pendiente)
│   ├── ai/                     @warden/ai — cliente OpenRouter, prompts versionados, redact(), schemas
│   └── config/                 @warden/config — tsconfig.base.json
├── supabase/
│   ├── migrations/             SQL versionado (fuente de verdad del esquema)
│   ├── seed.sql                Catálogos: risk_domains y sources
│   └── config.toml
├── infra/docker-compose.yml    Worker + SpiderFoot en local
├── docs/                       architecture.md, scoring-model.md, sources.md, adr/, diagrams/ (ER en Mermaid)
├── frontend/frontend/          ⚠️ LEGADO: prototipo Vite del login. Ya portado a apps/web. No desarrollar aquí.
└── .github/workflows/ci.yml    typecheck + test + validación de migraciones
```

### Grafo de dependencias entre paquetes

```
@warden/web     → shared, db
@warden/worker  → shared, db, collectors, scoring, ai
collectors      → shared, risk-analysis, zod
risk-analysis   → shared, zod (análisis puro y ejecutor de proveedores)
scoring         → shared
ai              → (zod)
db, shared      → (nada)
```

Reglas:
- `packages/*` **no importan de `apps/*`**.
- `apps/web` **no importa** `collectors` ni `ai`: el trabajo pesado, el tráfico a fuentes OSINT y las llaves viven en el worker.
- Los paquetes exportan TS fuente vía `"exports": { ".": "./src/index.ts" }`. Si la web necesita un paquete nuevo, añádelo a `transpilePackages` en `apps/web/next.config.ts`.
- `@warden/risk-analysis` contiene contratos/registro/ejecutor y módulos `email` y `credentials`.
  `credentials` no es un valor de `RiskDomainKey` ni reemplaza `secrets`; su incorporación al KRI
  requiere una decisión explícita y migraciones. Los proveedores `email-dns` y `hibp` están
  exportados por collectors pero no se registran en `collectAll` ni en el seed todavía.

---

## 5. Arquitectura y flujo de datos

```
┌────────────┐  POST /api/scans   ┌──────────────────────────────┐
│  apps/web  │ ─────────────────▶ │ Supabase                     │
│  (Vercel)  │  rpc request_scan  │  scans (queued)              │
│  sesión +  │ ◀──── lectura ──── │  pgmq: scan_requests         │◀── pg_cron cada 15 min:
│  RLS       │                    │  findings, scores, ...       │    enqueue_due_scans()
└────────────┘                    └──────────────┬───────────────┘
                                                 │ queue_read (service role)
                                                 ▼
                                  ┌──────────────────────────────┐      ┌─────────────┐
                                  │ apps/worker (contenedor)     │ ───▶ │ Fuentes OSINT│
                                  │ runScan:                     │      │ crt.sh, ...  │
                                  │  1. collect  (no-contact)    │      └─────────────┘
                                  │  2. persist  (upsert)        │      ┌─────────────┐
                                  │  3. score    (TODO)          │ ───▶ │ SpiderFoot  │
                                  │  4. report IA (TODO)         │      └─────────────┘
                                  └──────────────────────────────┘ ───▶ OpenRouter (redactado)
```

### Ciclo de vida de un escaneo

1. **Disparo.** Manual: la web llama `POST /api/scans { companyId }` → `rpc('request_scan')`. Programado: `pg_cron` ejecuta `enqueue_due_scans()` cada 15 min según `schedules`.
2. Se crea una fila en `scans` con `status = 'queued'` y la versión de pesos activa, y se encola `{ scan_id }` en `scan_requests`.
3. El worker hace `queue_read` (visibility timeout = `QUEUE_VISIBILITY_TIMEOUT`, 900 s por defecto) y llama `runScan`:
   - Marca `running`. Carga la empresa y sus activos **confirmados**.
   - **collect** (`pipeline/collect.ts`): por cada colector registrado, aplica `checkCollector`; registra el resultado en `scan_sources` (`ok | failed | skipped | blocked`). Un colector que falla no tumba el escaneo.
   - **persist** (`pipeline/persist.ts`): activos descubiertos → `assets` con `attribution_status = 'pending'` (un analista los confirma). Hallazgos → upsert en `findings` por `(company_id, fingerprint)` **sin tocar el estado de triage**; fuentes en `finding_sources`.
   - **score / report:** pendientes (TODO en `run-scan.ts`).
   - Marca `completed` o `failed`.
4. Tras procesar, `queue_delete`. Si el worker muere, el mensaje reaparece al vencer el timeout; tras 3 intentos (`MAX_ATTEMPTS`) el escaneo se marca `failed`.

### Modelo de datos (resumen)

Fuente de verdad: `supabase/migrations/`. Diagrama ER: [docs/diagrams/warden_er_diagram.mmd](docs/diagrams/warden_er_diagram.mmd).

| Grupo | Tablas |
|---|---|
| Identidad | `profiles` (1:1 con `auth.users`, `role`, `is_active`), `audit_log` |
| Catálogos | `risk_domains`, `sources`, `source_credentials` (solo `secret_ref`, nunca el secreto) |
| Empresas | `companies`, `assets` (`pending/confirmed/discarded`), `schedules` |
| Scoring | `scoring_weights` (versionadas, una activa), `scoring_weight_items` |
| Escaneos | `scans`, `scan_sources`, `findings` (único por `company_id, fingerprint`), `finding_sources` |
| Resultados | `scores`, `score_domains`, `reports` (guarda `model_used`, `prompt_version`, `context_hash`) |
| Alertas / integración | `alert_settings`, `alerts`, `integration_outbox` (patrón outbox), `archives` |

Funciones SQL relevantes: `app_role()`, `is_member()`, `is_admin()`, `request_scan()`, `enqueue_due_scans()`, `activate_scoring_weights()` (valida que los pesos sumen 100), `queue_read()`, `queue_delete()`.

---

## 6. Seguridad — reglas que un agente NO debe romper

1. **No-contact en tres capas.** Si agregas un colector:
   - `Collector.isNoContact` es el tipo literal `true` (un colector activo no compila).
   - `checkCollector()` exige que código **y** BD (`sources.is_no_contact`, `is_enabled`) coincidan.
   - CHECK `sources_enabled_requires_no_contact` en BD.
   No debilites ninguna de las tres. Si una herramienta tiene modos activos (p. ej. dnstwist con descarga de páginas, SpiderFoot), desactívalos explícitamente.
2. **Dos llaves de Supabase, dos mundos.**
   - `apps/web`: solo `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` + sesión del usuario → todo pasa por RLS.
   - `apps/worker`: `SUPABASE_SECRET_KEY` (service role, omite RLS). **Nunca** debe aparecer en `apps/web`, en variables `NEXT_PUBLIC_*`, ni en Vercel.
3. **RLS siempre activo.** Toda tabla nueva necesita `enable row level security` + políticas, siguiendo el patrón de `20261001000800_enable_rls_policies.sql`. Los analistas solo pueden actualizar `status`, `status_reason`, `status_by` de `findings`.
4. **Funciones `security definer`** llevan `set search_path = ''`, nombres calificados (`public.x`) y `revoke/grant execute` explícitos.
5. **IA:** todo contexto pasa por `redact()` antes de ir a OpenRouter. La evidencia cruda (secretos, emails) nunca sale de Warden.
6. **Secretos de fuentes:** en BD solo se guarda `secret_ref` (nombre de la variable de entorno del worker).
7. `WARDEN_DEV_SKIP_AUTH=true` solo funciona fuera de producción; no lo uses como mecanismo real.

---

## 7. Convenciones

| Elemento | Convención | Ejemplo |
|---|---|---|
| Archivos y carpetas | kebab-case | `score-gauge.tsx`, `run-scan.ts` |
| Componentes y tipos | PascalCase | `ScoreGauge`, `CollectorResult` |
| Funciones y variables | camelCase | `collectAll`, `scanId` |
| Paquetes internos | `@warden/*` | `@warden/scoring` |
| Tablas y columnas | snake_case, tablas en plural | `scan_sources` |
| Migraciones | `YYYYMMDDHHMMSS_verbo_objeto.sql` | `20261001000500_create_scans_findings.sql` |
| Carpeta de colector | igual a `sources.source_key` | `collectors/src/crtsh/` |
| Prompts | `nombre.vN.ts`; **nunca editar una versión publicada** | `executive-summary.v1.ts` |
| Colas | snake_case | `scan_requests` |

Estilo de código:
- **Idioma:** comentarios, mensajes de error, textos de UI y commits en **español**. Identificadores en inglés.
- Comentarios cortos que explican el **porqué**, no el qué.
- Imports con alias `@/` dentro de `apps/web`; `import type` para tipos.
- Comillas simples, punto y coma, 2 espacios, trailing commas.
- Exports con nombre (excepto `page.tsx` / `layout.tsx` de Next).
- Enums como arrays `as const` + tipo derivado en `@warden/shared`, no `enum` de TS.
- Variables de entorno validadas con zod en el worker (`config.ts`).

### Web (Next.js)
- Server Components por defecto; `'use client'` solo si hay estado, eventos o hooks de navegación.
- En el servidor usa `@/lib/supabase/server`; en el cliente `@/lib/supabase/client`. Ambos tipados con `Database`.
- Estilos con CSS Modules y los tokens de `globals.css` (`var(--surface)`, `var(--grade-c)`…). Tema oscuro. No agregar Tailwind ni librerías de UI sin acordarlo.
- Next 16 usa `src/proxy.ts` (antes `middleware.ts`).
- Route Handlers: valida el body, delega en una RPC con la sesión del usuario, traduce `42501` a 403.
- Al reemplazar mocks, respeta las formas de `mock-dashboard.ts` (`CompanyOverview`, `DomainScoreRow`, `AssetRow`, `FindingRow`, …) para no romper los componentes.

### Base de datos
- **Nunca edites una migración ya aplicada**: crea una nueva.
- Tras cambiar el esquema: `pnpm db:reset` y `pnpm db:types`, y commitea `packages/db/src/database.types.ts`.
- Si agregas un valor a un CHECK, actualízalo también en `@warden/shared`.

---

## 8. Recetas comunes

### Agregar una fuente OSINT (colector)
1. Documentarla en [docs/sources.md](docs/sources.md): licencia y **por qué es no-contact**.
2. Crear `packages/collectors/src/<source_key>/` con:
   - `collector.ts` que exporta un `Collector` (`isNoContact: true`, respeta `ctx.signal`).
   - `mapper.ts` con la transformación pura de la respuesta → `DiscoveredAsset[]` / `NormalizedFinding[]`.
   - `mapper.test.ts` con vitest.
3. Usar `fingerprint(sourceKey, ruleId, assetValue)` para cada hallazgo. **No** incluir datos que cambien entre escaneos (fechas, conteos) o se duplicarán.
4. Registrarlo en `packages/collectors/src/registry.ts`.
5. Insertarlo en `supabase/seed.sql` (deshabilitado por defecto; un admin lo habilita).
6. Si requiere API key: variable en `.env.example` (sección worker) + fila en `source_credentials` con el `secret_ref`.

### Agregar una página al dashboard
1. Crear `apps/web/src/app/(dashboard)/<ruta>/page.tsx` (ya hereda `TopNav`).
2. Componentes en `apps/web/src/components/<área>/` con su `*.module.css`.
3. Consultar con `createClient()` de `@/lib/supabase/server`; RLS filtra por rol.

### Cambiar un prompt de IA
Crear `packages/ai/src/prompts/<nombre>.v(N+1).ts` y cambiar el import. No modificar la versión anterior: `reports.prompt_version` debe reflejar lo que realmente se usó.

### Implementar el scoring (cuando esté definido)
- Solo funciones puras en `packages/scoring` (sin BD ni red) para poder recalcular históricos.
- Entrada: `ScoringFinding[]` + `WeightItem[]`; salida: `ScoreResult`.
- Persistir en `scores` + `score_domains` desde `run-scan.ts` y luego encolar en `report_requests`.

---

## 9. Comandos

```bash
corepack enable
pnpm install
cp .env.example .env            # completar con las llaves que imprime `pnpm db:start`
cp .env apps/web/.env.local     # Next.js solo lee variables de su propia carpeta
pnpm db:start                   # Supabase local (Docker): migraciones + seed
pnpm db:types                   # regenera packages/db/src/database.types.ts
pnpm dev                        # web (localhost:3000) + worker
pnpm typecheck                  # tsc en todos los paquetes
pnpm test                       # vitest
pnpm db:reset                   # recrea la BD local desde migraciones + seed
docker compose -f infra/docker-compose.yml up --build   # worker + SpiderFoot
```

Para ver el dashboard sin Supabase: `WARDEN_DEV_SKIP_AUTH=true` (la config `web` de `.claude/launch.json` ya lo hace).

Primer admin: regístrate y ejecuta
```sql
update public.profiles set role = 'admin', is_active = true where id = '<tu-user-id>';
```

### Variables de entorno

| Variable | Dónde | Uso |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | web | URL de Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | web | Llave pública (RLS) |
| `WARDEN_DEV_SKIP_AUTH` | web (solo dev) | Salta el login |
| `SUPABASE_URL` | worker | URL de Supabase |
| `SUPABASE_SECRET_KEY` | worker | Service role — **solo worker** |
| `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` | worker | Resúmenes con IA |
| `SPIDERFOOT_URL` | worker | API de SpiderFoot |
| `HIBP_API_KEY` | worker | API de brechas; requiere suscripción y dominio previamente verificado en HIBP |
| `QUEUE_VISIBILITY_TIMEOUT` | worker | Segundos de invisibilidad del mensaje (900) |

---

## 10. Flujo de trabajo con Git y CI

- Rama principal: `main`. Trabaja en ramas `feat/...` o `fix/...` y abre PR.
- CI (`.github/workflows/ci.yml`) corre `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm test` y levanta Supabase para validar migraciones + seed. **Antes de abrir un PR, `pnpm typecheck` y `pnpm test` deben pasar localmente.**
- Si cambias dependencias, commitea `pnpm-lock.yaml`.
- Commits en español, en imperativo y descriptivos (p. ej. "Agrega colector de checkdmarc").

## 11. Checklist para agentes antes de terminar una tarea

- [ ] ¿El cambio respeta la regla no-contact?
- [ ] ¿Ninguna llave secreta llegó a `apps/web`?
- [ ] ¿Las tablas nuevas tienen RLS y políticas?
- [ ] ¿Los enums siguen sincronizados entre `@warden/shared`, CHECKs y seed?
- [ ] ¿Regeneraste `database.types.ts` si cambió el esquema?
- [ ] ¿`pnpm typecheck` y `pnpm test` pasan?
- [ ] ¿Actualizaste `docs/` (y este archivo) si cambió la arquitectura, una fuente o una convención?
- [ ] ¿No desarrollaste en `frontend/frontend/` (legado)?

---

## 12. Entrega de módulos de correo y credenciales (12 de octubre de 2026)

### Qué se implementó

Se agregó una arquitectura modular dentro del monorepo, sin crear APIs ni servicios
HTTP independientes por dominio. Los analizadores transforman evidencia mediante
funciones puras; los proveedores hacen consultas externas y el ejecutor común los
coordina. El ejecutor no persiste resultados ni calcula el KRI.

| Pieza | Ruta / export | Responsabilidad |
|---|---|---|
| Correo | `packages/risk-analysis/src/email/`, `emailModule` | Observa publicación SPF/DMARC/MX y selectores DKIM conocidos |
| DNS público | `packages/collectors/src/email-dns/`, `emailDnsProvider` | Consulta únicamente `https://dns.google/resolve`; no hace conexiones HTTP/SMTP a la empresa |
| Credenciales en brechas | `packages/risk-analysis/src/credentials/`, `credentialsModule` | Analiza cuentas agregadas por brecha, sin almacenar aliases o contraseñas |
| HIBP | `packages/collectors/src/hibp/`, `hibpProvider` | Consulta dominio previamente verificado y catálogo de brechas; descarta aliases en el mapper |
| Base general | `packages/risk-analysis/src/{types,schemas,target,registry,runner}.ts` | Contratos, validación, atribución, registro y coordinación reutilizables |
| HTTP compartido | `packages/collectors/src/http/public-json.ts` | Hosts permitidos explícitos, HTTPS, redirects bloqueados, timeout de 15 s y límite de 5 MiB |

`runRiskAnalysis` se importa de `@warden/risk-analysis`; los proveedores se importan
de `@warden/collectors`. La evidencia tiene `schemaVersion: 1`. Las observaciones
usan `observed`, `absent` o `unknown`; cada ejecución de fuente devuelve `ok`,
`failed`, `skipped` o `blocked`. Fallos de consulta nunca significan ausencia de riesgo.
Las fuentes sin una política no-contact confiable quedan bloqueadas antes de recolectar.

### Alcance y restricciones

- Ambos módulos reportan cobertura `partial`, sin puntajes, letras ni severidades.
- Correo es una inspección inicial de publicación DNS: no evalúa SPF includes/redirects,
  políticas DMARC heredadas, envío SMTP ni firmas DKIM. Sin selectores conocidos,
  DKIM queda desconocido; no enumerar selectores por fuerza bruta.
- HIBP necesita `HIBP_API_KEY` (32 caracteres hexadecimales), suscripción compatible
  y dominio previamente verificado en HIBP. La variable está en `.env.example` y
  se valida en `apps/worker/src/config.ts`; nunca llevarla a web ni `NEXT_PUBLIC_*`.
- Warden no inicia verificaciones por correo ni modifica DNS para HIBP. 403 es fallo
  de autorización; 404 del endpoint de dominio indica que HIBP no devolvió cuentas,
  sin garantizar ausencia de filtraciones. Los conteos de distintas brechas no
  representan cuentas únicas sumables.
- Los resultados de HIBP llevan atribución y enlace al proveedor (CC BY 4.0).
  Conservarlos y mostrarlos en cualquier futura interfaz o reporte.
- `credentials` es una **clave de módulo**, no un valor de `RiskDomainKey` ni un
  reemplazo de `secrets`. Su resultado mantiene `riskDomain: null` hasta acordar
  cómo se incorpora al modelo del KRI.
- `runScan`, `collectAll` y la persistencia actual siguen sin usar estos adaptadores.
  No se modificaron el esquema, los enums ni el seed; tampoco se regeneraron tipos
  de BD porque no hubo cambios de esquema. No afirmar que están activos en producción.

### Pasos para continuar la integración

1. Acordar cómo se incorpora la evidencia de brechas al catálogo KRI y qué política
   convierte observaciones en hallazgos con severidad/confianza. No inventar scoring.
2. Crear las migraciones necesarias y actualizar catálogos/enums/seed de forma
   consistente. Registrar las fuentes **deshabilitadas por defecto**; para HIBP,
   guardar únicamente `secret_ref = 'HIBP_API_KEY'` en `source_credentials`.
3. Si cambia el esquema, ejecutar `pnpm db:reset` y `pnpm db:types` y versionar los
   tipos generados. Cualquier tabla nueva necesita RLS y políticas.
4. Conectar el ejecutor al worker y cargar sus políticas desde `sources` en el
   servidor; nunca recibir `isEnabled`/`isNoContact` desde el body del navegador.
   Mantener las tres capas no-contact, registro de ejecución y deduplicación estable
   al integrar los resultados con `scan_sources`, `findings` y `finding_sources`.
   Si el worker importa directamente `@warden/risk-analysis`, agregar su dependencia
   explícita al `package.json` del worker y actualizar el lockfile.
5. Agregar pruebas de integración/persistencia y luego conectar la UI a los datos
   reales con la sesión del usuario y RLS.

### Validación y actualización local

En la entrega inicial pasaron la validación de tipos del monorepo y **19 pruebas**:
10 de análisis, 8 de proveedores y 1 existente de crt.sh. Se usaron respuestas
simuladas; no se verificó una suscripción ni se consultaron dominios reales.

Después de incorporar los cambios desde Git, instalar dependencias usando la versión
fijada por `package.json` (`pnpm@10.34.6`) y ejecutar:

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm typecheck
corepack pnpm test
```

La entrega también actualiza `pnpm-lock.yaml`, `docs/architecture.md` y
`docs/sources.md`. Ejemplo de invocación, contratos y limitaciones detalladas en
[docs/risk-analysis.md](docs/risk-analysis.md).
