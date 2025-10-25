# Diagrama de Flujo - Sistema de Planes

## Visualización del Sistema de Estados y Transiciones

---

## 📊 Diagrama de Estados Completo

```
                         ┌──────────────────┐
                         │   ADMIN GENERA   │
                         │      PLAN        │
                         └────────┬─────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │    BORRADOR      │
                         │                  │
                         │  • No visible    │
                         │    para usuario  │
                         │  • Editable      │
                         │  • Eliminable    │
                         └────────┬─────────┘
                                  │
                                  │ Admin aplica
                                  │ (PATCH)
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │        ACTIVO           │
                    │                         │
                    │  • Visible para usuario │
                    │  • Plan principal       │
                    │  • Solo 1 por niño      │
                    └────┬────────────────┬───┘
                         │                │
          Nuevo plan     │                │ Admin elimina
          aplicado       │                │ (DELETE)
                         │                │
                         ▼                ▼
                ┌──────────────┐   ┌──────────────┐
                │  COMPLETADO  │   │   ELIMINADO  │
                │              │   │              │
                │ • Historial  │   │ • Plan borrado│
                │ • No editable│   │ • Reactiva el│
                │ • Visible    │   │   anterior   │
                └──────┬───────┘   └──────────────┘
                       │
                       │ Plan activo eliminado
                       │ (Reactivación)
                       │
                       ▼
                ┌──────────────┐
                │    ACTIVO    │
                │ (REACTIVADO) │
                │              │
                │ • Vuelve a   │
                │   ser activo │
                └──────────────┘
```

---

## 🔄 Flujo de Aplicación de Plan (Progresión)

### Caso: Aplicar Plan 1 cuando Plan 0 está activo

```
ANTES:
┌─────────────────────────────────────────┐
│ Planes del Niño                         │
├─────────────────────────────────────────┤
│ Plan 0: ACTIVO          ← Usuario ve    │
│ Plan 1: BORRADOR        ← Admin ve      │
└─────────────────────────────────────────┘

                    │
                    │ Admin ejecuta:
                    │ PATCH /api/consultas/plans/[plan1_id]
                    │
                    ▼

         ┌──────────────────────────┐
         │  Lógica del Backend:     │
         │                          │
         │  1. Marcar Plan 0 como   │
         │     "completado"         │
         │                          │
         │  2. Marcar Plan 1 como   │
         │     "activo"             │
         │                          │
         │  3. Registrar auditoría  │
         └──────────────────────────┘

                    │
                    ▼

DESPUÉS:
┌─────────────────────────────────────────┐
│ Planes del Niño                         │
├─────────────────────────────────────────┤
│ Plan 0: COMPLETADO      ← Historial     │
│ Plan 1: ACTIVO          ← Usuario ve    │
└─────────────────────────────────────────┘

         Usuario ahora ve Plan 1
         Plan 0 en historial
```

---

## 🔄 Flujo de Eliminación con Reactivación

### Caso: Eliminar Plan 1 activo (reactivar Plan 0)

```
ANTES:
┌─────────────────────────────────────────┐
│ Planes del Niño                         │
├─────────────────────────────────────────┤
│ Plan 0: COMPLETADO                      │
│ Plan 1: ACTIVO          ← Usuario ve    │
└─────────────────────────────────────────┘

                    │
                    │ Admin ejecuta:
                    │ DELETE /api/consultas/plans/[plan1_id]
                    │
                    ▼

      ┌─────────────────────────────────┐
      │  Lógica del Backend:            │
      │                                 │
      │  1. Detectar que Plan 1 es      │
      │     ACTIVO                      │
      │                                 │
      │  2. Buscar plan anterior:       │
      │     - Obtener todos los planes  │
      │     - Ordenar por versión       │
      │     - Tomar el primero (Plan 0) │
      │                                 │
      │  3. Reactivar Plan 0:           │
      │     - status = "activo"         │
      │     - reactivatedAt = now       │
      │     - reactivatedBy = admin     │
      │     - reactivatedReason = ...   │
      │                                 │
      │  4. Eliminar Plan 1             │
      └─────────────────────────────────┘

                    │
                    ▼

DESPUÉS:
┌─────────────────────────────────────────┐
│ Planes del Niño                         │
├─────────────────────────────────────────┤
│ Plan 0: ACTIVO (REACTIVADO) ← Usuario ve│
│         reactivatedReason:              │
│         "Plan 1 eliminado"              │
└─────────────────────────────────────────┘

         Usuario vuelve a ver Plan 0
         Sin pérdida de progreso
```

---

## 🔄 Flujo con Refinamientos (Versiones N.1)

### Caso Complejo: Plan 0 → 1 → 1.1 → 2

