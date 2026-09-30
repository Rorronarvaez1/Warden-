# Fuentes OSINT

Toda fuente debe cumplir dos reglas:

1. **No-contact:** no envía tráfico a la infraestructura evaluada. Consultar registros públicos (CT logs, DNS público, feeds, repositorios públicos) está permitido.
2. **Open source**, o un dato público con licencia abierta.

Para agregar una fuente:

1. Documentarla en esta tabla.
2. Crear `packages/collectors/src/<source_key>/`.
3. Registrarla en `registry.ts` y en `supabase/seed.sql`.

| source_key | Dominio | Licencia | Por qué es no-contact | Estado |
|---|---|---|---|---|
| `spiderfoot` | exposure | MIT | Solo con el caso de uso *passive* | Colector pendiente |
| `crtsh` | certs | Por verificar | Consulta logs públicos de Certificate Transparency | **Implementado** (descubrimiento de subdominios) |
| `checkdmarc` | email | Apache-2.0 | Lee registros DNS públicos (SPF, DMARC, MX) | Pendiente |
| `gitleaks` | secrets | MIT | Escanea repositorios públicos, no la infraestructura | Pendiente |
| `abusech` | reputation | Por verificar | Feeds públicos de abuse.ch | Pendiente |
| `dnstwist` | impersonation | Apache-2.0 | Resuelve dominios parecidos, no el dominio evaluado. Desactivar la descarga de páginas web. | Pendiente |
| `shodan` | exposure | Propietaria | Datos pasivos, pero **no es open source** | Bloqueado: pendiente de decisión |

## Pendientes de aclarar

- **Shodan:** su API es comercial. Hay que decidir si la regla "solo open source" aplica también a las APIs de datos.
- **Hackviser:** es una plataforma de entrenamiento, no una fuente de datos. Confirmar a qué se refiere.
- **osintframework.com:** es un directorio de herramientas. Cada herramienta que se tome de ahí se evalúa aquí por separado.
