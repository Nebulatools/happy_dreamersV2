# Ejemplos Prácticos - Sistema de Planes

## Casos de Uso Detallados con Ejemplos de Código

---

## 📋 Caso 1: Crear y Aplicar Primer Plan (Plan 0)

### Escenario
Un admin genera el primer plan para un nuevo niño basado en el cuestionario inicial.

### Paso 1: Generar Plan 0

**Request**:
```http
POST /api/consultas/plans
Content-Type: application/json

{
  "userId": "60d5ec49f1b2c8b1f8e4e1a1",
  "childId": "60d5ec49f1b2c8b1f8e4e1a2",
  "planType": "initial"
}
```

**Response**:
```json
{
  "success": true,
  "planId": "60d5ec49f1b2c8b1f8e4e1a3",
  "plan": {
    "_id": "60d5ec49f1b2c8b1f8e4e1a3",
    "childId": "60d5ec49f1b2c8b1f8e4e1a2",
    "userId": "60d5ec49f1b2c8b1f8e4e1a1",
    "planNumber": 0,
    "planVersion": "0",
    "planType": "initial",
    "status": "borrador",
    "schedule": {
      "bedtime": "20:00",
      "wakeTime": "07:00",
      "meals": [...],
      "activities": [],
      "naps": [...]
    },
    "objectives": [...],
    "recommendations": [...],
    "createdAt": "2025-01-24T10:00:00Z"
  }
}
```

**Estado en Base de Datos**:
```javascript
{
  _id: ObjectId("60d5ec49f1b2c8b1f8e4e1a3"),
  childId: ObjectId("60d5ec49f1b2c8b1f8e4e1a2"),
  userId: ObjectId("60d5ec49f1b2c8b1f8e4e1a1"),
  planNumber: 0,
  planVersion: "0",
  planType: "initial",
  status: "borrador", // ← Plan NO visible para el usuario
  schedule: {
    bedtime: "20:00",
    wakeTime: "07:00",
    meals: [
      { time: "07:30", type: "desayuno", description: "Desayuno nutritivo" },
      { time: "12:00", type: "almuerzo", description: "Almuerzo balanceado" },
      { time: "16:00", type: "merienda", description: "Merienda ligera" },
      { time: "19:00", type: "cena", description: "Cena temprana" }
    ],
    activities: [],
    naps: [
      { time: "14:00", duration: 90, description: "Siesta de la tarde" }
    ]
  },
  objectives: [
    "Establecer rutina de sueño consistente",
    "Mejorar calidad del descanso nocturno"
  ],
  recommendations: [
    "Mantener horarios fijos de dormir y despertar",
    "Crear ambiente oscuro y tranquilo para dormir"
  ],
  createdAt: ISODate("2025-01-24T10:00:00Z"),
  createdBy: ObjectId("60d5ec49f1b2c8b1f8e4e1a0") // Admin ID
}
```

---

### Paso 2: Aplicar Plan 0

**Request**:
```http
PATCH /api/consultas/plans/60d5ec49f1b2c8b1f8e4e1a3
Content-Type: application/json
```

**Response**:
```json
{
  "success": true,
  "plan": {
    "_id": "60d5ec49f1b2c8b1f8e4e1a3",
    "status": "activo",
    "appliedBy": "60d5ec49f1b2c8b1f8e4e1a0",
    "appliedAt": "2025-01-24T10:30:00Z",
    ...
  },
  "message": "Plan aplicado correctamente. Los planes anteriores han sido marcados como completados."
}
```

**Estado en Base de Datos (Actualizado)**:
```javascript
{
  _id: ObjectId("60d5ec49f1b2c8b1f8e4e1a3"),
  status: "activo", // ← Cambió de "borrador" a "activo"
  appliedBy: ObjectId("60d5ec49f1b2c8b1f8e4e1a0"),
  appliedAt: ISODate("2025-01-24T10:30:00Z"),
  updatedAt: ISODate("2025-01-24T10:30:00Z"),
  ...
}
```

