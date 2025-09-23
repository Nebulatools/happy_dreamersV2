Happy Dreamers — Workflow E2E (Único Archivo Maestro)

Resumen End‑to‑End completo, desde el arranque hasta el estado actual. Incluye: seeding por mes, generación de planes (0, 1, 1.1, 2, 2.1), transcripts, rangos de eventos usados, estadísticas consideradas, scripts y endpoints, validaciones, fixes aplicados y consultas de auditoría. Este archivo sustituye a todos los demás en la carpeta `workflow/`.

1) Entorno y datos base

- DB: MongoDB Atlas (URI en `.env`: `MONGODB_URI`).
- DB Name: `MONGODB_DB_FINAL=jaco_db_ultimate_2025`.
- Niño objetivo: `childId=68d1af5315d0e9b1cc189544` (padre: `ventas@jacoagency.io`).
- Admin: `mariana@admin.com`.
- Colecciones clave: `children`, `events`, `child_plans`, `consultation_reports`, `vector_documents`.

2) Seeding histórico (Junio → Julio → Agosto 2025)

- Junio 2025 (histórico previo a Plan 0)
  - Guía: `workflow/SEED_JUNE_2025_RUN.md` (integrada aquí).
  - Script: `scripts/seed-june-2025.js`.
  - Rango: 2025-06-01 → 2025-07-01.
  - Tipos: sleep, nap, feeding, night_waking, night_feeding, extra_activities, medication.

- Julio 2025 (after Plan 0; base para Plan 1)
  - Script: `scripts/seed-july-2025.js`.
  - Rango: 2025-07-01 → 2025-08-01.
  - Insertados: 177 eventos (total niño ~350 post inserción).
  - Patrones generados: sleep nocturno con delay, night_waking ~30%, night_feeding ~15%, nap diaria (~13:00, 60–120m), comidas (08:00, 12:30, 18:45) con jitter, actividades fin de semana, medicamento el 15/07.

- Agosto 2025 (para progresión siguiente)
  - Script: `scripts/seed-august-2025.js`.
  - Rango: 2025-08-01 → 2025-09-01.
  - Insertados: 178 eventos.
  - Patrones análogos a julio.

3) Plan 0 — Inicial (Survey + Stats + RAG)

- Fecha/hora: 2025-07-01T10:00:00Z.
- basedOn: `survey_stats_rag`.
- Insumos: encuesta del niño + estadísticas históricas (junio) + RAG.
- Resultado: título, schedule base (bedtime/wake/meals/naps), objectives, recommendations.
- Endpoint/API: `POST /api/consultas/plans` con `planType="initial"`.

4) Plan 1 — Progresión por eventos

- Fecha/hora: 2025-08-01T10:00:00Z.
- basedOn: `events_stats_rag`.
- Base de schedule: Plan 0.
- Ventana de datos usada (eventos nuevos): 2025-07-01T10:00:00Z → 2025-08-01T00:00:00Z.
- Estadísticas del período (enriquecidas):
  - Sueño nocturno prom.: ~609 min; hora media de acostarse ~20:39.
  - Despertar: ~06:58.
  - Siestas: 31; hora típica ~13:33; duración prom. ~92 min.
  - Comidas típicas: desayuno ~08:05 (n=31), almuerzo ~12:34 (n=31), cena ~18:47 (n=30). Merienda: 0.
- RAG: 1 fuente única (`drive:1f6sNJ...`).
- Endpoint/API: `POST /api/consultas/plans` con `planType="event_based"`.

5) Transcript de Consulta (Mock — 05/Ago/2025)

- Archivo (contenido integrado): acuerdos finales con horarios: despertar 06:55, dormir 20:40, siesta 13:30 (90 min), desayuno 08:10, almuerzo 12:35, cena 18:45, pantallas 60 min/día, corte 18:30.
- Endpoint/API de análisis: `POST /api/consultas/analyze` → guarda en `consultation_reports`.

6) Plan 1.1 — Refinamiento por Transcript (backdated al 01/Ago/2025)

- Script: `scripts/generate-plan1-1-aug-1-2025.js`.
- Fecha/hora (createdAt): 2025-08-01T20:05:56Z (backdated).
- basedOn: `transcript_analysis`.
- Base: Plan 1.
- Aplicación de transcript: horarios exactos acordados (06:55 / 20:40 / siesta 13:30/90 / 08:10 / 12:35 / 18:45 / corte pantallas 18:30).
- Acción: marca Plan 1 como `superseded` con la misma fecha.

7) Plan 2 — Progresión por eventos (backdated al 01/Sep/2025)

- Script: `scripts/generate-plan2-sep-1-2025.js`.
- Fecha/hora (createdAt): 2025-09-01T10:00:00Z (backdated).
- basedOn: `events_stats_rag`.
- Base de schedule: Plan 1.1 (último plan previo).
- Ventana de datos usada:
  - from = createdAt del Plan 1.1 → 2025-08-01T20:05:56Z.
  - to = 2025-09-01T00:00:00Z.
  - Eventos analizados: 173 (agosto completo hasta el corte).
- Estadísticas del período (sobre esa ventana):
  - Bedtime típico (desde sleep.startTime promedio, con nocturnal): `computeBedtimeStats`.
  - Siestas (conteo, hora típica, duración prom.): `computeNapStats`.
  - Comidas típicas (desayuno/almuerzo/cena/merienda): `computeFeedingTypicalTimes`.
- IA: genera schedule coherente con 1.1 ajustado a patrones reales del período (fallback robusto si IA falla).
- Acciones post insert: planes < 2 marcados como `superseded`.

8) Transcript de Seguimiento (Mock — 12/Sep/2025)

