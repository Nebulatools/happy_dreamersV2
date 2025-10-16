# Generación de Planes — Guía Simple y Paso a Paso

Este documento explica, en lenguaje claro, cómo se generan los planes (Plan 0, Plan 1, Plan 1.1), qué información usa cada uno y qué se guarda.

## 1) ¿Qué es un plan y por qué hay tres tipos?
- Plan 0 (Inicial): primer plan del niño. Se basa en su historia completa, su encuesta y conocimiento pediátrico (RAG).
- Plan 1, 2, 3… (Progresión por eventos): actualizaciones basadas en lo que pasó desde el plan anterior (eventos nuevos).
- Plan 1.1, 2.1… (Refinamiento por consulta): ajustes puntuales después de una consulta (transcript) sin saltar a un número nuevo.

Versión del plan:
- Plan 0 → versión “0”.
- Plan 1, 2, 3… → versión “1”, “2”, “3”…
- Refinamiento → “N.1” (ej. “1.1”).

Estado en base de datos: los planes se guardan como “borrador” al crearse. Al crear un Plan 2, por ejemplo, los planes con número menor se marcan como “superseded” (reemplazados). Los refinamientos (1.1) no reemplazan al 1.

## 2) ¿Qué información usa el sistema?
- Perfil del niño: datos del niño (edad, nombre, padre/madre propietaria).
- Eventos: registros como dormir, siesta, comidas, despertares, etc.
- Estadísticas: promedios y patrones calculados a partir de los eventos (hora típica de dormir, siestas, etc.).
- Encuesta (sólo Plan 0): respuestas de hábitos y rutina familiar.
- Políticas por edad: reglas seguras (p. ej., transición de siestas 2→1 entre 15–18 meses).
- RAG: fragmentos de documentos pediátricos (lineamientos y buenas prácticas) que se incluyen como contexto.

## 3) Flujo general (lo mismo para todos)
1. Validar si se puede generar (según tipo).
2. Preparar datos (niño, eventos, encuesta si aplica, estadísticas, políticas, RAG).
3. Pedir a la IA un plan en formato JSON (con reglas claras: sin choques de horarios, etc.).
4. Guardar el plan como “borrador” con metadatos (de dónde salió la info, rangos de fechas, etc.).

## 4) Plan 0 (Inicial) — Paso a paso
Qué usa:
- Historia completa de eventos.
- Encuesta del niño (rutina antes de dormir, si hace siestas, dónde duerme, etc.).
- Estadísticas calculadas (hora típica de acostarse, siestas, comidas típicas).
- RAG (documentos de referencia por edad) y políticas por edad.

Cómo se genera:
1. Cargar al niño y todos sus eventos.
2. Calcular estadísticas y extraer patrones (siestas, bedtime, comidas).
3. Buscar en RAG recomendaciones para la edad del niño.
4. Construir un mensaje a la IA con: datos del niño, estadísticas, encuesta y RAG.
5. La IA responde un JSON con horario (dormir, despertar, siestas, comidas), objetivos y recomendaciones.
6. Guardar el plan como “borrador”, marcando que se basó en “survey + stats + RAG”.

## 5) Plan 1, 2, 3… (Basado en eventos) — Paso a paso
Qué usa:
- El plan anterior como base (su horario actual).
- Sólo los eventos nuevos (desde que se creó el último plan hasta hoy).
- Estadísticas del período reciente (no de toda la historia).
- RAG y políticas por edad para validar metodología.

Cómo se genera:
1. Encontrar el último plan creado (incluye refinamientos).
2. Cargar eventos con fecha posterior a ese plan (lo reciente).
3. Calcular estadísticas de ese período y extraer patrones (siestas, bedtime, comidas).
4. Buscar en RAG material actualizado para la edad.
5. Construir el mensaje a la IA con: el horario del plan anterior, análisis de eventos recientes, estadísticas y RAG.
6. La IA devuelve un JSON “evolucionado” (ajustes graduales y coherentes con lo observado).
7. Guardar como “borrador”, incluyendo rango de fechas analizado y tipos de eventos usados.
8. Marcar planes anteriores con número menor como “superseded”.