**Resultado**:
- ✅ Plan 0 ahora es visible para el usuario
- ✅ Usuario puede ver horarios, objetivos y recomendaciones
- ✅ Admin puede continuar haciendo seguimiento

---

## 📋 Caso 2: Aplicar Nuevo Plan Basado en Eventos (Plan 1)

### Escenario
Después de 7 días, el admin genera Plan 1 basado en los eventos registrados.

### Paso 1: Generar Plan 1

**Request**:
```http
POST /api/consultas/plans
Content-Type: application/json

{
  "userId": "60d5ec49f1b2c8b1f8e4e1a1",
  "childId": "60d5ec49f1b2c8b1f8e4e1a2",
  "planType": "event_based"
}
```

**Response**:
```json
{
  "success": true,
  "planId": "60d5ec49f1b2c8b1f8e4e1a4",
  "plan": {
    "_id": "60d5ec49f1b2c8b1f8e4e1a4",
    "planNumber": 1,
    "planVersion": "1",
    "planType": "event_based",
    "status": "borrador",
    "basedOnPlan": {
      "planId": "60d5ec49f1b2c8b1f8e4e1a3",
      "planVersion": "0"
    },
    "eventsDateRange": {
      "fromDate": "2025-01-24T10:30:00Z",
      "toDate": "2025-01-31T10:00:00Z",
      "totalEventsAnalyzed": 42
    },
    ...
  }
}
```

**Estado Actual en Base de Datos**:
```javascript
// Dos planes en la base de datos
[
  {
    _id: ObjectId("60d5ec49f1b2c8b1f8e4e1a3"),
    planVersion: "0",
    status: "activo", // ← Plan actual del usuario
    ...
  },
  {
    _id: ObjectId("60d5ec49f1b2c8b1f8e4e1a4"),
    planVersion: "1",
    status: "borrador", // ← Plan nuevo (NO visible para usuario)
    basedOnPlan: {
      planId: ObjectId("60d5ec49f1b2c8b1f8e4e1a3"),
      planVersion: "0"
    },
    ...
  }
]
```

---

### Paso 2: Aplicar Plan 1

**Request**:
```http
PATCH /api/consultas/plans/60d5ec49f1b2c8b1f8e4e1a4
```

**Lógica Ejecutada en el Backend**:

```typescript
// 1. Marcar Plan 0 como completado
await plansCollection.updateMany(
  {
    childId: ObjectId("60d5ec49f1b2c8b1f8e4e1a2"),
    userId: ObjectId("60d5ec49f1b2c8b1f8e4e1a1"),
    status: "activo",
    _id: { $ne: ObjectId("60d5ec49f1b2c8b1f8e4e1a4") }
  },
  {
    $set: {
      status: "completado",
      updatedAt: new Date()
    }
  }
)

// 2. Activar Plan 1
await plansCollection.updateOne(
  { _id: ObjectId("60d5ec49f1b2c8b1f8e4e1a4") },
  {
    $set: {
      status: "activo",
      appliedBy: ObjectId("60d5ec49f1b2c8b1f8e4e1a0"),
      appliedAt: new Date()
    }
  }
)
```

**Estado Final en Base de Datos**:
```javascript
[
  {
    _id: ObjectId("60d5ec49f1b2c8b1f8e4e1a3"),
    planVersion: "0",
    status: "completado", // ← Automáticamente marcado como completado
    updatedAt: ISODate("2025-01-31T10:30:00Z"),
    ...
  },
  {
    _id: ObjectId("60d5ec49f1b2c8b1f8e4e1a4"),
    planVersion: "1",
    status: "activo", // ← Ahora es el plan activo
    appliedBy: ObjectId("60d5ec49f1b2c8b1f8e4e1a0"),
    appliedAt: ISODate("2025-01-31T10:30:00Z"),
    ...
  }
]
```

