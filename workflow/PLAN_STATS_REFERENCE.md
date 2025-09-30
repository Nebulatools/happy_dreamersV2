Plan Stats Reference — Qué estadísticas se usan para generar planes

Objetivo: documentar todas las estadísticas y datos que se usan para construir Plan 0, Planes de Progresión (1, 2, …) y Planes de Refinamiento (.1), con su origen, filtros y fórmulas.

Fuentes de datos
- Colección `events` (canónica). Fallback: `children.events` para compatibilidad.
- Eventos relevantes: `sleep`, `bedtime`, `wake`, `nap`, `night_waking`, `night_feeding`, `feeding`, `extra_activities`, `medication` (según el cálculo).
- Rango temporal:
  - Plan 0: todo el histórico disponible (sin límite) o el que se defina en la API.
  - Progresión (Plan N): desde `createdAt` del último plan previo (incluye refinamientos) hasta la fecha de corte (ahora o una fecha backdated).
  - Refinamiento (.1): NO abre ventana nueva; aplica transcript sobre el plan base.

Estadísticas base (lib/sleep-calculations.ts / hooks/use-sleep-data.ts)
- avgSleepDuration (horas):
  - Lógica: inferencia de duración nocturna emparejando `sleep/bedtime` → `wake`, con ajuste por `sleepDelay` y límites razonables (2–16 horas). Si no hay wake, fallback 8h (acotado a eventos recientes).
  - Filtro: eventos nocturnos (start 18:00–06:00) para los pares relevantes.
- avgNapDuration (horas):
  - Lógica: promedio de diferencias `endTime - startTime` para `nap` del período.
- avgBedtime (HH:MM):
  - Lógica: promedio de `startTime` de `bedtime/sleep` solo nocturnos (18:00–06:00). Ajuste de madrugadas (00–06) sumando 24h antes de promediar.
- avgSleepTime (HH:MM):
  - Lógica: hora real de dormir considerando `sleepDelay` sobre `sleep` nocturnos; luego promedio con ajuste nocturno 00–06 (+24h) y conversión a 24h.
- avgWakeTime (HH:MM):
  - Lógica: `calculateInferredWakeTime`:
    - Caso ideal: `bedtime/sleep` → siguiente `wake` como despertar de la mañana.
    - Alterno: si el primer evento del día es siesta/actividad, inferir wake 60 min antes (lógica usada en algunas rutas).
    - Ajuste de madrugadas (00–06) sumando 24h para promediar correctamente y volver a 24h.
- bedtimeVariation (min):
  - Lógica: desviación/variación de los `startTime` de `bedtime/sleep` nocturnos con ajuste de 00–06 (+24h) para consistencia.
- totalWakeups / avgWakeupsPerNight:
  - Lógica: conteo de `night_waking` + inferencias en notas; en hooks se analiza secuencia `sleep → wakes` en madrugada (23–06) y duración 0.5–8h.
- totalSleepHours: `avgSleepDuration + avgNapDuration` (agregadas como horas/día promedio en período).
- first nap time / nap stats (en tarjetas específicas):
  - Lógica: a partir de `nap` del período, primer inicio y duraciones agregadas.
- Feeding typical times: (lib)
  - Buckets por intervalo: desayuno (06:00–10:00), almuerzo (11:00–14:00), snack (15:00–17:00), cena (18:00–20:59). Promedio de `startTime` dentro del bucket; se informan HH:MM y conteos (n).

Estadísticas “enriquecidas” usadas en prompts de IA (Planes de Progresión)
- Bedtime promedio del período (avgBedtime).
- Nap stats del período: count, typicalTime (HH:MM), avgDuration (min).
- Feeding typical times: breakfast/lunch/snack/dinner (HH:MM) + conteos por categoría.
- avgWakeTimeMinutes / wakeTime textual (derivado al formatear HH:MM → minutos y viceversa).
- Políticas por edad/eventos: 
  - Ventana transición siestas (15–18 meses): pasos de 10–15 min.
  - Destete nocturno: si hay `night_feeding` reciente, mover toma x minutos y ajustar oz.

Cómo se combinan según el tipo de plan
- Plan 0 (initial):
  - Usa histórico completo (o definido) para stats anteriores.
  - Usa encuesta (survey) y RAG para enriquecer recomendaciones iniciales.
- Plan N (event_based):
  - Base schedule: último plan previo (incluye .1 refinamientos) para mantener coherencia.
  - Ventana de eventos: desde createdAt del último plan previo → corte.
  - Con esas stats se arma el prompt “events_stats_rag” y se genera un nuevo schedule/objetivos/recomendaciones.
- Plan N.1 (transcript_refinement):
  - Solo aplica transcript (wake/bedtime/naps/meals/pantallas) sobre el plan base, sin abrir nueva ventana de eventos.

Garantía de “usar todos los eventos”
- La API de progresión lee de `events` con filtro exacto: `startTime > fromDate && startTime <= toDate` y ordena por `startTime`. No se omiten eventos válidos dentro del rango.
- Las métricas internas procesan todos los eventos del período, con filtros por tipo y nocturnidad cuando corresponde (p. ej., bedtimes/sleep nocturnos).
- En caso de datos embebidos antiguos, hay fallback a `children.events` para no perder registros.

Notas sobre UI y períodos (7d/30d/90d)
- Para tarjetas comparativas (hooks/use-sleep-comparison.ts), se filtra por período y se promedia:
  - Se corrige ahora el cálculo de promedios de horas con ajuste de madrugadas (00–06 → +24h) para evitar valores erróneos como 12:31.
  - Solo se consideran `sleep/bedtime` nocturnos (18–06) para construir el despertar matutino; se excluye sueño diurno.

Auditoría rápida (Mongo)
- Conteo por tipo en rango:
  db.events.aggregate([
    { $match: { childId: ObjectId('<CHILD_ID>'), startTime: { $gt: '<FROM_ISO>', $lte: '<TO_ISO>' } } },
    { $group: { _id: '$eventType', n: { $sum: 1 } } }
  ])
- Ver planes y createdAt:
  db.child_plans.find({ childId: ObjectId('<CHILD_ID>') }).sort({ createdAt: 1 })

