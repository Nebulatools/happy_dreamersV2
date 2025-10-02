# Flujo de Generación de Planes - Happy Dreamers

## 📋 Resumen del Sistema

El sistema de generación de planes tiene 3 tipos de planes que siguen una secuencia lógica:

1. **Plan 0 (Inicial)** → Plan basado en survey + estadísticas + RAG
2. **Plan N (Progresión)** → Plan basado en nuevos eventos registrados
3. **Plan N.1 (Refinamiento)** → Plan basado en transcript de consulta

## 🔄 Flujo Completo

```
Plan 0 (28 sept)
    ↓ [Registrar eventos]
    ↓
Plan 1 (5 oct) ← basado en eventos desde Plan 0
    ↓ [Registrar más eventos]
    ↓ [Opcional: Consulta con transcript]
    ↓
Plan 1.1 (7 oct) ← refinamiento basado en transcript
    ↓ [Registrar más eventos]
    ↓
Plan 2 (12 oct) ← basado en eventos desde Plan 1.1
    ↓ [Registrar más eventos]
    ↓ [Opcional: Consulta con transcript]
    ↓
Plan 2.1 (14 oct) ← refinamiento basado en transcript
```

## 📊 Lógica de Validación

### Plan Inicial (Plan 0)
**Condición**: No debe existir ningún plan previo
```typescript
canGenerate = existingPlans.length === 0
```

### Plan de Progresión (Plan N)
**Condición**: Debe haber eventos DESPUÉS del último plan creado
```typescript
// Busca eventos después del último plan (incluye refinamientos)
latestPlan = plans.sort(by createdAt DESC)[0]
events = find({
  childId: childId,  // STRING (no ObjectId)
  startTime: { $gt: latestPlan.createdAt }
})
canGenerate = events.length > 0
```

**Ejemplo**:
- Plan 0 creado: 28 sept 2025 17:32 UTC
- Eventos desde: 29 sept 2025 16:00 UTC
- ✅ Puede generar Plan 1

### Plan de Refinamiento (Plan N.1)
**Condiciones**:
1. Debe existir al menos Plan 1 (no se puede refinar Plan 0)
2. No debe existir ya un refinamiento para el plan actual
3. Debe haber un transcript DESPUÉS del último plan

```typescript
// No se puede refinar Plan 0
if (latestPlan.planNumber === 0) {
  canGenerate = false
}

// Verificar que no exista refinamiento
existingRefinement = plans.find(p =>
  p.planNumber === currentPlanNumber &&
  p.planVersion.includes('.1')
)

if (existingRefinement) {
  canGenerate = false
}

// Verificar transcript disponible
transcript = findTranscript({
  childId: childId,  // ObjectId
  createdAt: { $gt: latestPlan.createdAt }
})
canGenerate = !!transcript
```

## 🔧 Formato de Datos por Colección

### Collection: `events`
```typescript
{
  _id: ObjectId,
  childId: STRING,  // ⚠️ IMPORTANTE: es string, no ObjectId
  eventType: string,
  startTime: ISO string,
  endTime: ISO string
}
```

### Collection: `child_plans`
```typescript
{
  _id: ObjectId,
  childId: ObjectId,  // ✅ Es ObjectId
  userId: ObjectId,
  planNumber: number,  // 0, 1, 2, 3...
  planVersion: string, // "0", "1", "1.1", "2", "2.1"
  planType: "initial" | "event_based" | "transcript_refinement",
  createdAt: Date
}
```

### Collection: `consultation_reports`
```typescript
{
  _id: ObjectId,
  childId: ObjectId,  // ✅ Es ObjectId
  transcript: string,
  analysis: string,
  createdAt: Date
}
```

## ✅ Escenarios de Uso Validados

### Escenario 1: Flujo Normal de Progresión
1. ✅ Crear Plan 0 → OK
2. ✅ Registrar eventos → OK
3. ✅ Botón Plan 1 se habilita → OK
4. ✅ Crear Plan 1 → OK
5. ✅ Registrar más eventos → OK
6. ✅ Botón Plan 2 se habilita → OK