Reglas clave incluidas en el mensaje a la IA:
- No puede haber dos eventos distintos a la misma hora.
- Los cambios deben ser coherentes con la edad y con los patrones reales.

## 6) Plan 1.1 (Refinamiento por consulta) — Paso a paso
Qué usa:
- El mismo plan N como base.
- Un transcript de la consulta médica más reciente.
- Cambios de horarios específicos extraídos del transcript (si se acordaron).

Cómo se genera:
1. Cargar el plan N y el transcript más reciente.
2. Extraer horarios acordados (despertar, dormir, siestas, comidas, límites de pantalla…).
3. Construir el mensaje a la IA con el horario base + los cambios del transcript (estos cambios tienen prioridad).
4. La IA devuelve un JSON con los ajustes de refinamiento.
5. Guardar como “borrador”, registrando el `reportId` del transcript y qué se refinó.

## 7) ¿Qué valida el sistema antes de generar?
- Plan 0: sólo si el niño no tiene planes previos.
- Plan por eventos: debe haber eventos nuevos posteriores al último plan.
- Refinamiento por consulta: no se puede refinar el Plan 0; debe haber un transcript nuevo y que no exista ya el “.1”.

## 8) ¿Qué se le manda exactamente a la IA?
- Datos del niño (edad en meses, nombre).
- Resumen de estadísticas: horas de sueño promedio, hora de despertar, etc.
- Patrones enriquecidos: siestas (cuántas, a qué hora, duración), hora típica de acostarse, comidas típicas.
- Plan anterior (solo para planes por eventos) + análisis de eventos del período (qué tipos y qué rango de fechas).
- Encuesta (sólo Plan 0): rutina antes de dormir, hora fija, si hace siestas, dónde duerme.
- RAG: extractos de documentos relevantes (fuente + contenido) según la edad.
- Políticas: límites seguros de ajuste (transición de siestas, destete nocturno si aplica).
- Instrucción estricta: “responde sólo un JSON válido y sin choques de horarios”.

## 9) ¿Qué se guarda en la base de datos?
Siempre:
- `planNumber`, `planVersion`, `planType`, `title`, `schedule` (horario), `objectives`, `recommendations`, fechas y autor.

Según el tipo:
- Plan 0: `basedOn = "survey_stats_rag"` + `sourceData` (si usó encuesta, cuántos eventos, edad, fuentes RAG).
- Plan por eventos: `basedOn = "events_stats_rag"`, `basedOnPlan` (el que se usó como base), `eventsDateRange` (rango analizado) y `eventAnalysis` (tipos y conteos, fuentes RAG, versión base).
- Refinamiento: `basedOn = "transcript_refinement"` + `transcriptAnalysis` (reporte, mejoras/ajustes, plan base).

---

## Snapshot JSON de la Generación de Planes

### Salida de la IA (formato esperado)

- Plan 0 (initial)
```
{
  "schedule": {
    "bedtime": "20:00",
    "wakeTime": "07:00",
    "meals": [
      {"time": "07:30", "type": "desayuno", "description": "Descripción del desayuno"},
      {"time": "12:00", "type": "almuerzo", "description": "Descripción del almuerzo"},
      {"time": "16:00", "type": "merienda", "description": "Descripción de la merienda"},
      {"time": "19:00", "type": "cena", "description": "Descripción de la cena"}
    ],
    "activities": [],
    "naps": [
      {"time": "14:00", "duration": 60, "description": "Siesta de la tarde"}
    ]
  },
  "objectives": [
    "Objetivo 1 específico y medible",
    "Objetivo 2 específico y medible"
  ],
  "recommendations": [
    "Recomendación 1 específica",
    "Recomendación 2 específica"
  ]
}
```

- Plan N (event_based)
```
{
  "schedule": {
    "bedtime": "20:00",
    "wakeTime": "07:00",
    "meals": [...],
    "activities": [],
    "naps": [...]
  },
  "objectives": [
    "Objetivo basado en progresión real observada"
  ],
  "recommendations": [
    "Recomendación basada en patrones de eventos reales"
  ],
  "progressAnalysis": "Análisis de cómo el niño ha progresado desde el plan anterior"
}
```

