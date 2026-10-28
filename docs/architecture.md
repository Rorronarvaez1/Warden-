# Arquitectura

## Componentes

| Componente | Dónde corre | Responsabilidad |
|---|---|---|
| `apps/web` | Vercel | Dashboard, gestión de empresas, activos y hallazgos. Solicita escaneos. |
| `apps/worker` | Contenedor (Railway, Fly o VM) | Consume la cola, ejecuta colectores, persiste hallazgos, calcula score, genera reportes. |
| SpiderFoot | Contenedor junto al worker | Motor OSINT, usado solo con módulos pasivos. |
| Supabase | Supabase Cloud o self-hosted | Postgres, Auth, Storage, colas (pgmq) y programación (pg_cron). |
| OpenRouter | Externo | Acceso a modelos de IA para los resúmenes ejecutivos. |

## Flujo de un escaneo

1. **Manual:** la web llama `POST /api/scans`, que ejecuta `request_scan()`.
   **Programado:** `pg_cron` ejecuta `enqueue_due_scans()` cada 15 minutos.
2. Ambos crean una fila en `scans` (`queued`) y encolan `{ scan_id }` en `scan_requests`.
3. El worker lee la cola (`queue_read`) y ejecuta `runScan`:
   - **collect:** cada colector pasa por `checkCollector` (compuerta no-contact) y se registra en `scan_sources`.
   - **persist:** los activos descubiertos quedan `pending`; los hallazgos hacen upsert por `(company_id, fingerprint)` y cada fuente registra `finding_sources.last_seen_scan_id`.
   - **resolve** (`pipeline/resolve.ts`): un hallazgo `open` que su fuente no observó en los últimos `UNSEEN_SCANS_TO_RESOLVE` escaneos con `scan_sources.status = 'ok'` (supuesto: 3) pasa a `resolved` con `status_by = null`. Una fuente fallida, omitida o bloqueada nunca resuelve hallazgos ni cuenta para la racha; `false_positive` y `accepted` no se tocan. Si la fuente vuelve a observarlo, el worker lo reabre (solo los que resolvió él, no los de un analista).
   - **score** (`pipeline/score.ts`): calcula el KRI con `@warden/scoring` sobre los hallazgos `open` y la versión de pesos del escaneo. Solo cuentan los dominios con alguna fuente `ok`; los demás quedan en `scores.excluded_domains` (ver `scoring-model.md`).
4. Si el worker muere a mitad del escaneo, el mensaje reaparece al vencer `QUEUE_VISIBILITY_TIMEOUT`. Después de 3 intentos, el escaneo se marca como `failed`.

## Seguridad

- La web usa solo la llave publicable y la sesión del usuario, así que todo pasa por RLS.
- El worker usa la llave secreta (service role). Esa llave nunca debe llegar a Vercel.
- `redact()` limpia el contexto antes de enviarlo a OpenRouter; la evidencia cruda no sale de Warden.
- Los usuarios nuevos se crean con `is_active = false`. Un admin los habilita desde `/settings/users` en desarrollo local.
- La función local `manage-users` usa las APIs de Supabase Auth con una llave administrativa inyectada por su runtime. Verifica el JWT, su emisor local y el perfil admin activo antes de operar. Esa llave no llega a la web. Preparación y límites: [local-users.md](local-users.md).

## Análisis modular de evidencia

`@warden/risk-analysis` contiene contratos generales, validación de objetivos, registro
y ejecutor compartido, más módulos de correo y credenciales en brechas. Los
adaptadores DNS público y HIBP viven en `@warden/collectors`, que depende de
`risk-analysis`; este último depende solo de `shared` y `zod` y no importa de apps.
Los módulos producen observaciones sin scoring ni severidades inventadas.

Estos proveedores son invocables mediante `runRiskAnalysis`, pero todavía no forman
parte de `runScan`, del seed ni del catálogo productivo. Credenciales no se confunde
con el dominio `secrets`: su integración al KRI y la persistencia requieren una
decisión de modelo y migraciones. Alcance, uso y limitaciones en [risk-analysis.md](risk-analysis.md).