```
Timeline de Evolución:

DÍA 1:
┌──────────────┐
│ Plan 0       │
│ ACTIVO       │
└──────────────┘

DÍA 7:
┌──────────────┐  ┌──────────────┐
│ Plan 0       │  │ Plan 1       │
│ COMPLETADO   │  │ ACTIVO       │ ← Usuario ve
└──────────────┘  └──────────────┘

DÍA 10 (Refinamiento con consulta):
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Plan 0       │  │ Plan 1       │  │ Plan 1.1     │
│ COMPLETADO   │  │ COMPLETADO   │  │ ACTIVO       │ ← Usuario ve
└──────────────┘  └──────────────┘  └──────────────┘

DÍA 14:
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Plan 0       │  │ Plan 1       │  │ Plan 1.1     │  │ Plan 2       │
│ COMPLETADO   │  │ COMPLETADO   │  │ COMPLETADO   │  │ ACTIVO       │ ← Usuario ve
└──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
```

### Si se elimina Plan 2:

```
ORDENAMIENTO DE PLANES:
┌────────────────────────────────────┐
│ Versiones disponibles:             │
│ - 1.1 (refinamiento de 1)          │
│ - 1   (plan base)                  │
│ - 0   (plan inicial)               │
└────────────────────────────────────┘

        │ compareVersions aplicado
        │
        ▼

┌────────────────────────────────────┐
│ Orden de mayor a menor:            │
│ 1. Plan 1.1 ← Este se reactiva     │
│ 2. Plan 1                          │
│ 3. Plan 0                          │
└────────────────────────────────────┘

        │
        ▼

RESULTADO:
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Plan 0       │  │ Plan 1       │  │ Plan 1.1     │
│ COMPLETADO   │  │ COMPLETADO   │  │ ACTIVO       │ ← Usuario ve
└──────────────┘  └──────────────┘  └──────────────┘
                                     (REACTIVADO)

Plan 2 eliminado
```

---

## 📊 Diagrama de Secuencia - Aplicar Plan

```
Admin                API                    MongoDB
  │                   │                        │
  │ PATCH plan/[id]   │                        │
  ├──────────────────>│                        │
  │                   │                        │
  │                   │ 1. Verificar sesión    │
  │                   │    y permisos          │
  │                   │                        │
  │                   │ 2. Obtener plan        │
  │                   ├───────────────────────>│
  │                   │<───────────────────────┤
  │                   │   planToApply          │
  │                   │                        │
  │                   │ 3. Verificar status    │
  │                   │    = "borrador"        │
  │                   │                        │
  │                   │ 4. Marcar activos      │
  │                   │    como "completado"   │
  │                   ├───────────────────────>│
  │                   │   updateMany(...)      │
  │                   │<───────────────────────┤
  │                   │   {modifiedCount: 1}   │
  │                   │                        │
  │                   │ 5. Activar plan        │
  │                   ├───────────────────────>│
  │                   │   updateOne(...)       │
  │                   │<───────────────────────┤
  │                   │   {modifiedCount: 1}   │
  │                   │                        │
  │                   │ 6. Obtener plan        │
  │                   │    actualizado         │
  │                   ├───────────────────────>│
  │                   │<───────────────────────┤
  │                   │   updatedPlan          │
  │                   │                        │
  │<──────────────────┤                        │
  │  {success, plan}  │                        │
  │                   │                        │
```

---

## 📊 Diagrama de Secuencia - Eliminar con Reactivación

```
Admin                API                    MongoDB
  │                   │                        │
  │ DELETE plan/[id]  │                        │
  ├──────────────────>│                        │
  │                   │                        │
  │                   │ 1. Obtener plan a      │
  │                   │    eliminar            │
  │                   ├───────────────────────>│
  │                   │<───────────────────────┤
  │                   │   planToDelete         │
  │                   │   (status: "activo")   │
  │                   │                        │
  │                   │ 2. Obtener todos       │
  │                   │    los planes          │
  │                   ├───────────────────────>│
  │                   │<───────────────────────┤
  │                   │   [plan0, plan1, ...]  │
  │                   │                        │
  │                   │ 3. Ordenar por versión │
  │                   │    (compareVersions)   │
  │                   │    [1.1, 1, 0]         │
  │                   │                        │
  │                   │ 4. Reactivar Plan 1.1  │
  │                   ├───────────────────────>│
  │                   │   updateOne(...)       │
  │                   │   status = "activo"    │
  │                   │<───────────────────────┤
  │                   │   {modifiedCount: 1}   │
  │                   │                        │
  │                   │ 5. Eliminar plan       │
  │                   ├───────────────────────>│
  │                   │   deleteOne(...)       │
  │                   │<───────────────────────┤
  │                   │   {deletedCount: 1}    │
  │                   │                        │
  │<──────────────────┤                        │
  │  {success,        │                        │
  │   reactivated}    │                        │
  │                   │                        │
```

---

## 🎯 Matriz de Transiciones de Estado

| Estado Inicial | Acción              | Estado Final | Trigger              | Automático |
|----------------|---------------------|--------------|----------------------|------------|
| `borrador`     | Aplicar (PATCH)     | `activo`     | Admin aplica plan    | No         |
| `borrador`     | Eliminar (DELETE)   | Eliminado    | Admin borra borrador | No         |
| `activo`       | Nuevo plan aplicado | `completado` | Admin aplica otro    | ✅ Sí      |
| `activo`       | Eliminar (DELETE)   | Eliminado    | Admin borra plan     | No         |
| `completado`   | Plan activo borrado | `activo`     | Reactivación auto    | ✅ Sí      |
| `completado`   | Eliminar (DELETE)   | Eliminado    | Admin borra historial| No         |

