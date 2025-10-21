Rollout seguro de v3 (Strangler)
================================

Objetivo: migrar endpoints a v3 sin downtime, con reversión inmediata y control por feature flag.

Feature Flags y Gating
- `HD_V3_ENABLED`: master switch. Si `false`, v3 no responde (404). Si `true`, habilita gating.
- `HD_V3_PERCENT` (0..100): porcentaje de tráfico que enruta a v3 en routers de compatibilidad (`/api/plans/*`). Asignación estable por usuario/IP.
- Overrides por headers (para canario/control):
  - `x-force-v3: 1` → fuerza v3.
  - `x-disable-v3: 1` → fuerza legacy.

Router de compatibilidad
- Rutas legacy (compat) bajo `/api/plans/*` deciden en tiempo de petición:
  - Si gating a v3 → delegan al handler v3.
  - Si gating a legacy → devuelven 501 (placeholder) o delegan a legacy real si existe.
- Código: `core-v3/api/gating.ts` y wrappers en `app/api/plans/*`.

Oleadas de migración
1) Planes (v3 listo)
   - POST `/api/plans/initial` → v3 `/api/v3/plans/initial` (gating)
   - POST `/api/plans/progression` → v3 `/api/v3/plans/progression`
   - POST `/api/plans/refinement` → v3 `/api/v3/plans/refinement`
   - GET `/api/plans/:planId`, `/api/plans/child/:childId/latest` → v3 equivalentes
2) Insights/analítica (posterior)
   - Leer de `events` canónico; prohibido strings de fecha.

Tablero de conversión
- Métricas en memoria: `route_v3_total`, `route_legacy_total` etiquetadas por endpoint.
- Endpoint admin: `GET /api/v3/admin/rollout/metrics` → `counts` y p95 de LLM.
- Objetivo por etapa: aumentar `HD_V3_PERCENT` de 5% → 25% → 50% → 100%.

Gates para 100%
- N días “verdes” (p. ej. 7) con:
  - 0 regresiones críticas de validación (`plan_validation_failed_total` estable).
  - LLM p95 < SLO pactado.
  - Drift de sync sin crecimiento (ver `sync_drift_detected_total`).

Checklist previo a subir `HD_V3_PERCENT`
- `plan_validation_failed_total` estable y bajo vs. línea base.
- p95 de `observeLLMDuration` bajo SLO pactado (p. ej., < 2s, ajustar a tu objetivo).
- `GET /api/v3/health` → `llmReady:true`.
- Monitoreo de drift: `sync_drift_detected_total` sin alzas.

Sanity (cURL autenticado)
- Health: `curl -sS https://<host>/api/v3/health | jq` debe mostrar `llmReady:true`.
- Cookie NextAuth (JWT):
  - `export COOKIE="next-auth.session-token=<TOKEN>"` (o `__Secure-next-auth.session-token` según entorno)
- Initial:
  - `curl -sS -X POST https://<host>/api/v3/plans/initial -H "Content-Type: application/json" -H "Cookie: $COOKIE" -d '{"childId":"<24hex>"}' | jq`
- Progression:
  - `curl -sS -X POST https://<host>/api/v3/plans/progression -H "Content-Type: application/json" -H "Cookie: $COOKIE" -d '{"childId":"<24hex>","afterPlanId":"<24hex>"}' | jq`
- Refinement:
  - `curl -sS -X POST https://<host>/api/v3/plans/refinement -H "Content-Type: application/json" -H "Cookie: $COOKIE" -d '{"childId":"<24hex>","basePlanId":"<24hex>","transcriptId":"<id>"}' | jq`

Reversión inmediata
- Bajar `HD_V3_PERCENT` a 0 o añadir `x-disable-v3` en clientes críticos.
- `HD_V3_ENABLED=false` apaga por completo v3.

Plan de retiro de legacy
- Cuando 100% estable y N días verdes:
  - Remover paths `app/api/plans/*` wrappers o apuntarlos permanentemente a v3.
  - Archivar rutas legacy y documentación antigua.
  - Mantener `route_legacy_total` estable en 0 durante 30 días.

Runbooks
- Operación: modificar flags (ENV/Secrets), monitorear `GET /api/v3/admin/rollout/metrics` y cobertura de tests en CI.
- Soporte: ante errores 5xx de LLM, revisar `plan_validation_failed_total` y logs `PlanObs` (sin PII), reducir `HD_V3_PERCENT` y abrir incidente.
