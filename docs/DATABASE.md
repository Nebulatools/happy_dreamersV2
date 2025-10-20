V3 Data Contract (MongoDB/TypeScript)
=====================================

Principles
- IDs: all references are `ObjectId` in DB (`_id`, `childId`, `userId`, etc.).
- Dates: store as `Date` in DB, never as string. Serialize to ISO only at API boundary.
- Status: normalized to English; legacy bilingual values are mapped on read for compatibility.

Entities (DB)
- `User` (`src/domain/entities.ts`)
  - `_id:ObjectId`, `email`, `name?`, `role:'admin'|'parent'`, timestamps
- `Child`
  - `_id:ObjectId`, `userId:ObjectId`, `name`, `birthdate?`, `tz?`, timestamps
- `Event`
  - `_id:ObjectId`, `childId:ObjectId`, `type:EventType`, `startTime:Date`, `endTime?:Date`, `sleepDelay?:number`, `notes?`, timestamps
  - `EventType`: see `src/domain/event-types.ts` (catalog; `bedtime` kept for legacy reads)
- `ChildPlan`
  - `_id:ObjectId`, `childId:ObjectId`, `userId:ObjectId`, `planType`, `planNumber`, `planVersion`, `status:PlanStatus`, `output?`, `sourceData?`, timestamps
- `ConsultationReport`, `ConsultationSession`
  - See `src/domain/entities.ts`

API Validation (Zod)
- `src/domain/schemas.ts` provides endpoint-facing schemas.
- `ObjectId` strings (24 hex) are converted safely to `ObjectId` via `toObjectId()`.
- Status strings are mapped with `mapLegacyStatus()`.

Helpers
- `toObjectId(hex)` and `zObjectIdString(z)` → input validation + transform (see `src/domain/object-id.ts`).
- `mapLegacyStatus()` and `mapToLegacyStatus()` (see `src/domain/status.ts`).

Repositories (Strangler-friendly)
- `src/repo/*.ts` expose typed accessors for `children`, `events`, `plans`. Use these instead of raw `db.collection` in v2/v3 code.

Constraints
- No migrations here (Fase 3). The contract is forward-looking; adapters and mappers bridge legacy.

Index Strategy
- Events:
  - `events_childId_startTime_desc`: `{ childId: 1, startTime: -1 }` for range queries and sorting by recent activity.
- Plans:
  - `plans_childId_createdAt_desc`: `{ childId: 1, createdAt: -1 }` to fetch latest plans quickly.
  - `plans_version_unique`: `{ childId: 1, planNumber: 1, planVersion: 1 }` (unique optional; currently non-unique, enable after data cleanup).
- Consultation Reports (surveys):
  - `reports_childId_createdAt_desc`: `{ childId: 1, createdAt: -1 }`.

Migration Scripts (Fase 2)
- `scripts/migrations/001-normalize-ids.ts`: convert string IDs (childId/userId/planId/reportId) to `ObjectId`.
- `scripts/migrations/002-normalize-dates.ts`: coerce ISO strings to `Date` for time fields.
- `scripts/migrations/003-normalize-status.ts`: map legacy statuses to modern and mark older active plans as `superseded` per child when applicable.
- `scripts/create-indexes.ts`: create indexes above (idempotent).

Dry-run & Backups
- All migration scripts support `--dry-run` (default) and `--apply`.
- Before applying, scripts export backups as JSON under `backups/<timestamp>-<script-name>/` for touched collections.

Validation Post-Migration
- Queries for active plans should not rely on bilingual statuses.
- Use `explain()` to verify no COLLSCAN on critical routes (childId + createdAt/startTime flows).
