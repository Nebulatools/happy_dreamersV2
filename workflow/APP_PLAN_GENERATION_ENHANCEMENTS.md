Actualización de generación de planes (backend)

Resumen

- Objetivo: que la generación desde la app (UI) use TODAS las estadísticas relevantes —sin depender de scripts— y refleje siestas y comidas tal como se registran en eventos.
- Cambios aplicados en `app/api/consultas/plans/route.ts` (no requieren cambios de UI ni de esquema de DB):
  - Enriquecimiento de estadísticas para prompts (Plan 0 y Plan 1):
    - Siestas: conteo, hora típica y duración promedio.
    - Bedtime: hora media observada.
    - Comidas: horas típicas (desayuno/almuerzo/merienda/cena) y conteos por categoría.
  - Reglas en prompt:
    - Si hubo siestas, DEBE incluirse al menos una siesta con hora y duración cercanas a las observadas.
    - Para comidas, si no hubo eventos en una categoría (n=0), no inventar horarios.
  - Plan 1 (event_based): ahora prefiere leer eventos desde la colección `events` en el rango desde `createdAt` del Plan 0 hasta “ahora”; si no es posible, cae en `child.events`.

Detalles técnicos

- Helpers añadidos (en el mismo archivo):
  - `computeNapStatsFromEvents(events)` → { count, avgDuration, typicalTime }
  - `computeBedtimeAvgFromEvents(events)` → { avgBedtime }
  - `computeFeedingTypicalTimesFromEvents(events)` → horas típicas y conteos por categoría
- Plan 0 (initial):
  - Sigue usando TODO el histórico de `events` para estadísticas base.
  - Prompt incluye: avgSleepDuration, avgWakeTime, bedtime medio, siestas (count/hora/duración), comidas típicas y survey.
- Plan 1 (event_based):
  - Eventos del período (Plan 0 → fecha actual) con métricas equivalentes a las de Plan 0, pero del rango.
  - Prompt con mismas reglas (siestas y comidas); mantiene uso de RAG.

Compatibilidad / Seguridad

- No se modifican los esquemas en MongoDB; se agregan datos solo al prompt de IA.
- Mantiene `basedOn` y metadatos existentes.
- RAG, políticas y validaciones previas siguen funcionando igual.

Resultado esperado

- Los planes generados desde la UI reflejan las siestas y comidas observadas en los eventos.
- Se evitan salidas inconsistentes (p. ej., “naps: 0” cuando hubo siestas registradas).

UI – Corrección de etiquetas “Basado en”

- Componente: `components/consultas/EditablePlanDisplay.tsx`
  - Antes: mostraba “Análisis de transcript” por defecto cuando `basedOn` no era `survey_stats_rag`.
  - Ahora: reconoce explícitamente `events_stats_rag` y presenta “Plan <versión base> + <N eventos> + RAG”.
  - También ajusta el campo “Tipo” para mostrar “Progresión basada en eventos” o “Refinamiento por transcript” según `planType`.