### Escenario 2: Flujo con Refinamiento
1. ✅ Crear Plan 0 → OK
2. ✅ Registrar eventos → OK
3. ✅ Crear Plan 1 → OK
4. ✅ Crear transcript de consulta → OK
5. ✅ Botón Plan 1.1 se habilita → OK
6. ✅ Crear Plan 1.1 (refinamiento) → OK
7. ✅ Registrar más eventos → OK
8. ✅ Botón Plan 2 se habilita → OK (usa Plan 1.1 como base)

### Escenario 3: No se puede refinar Plan 0
1. ✅ Crear Plan 0 → OK
2. ✅ Crear transcript de consulta → OK
3. ❌ Botón Plan 0.1 NO se habilita → Correcto
4. ℹ️ Mensaje: "No se puede refinar el Plan 0. Primero genere el Plan 1"

## 🐛 Bug Corregido

### Problema Original
La función `hasEventsAfterDate()` buscaba eventos usando:
```typescript
// ❌ INCORRECTO
childId: new ObjectId(childId)  // ObjectId
```

Pero los eventos se guardan con `childId` como string:
```typescript
// ✅ CORRECTO
childId: childId  // string
```

### Solución Aplicada
Corregido en 3 funciones:
1. `hasEventsAfterDate()` - Línea 172
2. `generateInitialPlan()` - Línea 668
3. `generateEventBasedPlan()` - Línea 772

## 🧪 Script de Debugging

Para verificar el estado de validación de planes:
```bash
node scripts/debug-plan-validation.js
```

Este script muestra:
- Información del niño
- Planes existentes con fechas
- Eventos encontrados después del último plan
- Estadísticas generales de eventos
- Eventos cercanos a la fecha del plan

## 🎯 Respuestas a Preguntas Frecuentes

### ¿Si se registran eventos después del Plan 1, se puede generar Plan 2?
✅ **SÍ** - El sistema busca eventos después del último plan creado (incluyendo refinamientos). Si hay eventos nuevos, el botón de Plan 2 se habilitará automáticamente.

### ¿Si se asigna un transcript ahora, se puede generar Plan 1.1?
✅ **SÍ** - Si existe Plan 1 y hay un transcript creado DESPUÉS del Plan 1, el botón de Plan 1.1 (refinamiento) se habilitará automáticamente.

### ¿Qué pasa si se crea Plan 1.1 y luego se registran eventos?
✅ **El Plan 2 usará Plan 1.1 como base** - El sistema siempre usa el último plan creado (por fecha) como punto de referencia para buscar nuevos eventos.

## 📝 Notas Técnicas

### Comparación de Fechas
Las fechas se comparan usando strings ISO para garantizar consistencia:
```typescript
const afterDateISO = afterDate.toISOString()
const nowISO = new Date().toISOString()

events.find({
  startTime: {
    $gt: afterDateISO,   // Estrictamente mayor
    $lte: nowISO          // Menor o igual
  }
})
```

### Orden de Planes
Los planes se ordenan por:
1. **planNumber** (descendente) para obtener el último plan de progresión
2. **createdAt** (descendente) para obtener el último plan cronológicamente

```typescript
// Para encontrar el plan más reciente (incluye refinamientos)
latestByCreatedAt = plans.sort((a, b) =>
  new Date(b.createdAt) - new Date(a.createdAt)
)[0]
```

## 🔐 Seguridad y Validaciones

1. ✅ Solo administradores pueden generar planes (verificado en POST)
2. ✅ Padres y administradores pueden ver planes (verificado en GET)
3. ✅ Validación de tipos de planes permitidos
4. ✅ Validación de existencia de eventos/transcripts antes de generar
5. ✅ Planes anteriores marcados como "superseded" al crear nuevos (excepto refinamientos)
