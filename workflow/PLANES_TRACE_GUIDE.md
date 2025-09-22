Guía de traza y control – Generación de Planes

Objetivo

- Centralizar en este folder la traza de cómo se generan los planes (Plan 0, Planes por eventos, Refinamientos por transcript), con enlaces al código y campos que debes revisar en la base de datos o API.

Qué guardamos aquí

- Archivos PLANx_RUN_<timestamp>.md con el contexto de cada ejecución relevante (inputs, RAG queries, tiempos y logs).
- Instrucciones de verificación rápida vía API para confirmar fuentes RAG, survey usado y estadísticas.

Campos importantes en el documento del plan (`child_plans`)

- `planNumber` y `planVersion`: versionado (Plan 0 → 0 / "0"; eventos → 1,2,3; refinamientos → N.1).
- `basedOn`:
  - Plan 0: `"survey_stats_rag"`
  - Eventos: `"events_previous_rag"`
  - Refinamientos: `"transcript_analysis"`
- `sourceData` (Plan 0 y eventos):
  - `surveyDataUsed`: boolean (si existía `children.surveyData`).
  - `childStatsUsed`: boolean (siempre true en Plan 0/eventos).
  - `ragSources`: array con `metadata.source` de los documentos usados por RAG.
  - `ageInMonths`: edad calculada por `birthDate`.
  - `totalEvents`: conteo de eventos analizados.

Cómo verificar por API

1) Obtener planes del niño:
   - GET `/api/consultas/plans?userId=<PARENT_ID>&childId=<CHILD_ID>`
2) En la respuesta:
   - Localiza el plan por `planNumber`.
   - Confirma `basedOn` y revisa `sourceData`.
   - Para refinamientos, revisa `transcriptAnalysis` y `reportId`.

Flujos y funciones clave (código)

- Endpoint: `app/api/consultas/plans/route.ts`
  - `POST` → crea Plan 0 / eventos / refinamiento
  - `generateInitialPlan` → Plan 0 usando survey + stats + RAG
  - `generateEventBasedPlan` → Plan N usando eventos desde último plan + RAG + basePlan
  - `generateTranscriptRefinementPlan` → Plan N.1 usando transcript + plan previo
  - `searchRAGForPlan` → queries y dedupe de fuentes para RAG
  - `generatePlanWithAI` → prompt JSON estricto + políticas + parseo/fallback
- Estadísticas: `lib/sleep-calculations.ts`
- Políticas/limitaciones: `lib/plan-policies.ts`
- RAG (MongoDB vector): `lib/rag/vector-store-mongodb.ts`

RAG – consultas por defecto (Plan 0/Eventos)

- `"rutina de sueño para niños de <X> meses"` (X = `ageInMonths`)
- `"horarios de comida infantil"`
- `"siestas apropiadas por edad"`
- `"rutinas de acostarse"`

Buenas prácticas de traza

- Copiar los logs relevantes por ejecución a un archivo `PLANx_RUN_<timestamp>.md` en este folder.
- Anotar `childId`, `userId`, `adminId`, `planId`, duración y queries RAG.
- Si es posible, anotar las `ragSources` leídas desde la API del plan generado.

