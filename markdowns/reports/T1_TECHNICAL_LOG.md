# T1 – Bitacora tecnica: Unificacion de capa de datos (Mongoose)

Fecha: 2025-09-19
Rama: `T1`

## Objetivo
- Unificar el acceso a datos en torno a `@/lib/mongoose`, eliminando el uso directo del driver nativo (`@/lib/mongodb`).
- Exponer utilidades unificadas: `getDb()` y `getMongoClientPromise()` para compatibilidad (NextAuth, integraciones).

## Cambios principales
- `lib/mongoose.ts`
  - Se agregaron utilidades: `getDb()` y `getMongoClientPromise()`.
  - Conexion singleton y listeners de conexion (sin flags deprecados de Mongoose v8).
- Eliminado `lib/mongodb.ts` (para evitar regresiones al driver nativo).
- Reemplazados imports y usos en endpoints/libs:
  - `import { connectToDatabase } from "@/lib/mongodb"` -> `import { getDb } from "@/lib/mongoose"`.
  - `import clientPromise from "@/lib/mongodb"` -> `const db = await getDb()` (sin cliente explicito).
  - `MongoDBAdapter(clientPromise)` -> `MongoDBAdapter(getMongoClientPromise())`.
- Tests: `jest.setup.js` ahora mockea `@/lib/mongoose` (antes `@/lib/mongodb`).

## Archivos actualizados (categorias)
- Autenticacion
  - `lib/auth.ts`, `lib/auth-helpers.ts`.
- Capa de datos e integraciones
  - `lib/mongoose.ts`, `lib/event-sync.ts`, `lib/integrations/zoom.ts`.
- RAG
  - `lib/rag/vector-store-mongodb.ts`, `lib/rag/plan-context-builder.ts`.
- Notificaciones
  - `lib/notification-scheduler.ts`, `app/api/notifications/{count,history,settings,scheduler}/route.ts`.
- Endpoints de negocio
  - `app/api/reports/professional/route.ts` (usa `dbConnect` de `@/lib/mongoose`).
  - `app/api/children/*` (incluye `[id]`, `events`, `v2`).
  - `app/api/events/route.ts`.
  - `app/api/user/{profile,change-password,password}/route.ts`.
  - `app/api/users/search/route.ts`.
  - `app/api/consultas/{analyze,history}/route.ts`, `app/api/consultas/plans/{route.ts,[id]/route.ts}`.
  - `app/api/transcripts/process/route.ts`.
  - `app/api/chat/route.ts`.
  - Integraciones Google/Zoom: `app/api/integrations/**/route.ts`.
- Tests
  - `jest.setup.js` (mock de `@/lib/mongoose`).

### Scripts y Pruebas (migrados a Mongoose)
- Helper nuevo: `scripts/mongoose-util.js` (connect/getDb/disconnect via Mongoose).
- scripts:
  - `scripts/test-mongodb-connection.js`
  - `scripts/reset-password.js`
  - `scripts/poblar-logico.js`
  - `scripts/limpiar-eventos.js`
  - `scripts/fix-parent-ids.js`
  - `scripts/create-test-user.js`
  - `scripts/create-gutierrez-family.js`
  - `scripts/check-reset-tokens.js`
- pruebas:
  - `pruebas/poblar-segunda-semana.js`
  - `pruebas/generar-plan1-esteban.js`
  - `pruebas/generar-plan1-1-esteban.js`
  - `pruebas/generar-plan0-esteban.js`
  - `pruebas/eliminar-planes.js`
  - `pruebas/eliminar-consulta-esteban.js`
  - `pruebas/crear-consulta-y-plan1-1.js`
  - `pruebas/analizar-ninos-completo.js`
  - `pruebas/flow-solution/josefina-journey-completo.js`

## Validacion tecnica
- Busqueda de referencias:
  - `@/lib/mongodb`: 0 ocurrencias en codigo (excluyendo docs/markdowns/CLAUDE).
  - `connectToDatabase(`: 0 ocurrencias en codigo (excluyendo docs/markdowns/CLAUDE/reference/testing).
- Tests (Jest): 3 suites, 34 tests PASSED.
- Type-check: existen errores previos no relacionados al ticket (tipos de tests, modelos y utilidades). Los cambios T1 eliminaron referencias al driver nativo sin introducir nuevos errores en el area tocada.

## Comparativa con v0 (commit: "T1 - Ajustes ticket #1")
- Commit en `happy_dreamers_v0` (branch `T1`): `3786edd`.
- Archivos modificados alli: endpoints principales de API, `lib/mongoose.ts`, `lib/auth*`, `lib/notification-scheduler.ts`, RAG, integraciones y eliminacion de `lib/mongodb.ts`.
- En V2 se actualizaron los mismos grupos de archivos. Diferencias esperables:
  - V2 incluye mocks de tests (`jest.setup.js`) que no existian en el listado de v0.
  - V2 tiene rutas adicionales (`children/[id]`, `children/events/[id]`) que tambien fueron adaptadas a `getDb()`.
  - Resultado: cobertura equivalente o mayor que v0, manteniendo el objetivo del ticket.

## Notas
- NextAuth ahora usa `MongoDBAdapter(getMongoClientPromise())` (cliente subyacente de Mongoose) para evitar doble conexion.
- Scripts de mantenimiento en `/scripts` y `/pruebas` siguen usando el driver nativo a proposito (no forman parte del runtime de la app). Se pueden migrar en un ticket posterior si se requiere.

## Recomendaciones
- Mantener este patron para nuevos endpoints (`import { getDb } from "@/lib/mongoose"`).
- Evitar reinstaurar `@/lib/mongodb` o abrir conexiones paralelas.