---

## 🔍 Árbol de Decisión - Eliminación de Plan

```
                    ┌─────────────────────┐
                    │ Plan a eliminar     │
                    │ obtenido            │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │ ¿Es ACTIVO?         │
                    └─────┬───────┬───────┘
                          │       │
                     NO   │       │   SÍ
                          │       │
                          │       ▼
                          │    ┌──────────────────────┐
                          │    │ Obtener otros planes │
                          │    │ del mismo niño       │
                          │    └──────────┬───────────┘
                          │               │
                          │    ┌──────────▼───────────┐
                          │    │ ¿Hay otros planes?   │
                          │    └─────┬────────┬───────┘
                          │          │        │
                          │     NO   │        │   SÍ
                          │          │        │
                          │          │        ▼
                          │          │    ┌──────────────────┐
                          │          │    │ Ordenar por      │
                          │          │    │ versión (mayor   │
                          │          │    │ a menor)         │
                          │          │    └────────┬─────────┘
                          │          │             │
                          │          │    ┌────────▼─────────┐
                          │          │    │ Tomar primer plan│
                          │          │    │ (más reciente)   │
                          │          │    └────────┬─────────┘
                          │          │             │
                          │          │    ┌────────▼─────────┐
                          │          │    │ Reactivar plan:  │
                          │          │    │ - status = activo│
                          │          │    │ - reactivatedAt  │
                          │          │    │ - reactivatedBy  │
                          │          │    └────────┬─────────┘
                          │          │             │
                          ▼          ▼             ▼
                      ┌─────────────────────────────┐
                      │ Eliminar plan original      │
                      └──────────────┬──────────────┘
                                     │
                      ┌──────────────▼──────────────┐
                      │ Retornar success con info   │
                      │ de reactivación (si aplica) │
                      └─────────────────────────────┘
```

---

## 📈 Evolución de un Plan a través del Tiempo

### Línea de Tiempo Visual

```
Semana 1          Semana 2          Semana 3          Semana 4
   │                 │                 │                 │
   │                 │                 │                 │
   ▼                 ▼                 ▼                 ▼
┌──────┐         ┌──────┐         ┌──────┐         ┌──────┐
│Plan 0│         │Plan 1│         │Plan  │         │Plan 2│
│ACTIVO│    →    │ACTIVO│    →    │ 1.1  │    →    │ACTIVO│
└──────┘         └──────┘         │ACTIVO│         └──────┘
                                  └──────┘
   │                 │                 │                 │
   │ Genera          │ Eventos         │ Transcript      │ Eventos
   │ basado en       │ registrados     │ de consulta     │ registrados
   │ cuestionario    │                 │                 │
   │                 │                 │                 │
   ▼                 ▼                 ▼                 ▼

COMPLETADO      COMPLETADO      COMPLETADO        (En progreso)
```

### Estados Acumulados

```
Después de Semana 1:
┌─────────────────────────┐
│ Plan 0: ACTIVO          │
└─────────────────────────┘

Después de Semana 2:
┌─────────────────────────┐
│ Plan 0: COMPLETADO      │
│ Plan 1: ACTIVO          │
└─────────────────────────┘

Después de Semana 3:
┌─────────────────────────┐
│ Plan 0: COMPLETADO      │
│ Plan 1: COMPLETADO      │
│ Plan 1.1: ACTIVO        │
└─────────────────────────┘

Después de Semana 4:
┌─────────────────────────┐
│ Plan 0: COMPLETADO      │
│ Plan 1: COMPLETADO      │
│ Plan 1.1: COMPLETADO    │
│ Plan 2: ACTIVO          │
└─────────────────────────┘
```

---

## 🔄 Ciclo de Vida Completo de un Plan

```
        ┌────────────────────────────────────────────┐
        │          CICLO DE VIDA DE UN PLAN          │
        └────────────────────────────────────────────┘

┌──────────────┐
│   GENERADO   │  Admin genera plan basado en:
│  (Borrador)  │  - Cuestionario (Plan 0)
└──────┬───────┘  - Eventos (Plan N)
       │          - Transcript (Plan N.1)
       │
       │ Admin revisa y edita si es necesario
       │
       ▼
┌──────────────┐
│   APLICADO   │  Admin aplica el plan
│   (Activo)   │  - Usuarios ven el plan
└──────┬───────┘  - Solo 1 activo por niño
       │          - Planes anteriores → completados
       │
       │ Usuario sigue el plan
       │ Se registran eventos
       │
       ▼
┌──────────────┐
│  REEMPLAZADO │  Nuevo plan es aplicado
│ (Completado) │  - Plan pasa a historial
└──────┬───────┘  - Visible para referencia
       │          - No editable
       │
       │ Plan activo eliminado
       │
       ▼
┌──────────────┐
│ REACTIVADO   │  Si se elimina plan activo
│  (Activo)    │  - Vuelve a ser activo
└──────────────┘  - Usuario lo ve de nuevo
                  - Sin pérdida de progreso
```

---

**Fin del documento de diagramas**