- Plan N.1 (transcript_refinement)
```
{
  "schedule": {
    "bedtime": "20:00",
    "wakeTime": "07:00",
    "meals": [
      { "time": "07:30", "type": "desayuno", "description": "Descripción del desayuno" }
    ],
    "activities": [],
    "naps": [
      { "time": "14:00", "duration": 90, "description": "Siesta vespertina" }
    ]
  },
  "objectives": [
    "Objetivo refinado basado en la consulta médica"
  ],
  "recommendations": [
    "Recomendación específica basada en el análisis de la consulta"
  ]
}
```

### Documento almacenado (ejemplo Plan por eventos)
```
{
  "_id": "<ObjectId>",
  "childId": "<ObjectId>",
  "userId": "<ObjectId>",
  "planNumber": 1,
  "planVersion": "1",
  "planType": "event_based",
  "title": "Plan 1 para Nombre (Progresión por Eventos)",
  "schedule": { ... },
  "objectives": ["Objetivo…"],
  "recommendations": ["Recomendación…"],
  "basedOn": "events_stats_rag",
  "basedOnPlan": { "planId": "<ObjectId>", "planVersion": "0" },
  "eventsDateRange": { "fromDate": "...", "toDate": "...", "totalEventsAnalyzed": 45 },
  "eventAnalysis": {
    "eventsAnalyzed": 45,
    "eventTypes": ["sleep", "nap", "feeding"],
    "progressFromPrevious": "Análisis de progresión...",
    "ragSources": ["HAPPY_DREAMERS_SLEEP_BASICS.pdf", "HD Horarios de sueño.pdf"],
    "basePlanVersion": "0"
  },
  "createdAt": "...",
  "updatedAt": "...",
  "createdBy": "<ObjectId>",
  "status": "borrador"
}
```

Notas:
- Plan 0 guarda `sourceData` (si usó encuesta, total de eventos, edad en meses y fuentes RAG) en lugar de `eventAnalysis`.
- Plan N.1 guarda `transcriptAnalysis` (reporte referencia y qué se refinó).

---

Glosario rápido:
- Eventos: registros (sleep, nap, feeding, night_waking, etc.).
- Estadísticas: promedios y patrones extraídos de eventos.
- RAG: base de conocimiento (documentos con mejores prácticas) usada como contexto para la IA.
- Políticas por edad: límites/guías para cambios seguros (ej. transición 2→1 siestas).

---

## Apéndice — Datos EXACTOS usados por plan (con ejemplos)

Esta sección lista lo que realmente entra a la generación de cada plan, con referencias a código y ejemplos concretos.

### A) Plan 0 (Inicial)

- Niño
  - Fuente: `children` por `_id` (app/api/consultas/plans/route.ts:671)
  - `effectiveUserId = parentId` al guardar (app/api/consultas/plans/route.ts:719)

- Eventos (histórico completo)
  - Query: `db.collection("events").find({ childId: ObjectId(childId) }).sort({ startTime: -1 })` (app/api/consultas/plans/route.ts:683)
  - Tipos relevantes: `sleep`, `nap`, `feeding`, `night_waking`, `night_feeding` (ver cálculos y políticas)
  - Ejemplo de eventos mínimos usados:
    ```
    { eventType: "sleep",   startTime: "2025-07-01T20:30:00Z", endTime: "2025-07-02T06:50:00Z" }
    { eventType: "nap",     startTime: "2025-07-02T14:05:00Z", endTime: "2025-07-02T15:20:00Z" }
    { eventType: "feeding", startTime: "2025-07-02T07:40:00Z" }
    { eventType: "feeding", startTime: "2025-07-02T12:10:00Z" }
    { eventType: "feeding", startTime: "2025-07-02T16:10:00Z" }
    { eventType: "feeding", startTime: "2025-07-02T19:05:00Z" }
    { eventType: "night_feeding", startTime: "2025-07-03T02:40:00Z" }
    ```

