# Flujo de Estados de Planes - Happy Dreamers

## Documentación del Sistema de Gestión de Estados de Planes

**Fecha de creación:** 2025-01-24
**Versión:** 1.0
**Autor:** Sistema Happy Dreamers

---

## 📋 Índice

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Estados de Planes](#estados-de-planes)
3. [Flujo de Transiciones](#flujo-de-transiciones)
4. [Casos de Uso](#casos-de-uso)
5. [Implementación Técnica](#implementación-técnica)
6. [Ejemplos Prácticos](#ejemplos-prácticos)
7. [Validaciones y Reglas de Negocio](#validaciones-y-reglas-de-negocio)

---

## 📝 Resumen Ejecutivo

El sistema de planes de Happy Dreamers maneja tres estados principales para cada plan: **borrador**, **activo** y **completado**. Este documento describe el ciclo de vida completo de un plan y las reglas que gobiernan las transiciones entre estados.

### Principios Fundamentales

1. **Un solo plan activo**: Solo puede existir un plan activo por niño en cualquier momento
2. **Progresión automática**: Al aplicar un nuevo plan, el anterior se marca como completado
3. **Reactivación inteligente**: Si se elimina un plan activo, el sistema reactiva automáticamente el plan anterior
4. **Trazabilidad completa**: Todos los cambios de estado quedan registrados con información de auditoría

---

## 🔄 Estados de Planes

### 1. Borrador (`borrador`)

**Descripción**: Estado inicial de todo plan recién generado por el admin.

**Características**:
- Plan generado pero no aplicado al usuario
- Visible solo para el admin
- El usuario NO ve este plan en su interfaz
- Puede ser editado, eliminado o aplicado

**Cuándo se crea**:
- Al generar Plan 0 (inicial)
- Al generar Plan N (basado en eventos)
- Al generar Plan N.1 (refinamiento con transcript)

**Acciones permitidas**:
- ✅ Editar (PUT `/api/consultas/plans/[id]`)
- ✅ Eliminar (DELETE `/api/consultas/plans/[id]`)
- ✅ Aplicar (PATCH `/api/consultas/plans/[id]`)
- ❌ No visible para el usuario padre

---

### 2. Activo (`activo`)

**Descripción**: Plan aplicado y actualmente en uso por el usuario.

**Características**:
- Plan principal que el usuario ve y sigue
- Solo puede haber UNO por niño
- Visible en el dashboard del usuario
- El admin puede verlo y editarlo

**Cuándo se activa**:
- Al aplicar un plan en estado borrador (PATCH)
- Al reactivarse después de eliminar el plan activo actual

**Acciones permitidas**:
- ✅ Ver (usuario y admin)
- ✅ Editar (admin únicamente)
- ✅ Eliminar (admin únicamente - reactiva el anterior)
- ❌ NO se puede aplicar de nuevo (ya está activo)

**Transiciones automáticas**:
- → `completado`: Cuando se aplica un nuevo plan
- → Eliminado: Cuando el admin lo elimina (reactiva el anterior)

---

### 3. Completado (`completado`)

**Descripción**: Plan que fue activo pero ya fue reemplazado por uno más reciente.

**Características**:
- Plan histórico para referencia
- Visible en el historial del usuario
- No se puede editar
- Mantiene toda la información de auditoría

**Cuándo se marca como completado**:
- Al aplicar un nuevo plan (el anterior activo → completado)
- Automáticamente cuando un plan activo es reemplazado

**Acciones permitidas**:
- ✅ Ver (usuario y admin - historial)
- ✅ Eliminar (admin únicamente)
- ❌ NO se puede editar
- ❌ NO se puede reactivar manualmente (solo automáticamente al eliminar el activo)

**Transiciones posibles**:
- → `activo`: Solo cuando se elimina el plan activo actual (reactivación automática)

---

## 🔀 Flujo de Transiciones

### Diagrama de Estados

```
┌──────────────┐
│   BORRADOR   │ ← Plan recién generado
└──────┬───────┘
       │
       │ PATCH /api/consultas/plans/[id]
       │ (Aplicar plan)
       │
       ▼
┌──────────────┐
│    ACTIVO    │ ← Plan en uso actual
└──────┬───────┘
       │
       │ Nuevo plan aplicado
       │
       ▼
┌──────────────┐
│  COMPLETADO  │ ← Plan histórico
└──────┬───────┘
       │
       │ Plan activo eliminado
       │ (Reactivación automática)
       │
       └────────────────┐
                        │
                        ▼
                  ┌──────────────┐
                  │    ACTIVO    │ ← Reactivado
                  └──────────────┘
```

---

## 💼 Casos de Uso

### Caso 1: Generar y Aplicar Primer Plan

**Escenario**: Admin genera Plan 0 para un nuevo niño

**Flujo**:

1. Admin genera Plan 0 → Estado: `borrador`
2. Plan NO visible para el usuario
3. Admin revisa y aplica el plan → Estado: `activo`
4. Usuario ahora ve el plan en su dashboard

**Estados en base de datos**:

```javascript
// Después de generar
{
  _id: "plan_001",
  planNumber: 0,
  planVersion: "0",
  status: "borrador", // ← Estado inicial
  childId: "child_123",
  createdAt: "2025-01-24T10:00:00Z"
}

// Después de aplicar
{
  _id: "plan_001",
  planNumber: 0,
  planVersion: "0",
  status: "activo", // ← Estado cambiado
  appliedBy: "admin_456",
  appliedAt: "2025-01-24T10:30:00Z",
  childId: "child_123"
}
```

---

### Caso 2: Aplicar Nuevo Plan (Progresión Natural)

**Escenario**: Admin genera Plan 1 basado en eventos, reemplazando Plan 0

**Flujo**:

1. Usuario tiene Plan 0 activo
2. Admin genera Plan 1 → Estado: `borrador`
3. Admin aplica Plan 1:
   - Plan 0: `activo` → `completado`
   - Plan 1: `borrador` → `activo`
4. Usuario ve Plan 1, Plan 0 queda en historial

**Estados en base de datos**:

```javascript
// Antes de aplicar Plan 1
[
  { _id: "plan_001", planVersion: "0", status: "activo" }  // Plan actual
]

// Después de aplicar Plan 1
[
  { _id: "plan_001", planVersion: "0", status: "completado" }, // ← Marcado como completado
  { _id: "plan_002", planVersion: "1", status: "activo" }      // ← Nuevo plan activo
]
```

**Código ejecutado**:

```typescript
// 1. Marcar planes activos anteriores como completados
await plansCollection.updateMany(
  {
    childId: planToApply.childId,
    status: "activo",
    _id: { $ne: new ObjectId(planId) }
  },
  {
    $set: {
      status: "completado",
      updatedAt: new Date()
    }
  }
)

// 2. Activar el nuevo plan
await plansCollection.updateOne(
  { _id: new ObjectId(planId) },
  {
    $set: {
      status: "activo",
      appliedBy: new ObjectId(session.user.id),
      appliedAt: new Date()
    }
  }
)
```

---

### Caso 3: Eliminar Plan Activo (Reactivación)

**Escenario**: Admin elimina el Plan 1 activo por error

**Flujo**:

1. Usuario tiene Plan 1 activo
2. Admin elimina Plan 1
3. Sistema busca el plan anterior (Plan 0)
4. Sistema reactiva Plan 0: `completado` → `activo`
5. Usuario vuelve a ver Plan 0

**Estados en base de datos**:

```javascript
// Antes de eliminar Plan 1
[
  { _id: "plan_001", planVersion: "0", status: "completado" },
  { _id: "plan_002", planVersion: "1", status: "activo" }  // ← A eliminar
]

// Después de eliminar Plan 1
[
  {
    _id: "plan_001",
    planVersion: "0",
    status: "activo", // ← Reactivado automáticamente
    reactivatedAt: "2025-01-24T11:00:00Z",
    reactivatedBy: "admin_456",
    reactivatedReason: "Plan 1 eliminado"
  }
  // plan_002 ya no existe (eliminado)
]
```

**Código de reactivación**:

```typescript
// Función de comparación de versiones (maneja refinamientos como 1.1, 2.1)
const compareVersions = (versionA: string, versionB: string): number => {
  const parseVersion = (v: string) => {
    const parts = v.split('.')
    const major = parseInt(parts[0]) || 0
    const minor = parseInt(parts[1]) || 0
    return { major, minor }
  }

  const a = parseVersion(versionA)
  const b = parseVersion(versionB)

  if (a.major !== b.major) {
    return b.major - a.major // Mayor número primero
  }
  return b.minor - a.minor // Mayor refinamiento primero
}

// Ordenar planes por versión (de mayor a menor)
const sortedPlans = allPlans.sort((a, b) =>
  compareVersions(a.planVersion, b.planVersion)
)

// El primer plan es el más reciente (anterior al eliminado)
const previousPlan = sortedPlans[0]

if (previousPlan) {
  // Reactivar el plan anterior
  await collection.updateOne(
    { _id: previousPlan._id },
    {
      $set: {
        status: "activo",
        reactivatedAt: new Date(),
        reactivatedBy: new ObjectId(session.user.id),
        reactivatedReason: `Plan ${planToDelete.planVersion} eliminado`
      }
    }
  )
}
```

---

### Caso 4: Refinamiento con Transcript (Plan N.1)

**Escenario**: Admin genera Plan 1.1 (refinamiento de Plan 1) basado en consulta

**Flujo**:

1. Usuario tiene Plan 1 activo
2. Hay una consulta nueva con transcript
3. Admin genera Plan 1.1 → Estado: `borrador`
4. Admin aplica Plan 1.1:
   - Plan 1: `activo` → `completado`
   - Plan 1.1: `borrador` → `activo`
5. Usuario ve Plan 1.1

**Estados en base de datos**:

```javascript
// Antes de aplicar Plan 1.1
[
  { _id: "plan_001", planVersion: "0", status: "completado" },
  { _id: "plan_002", planVersion: "1", status: "activo" }
]

// Después de aplicar Plan 1.1
[
  { _id: "plan_001", planVersion: "0", status: "completado" },
  { _id: "plan_002", planVersion: "1", status: "completado" }, // ← Marcado como completado
  { _id: "plan_003", planVersion: "1.1", status: "activo" }   // ← Refinamiento activo
]
```

---

### Caso 5: Múltiples Eliminaciones con Refinamientos

**Escenario**: Usuario tiene historial complejo (Plan 0, 1, 1.1, 2) y se elimina Plan 2 activo

**Flujo**:

1. Estado inicial:
   - Plan 0: `completado`
   - Plan 1: `completado`
   - Plan 1.1: `completado`
   - Plan 2: `activo`

2. Admin elimina Plan 2

3. Sistema ordena por versión:
   - 2 (eliminado)
   - 1.1 (más reciente disponible) ← Este se reactiva
   - 1
   - 0

4. Sistema reactiva Plan 1.1: `completado` → `activo`

**Lógica de ordenamiento**:

```javascript
// Comparación de versiones
compareVersions("2", "1.1")   // → 2 es mayor (2.0 vs 1.1)
compareVersions("1.1", "1")   // → 1.1 es mayor (1.1 vs 1.0)
compareVersions("1", "0")     // → 1 es mayor (1.0 vs 0.0)

// Resultado: [2, 1.1, 1, 0]
// Al eliminar Plan 2, se reactiva 1.1 (siguiente en la lista)
```

---

## 🔧 Implementación Técnica

### Endpoints Modificados

#### 1. PATCH `/api/consultas/plans/[id]` - Aplicar Plan

**Función**: Cambiar plan de `borrador` a `activo`

**Lógica implementada**:

```typescript
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // 1. Verificar que el plan esté en borrador
  if (planToApply.status !== "borrador") {
    return NextResponse.json(
      { error: "Solo se pueden aplicar planes en estado borrador" },
      { status: 400 }
    )
  }

  // 2. Marcar todos los planes activos como completados
  await plansCollection.updateMany(
    {
      childId: planToApply.childId,
      userId: planToApply.userId,
      status: "activo",
      _id: { $ne: new ObjectId(planId) }
    },
    {
      $set: {
        status: "completado",
        updatedAt: new Date()
      }
    }
  )

  // 3. Activar el plan actual
  await plansCollection.updateOne(
    { _id: new ObjectId(planId) },
    {
      $set: {
        status: "activo",
        updatedAt: new Date(),
        appliedBy: new ObjectId(session.user.id),
        appliedAt: new Date()
      }
    }
  )

  return NextResponse.json({
    success: true,
    message: "Plan aplicado correctamente. Los planes anteriores han sido marcados como completados."
  })
}
```

---

#### 2. DELETE `/api/consultas/plans/[id]` - Eliminar Plan

**Función**: Eliminar un plan y reactivar el anterior si era activo

**Lógica implementada**:

```typescript
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // 1. Obtener el plan a eliminar
  const planToDelete = await collection.findOne({ _id: new ObjectId(planId) })

  // 2. Si es activo, buscar el plan anterior para reactivarlo
  let reactivatedPlan = null
  if (planToDelete.status === "activo") {
    // Obtener todos los planes del mismo niño (excepto el que se va a eliminar)
    const allPlans = await collection.find({
      childId: planToDelete.childId,
      userId: planToDelete.userId,
      _id: { $ne: new ObjectId(planId) }
    }).toArray()

    // Ordenar por versión (mayor a menor)
    const sortedPlans = allPlans.sort((a, b) =>
      compareVersions(a.planVersion, b.planVersion)
    )

    // El primer plan es el más reciente
    const previousPlan = sortedPlans[0]

    if (previousPlan) {
      // Reactivar el plan anterior
      await collection.updateOne(
        { _id: previousPlan._id },
        {
          $set: {
            status: "activo",
            reactivatedAt: new Date(),
            reactivatedBy: new ObjectId(session.user.id),
            reactivatedReason: `Plan ${planToDelete.planVersion} eliminado`
          }
        }
      )
      reactivatedPlan = previousPlan
    }
  }

  // 3. Eliminar el plan original
  await collection.deleteOne({ _id: new ObjectId(planId) })

  return NextResponse.json({
    success: true,
    message: "Plan eliminado correctamente",
    reactivated: reactivatedPlan ? {
      planId: reactivatedPlan._id,
      planVersion: reactivatedPlan.planVersion
    } : null
  })
}
```

---

### Función de Comparación de Versiones

```typescript
/**
 * Compara versiones de planes considerando refinamientos
 * Ejemplos:
 *   - "2" > "1.1" (2.0 > 1.1)
 *   - "1.1" > "1" (1.1 > 1.0)
 *   - "1" > "0" (1.0 > 0.0)
 */
const compareVersions = (versionA: string, versionB: string): number => {
  const parseVersion = (v: string) => {
    const parts = v.split('.')
    const major = parseInt(parts[0]) || 0
    const minor = parseInt(parts[1]) || 0
    return { major, minor }
  }

  const a = parseVersion(versionA)
  const b = parseVersion(versionB)

  // Comparar número mayor (plan base)
  if (a.major !== b.major) {
    return b.major - a.major // Mayor número primero
  }

  // Si el número mayor es igual, comparar refinamiento
  return b.minor - a.minor // Mayor refinamiento primero
}
```

**Ejemplos de uso**:

```javascript
compareVersions("2", "1.1")   // → 1 (2 > 1.1)
compareVersions("1.1", "1")   // → 1 (1.1 > 1)
compareVersions("1", "0")     // → 1 (1 > 0)
compareVersions("1.1", "1.1") // → 0 (iguales)
compareVersions("0", "1")     // → -1 (0 < 1)
```

---

## ✅ Validaciones y Reglas de Negocio

### Reglas de Estado

1. **Solo un plan activo**: Sistema garantiza que solo existe un plan activo por niño
2. **Progresión automática**: Al aplicar plan, el anterior se marca como completado automáticamente
3. **Reactivación inteligente**: Al eliminar plan activo, se reactiva el más reciente disponible
4. **Auditoría completa**: Todos los cambios quedan registrados con usuario, fecha y razón

### Validaciones en PATCH (Aplicar)

```typescript
// ❌ No se puede aplicar un plan que no sea borrador
if (planToApply.status !== "borrador") {
  return error("Solo se pueden aplicar planes en estado borrador")
}

// ✅ Se marcan como completados todos los planes activos anteriores
// ✅ Se activa el plan seleccionado
// ✅ Se registra quién y cuándo lo aplicó
```

### Validaciones en DELETE (Eliminar)

```typescript
// ✅ Se puede eliminar cualquier plan (borrador, activo, completado)
// ✅ Si es activo, se reactiva automáticamente el anterior
// ✅ Si no hay plan anterior, el niño queda sin plan activo
// ✅ Se registra la reactivación con fecha, usuario y razón
```

---

## 📊 Ejemplos Prácticos con Datos Reales

### Ejemplo 1: Flujo Completo de Vida de un Niño

**Timeline**:

```
Día 1:
- Admin genera Plan 0 → borrador
- Admin aplica Plan 0 → activo

Día 7:
- Admin genera Plan 1 (eventos) → borrador
- Admin aplica Plan 1 → activo
  Plan 0 → completado (automático)

Día 10:
- Admin genera Plan 1.1 (refinamiento) → borrador
- Admin aplica Plan 1.1 → activo
  Plan 1 → completado (automático)

Día 14:
- Admin elimina Plan 1.1 por error
  Plan 1.1 → eliminado
  Plan 1 → activo (reactivación automática)
```

**Estado final de base de datos**:

```javascript
[
  {
    _id: "plan_001",
    planVersion: "0",
    status: "completado",
    createdAt: "2025-01-01",
    appliedAt: "2025-01-01"
  },
  {
    _id: "plan_002",
    planVersion: "1",
    status: "activo", // ← Reactivado
    createdAt: "2025-01-07",
    appliedAt: "2025-01-07",
    reactivatedAt: "2025-01-14",
    reactivatedBy: "admin_456",
    reactivatedReason: "Plan 1.1 eliminado"
  }
  // plan_003 (Plan 1.1) fue eliminado
]
```

---

### Ejemplo 2: Múltiples Refinamientos

**Escenario**: Plan con varias iteraciones de refinamiento

```
Plan 0 → completado
Plan 1 → completado
Plan 1.1 → completado
Plan 2 → completado
Plan 2.1 → activo ← Usuario ve este
```

**Si se elimina Plan 2.1**:

```javascript
// Sistema ordena: [2.1 (eliminar), 2, 1.1, 1, 0]
// Reactiva el siguiente: Plan 2

Plan 0 → completado
Plan 1 → completado
Plan 1.1 → completado
Plan 2 → activo ← Reactivado automáticamente
// Plan 2.1 eliminado
```

---

## 🎯 Beneficios del Sistema

1. **Simplicidad para el usuario**: Solo ve un plan activo, sin confusión
2. **Historial completo**: Todos los planes anteriores disponibles para referencia
3. **Recuperación ante errores**: Eliminación accidental no pierde progreso
4. **Trazabilidad total**: Auditoría completa de cambios y reactivaciones
5. **Consistencia garantizada**: Imposible tener múltiples planes activos

---

## 📚 Referencias Técnicas

### Archivos Modificados

- `app/api/consultas/plans/[id]/route.ts`: Lógica de PATCH (aplicar) y DELETE (eliminar con reactivación)
- `app/api/consultas/plans/route.ts`: Generación de planes en estado borrador

### Modelos de Datos

- Ver `types/models.ts` para definición completa de `ChildPlan`
- Estados: `"borrador" | "activo" | "completado" | "superseded" | "archived"`

---

**Fin del documento**
