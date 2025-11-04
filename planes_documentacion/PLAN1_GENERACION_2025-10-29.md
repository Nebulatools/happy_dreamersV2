# Plan 1 – Generación del 29/10/2025 (Plan basado en eventos)

## Resumen operativo
- **Plan ID**: `6901b4894fb1a088f23b68a6`
- **Tipo**: `event_based`
- **Versión/Número**: `planNumber = 1`, `planVersion = "1"`
- **Niño**: `68d1af5315d0e9b1cc189544` (1 mes → rango 0-3 meses)
- **Solicitud**: `POST /api/consultas/plans` enviada el `2025-10-29T06:30:17Z`
- **Base**: Plan 0 activo más reciente (`existingPlans[0]`)
- **Resultado**: borrador almacenado en `child_plans` con estado `borrador`

### Rutina diaria entregada por la IA
| Evento | Hora (24h) | Descripción |
|--------|------------|-------------|
| Despertar | `07:15` | Hora de levantarse |
| Desayuno | `08:00` | Primera comida del día |
| Almuerzo | `12:15` | Segunda comida |
| Siesta | `13:30` (90 min) | Siesta de la tarde |
| Cena | `18:45` | Última comida |
| Dormir | `20:15` | Hora de ir a la cama |

---

## Flujo técnico paso a paso

1. **Autenticación y permisos** (`app/api/consultas/plans/route.ts:335-368`). Solo admins pueden disparar `planType: "event_based"`.
2. **Carga de historial de planes** (`find` + `sort({ planNumber: -1 })`). El primer elemento (`existingPlans[0]`) actúa como base y provee `createdAt` para la ventana de eventos.
3. **Validación de eventos recientes**
   - `hasEventsAfterDate(childId, latestPlan.createdAt)` asegura que existan registros posteriores al plan anterior (`route.ts:400-417`).
   - Si no hay eventos, el endpoint devuelve 400. El éxito del plan confirma que sí se encontraron.
4. **Obtención de eventos a analizar**
   - `eventsFromDate = new Date(basePlan.createdAt)` y `eventsToDate = new Date()` (`route.ts:878-889`).
   - Consulta en `events` filtrando `childId: new ObjectId(childId)` y `startTime: { $gt: eventsFromDateISO, $lte: nowISO }` (`route.ts:890-904`).
   - Orden ascendente por `startTime` para preservar la evolución temporal.
5. **Cálculo de estadísticas primarias**
   - `processSleepStatistics(newEvents, eventsFromDate)` (`lib/sleep-calculations.ts:579-664`).
   - Produce métricas como `avgWakeTimeMinutes`, `avgBedtime`, `napEvents`, `avgNapDuration`, `avgSleepDurationMinutes`, etc., restringidas al período posterior al último plan.
6. **Estadísticas enriquecidas** (`route.ts:910-928`).
   - `computeNapStatsFromEvents` → cuenta, duración media y hora típica de siesta.
   - `computeBedtimeAvgFromEvents` → promedio de acostarse considerando eventos nocturnos.
   - `computeFeedingTypicalTimesFromEvents` → tiempos medios para desayuno, almuerzo, snack y cena más conteos.
7. **Determinación de edad y políticas**
   - Edad en meses = `differenceInDays(today, birthDate) / 30.44` (`route.ts:907-909`).
   - `derivePlanPolicy` establece reglas adicionales (ventanas despierto, ritmo de avance) según edad y eventos (`route.ts:913-914`).
8. **Carga de contexto RAG**
   - Constante `RAG_SOURCE = 'summary'` fuerza el uso del archivo optimizado (`route.ts:23-31`).
   - `searchRAGForPlan` → `loadRAGFromSummary(ageInMonths)` (`route.ts:1396-1474`).
   - El lector selecciona la sección `## EDAD: 0-3 MESES` y formatea los horarios ideales; registra logs con `🗂️  Usando RAG_SUMMARY.md` y `✅ RAG cargado exitosamente`.
9. **Compilación del prompt para la IA** (`generatePlanWithAI`, `route.ts:1492-1705`).
   - Incluye: plan anterior (`previousPlan.schedule`), estadísticas recientes (`childData.stats`), métricas enriquecidas (`enrichedStats`), políticas y extracto RAG.
   - Instrucciones forzan formato 24h, intervalos de 15 minutos y progresión gradual.
10. **Generación del plan**
    - `openai.chat.completions.create` (modelo GPT-4) retorna JSON con `schedule`, `objectives`, `recommendations`.
    - El resultado se inserta en Mongo como `child_plans` con metadatos (`route.ts:930-952`).

---

## Cálculo de cada horario

> Las funciones listadas se encuentran en `app/api/consultas/plans/route.ts` salvo que se indique lo contrario.

