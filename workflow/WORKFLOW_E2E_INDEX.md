End‑to‑End: Junio → Plan 0 → Julio → Plan 1 → Transcript → Plan 1.1

Paso 1 — Seed Junio 2025

- Archivo: `workflow/SEED_JUNE_2025_RUN.md`
- Fuente: `scripts/seed-june-2025.js`
- Resultado: ~174 eventos (sleep, nap, feeding, etc.)

Paso 2 — Plan 0 (1/jul/2025)

- Archivo: `workflow/PLAN0_RUN_2025-07-01_10-00-00Z.md`
- Endpoint: `POST /api/consultas/plans` con `planType: "initial"`
- Insumos: survey del niño + estadísticas históricas (junio) + RAG
- Salida: horarios base y recomendaciones iniciales (“survey_stats_rag”)

Paso 3 — Seed Julio 2025

- Archivo: `workflow/SEED_JULY_2025_RUN.md`
- Fuente: `scripts/seed-july-2025.js`
- Resultado: 177 eventos añadidos (julio); total del niño ≈ 350

Paso 4 — Plan 1 (1/ago/2025)

- Archivo: `workflow/PLAN1_RUN_2025-08-01_10-00-00Z.md`
- Endpoint: `POST /api/consultas/plans` con `planType: "event_based"`
- Insumos: Plan 0 como base + eventos desde Plan 0 → 1/ago + RAG
- Estadísticas del período incluidas (bedtime, wake, siesta típica, comidas típicas)
- Salida: progresión (“events_stats_rag”)

Paso 5 — Transcript de Consulta (mock)

- Archivo: `workflow/TRANSCRIPTO_MOCK_CONSULTA_2025-08-05.md`
- Contenido: acuerdos finales realistas (despertar 06:55, dormir 20:40, siesta 13:30/90min, comidas 08:10/12:35/18:45, corte pantallas 18:30)
- Endpoint: `POST /api/consultas/analyze` → guarda `consultation_reports` (ver Historial en UI)

Paso 6 — Plan 1.1 (Refinamiento por transcript)

- Archivo: `workflow/PLAN1_1_RUN_2025-09-23_00-50-52Z.md`
- Endpoint: `POST /api/consultas/plans` con `planType: "transcript_refinement"` y `reportId`
- Insumos: Plan 1 como base + transcript analizado
- Salida: aplica horarios acordados en la consulta (“transcript_analysis”)

Referencias de código clave

- Planes API: `app/api/consultas/plans/route.ts`
- Análisis de transcript: `app/api/consultas/analyze/route.ts`
- Historial de consultas: `app/api/consultas/history/route.ts`
- Estadísticas de sueño: `lib/sleep-calculations.ts`
- RAG (vector store MongoDB): `lib/rag/vector-store-mongodb.ts`