**Resultado**:
- ✅ Usuario ahora ve Plan 1 como su plan activo
- ✅ Plan 0 queda en historial (completado)
- ✅ Transición automática sin intervención manual

---

## 📋 Caso 3: Eliminar Plan Activo (Reactivación Automática)

### Escenario
El admin elimina Plan 1 por error. El sistema debe reactivar Plan 0 automáticamente.

### Paso 1: Estado Inicial

**Base de Datos Antes de Eliminar**:
```javascript
[
  {
    _id: ObjectId("60d5ec49f1b2c8b1f8e4e1a3"),
    planVersion: "0",
    status: "completado"
  },
  {
    _id: ObjectId("60d5ec49f1b2c8b1f8e4e1a4"),
    planVersion: "1",
    status: "activo" // ← A eliminar
  }
]
```

---

### Paso 2: Eliminar Plan 1

**Request**:
```http
DELETE /api/consultas/plans/60d5ec49f1b2c8b1f8e4e1a4
```

**Lógica Ejecutada en el Backend**:

```typescript
// 1. Obtener el plan a eliminar
const planToDelete = await collection.findOne({
  _id: ObjectId("60d5ec49f1b2c8b1f8e4e1a4")
})

// 2. Verificar que es activo
if (planToDelete.status === "activo") {
  // 3. Obtener todos los planes del mismo niño (excepto el que se elimina)
  const allPlans = await collection.find({
    childId: planToDelete.childId,
    userId: planToDelete.userId,
    _id: { $ne: ObjectId("60d5ec49f1b2c8b1f8e4e1a4") }
  }).toArray()

  // 4. Ordenar por versión (mayor a menor)
  const sortedPlans = allPlans.sort((a, b) =>
    compareVersions(a.planVersion, b.planVersion)
  )
  // Resultado: ["0"] → Plan 0 es el siguiente a reactivar

  // 5. Reactivar Plan 0
  const previousPlan = sortedPlans[0] // Plan 0
  await collection.updateOne(
    { _id: previousPlan._id },
    {
      $set: {
        status: "activo",
        reactivatedAt: new Date(),
        reactivatedBy: ObjectId("60d5ec49f1b2c8b1f8e4e1a0"),
        reactivatedReason: "Plan 1 eliminado"
      }
    }
  )
}

// 6. Eliminar Plan 1
await collection.deleteOne({
  _id: ObjectId("60d5ec49f1b2c8b1f8e4e1a4")
})
```

**Response**:
```json
{
  "success": true,
  "message": "Plan eliminado correctamente",
  "reactivated": {
    "planId": "60d5ec49f1b2c8b1f8e4e1a3",
    "planVersion": "0"
  }
}
```

**Estado Final en Base de Datos**:
```javascript
[
  {
    _id: ObjectId("60d5ec49f1b2c8b1f8e4e1a3"),
    planVersion: "0",
    status: "activo", // ← Reactivado automáticamente
    reactivatedAt: ISODate("2025-01-31T11:00:00Z"),
    reactivatedBy: ObjectId("60d5ec49f1b2c8b1f8e4e1a0"),
    reactivatedReason: "Plan 1 eliminado",
    ...
  }
  // Plan 1 eliminado (ya no existe)
]
```

**Resultado**:
- ✅ Usuario vuelve a ver Plan 0 como activo
- ✅ No hay pérdida de progreso
- ✅ Historial completo de auditoría

---

## 📋 Caso 4: Refinamiento con Transcript (Plan 1.1)

### Escenario
El admin genera un refinamiento de Plan 1 basado en una consulta médica.

### Paso 1: Estado Inicial

**Base de Datos**:
```javascript
[
  {
    _id: ObjectId("60d5ec49f1b2c8b1f8e4e1a3"),
    planVersion: "0",
    status: "completado"
  },
  {
    _id: ObjectId("60d5ec49f1b2c8b1f8e4e1a4"),
    planVersion: "1",
    status: "activo" // ← Plan actual
  }
]
```