- Estadísticas base (derivadas del histórico)
  - Función: `processSleepStatistics(events)` (lib/sleep-calculations.ts:582)
  - Campos usados explícitamente por el prompt:
    - `stats.avgSleepDurationMinutes` → “Sueño nocturno (promedio) … minutos” (app/api/consultas/plans/route.ts:1252)
    - `stats.avgWakeTimeMinutes` → convertido a HH:MM para “Hora promedio de despertar” (app/api/consultas/plans/route.ts:1253)
  - Otros campos existen (avgBedtime, etc.), pero en el prompt del Plan 0 se usan principalmente los dos anteriores.

- Enriquecidos desde eventos (histórico)
  - Siestas: `computeNapStatsFromEvents` → `{ count, avgDuration, typicalTime }` (app/api/consultas/plans/route.ts:100)
    - Ejemplo con los eventos de arriba: `count=1`, `avgDuration≈75 min`, `typicalTime≈"14:05"` → redondeado a `"14:00"` en recomendaciones.
  - Bedtime: `computeBedtimeAvgFromEvents` → `{ avgBedtime }` (app/api/consultas/plans/route.ts:110)
    - Ejemplo: de varias noches con `startTime` entre 19:30–21:00, el promedio podría ser `"20:15"`.
  - Comidas típicas: `computeFeedingTypicalTimesFromEvents` → `{ breakfast?, lunch?, snack?, dinner?, <count por cada uno> }` (app/api/consultas/plans/route.ts:118)
    - Ejemplo con datos: `breakfast="07:40"(n=1)`, `lunch="12:10"(n=1)`, `snack="16:10"(n=1)`, `dinner="19:05"(n=1)`.
  - Estos valores se inyectan en el prompt si existen (app/api/consultas/plans/route.ts:1254)

- Encuesta (SurveyData)
  - Se pasa `child.surveyData` (app/api/consultas/plans/route.ts:713)
  - Campos usados hoy en el prompt (rama Plan 0):
    - `rutinaHabitos.rutinaAntesAcostarse` (app/api/consultas/plans/route.ts:1260)
    - `rutinaHabitos.horaDormir` (app/api/consultas/plans/route.ts:1261)
    - `rutinaHabitos.haceSiestas` (app/api/consultas/plans/route.ts:1262)
    - `rutinaHabitos.dondeDuermeNoche` (app/api/consultas/plans/route.ts:1263)
  - Nota: El esquema completo de encuesta tiene más campos (types/models.ts:145), pero estos 4 son los que se usan explícitamente en el prompt actual.

- RAG (conocimiento por edad)
  - Búsqueda: queries fijas →
    1) `"rutina de sueño para niños de ${ageInMonths} meses"`
    2) `"horarios de comida infantil"`
    3) `"siestas apropiadas por edad"`
    4) `"rutinas de acostarse"` (app/api/consultas/plans/route.ts:1190)
  - Para cada query: `searchSimilar(query, 2)` (app/api/consultas/plans/route.ts:1200); se deduplica por `metadata.source` y se toman hasta 6 fuentes (app/api/consultas/plans/route.ts:1204)
  - Se inyecta como `Fuente: …\nContenido: …` en el prompt (app/api/consultas/plans/route.ts:1266)

- Políticas por edad/eventos
  - Derivación: `derivePlanPolicy({ ageInMonths, events })` (app/api/consultas/plans/route.ts:703)
  - Contiene:
    - Ventana 2→1 siestas si 15–18 meses (recomendación de pasos de 10–15 min) (lib/plan-policies.ts:28)
    - Destete nocturno activo si hubo `night_feeding` en últimos 7 días (lib/plan-policies.ts:34)
  - Inyectado como segundo `system` en el prompt (app/api/consultas/plans/route.ts:1487)

- Qué se guarda adicionalmente
  - `basedOn = "survey_stats_rag"` (app/api/consultas/plans/route.ts:728)
  - `sourceData { surveyDataUsed, childStatsUsed, ragSources, ageInMonths, totalEvents }` (app/api/consultas/plans/route.ts:729)

### B) Plan 1, 2, 3… (Progresión por eventos)

- Plan base
  - Se usa el último plan por `createdAt` como base (incluye refinamientos) (app/api/consultas/plans/route.ts:418)
  - En generación se recibe como `basePlan` (app/api/consultas/plans/route.ts:744)

