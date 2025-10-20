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