---

### Paso 2: Generar Plan 1.1 (Refinamiento)

**Request**:
```http
POST /api/consultas/plans
Content-Type: application/json

{
  "userId": "60d5ec49f1b2c8b1f8e4e1a1",
  "childId": "60d5ec49f1b2c8b1f8e4e1a2",
  "planType": "transcript_refinement",
  "reportId": "60d5ec49f1b2c8b1f8e4e1a5"
}
```

**Response**:
```json
{
  "success": true,
  "planId": "60d5ec49f1b2c8b1f8e4e1a6",
  "plan": {
    "_id": "60d5ec49f1b2c8b1f8e4e1a6",
    "planNumber": 1,
    "planVersion": "1.1",
    "planType": "transcript_refinement",
    "status": "borrador",
    "basedOnPlan": {
      "planId": "60d5ec49f1b2c8b1f8e4e1a4",
      "planVersion": "1"
    },
    "transcriptAnalysis": {
      "reportId": "60d5ec49f1b2c8b1f8e4e1a5",
      "improvements": [...],
      "adjustments": [...],
      "basePlanVersion": "1"
    },
    ...
  }
}
```

**Estado en Base de Datos**:
```javascript
[
  {
    _id: ObjectId("60d5ec49f1b2c8b1f8e4e1a3"),
    planVersion: "0",
    status: "completado"
  },
  {
    _id: ObjectId("60d5ec49f1b2c8b1f8e4e1a4"),
    planVersion: "1",
    status: "activo"
  },
  {
    _id: ObjectId("60d5ec49f1b2c8b1f8e4e1a6"),
    planVersion: "1.1", // ← Refinamiento de Plan 1
    status: "borrador",
    basedOnPlan: {
      planId: ObjectId("60d5ec49f1b2c8b1f8e4e1a4"),
      planVersion: "1"
    },
    ...
  }
]
```

---

### Paso 3: Aplicar Plan 1.1

**Request**:
```http
PATCH /api/consultas/plans/60d5ec49f1b2c8b1f8e4e1a6
```

**Estado Final**:
```javascript
[
  {
    _id: ObjectId("60d5ec49f1b2c8b1f8e4e1a3"),
    planVersion: "0",
    status: "completado"
  },
  {
    _id: ObjectId("60d5ec49f1b2c8b1f8e4e1a4"),
    planVersion: "1",
    status: "completado" // ← Marcado como completado
  },
  {
    _id: ObjectId("60d5ec49f1b2c8b1f8e4e1a6"),
    planVersion: "1.1",
    status: "activo", // ← Ahora es el activo
    appliedBy: ObjectId("60d5ec49f1b2c8b1f8e4e1a0"),
    appliedAt: ISODate("2025-02-05T10:00:00Z"),
    ...
  }
]
```

**Resultado**:
- ✅ Plan 1.1 es el activo
- ✅ Plan 1 queda en historial (completado)
- ✅ Plan 0 se mantiene en historial

---

## 📋 Caso 5: Eliminación Compleja con Múltiples Refinamientos

### Escenario
Usuario tiene historial: Plan 0 → 1 → 1.1 → 2 (activo). Se elimina Plan 2.

### Estado Inicial

**Base de Datos**:
```javascript
[
  {
    _id: ObjectId("...a3"),
    planVersion: "0",
    status: "completado"
  },
  {
    _id: ObjectId("...a4"),
    planVersion: "1",
    status: "completado"
  },
  {
    _id: ObjectId("...a5"),
    planVersion: "1.1",
    status: "completado"
  },
  {
    _id: ObjectId("...a6"),
    planVersion: "2",
    status: "activo" // ← A eliminar
  }
]
```

---

### Lógica de Reactivación

**Paso 1: Obtener todos los planes (excepto el que se elimina)**