- Eventos (sólo los nuevos)
  - Rango: `startTime > basePlan.createdAt` y `<= now` (app/api/consultas/plans/route.ts:775, app/api/consultas/plans/route.ts:789)
  - Validados previamente con `PUT` usando `hasEventsAfterDate` (app/api/consultas/plans/route.ts:520, app/api/consultas/plans/route.ts:144)
  - Ejemplo de recorte temporal: si `basePlan.createdAt = 2025-08-01`, se toman eventos `> 2025-08-01T00:00:00Z` y `<= now`.

- Estadísticas del período + Enriquecidos (idénticos a Plan 0 pero sólo sobre el período)
  - `processSleepStatistics(newEvents, eventsFromDate)` (app/api/consultas/plans/route.ts:809)
  - `computeNapStatsFromEvents(newEvents)` (app/api/consultas/plans/route.ts:819)
  - `computeBedtimeAvgFromEvents(newEvents)` (app/api/consultas/plans/route.ts:820)
  - `computeFeedingTypicalTimesFromEvents(newEvents)` (app/api/consultas/plans/route.ts:821)

- RAG y Políticas
  - RAG por edad (igual que Plan 0) (app/api/consultas/plans/route.ts:815)
  - Políticas por edad/eventos (app/api/consultas/plans/route.ts:816)

- Contexto extra para la IA (muy importante)
  - `previousPlan.schedule` (el horario base real) (app/api/consultas/plans/route.ts:824)
  - `eventAnalysis` con:
    - `eventsAnalyzed` (conteo)
    - `eventTypes` (únicos)
    - `dateRange { from, to }`
    - `basePlanVersion` (app/api/consultas/plans/route.ts:835)
  - El prompt obliga a no duplicar horarios y a mantener coherencia con el plan base.

- Qué se guarda adicionalmente
  - `basedOn = "events_stats_rag"` (app/api/consultas/plans/route.ts:854)
  - `basedOnPlan { planId, planVersion }` (app/api/consultas/plans/route.ts:855)
  - `eventsDateRange { fromDate, toDate, totalEventsAnalyzed }` (app/api/consultas/plans/route.ts:859)
  - `eventAnalysis { eventsAnalyzed, eventTypes, progressFromPrevious, ragSources, basePlanVersion }` (app/api/consultas/plans/route.ts:864)

### C) Plan 1.1 (Refinamiento con transcript)

- Transcript
  - Se obtiene de `consultation_reports` por `reportId` y `childId` (app/api/consultas/plans/route.ts:898)
  - Validación previa: debe existir transcript posterior al último plan y no existir ya `.1` (app/api/consultas/plans/route.ts:568)

- Extracción de cambios de horarios
  - Función: `extractScheduleChangesFromTranscript` → devuelve (si existen) `wakeTime`, `bedtime`, `breakfast`, `lunch`, `snack`, `dinner`, `napTime`, `napDuration`, `screenTimeLimit`, `screenTimeCutoff`, `otherChanges[]` (app/api/consultas/plans/route.ts:960)
  - Estos cambios tienen prioridad sobre el plan base en el prompt (app/api/consultas/plans/route.ts:1371)

- IA con foco de refinamiento
  - Prompt incluye: `previousPlan.schedule` + análisis del transcript y los `scheduleChanges` (app/api/consultas/plans/route.ts:1358)
  - No usa RAG en esta rama (el foco es la consulta).

- Qué se guarda adicionalmente
  - `basedOn = "transcript_refinement"` (app/api/consultas/plans/route.ts:905)
  - `transcriptAnalysis { reportId, improvements, adjustments, basePlanVersion }` (app/api/consultas/plans/route.ts:915)


## Snapshot JSON de la Generación de Planes

### Formato de salida del LLM (por tipo)

