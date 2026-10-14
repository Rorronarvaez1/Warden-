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
| `email_dns` | email | Registros DNS públicos; cliente implementado en Warden | Consulta únicamente `dns.google` por DoH; no conecta a HTTP/SMTP ni DNS autoritativo de la empresa | Adaptador implementado; sin registro en seed/pipeline |
| `hibp` | credentials (módulo; fuera del catálogo KRI) | Datos de brechas CC BY 4.0 con atribución; acceso por dominio requiere suscripción | Consulta únicamente HIBP para dominios previamente verificados; descarta aliases y no prueba contraseñas | Adaptador implementado; sin registro en seed/pipeline |

Los adaptadores nuevos y sus restricciones se describen en [risk-analysis.md](risk-analysis.md).
La licencia de los datos de HIBP y la autorización requerida se documentan en su
[API oficial](https://haveibeenpwned.com/API/v3). La consulta de cuentas por dominio
no permite evaluar dominios arbitrarios: deben estar previamente verificados en HIBP.

### Decisión sobre HIBP (13 de octubre de 2026)

Warden solo evalúa a la empresa que lo contrató, así que la restricción de verificación
no es un bloqueo: la empresa verifica sus propios dominios en HIBP. Se acepta HIBP como
excepción a la regla "open source" porque sus datos tienen licencia abierta (CC BY 4.0),
aunque el acceso por API sea de pago. Condiciones:

- La suscripción y la `HIBP_API_KEY` pertenecen a la empresa; Warden solo la referencia
  con `secret_ref = 'HIBP_API_KEY'` en el worker.
- La verificación de dominios la hace el equipo de TI de la empresa desde HIBP; Warden
  no la inicia ni modifica DNS.
- Pendiente: decidir si `credentials` cuenta dentro del dominio `secrets` o como un
  séptimo dominio del KRI (requiere migración).

## Pendientes de aclarar

- **Shodan:** su API es comercial. Hay que decidir si la regla "solo open source" aplica también a las APIs de datos.
- **Hackviser:** es una plataforma de entrenamiento, no una fuente de datos. Confirmar a qué se refiere.
- **osintframework.com:** es un directorio de herramientas. Cada herramienta que se tome de ahí se evalúa aquí por separado.