```javascript
const allPlans = [
  { planVersion: "0", ... },
  { planVersion: "1", ... },
  { planVersion: "1.1", ... }
]
```

**Paso 2: Ordenar por versión**

```javascript
// Función compareVersions aplicada:
compareVersions("1.1", "1") // → 1 (1.1 > 1)
compareVersions("1", "0")   // → 1 (1 > 0)

// Resultado ordenado: ["1.1", "1", "0"]
const sortedPlans = [
  { planVersion: "1.1", ... }, // ← Este será reactivado
  { planVersion: "1", ... },
  { planVersion: "0", ... }
]
```

**Paso 3: Reactivar el primer plan (más reciente)**

```javascript
const previousPlan = sortedPlans[0] // Plan 1.1

await collection.updateOne(
  { _id: previousPlan._id },
  {
    $set: {
      status: "activo",
      reactivatedAt: new Date(),
      reactivatedBy: ObjectId("..."),
      reactivatedReason: "Plan 2 eliminado"
    }
  }
)
```

**Estado Final**:
```javascript
[
  {
    _id: ObjectId("...a3"),
    planVersion: "0",
    status: "completado"
  },
  {
    _id: ObjectId("...a4"),
    planVersion: "1",
    status: "completado"
  },
  {
    _id: ObjectId("...a5"),
    planVersion: "1.1",
    status: "activo", // ← Reactivado
    reactivatedAt: ISODate("2025-02-10T10:00:00Z"),
    reactivatedBy: ObjectId("..."),
    reactivatedReason: "Plan 2 eliminado"
  }
  // Plan 2 eliminado
]
```

**Resultado**:
- ✅ Plan 1.1 reactivado (el más reciente después de Plan 2)
- ✅ Plan 1 y 0 se mantienen en historial
- ✅ Usuario ve Plan 1.1 sin pérdida de progreso

---

## 🔍 Función de Comparación de Versiones - Detalles

### Ejemplos de Comparación

```javascript
// Comparaciones de versiones principales
compareVersions("2", "1")     // → 1  (2.0 > 1.0)
compareVersions("1", "0")     // → 1  (1.0 > 0.0)
compareVersions("0", "1")     // → -1 (0.0 < 1.0)

// Comparaciones con refinamientos
compareVersions("1.1", "1")   // → 1  (1.1 > 1.0)
compareVersions("2.1", "2")   // → 1  (2.1 > 2.0)
compareVersions("1", "1.1")   // → -1 (1.0 < 1.1)

// Comparaciones entre refinamientos
compareVersions("1.2", "1.1") // → 1  (1.2 > 1.1)
compareVersions("1.1", "1.2") // → -1 (1.1 < 1.2)

// Comparaciones entre versiones mayores diferentes
compareVersions("2", "1.1")   // → 1  (2.0 > 1.1)
compareVersions("2.1", "1.2") // → 1  (2.1 > 1.2)
compareVersions("1.1", "2")   // → -1 (1.1 < 2.0)

// Comparaciones iguales
compareVersions("1", "1")     // → 0  (1.0 = 1.0)
compareVersions("1.1", "1.1") // → 0  (1.1 = 1.1)
```

### Algoritmo de Ordenamiento

```javascript
const plans = [
  { planVersion: "0" },
  { planVersion: "1" },
  { planVersion: "1.1" },
  { planVersion: "2" },
  { planVersion: "2.1" }
]

// Ordenar de mayor a menor
const sortedPlans = plans.sort((a, b) =>
  compareVersions(a.planVersion, b.planVersion)
)

// Resultado:
// [
//   { planVersion: "2.1" },  ← Mayor versión
//   { planVersion: "2" },
//   { planVersion: "1.1" },
//   { planVersion: "1" },
//   { planVersion: "0" }     ← Menor versión
// ]
```

---

**Fin del documento de ejemplos prácticos**
