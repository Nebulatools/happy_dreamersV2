# v3 Data Migrations Runbook

Objetivo: sanear y consolidar datos para el esquema v3, garantizando `ObjectId` para IDs y `Date` para tiempos, removiendo eventos huérfanos/duplicados y reindexando.

## Scripts

- `core-v3/migrations/migrations/001_unify_ids_and_dates.ts`
  - Convierte `events.childId` a `ObjectId` (si es string 24 hex)
  - Convierte `events.startTime/endTime` a `Date` (si vienen en string ISO)
  - Normaliza `children.events[]` para que `startTime/endTime` sean `Date`
  - Registra reporte (examined/updated/quarantined/childrenTouched)
- `core-v3/migrations/migrations/002_remove_phantoms.ts`
  - Elimina eventos huérfanos (sin `children._id` correspondiente) → mueve a `quarantine_events`
  - Deduplica por `(childId,type,startTime,endTime)` → mueve duplicados a `quarantine_events`
  - Limpia `children.events[]` inválidos/duplicados → mueve a `quarantine_children_events`
- `core-v3/migrations/migrations/003_reindex.ts`
  - Crea índices requeridos: `events(childId,startTime)` y `plans(childId,createdAt)`

## Ejecutar

1) Compilar v3:
   - `npm run v3:build`

2) Dry-run (sin cambios, sólo logs):
   - `node core-v3/dist/migrations/index.js --dry-run`

3) Aplicar cambios:
   - `node core-v3/dist/migrations/index.js --apply`

El modo también puede controlarse con env var `MIGRATION_MODE=apply|dry-run`.

## Idempotencia y Seguridad

- Los scripts son idempotentes: pueden correrse múltiples veces sin corromper datos.
- Registros que no pueden migrarse se mueven a colecciones `quarantine_*` con bitácora (`reason`, `quarantinedAt`).
- Las comparaciones de tiempo son `Date` vs `Date` en toda la migración.

## Verificación (muestreo)

Ejemplos de checks manuales post-migración:

```js
// Verificar tipos de IDs
db.events.find({ $expr: { $ne: [ { $type: "$childId" }, "objectId" ] } }).limit(5)

// Verificar fechas como Date
db.events.find({ $or: [ { $expr: { $ne: [ { $type: "$startTime" }, "date" ] } }, { $and: [ { endTime: { $exists: true } }, { $expr: { $ne: [ { $type: "$endTime" }, "date" ] } } ] } ] }).limit(5)

// Muestreo aleatorio de eventos
db.events.aggregate([{ $sample: { size: 10 } }])

// Índices
db.events.getIndexes()
db.plans.getIndexes()
```

## Logs Estructurados

Todos los scripts emiten JSON por `stdout`. Ejemplo:

```json
{"scope":"migrate-001","event":"events_done","examined":1200,"updated":1080,"quarantined":3,"mode":"apply"}
{"scope":"migrate-001","event":"children_done","childrenTouched":85,"mode":"apply"}
{"scope":"migrate-002","event":"orphans_done","orphans":12}
{"scope":"migrate-002","event":"duplicates_done","groups":7,"removed":14}
{"scope":"migrate-002","event":"children_embedded_done","cleanedChildren":40,"cleanedItems":63}
{"scope":"migrate-003","event":"indexes_ensured"}
```

## Notas

- Si la base es grande, considerar correr por ventanas de tiempo (`startTime`) en 001/002.
- `quarantine_*` permite auditar y opcionalmente re-procesar registros manualmente.

