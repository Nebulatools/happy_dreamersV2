Deprecations and Removals (Strangler Completion)

Overview
- After stabilizing v2 and migrating data, we removed dual‑read/dual‑write and legacy endpoints.

Timeline
- Phase 1: v2 introduced behind flags, dual‑write optional for events, dual‑read fallback from children.events
- Phase 2: RAG and plans v2, tests and observability in place
- Phase 3 (this PR):
  - Disabled dual‑write by default and removed code paths
  - Removed dual‑read fallback from v2/events
  - Migrated remaining `children.events[]` to canonical `events` and unset embedded arrays
  - Deleted legacy endpoints `/api/consultas/*`, `/api/events`, `/api/children/events/*`, `/api/debug/*`, and admin cleanup endpoints

What changed
- No code references to `children.events[]` remain
- v2 endpoints are the single source of truth
- Observability dashboards continue to function; error rates expected to remain stable

Janitor scripts
- `scripts/janitor/migrate-children-events-to-events.ts`: moves embedded events to `events` and unsets arrays

Flags
- `V2_API_ENABLED` controls v2 routing in production
- `V2_RAG_CONTEXT_ENABLED` toggles RAG v2 context
- `DUAL_WRITE_EVENTS` is deprecated and no longer used by v2/events

Rollback considerations
- Keep the migration script idempotent
- Observability available via `/api/v2/health?metrics=1`