- Plan 0 (initial)
```
{
  "schedule": {
    "bedtime": "20:00",
    "wakeTime": "07:00",
    "meals": [
      {"time": "07:30", "type": "desayuno", "description": "Descripción del desayuno"},
      {"time": "12:00", "type": "almuerzo", "description": "Descripción del almuerzo"},
      {"time": "16:00", "type": "merienda", "description": "Descripción de la merienda"},
      {"time": "19:00", "type": "cena", "description": "Descripción de la cena"}
    ],
    "activities": [],
    "naps": [
      {"time": "14:00", "duration": 60, "description": "Siesta de la tarde"}
    ]
  },
  "objectives": [
    "Objetivo 1 específico y medible",
    "Objetivo 2 específico y medible"
  ],
  "recommendations": [
    "Recomendación 1 específica",
    "Recomendación 2 específica"
  ]
}
```

- Plan N (event_based)
```
{
  "schedule": {
    "bedtime": "20:00",
    "wakeTime": "07:00",
    "meals": [...],
    "activities": [],
    "naps": [...]
  },
  "objectives": [
    "Objetivo basado en progresión real observada"
  ],
  "recommendations": [
    "Recomendación basada en patrones de eventos reales"
  ],
  "progressAnalysis": "Análisis de cómo el niño ha progresado desde el plan anterior"
}
```

- Plan N.1 (transcript_refinement)
```
{
  "schedule": {
    "bedtime": "20:00",
    "wakeTime": "07:00",
    "meals": [
      { "time": "07:30", "type": "desayuno", "description": "Descripción del desayuno" }
    ],
    "activities": [],
    "naps": [
      { "time": "14:00", "duration": 90, "description": "Siesta vespertina" }
    ]
  },
  "objectives": [
    "Objetivo refinado basado en la consulta médica"
  ],
  "recommendations": [
    "Recomendación específica basada en el análisis de la consulta"
  ]
  // Opcionalmente el LLM puede devolver campos auxiliares (p.ej. improvements/adjustments),
  // que se guardan dentro de transcriptAnalysis en el documento final
}
```

### Documento persistido en `child_plans` (ejemplo)
```
{
  "_id": "<ObjectId>",
  "childId": "<ObjectId>",
  "userId": "<ObjectId>",
  "planNumber": 1,
  "planVersion": "1",
  "planType": "event_based",
  "title": "Plan 1 para Nombre (Progresión por Eventos)",
  "schedule": {
    "bedtime": "20:00",
    "wakeTime": "07:00",
    "meals": [
      { "time": "07:30", "type": "desayuno", "description": "Desayuno nutritivo" },
      { "time": "12:00", "type": "almuerzo", "description": "Almuerzo balanceado" },
      { "time": "16:00", "type": "merienda", "description": "Merienda ligera" },
      { "time": "19:00", "type": "cena", "description": "Cena temprana" }
    ],
    "activities": [],
    "naps": [
      { "time": "14:00", "duration": 90, "description": "Siesta de la tarde" }
    ]
  },
  "objectives": ["Objetivo…"],
  "recommendations": ["Recomendación…"],
  "basedOn": "events_stats_rag",
  "basedOnPlan": { "planId": "<ObjectId>", "planVersion": "0" },
  "eventsDateRange": {
    "fromDate": "2025-08-01T00:00:00.000Z",
    "toDate": "2025-09-01T00:00:00.000Z",
    "totalEventsAnalyzed": 45
  },
  "eventAnalysis": {
    "eventsAnalyzed": 45,
    "eventTypes": ["sleep", "nap", "feeding"],
    "progressFromPrevious": "Análisis de progresión basado en eventos recientes",
    "ragSources": ["HAPPY_DREAMERS_SLEEP_BASICS.pdf", "HD Horarios de sueño.pdf"],
    "basePlanVersion": "0"
  },
  "createdAt": "2025-09-01T10:00:00.000Z",
  "updatedAt": "2025-09-01T10:00:00.000Z",
  "createdBy": "<ObjectId>",
  "status": "borrador"
}
```

Notas:
- Para Plan 0, en lugar de `basedOnPlan/eventsDateRange/eventAnalysis` se guarda `basedOn: "survey_stats_rag"` y `sourceData { surveyDataUsed, childStatsUsed, ragSources, ageInMonths, totalEvents }`.
- Para Plan N.1, se usa `basedOn: "transcript_refinement"` y `transcriptAnalysis { reportId, improvements, adjustments, basePlanVersion }`.