### 1. Despertar `07:15`
- **Dato base**: `avgWakeTimeMinutes` de `processSleepStatistics`, derivado de eventos `sleep`/`wake` posteriores al último plan.
- **Normalización**: Convertido a HH:MM mediante `String(Math.floor(minutes / 60)).padStart(2,'0')` (`route.ts:1604-1606`).
- **Redondeo**: El prompt exige cuartos de hora. Si el promedio cae p.ej. en 07:12, la IA solo puede responder `07:00` o `07:15`; mantiene `07:15` para preservar el promedio pero acercarse al objetivo RAG (07:00).
- **Control**: Se compara con `previousPlan.schedule.wakeTime` para evitar saltos mayores a 15 min dentro del `progressAnalysis` generado por la IA.

### 2. Desayuno `08:00`
- **Dato base**: `feedingStats.breakfast` (hora típica calculada en `computeFeedingTypicalTimesFromEvents`).
- **Conteo**: `feedingStats.breakfastCount` se expone en el prompt para que la IA considere cuánta evidencia hay de ese horario.
- **Razonamiento del modelo**: Al estar cercano al ideal de la sección RAG (desayuno entre 08:00-08:30), mantiene `08:00` como paso estable.

### 3. Almuerzo `12:15`
- **Dato base**: `feedingStats.lunch` (promedio de eventos `feeding` en ventana 11:00-14:00).
- **Rounding rule**: Se aplica el mismo criterio de cuartos de hora. Un promedio como 12:13 se representa como `12:15` por mandato del prompt.
- **Progresión**: Si el Plan 0 ya proponía 12:30, el ajuste de 15 minutos acerca al objetivo RAG (12:00) sin un salto brusco.

### 4. Siesta `13:30` con duración `90` min
- **Horario**: `computeNapStatsFromEvents` devuelve `typicalTime`; se redondea al cuarto de hora más próximo para mantener consistencia humana.
- **Duración**: `avgDuration` (en minutos) se acota entre 60 y 120 (`Math.max(60, Math.min(120, avg))` en el prompt) y se redondea al múltiplo de 5 más cercano; la IA devolvió `90` al estar el promedio en torno a esa cifra.
- **Validaciones**: El prompt exige al menos una siesta cuando `napStats.count > 0`.

### 5. Cena `18:45`
- **Dato base**: `feedingStats.dinner` calcula la media en la ventana 18:00-20:59.
- **RAG**: El bloque 0-3 meses recomienda última comida cercana a las 19:00. `18:45` conserva evidencia real (media ≈18:43) pero se alinea con el objetivo.

### 6. Hora de dormir `20:15`
- **Dato base**: `computeBedtimeAvgFromEvents` produce `avgBedtime` usando eventos `sleep` nocturnos.
- **Comparativa**: El prompt incluye el bedtime del plan anterior más la meta RAG (20:00). El modelo elige `20:15`, avanzando 15 minutos hacia el ideal pero confirmando que los datos reales sostienen el cambio.
- **Restricción**: No se permiten dos eventos a la misma hora, validado por la IA siguiendo las instrucciones del prompt.

---

## Confirmación de uso de `docs/RAG_SUMMARY_OPTIMIZED.md`
- `RAG_SOURCE = 'summary'` (línea 23) bloquea cualquier otra fuente.
- `loadRAGFromSummary` abre `docs/RAG_SUMMARY_OPTIMIZED.md` con `fs.readFileSync`, seleccionando la sección según la edad (0-3 meses) y registrando el log:
  - `🗂️  Usando RAG_SUMMARY.md como fuente (Document 4 priorizado)`
  - `📚 Leyendo RAG desde archivo: .../docs/RAG_SUMMARY_OPTIMIZED.md`
  - `✅ RAG cargado exitosamente: 1 documento para edad 0-3`
- El contenido inyectado enumera horarios ideales (despertar 07:00, dormir 20:00, siestas 08:30/11:00/13:30/16:00). La IA usa estos datos como objetivo de largo plazo y ajusta el plan real en pasos de 15 minutos.

---

## Auditoría rápida
- **Eventos analizados**: La inserción del plan guarda `eventsDateRange.totalEventsAnalyzed` y `eventAnalysis.eventsAnalyzed` (consultar documento en Mongo para conocer el número exacto).
- **Estado actual**: El plan quedó en `borrador`. Debe activarse vía `PATCH /api/consultas/plans` para que sustituya al Plan 0.
- **Siguiente validación**: El `PUT /api/consultas/plans` inmediato (06:30:33Z) verificó si se puede generar un plan adicional; al no haber eventos posteriores al 29/10/2025 06:30Z, retornó `eventCount: 0`, lo que confirma que el sistema evita duplicar planes sin nuevos datos.

