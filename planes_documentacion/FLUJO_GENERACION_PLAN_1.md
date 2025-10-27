# Flujo de Generación del Plan 1 - Happy Dreamers

## Índice
1. [Visión General](#visión-general)
2. [Entrada de Datos](#entrada-de-datos)
3. [Procesamiento de Eventos](#procesamiento-de-eventos)
4. [Cálculo de Estadísticas](#cálculo-de-estadísticas)
5. [Integración RAG](#integración-rag)
6. [Generación con IA](#generación-con-ia)
7. [Estructura del Plan Generado](#estructura-del-plan-generado)
8. [Ejemplo Práctico](#ejemplo-práctico)

---

## Visión General

El **Plan 1** es el primer plan de progresión basado en eventos reales registrados después del Plan 0 (inicial). Este plan representa el siguiente paso en la estrategia progresiva de ajuste de horarios hacia los objetivos ideales.

### Diferencias clave entre Plan 0 y Plan 1:

| Aspecto | Plan 0 (Inicial) | Plan 1 (Basado en Eventos) |
|---------|------------------|----------------------------|
| **Base de datos** | Survey + Estadísticas históricas completas | Plan 0 + Eventos desde Plan 0 |
| **Objetivo** | Primer ajuste suave desde situación actual | Siguiente paso progresivo hacia ideal |
| **Rango de eventos** | Todos los eventos históricos | Solo eventos después del Plan 0 |
| **Estrategia** | Establecer base inicial | Evolución basada en progreso real |

---

## Entrada de Datos

### 1. Parámetros de entrada (API POST `/api/consultas/plans`)

```typescript
{
  userId: string,        // ID del padre
  childId: string,       // ID del niño
  planType: "event_based", // Tipo de plan
  // NO se requiere reportId para planes event_based
}
```

### 2. Plan Base (Plan 0)

El sistema obtiene el plan anterior más reciente (en este caso, Plan 0):

```typescript
const existingPlans = await db.collection("child_plans")
  .find({
    childId: new ObjectId(childId),
    userId: new ObjectId(userId)
  })
  .sort({ planNumber: -1 })
  .toArray()

const basePlan = existingPlans[0] // Plan 0
```

### 3. Datos del niño

```typescript
const child = await db.collection("children").findOne({
  _id: new ObjectId(childId)
})

// Información clave:
// - firstName: Nombre del niño
// - birthDate: Fecha de nacimiento
// - surveyData: Datos del cuestionario inicial
// - parentId: ID del padre propietario
```

---

## Procesamiento de Eventos

### 1. Obtención de eventos desde el Plan 0

**CRÍTICO**: Solo se analizan eventos **después** de la creación del Plan 0:

```typescript
const eventsFromDate = new Date(basePlan.createdAt)
const eventsToDate = new Date()

const newEvents = await eventsCol.find({
  childId: new ObjectId(childId),
  startTime: {
    $gt: eventsFromDate.toISOString(),  // Mayor que (no igual)
    $lte: eventsToDate.toISOString()    // Menor o igual a ahora
  }
}).sort({ startTime: 1 }).toArray()
```

### 2. Validación de eventos disponibles

El sistema valida que haya eventos antes de generar el plan:

```typescript
if (newEvents.length === 0) {
  throw new Error("No hay eventos nuevos para analizar")
}
```

### 3. Tipos de eventos procesados

```typescript
// Eventos relevantes para el análisis:
- sleep: Inicio del sueño nocturno
- bedtime: Hora de acostarse
- wake: Hora de despertar
- nap: Siestas diurnas
- night_waking: Despertares nocturnos
- feeding: Comidas (desayuno, almuerzo, merienda, cena)
```

---

## Cálculo de Estadísticas

### 1. Estadísticas principales (`processSleepStatistics`)

Archivo: `/lib/sleep-calculations.ts`

```typescript
const stats = processSleepStatistics(newEvents, eventsFromDate)
```

#### Métricas calculadas:

| Métrica | Descripción | Cálculo |
|---------|-------------|---------|
| `avgSleepDuration` | Duración promedio sueño nocturno (horas) | Inferencia bedtime/sleep → wake |
| `avgNapDuration` | Duración promedio de siestas (horas) | Promedio de eventos nap con endTime |
| `avgBedtime` | Hora promedio de acostarse | Promedio de eventos bedtime/sleep nocturnos |
| `avgSleepTime` | Hora real de dormir (con delay) | Bedtime + sleepDelay |
| `avgWakeTime` | Hora promedio de despertar | Promedio de wake después de sleep nocturno |
| `bedtimeVariation` | Variación en minutos de hora de acostarse | Desviación estándar de bedtime |
| `totalWakeups` | Total de despertares nocturnos | Conteo de eventos night_waking |
| `avgWakeupsPerNight` | Promedio de despertares por noche | totalWakeups / nightSleep.length |
| `dominantMood` | Estado emocional dominante | Moda de emotionalState |

#### Ejemplo de estadísticas calculadas:

```json
{
  "avgSleepDuration": 10.5,           // 10.5 horas
  "avgNapDuration": 1.5,              // 1.5 horas
  "avgBedtime": "20:30",              // 8:30 PM
  "avgSleepTime": "20:45",            // 8:45 PM (con 15 min de delay)
  "avgWakeTime": "07:15",             // 7:15 AM
  "bedtimeVariation": 23,             // 23 minutos de variación
  "totalWakeups": 3,                  // 3 despertares totales
  "avgWakeupsPerNight": 0.43,         // 0.43 por noche
  "dominantMood": "calm",             // Estado tranquilo
  "avgSleepDurationMinutes": 630,     // 630 minutos
  "avgWakeTimeMinutes": 435           // 435 minutos desde medianoche
}
```

### 2. Estadísticas enriquecidas

#### a) Estadísticas de siestas (`computeNapStatsFromEvents`)

```typescript
const napStats = computeNapStatsFromEvents(newEvents)

// Resultado:
{
  count: 7,                  // 7 siestas en el período
  avgDuration: 90,           // 90 minutos promedio
  typicalTime: "14:00"       // Hora típica: 14:00
}
```

**Cálculo de hora típica:**
```typescript
// 1. Extraer startTime de cada evento nap
const starts = naps.map(e => new Date(e.startTime))

// 2. Calcular promedio de minutos desde medianoche
const avgMinutes = starts.reduce((sum, d) => {
  return sum + (d.getHours() * 60 + d.getMinutes())
}, 0) / starts.length

// 3. Convertir a formato HH:MM
const h = Math.floor(avgMinutes / 60)
const m = avgMinutes % 60
typicalTime = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
```

#### b) Estadísticas de bedtime (`computeBedtimeAvgFromEvents`)

```typescript
const bedtimeStats = computeBedtimeAvgFromEvents(newEvents)

// Resultado:
{
  avgBedtime: "20:30"  // Hora promedio de acostarse
}
```

**Ajuste nocturno:** Los horarios después de medianoche se ajustan sumando 24 horas para el cálculo correcto del promedio:

```typescript
// Ejemplo: 22:00, 21:30, 01:00 (madrugada)
// Se convierte a: 22:00, 21:30, 25:00 (para promedio correcto)
// Resultado: 22:50 (promedio real)
```

#### c) Estadísticas de comidas (`computeFeedingTypicalTimesFromEvents`)

```typescript
const feedingStats = computeFeedingTypicalTimesFromEvents(newEvents)

// Resultado:
{
  breakfast: "07:30",       // Desayuno
  breakfastCount: 5,        // 5 eventos de desayuno
  lunch: "12:00",           // Almuerzo
  lunchCount: 6,            // 6 eventos de almuerzo
  snack: "16:00",           // Merienda
  snackCount: 4,            // 4 eventos de merienda
  dinner: "19:00",          // Cena
  dinnerCount: 5            // 5 eventos de cena
}
```

**Clasificación automática por hora:**
```typescript
const buckets = {
  breakfast: { from: 360, to: 600 },   // 06:00 - 10:00
  lunch: { from: 660, to: 840 },       // 11:00 - 14:00
  snack: { from: 900, to: 1020 },      // 15:00 - 17:00
  dinner: { from: 1080, to: 1259 }     // 18:00 - 20:59
}
```

---

## Integración RAG

### 1. Fuente de datos RAG

**Archivo:** `docs/RAG_SUMMARY_OPTIMIZED.md`

**Configuración:**
```typescript
const RAG_SOURCE: 'summary' | 'vector' = 'summary'
```

### 2. Selección de información por edad

```typescript
// Determinar rango de edad del niño
const ageInMonths = Math.floor(differenceInDays(new Date(), birthDate) / 30.44)

let ageRange = '0-3'
if (ageInMonths >= 3 && ageInMonths < 6) ageRange = '3-6'
else if (ageInMonths >= 6 && ageInMonths < 9) ageRange = '6'
else if (ageInMonths >= 9 && ageInMonths < 13) ageRange = '9'
else if (ageInMonths >= 13 && ageInMonths < 15) ageRange = '13-15'
else if (ageInMonths >= 15 && ageInMonths < 30) ageRange = '15-18'
else if (ageInMonths >= 30 && ageInMonths < 36) ageRange = '30+'
else ageRange = '36-60'
```

### 3. Extracción de horarios ideales

**Ejemplo para 15 meses:**

```json
{
  "ageMonths": "15",
  "wakeTime": "07:00",
  "bedtime": "19:30",
  "nightSleepDuration": "11.5 horas",
  "naps": [
    {
      "napNumber": 1,
      "time": "12:30-14:00",
      "duration": "1.5 horas",
      "optional": false
    }
  ],
  "totalNapTime": "1.5 horas",
  "awakeWindows": ["5-6 horas"],
  "notes": "Transición a 1 siesta consolidada al mediodía"
}
```

### 4. Formateo para GPT-4

```typescript
const formattedContent = `
HORARIOS OBJETIVO PARA 15 MESES:

Hora de despertar: 07:00
Hora de dormir: 19:30
Duración sueño nocturno: 11.5 horas

Siestas:
- Siesta 1: 12:30-14:00 (1.5 horas)

Tiempo total de siestas: 1.5 horas

Ventanas despierto: 5-6 horas

NOTAS: Transición a 1 siesta consolidada al mediodía
`
```

### 5. Reglas de ajuste progresivo

También se incluyen las reglas de ajuste:

```markdown
## REGLAS DE AJUSTE PROGRESIVO

1. **Cambios graduales**: Máximo 15 minutos por ajuste cada 3-4 días
2. **Prioridad**: Primero hora de despertar, luego hora de dormir
3. **Observación**: Monitorear tolerancia del niño antes de siguiente ajuste
4. **Flexibilidad**: Ajustar según respuesta individual del niño
```

---

## Generación con IA

### 1. Construcción del prompt

El prompt para GPT-4 incluye:

```typescript
const systemPrompt = `
Eres la Dra. Mariana, especialista en pediatría y desarrollo infantil.

GENERA PLAN DE PROGRESIÓN basado en EVENTOS REALES registrados para ${childData.firstName}.

PLAN ANTERIOR (COMO BASE):
${JSON.stringify(previousPlan?.schedule, null, 2)}

ANÁLISIS DE EVENTOS RECIENTES (${eventAnalysis.eventsAnalyzed} eventos):
- Tipos de eventos: ${eventAnalysis.eventTypes.join(", ")}
- Período analizado: ${eventAnalysis.dateRange.from} a ${eventAnalysis.dateRange.to}
- Sueño nocturno (promedio): ${childData.stats.avgSleepDurationMinutes} minutos
- Hora promedio de despertar: ${avgWakeTime}
- Siestas (período): total=${napStats.count}, hora típica=${napStats.typicalTime}, duración prom=${napStats.avgDuration} min
- Hora media de acostarse (período): ${bedtimeStats.avgBedtime}
- Comidas típicas (período): desayuno=${feedingStats.breakfast} (n=${feedingStats.breakfastCount}), ...

🎯 OBJETIVO IDEAL (hacia donde continuamos avanzando):
${ragContext.map(doc => \`Fuente: \${doc.source}\nContenido: \${doc.content}\`).join("\n\n---\n\n")}

⚠️ IMPORTANTE: Usa el plan anterior como base y da el SIGUIENTE PASO progresivo hacia estos horarios ideales.

INSTRUCCIONES PARA PROGRESIÓN:
1. 🎯 PRIORIDAD: Utiliza el PLAN ANTERIOR como base sólida
2. 📊 AJUSTA según los PATRONES REALES observados en los eventos
3. ⚠️ CRÍTICO: TODOS LOS HORARIOS EN FORMATO 24 HORAS (00:00-23:59)
4. 🕐 USA HORARIOS EN INTERVALOS DE 15 MINUTOS (:00, :15, :30, :45 únicamente)
5. 📈 ESTRATEGIA PROGRESIVA: CONTINÚA avanzando desde el plan anterior hacia el objetivo ideal del RAG
6. ✨ EVOLUCIONA el plan manteniendo coherencia con el anterior
...
`
```

### 2. Políticas de ajuste seguro

```typescript
const policies = derivePlanPolicy({ ageInMonths, events: newEvents })

// Las políticas incluyen:
// - Límites de ajuste (15 minutos cada 3-4 días)
// - Reglas de transición de siestas (si aplica)
// - Reglas de destete nocturno (si aplica)
```

### 3. Llamada a OpenAI

```typescript
const completion = await openai.chat.completions.create({
  model: "gpt-4",
  messages: [
    { role: "system", content: systemPrompt },
    { role: "system", content: policyText },  // Políticas de ajuste
    { role: "user", content: "Genera el plan detallado siguiendo exactamente el formato JSON especificado." }
  ],
  max_tokens: 2000,
  temperature: 0.3  // Temperatura baja para mayor consistencia
})
```

### 4. Parseo y validación

```typescript
let responseContent = completion.choices[0]?.message?.content || ""

// Limpiar respuesta
responseContent = responseContent.trim()

// Extraer JSON si está envuelto en texto
if (!responseContent.startsWith('{')) {
  const jsonMatch = responseContent.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    responseContent = jsonMatch[0]
  }
}

const aiPlan = JSON.parse(responseContent)
```

---

## Estructura del Plan Generado

### 1. Estructura completa del Plan 1

```typescript
{
  // IDs y metadata
  childId: ObjectId("..."),
  userId: ObjectId("..."),
  planNumber: 1,
  planVersion: "1",
  planType: "event_based",

  // Información básica
  title: "Plan 1 para Sofía (Progresión por Eventos)",

  // Horarios detallados
  schedule: {
    bedtime: "20:00",        // Hora de dormir (formato 24h)
    wakeTime: "07:00",       // Hora de despertar (formato 24h)

    meals: [                 // Comidas con horarios específicos
      {
        time: "07:30",
        type: "desayuno",
        description: "Desayuno nutritivo con frutas y cereales"
      },
      {
        time: "12:00",
        type: "almuerzo",
        description: "Almuerzo balanceado con proteínas y vegetales"
      },
      {
        time: "16:00",
        type: "merienda",
        description: "Merienda ligera"
      },
      {
        time: "19:00",
        type: "cena",
        description: "Cena temprana y ligera"
      }
    ],

    activities: [],          // Sin actividades en Plan 1 (opcional)

    naps: [                  // Siestas con duración
      {
        time: "13:00",
        duration: 90,
        description: "Siesta después del almuerzo"
      }
    ]
  },

  // Objetivos del plan
  objectives: [
    "Consolidar rutina de sueño nocturno de 11 horas",
    "Mantener 1 siesta de 90 minutos al mediodía",
    "Reducir despertares nocturnos a menos de 1 por noche"
  ],

  // Recomendaciones específicas
  recommendations: [
    "Mantener hora de despertar consistente a las 7:00 AM",
    "Iniciar rutina de relajación 30 minutos antes de dormir",
    "Asegurar ambiente oscuro y tranquilo durante siestas"
  ],

  // Información de base
  basedOn: "events_stats_rag",

  basedOnPlan: {
    planId: ObjectId("..."),  // ID del Plan 0
    planVersion: "0"
  },

  // Rango de eventos analizados
  eventsDateRange: {
    fromDate: "2025-01-15T10:30:00.000Z",
    toDate: "2025-01-27T18:45:00.000Z",
    totalEventsAnalyzed: 45
  },

  // Análisis detallado
  eventAnalysis: {
    eventsAnalyzed: 45,
    eventTypes: ["sleep", "wake", "nap", "feeding"],
    progressFromPrevious: "El niño ha mostrado buena adaptación al Plan 0. Los horarios de despertar se han consolidado en torno a las 7:15 AM. Las siestas se han regularizado a una por día al mediodía. Se observa reducción de despertares nocturnos.",
    ragSources: ["HD Horarios de sueño - 15 meses", "Reglas de Ajuste Progresivo"],
    basePlanVersion: "0"
  },

  // Metadata de creación
  createdAt: "2025-01-27T18:45:00.000Z",
  updatedAt: "2025-01-27T18:45:00.000Z",
  createdBy: ObjectId("..."),  // ID del admin que generó el plan
  status: "borrador"            // Estado inicial: borrador
}
```

### 2. Estados del plan

| Estado | Descripción |
|--------|-------------|
| `borrador` | Plan recién generado, no visible para padres |
| `active` | Plan activado y visible para padres |
| `superseded` | Plan anterior reemplazado por uno nuevo |

---

## Ejemplo Práctico

### Caso: Sofía, 15 meses

#### 1. Datos iniciales

```typescript
// Niña: Sofía
// Edad: 15 meses
// Plan 0 creado: 2025-01-15 10:30:00
```

#### 2. Plan 0 (base)

```json
{
  "schedule": {
    "bedtime": "21:00",
    "wakeTime": "07:30",
    "meals": [
      { "time": "08:00", "type": "desayuno" },
      { "time": "12:30", "type": "almuerzo" },
      { "time": "16:30", "type": "merienda" },
      { "time": "19:30", "type": "cena" }
    ],
    "naps": [
      { "time": "13:30", "duration": 90 }
    ]
  }
}
```

#### 3. Eventos registrados (15 ene - 27 ene)

```typescript
Total eventos: 45
- sleep: 12 eventos
- wake: 12 eventos
- nap: 10 eventos
- feeding: 11 eventos
```

#### 4. Estadísticas calculadas

```json
{
  "avgSleepDuration": 10.8,
  "avgWakeTime": "07:15",
  "avgBedtime": "20:45",
  "napStats": {
    "count": 10,
    "avgDuration": 85,
    "typicalTime": "13:15"
  },
  "feedingStats": {
    "breakfast": "07:45",
    "lunch": "12:15",
    "snack": "16:15",
    "dinner": "19:15"
  }
}
```

#### 5. RAG ideal (15 meses)

```json
{
  "wakeTime": "07:00",
  "bedtime": "19:30",
  "nightSleepDuration": "11.5 horas",
  "naps": [
    { "time": "12:30-14:00", "duration": "1.5 horas" }
  ]
}
```

#### 6. Plan 1 generado (progresión)

```json
{
  "schedule": {
    "bedtime": "20:30",        // ⬇️ 30 min antes (de 21:00 → 20:30)
    "wakeTime": "07:15",       // ⬆️ 15 min antes (de 07:30 → 07:15, sigue realidad)
    "meals": [
      { "time": "07:45", "type": "desayuno" },    // ⬆️ Ajustado a realidad
      { "time": "12:15", "type": "almuerzo" },    // ⬆️ Ajustado a realidad
      { "time": "16:15", "type": "merienda" },    // ⬆️ Ajustado a realidad
      { "time": "19:15", "type": "cena" }         // ⬆️ Ajustado a realidad
    ],
    "naps": [
      { "time": "13:15", "duration": 90 }         // ⬆️ Ajustado a hora típica observada
    ]
  },
  "objectives": [
    "Consolidar hora de despertar a las 7:15 AM",
    "Adelantar hora de dormir progresivamente hacia 20:00",
    "Mantener siesta única de 90 minutos"
  ],
  "eventAnalysis": {
    "eventsAnalyzed": 45,
    "progressFromPrevious": "Sofía ha mostrado excelente adaptación al Plan 0. Los horarios se han estabilizado y se observa reducción natural de hora de acostarse. El siguiente paso es consolidar estos avances y continuar acercándose a los horarios ideales."
  }
}
```

#### 7. Estrategia progresiva aplicada

| Aspecto | Plan 0 | Estadísticas reales | Ideal RAG | Plan 1 (siguiente paso) |
|---------|--------|---------------------|-----------|------------------------|
| Despertar | 07:30 | 07:15 | 07:00 | 07:15 (seguir realidad) |
| Dormir | 21:00 | 20:45 | 19:30 | 20:30 (paso intermedio) |
| Siesta | 13:30 | 13:15 | 12:30 | 13:15 (seguir realidad) |
| Desayuno | 08:00 | 07:45 | - | 07:45 (seguir realidad) |

**Lógica del ajuste:**
- ✅ Despertar: Ya está cerca del ideal (7:15 vs 7:00), mantener realidad
- ✅ Dormir: Mover progresivamente (21:00 → 20:30 → eventual 19:30)
- ✅ Siesta: Hora real funciona bien, mantener
- ✅ Comidas: Ajustar a patrones reales observados

---

## Flujo de Activación

### 1. Plan generado como borrador

```typescript
status: "borrador"
// El plan NO es visible para los padres
// Solo el admin puede verlo en el dashboard
```

### 2. Admin revisa y aprueba

```typescript
// Endpoint PATCH /api/consultas/plans
{
  planId: "...",
  childId: "...",
  userId: "..."
}
```

### 3. Activación del plan

```typescript
// 1. Marcar planes anteriores como superseded
UPDATE child_plans
SET status = "superseded"
WHERE planNumber < 1

// 2. Activar Plan 1
UPDATE child_plans
SET status = "active", activatedAt = NOW()
WHERE _id = planId
```

### 4. Plan visible para padres

```typescript
// Endpoint GET /api/children/{id}/active-plan
// Retorna el plan activo más reciente
```

---

## Resumen del Flujo Completo

```
┌─────────────────────────────────────────────────────────────────┐
│                    GENERACIÓN DEL PLAN 1                        │
└─────────────────────────────────────────────────────────────────┘

1. ENTRADA
   ├─ Usuario solicita generar Plan 1 (event_based)
   ├─ Sistema obtiene Plan 0 (base)
   └─ Sistema obtiene datos del niño

2. OBTENCIÓN DE EVENTOS
   ├─ Buscar eventos desde Plan 0 hasta ahora
   ├─ Filtrar por childId y rango de fechas
   └─ Validar que existan eventos (>0)

3. PROCESAMIENTO DE ESTADÍSTICAS
   ├─ Calcular métricas principales (sleep-calculations.ts)
   │  ├─ Duración de sueño nocturno
   │  ├─ Hora de despertar
   │  ├─ Hora de acostarse
   │  └─ Despertares nocturnos
   ├─ Enriquecer con estadísticas detalladas
   │  ├─ Siestas (count, duration, typicalTime)
   │  ├─ Bedtime promedio
   │  └─ Comidas típicas (breakfast, lunch, snack, dinner)
   └─ Calcular edad en meses

4. INTEGRACIÓN RAG
   ├─ Leer docs/RAG_SUMMARY_OPTIMIZED.md
   ├─ Determinar rango de edad (ej: 15 meses → "15-18")
   ├─ Extraer sección JSON correspondiente
   ├─ Formatear horarios ideales
   └─ Agregar reglas de ajuste progresivo

5. APLICAR POLÍTICAS DE AJUSTE
   ├─ derivePlanPolicy({ ageInMonths, events })
   ├─ Límites de cambio (15 min cada 3-4 días)
   ├─ Reglas de transición de siestas (si aplica)
   └─ Reglas de destete nocturno (si aplica)

6. GENERACIÓN CON IA (GPT-4)
   ├─ Construir prompt estructurado
   │  ├─ Plan anterior (base)
   │  ├─ Estadísticas de eventos
   │  ├─ Estadísticas enriquecidas
   │  ├─ Objetivos ideales (RAG)
   │  └─ Instrucciones de estrategia progresiva
   ├─ Llamada a OpenAI (temperature: 0.3)
   ├─ Parsear respuesta JSON
   └─ Validar estructura

7. CONSTRUCCIÓN DEL PLAN 1
   ├─ Estructura base del plan
   ├─ Schedule (bedtime, wakeTime, meals, naps)
   ├─ Objetivos específicos
   ├─ Recomendaciones
   ├─ Análisis de progresión
   └─ Metadata (dates, references, status)

8. GUARDADO EN BASE DE DATOS
   ├─ Insertar en child_plans collection
   ├─ Estado inicial: "borrador"
   ├─ Plan NO visible para padres
   └─ Espera aprobación de admin

9. ACTIVACIÓN (MANUAL)
   ├─ Admin revisa plan en dashboard
   ├─ Admin aprueba y activa
   ├─ Planes anteriores → status: "superseded"
   ├─ Plan 1 → status: "active"
   └─ Plan visible para padres

┌─────────────────────────────────────────────────────────────────┐
│                      RESULTADO FINAL                            │
└─────────────────────────────────────────────────────────────────┘

Plan 1 activo con:
✅ Horarios ajustados a patrones reales
✅ Progresión hacia objetivos ideales
✅ Estrategia de implementación clara
✅ Visible en app de padres
```

---

## Archivos clave del sistema

| Archivo | Función |
|---------|---------|
| `/app/api/consultas/plans/route.ts` | API principal de gestión de planes |
| `/lib/sleep-calculations.ts` | Cálculo de estadísticas de sueño |
| `/lib/plan-policies.ts` | Políticas de ajuste progresivo |
| `/docs/RAG_SUMMARY_OPTIMIZED.md` | Horarios ideales por edad |
| `/app/api/children/[id]/active-plan/route.ts` | Endpoint para padres |

---

## Notas importantes

1. **Formato de horarios:** Siempre en formato 24 horas (00:00-23:59)
2. **Intervalos:** Todos los horarios en múltiplos de 15 minutos (:00, :15, :30, :45)
3. **Estrategia progresiva:** Nunca saltar directamente al ideal, avanzar gradualmente
4. **Base de datos:** Todos los eventos migrados a childId como ObjectId
5. **Validación:** Se requieren eventos nuevos para generar Plan 1
6. **Aprobación:** Planes generados como "borrador", requieren activación manual

---

**Última actualización:** 27 de enero de 2025