- Archivo (contenido integrado): acuerdos finales de seguimiento: despertar 06:50, dormir 20:35, siesta 13:35 (85–90m), desayuno 08:05, almuerzo 12:40, cena 18:40, pantallas 45 min/día, corte 18:15.

9) Plan 2.1 — Refinamiento por Transcript (22/Sep/2025)

- basedOn: `transcript_analysis`.
- Base de schedule: Plan 2.
- Aplicación de transcript: cambios específicos priorizados (wake 06:50, bedtime 20:35, siesta 13:35 85–90m, comidas ajustadas, pantallas 45m corte 18:15), más reglas de despertares.

10) Reglas para habilitar botones (UI)

- Plan Inicial (Plan 0): habilitado solo si no existe plan previo.
- Plan de Progresión: habilitado si hay eventos nuevos registrados después del último plan (incluye refinamientos). La validación lee de la colección `events` (fallback `children.events`).
- Plan de Refinamiento: habilitado si existe plan base (no Plan 0) y hay transcript nuevo posterior al último plan (o se selecciona explícitamente `reportId`).

11) Endpoints relevantes y archivos de código

- Generación de Planes: `app/api/consultas/plans/route.ts`
  - Valida canGenerate, secuencia, cálculo de versiones (0, 1, 1.1, 2, 2.1, ...).
  - Fuentes de eventos: colección `events` (fallback `children.events`).
  - Para Progresión: desde createdAt del último plan (incluye refinamientos) → ahora/corte.
  - Para Refinamiento: aplica transcript sobre el plan base; no abre ventana de eventos.
- Análisis de Transcript: `app/api/consultas/analyze/route.ts`.
- Historial de Consultas: `app/api/consultas/history/route.ts`
  - GET: lista + stats; DELETE (admin): eliminar consulta por id.
- Events API:
  - Listado: `app/api/children/events/route.ts` (prefiere `events`).
  - DELETE: `app/api/children/events/[id]/route.ts` (ahora borra en `events` y fallback en `children.events`).

12) Scripts creados/ejecutados

- `scripts/seed-june-2025.js` — seeding de junio (base Plan 0).
- `scripts/seed-july-2025.js` — seeding de julio (177 eventos).
- `scripts/seed-august-2025.js` — seeding de agosto (178 eventos).
- `scripts/generate-plan1-aug-1-2025.js` — Plan 1 (event_based) 01/Ago/2025.
- `scripts/generate-plan1-1-aug-1-2025.js` — Plan 1.1 (refinement) 01/Ago/2025 20:05:56Z (backdated).
- `scripts/generate-plan2-sep-1-2025.js` — Plan 2 (event_based) 01/Sep/2025 (backdated) con eventos desde 1.1.

13) Consultas de Auditoría (MongoDB)

- Ver eventos en rango Plan 2:
  db.events.aggregate([
    { $match: { childId: ObjectId('68d1af5315d0e9b1cc189544'), startTime: { $gt: '2025-08-01T20:05:56.000Z', $lte: '2025-09-01T00:00:00.000Z' } } },
    { $group: { _id: '$eventType', n: { $sum: 1 } } }
  ])

- Ver plan 2:
  db.child_plans.find({ planNumber: 2 }).sort({ createdAt: -1 }).limit(1)

- Ver plan 1.1:
  db.child_plans.find({ planNumber: 1, planVersion: '1.1' }).limit(1)

- Consultas de historial:
  db.consultation_reports.find({ childId: ObjectId('68d1af5315d0e9b1cc189544') }).sort({ createdAt: -1 })

14) Ajustes UI/UX relevantes

- PlanManager: muestra/habilita botones según validaciones backend; tooltip con razón; debug opcional.
- PlanDisplay / EditablePlanDisplay / Dashboard Planes: robustecidos para renderizar objectives y recommendations como string u objeto (`{ description, ... }`). Evita “Objects are not valid as a React child”.
- Información mínima en tarjeta de plan de Progresión: “Usado: base vX • eventos N • YYYY/MM/DD → YYYY/MM/DD • RAG M”.

15) Fixes y cambios técnicos clave

- Progresión (Plan N) — base para ventana: ahora SIEMPRE el último plan previo (incluye refinamientos). Antes usaba el último de progresión; ya corregido.
- hasEventsAfterDate: ahora lee primero de `events` (canónico) y cae a `children.events` si no hay.
- DELETE /api/children/events/[id]: ahora elimina en `events` con fallback a `children.events`.
- Backdating de planes: Plan 1.1 (01/Ago/2025 20:05:56Z) y Plan 2 (01/Sep/2025 10:00:00Z).

16) Resumen narrativo para PM

- Cargamos datos reales simulados de junio, generamos Plan 0 con encuesta/estadísticas/RAG. Luego poblamos julio, generamos Plan 1 con eventos de julio. Tuvimos una consulta el 05/08 y ajustamos a Plan 1.1 con los acuerdos. Poblamos agosto y generamos Plan 2 tomando como base el 1.1 y usando las estadísticas de agosto (desde 1.1 hasta el 01/09). Otra consulta el 12/09 refinó el Plan 2 a 2.1 con cambios puntuales. Los botones de la UI se habilitan solo cuando hay datos nuevos (progresión) o transcript listo (refinamiento). El backend ya valida contra la colección de eventos canónica y la UI muestra resúmenes claros y robustos.

17) Consideraciones

- Zonas horarias: las fechas `createdAt` y rangos usan ISO/Z. La UI local puede mostrarlas en hora local.
- Backdating: utilizado para reproducibilidad y para que los planes aparezcan “como si” se hubieran generado en esas fechas.
- Seguridad: acciones de borrado y generación respetan owner (`parentId`) y rol (admin/parent).

