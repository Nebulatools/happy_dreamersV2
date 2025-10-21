Operations (Runbooks)
=====================

Migrations
- Build: `npm run v3:build`
- Dry-run: `npm run v3:migrate:dry` (uses `MONGODB_URI` and `MONGODB_DB`)
- Apply: `npm run v3:migrate:apply` (requires approvals in CI workflow)
- Logs: artifacts in GitHub Actions and local `.log` via `tee` in workflows
- Idempotent; invalid records quarantined to `quarantine_*`

Sync & Cleanup (Drift)
- Admin endpoints (RBAC admin + rate limit):
  - GET `/api/v3/admin/sync/children` → overview by child
  - POST `/api/v3/admin/sync/child/:id/verify` → drift report
  - POST `/api/v3/admin/sync/child/:id/repair` → repair embedded
  - POST `/api/v3/admin/sync/run` → full scan/repair; cron allowed via `x-cron-secret`
- Logs structured (scope=sync) and metrics `sync_drift_detected_total`, `sync_repaired_total`

Rollout & Flags
- Master switch: `HD_V3_ENABLED`
- Percent routing: `HD_V3_PERCENT` (compat routers under `/api/plans/*`)
- Overrides for debugging: headers `x-force-v3`, `x-disable-v3`
- Summary: GET `/api/v3/admin/rollout/metrics`

Pre‑Increment Checklist (antes de subir `HD_V3_PERCENT`)
- `plan_validation_failed_total` estable y bajo (sin crecimiento respecto a la línea base de la semana).
- p95 de `observeLLMDuration` por debajo del SLO pactado (p. ej., < 2s o el objetivo definido).
- Health OK: `GET /api/v3/health` devuelve `llmReady:true`.
- Drift de sync estable (sin incrementos anómalos de `sync_drift_detected_total`).

Sanity manual (cURL)
- Health (sin auth):
  - `curl -sS https://<host>/api/v3/health | jq` (verificar `llmReady:true`).
- Autenticación: obtener cookie de sesión NextAuth (ej.: `next-auth.session-token` o `__Secure-next-auth.session-token`).
  - `export COOKIE="next-auth.session-token=<TOKEN>"`
  - Nota: en algunos despliegues el nombre es `__Secure-next-auth.session-token`.
- Initial plan:
  - `curl -sS -X POST https://<host>/api/v3/plans/initial -H "Content-Type: application/json" -H "Cookie: $COOKIE" -d '{"childId":"<24hex>"}' | jq`
- Progression plan:
  - `curl -sS -X POST https://<host>/api/v3/plans/progression -H "Content-Type: application/json" -H "Cookie: $COOKIE" -d '{"childId":"<24hex>","afterPlanId":"<24hex>"}' | jq`
- Refinement plan:
  - `curl -sS -X POST https://<host>/api/v3/plans/refinement -H "Content-Type: application/json" -H "Cookie: $COOKIE" -d '{"childId":"<24hex>","basePlanId":"<24hex>","transcriptId":"<id>"}' | jq`

Incidents
- Symptoms: spikes in `plan_validation_failed_total`, LLM p95 above SLO, increased `sync_drift_detected_total`
- Immediate actions: lower `HD_V3_PERCENT` (e.g., to 0) or set `HD_V3_ENABLED=false`
- Collect logs: search `PlanObs` and `sync` scopes; fetch CI artifacts
- Open an incident; document in runbooks and ROLLOUT-V3.md

CI/CD Gates
- Lint strict + type check
- Unit + integration + E2E canary (Plan pipeline or safe abort) with coverage >= 80%
- Migrations workflows with dry-run/apply and artifacts

Environments
- Dev/Preview/Prod with environment variables set via provider (e.g., Vercel) or GitHub Environments
- Secrets: DB, CRON_SECRET, LLM keys; never logged (sanitizer)
