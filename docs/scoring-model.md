# Modelo de scoring del KRI

> **Estado: pendiente de definir.** `@warden/scoring` lanza `ScoringModelNotDefinedError` hasta que se decida.

## Ya definido (por el esquema de BD)

- 6 dominios de riesgo: `exposure`, `email`, `certs`, `secrets`, `reputation`, `impersonation`.
- Cada dominio tiene un peso; la suma de los pesos de una versión es 100.
- Cada versión de pesos define puntos por severidad (`severity_points`) y factores por confianza (`confidence_factors`).
- Hay una calificación global y una por dominio, ambas con puntaje numérico y letra A–F.
- Los pesos están versionados: cada escaneo guarda la versión usada.

## Por decidir

1. **Escala del puntaje:** ¿0–100, donde más alto es mejor?
2. **Fórmula por dominio:** ¿se resta desde 100 según los hallazgos? ¿Hay un tope por dominio?
3. **Hallazgos que cuentan:** ¿solo `open`? ¿Qué pasa con `accepted`?
4. **Letras:** ¿umbrales fijos (A ≥ 90, …)? ¿Hay reglas de techo (p. ej., un hallazgo crítico limita la nota a D)?
5. **Pesos iniciales** de cada dominio para la versión 1.
