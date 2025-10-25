# 📚 Documentación del Sistema de Planes - Happy Dreamers

Documentación completa del sistema de gestión de estados de planes personalizados para niños.

---

## 📂 Estructura de la Documentación

Esta carpeta contiene toda la documentación técnica y práctica del sistema de planes de Happy Dreamers:

### 1. **FLUJO_ESTADOS_PLANES.md** 📖
Documentación principal y completa del sistema.

**Contenido**:
- Resumen ejecutivo del sistema
- Descripción detallada de cada estado (borrador, activo, completado)
- Flujo de transiciones entre estados
- Casos de uso con ejemplos de datos
- Implementación técnica de endpoints
- Validaciones y reglas de negocio
- Referencias técnicas

**Cuándo usar**: Para entender el sistema completo y buscar información de referencia.

---

### 2. **EJEMPLOS_PRACTICOS.md** 💡
Casos de uso detallados con código y datos reales.

**Contenido**:
- Ejemplo 1: Crear y aplicar primer plan (Plan 0)
- Ejemplo 2: Aplicar nuevo plan basado en eventos (Plan 1)
- Ejemplo 3: Eliminar plan activo con reactivación automática
- Ejemplo 4: Refinamiento con transcript (Plan N.1)
- Ejemplo 5: Eliminación compleja con múltiples refinamientos
- Detalles de función de comparación de versiones

**Cuándo usar**: Para ver ejemplos concretos de requests, responses y estados de base de datos.

---

### 3. **DIAGRAMA_FLUJO.md** 📊
Diagramas visuales del sistema y flujos de trabajo.

**Contenido**:
- Diagrama de estados completo
- Flujo de aplicación de plan
- Flujo de eliminación con reactivación
- Flujo con refinamientos (versiones N.1)
- Diagramas de secuencia (API ↔ MongoDB)
- Matriz de transiciones de estado
- Árbol de decisión para eliminación
- Evolución temporal de planes
- Ciclo de vida completo de un plan

**Cuándo usar**: Para visualizar el sistema de forma gráfica y entender flujos.

---

## 🎯 Guía Rápida de Uso

### Para Desarrolladores Nuevos

1. **Primero lee**: `FLUJO_ESTADOS_PLANES.md` (sección "Resumen Ejecutivo")
2. **Luego revisa**: `DIAGRAMA_FLUJO.md` (Diagrama de estados completo)
3. **Finalmente practica**: `EJEMPLOS_PRACTICOS.md` (Caso 1 y Caso 2)

### Para Desarrolladores Experimentados

1. **Consulta rápida**: `FLUJO_ESTADOS_PLANES.md` → Sección específica
2. **Ver código**: `EJEMPLOS_PRACTICOS.md` → Caso específico
3. **Visualizar flujo**: `DIAGRAMA_FLUJO.md` → Diagrama correspondiente

### Para Debugging

1. **Ver estado actual**: `DIAGRAMA_FLUJO.md` → Matriz de transiciones
2. **Verificar lógica**: `FLUJO_ESTADOS_PLANES.md` → Implementación técnica
3. **Comparar con ejemplo**: `EJEMPLOS_PRACTICOS.md` → Caso similar

---

## 🔑 Conceptos Clave

### Estados de Planes

| Estado | Descripción | Visible Usuario | Editable |
|--------|-------------|-----------------|----------|
| `borrador` | Plan recién generado | ❌ No | ✅ Sí |
| `activo` | Plan en uso actual | ✅ Sí | ⚠️ Solo admin |
| `completado` | Plan histórico | ✅ Sí (historial) | ❌ No |

### Reglas Fundamentales

1. **Solo un plan activo**: Garantizado por el sistema
2. **Progresión automática**: Al aplicar plan, anterior → completado
3. **Reactivación inteligente**: Al eliminar activo, reactiva el anterior
4. **Auditoría completa**: Todos los cambios registrados

---

## 📌 Endpoints Principales

### Generar Plan
```
POST /api/consultas/plans
Body: { userId, childId, planType }
```

### Aplicar Plan (borrador → activo)
```
PATCH /api/consultas/plans/[id]
```

### Eliminar Plan (con reactivación)
```
DELETE /api/consultas/plans/[id]
```

### Obtener Planes
```
GET /api/consultas/plans?childId=[id]&userId=[id]
```

---

## 🔄 Flujo Típico

### Flujo Normal (Usuario Nuevo)

```
1. Admin genera Plan 0 → borrador
2. Admin aplica Plan 0 → activo
3. Usuario ve Plan 0 y sigue horarios
4. Se registran eventos (7 días)
5. Admin genera Plan 1 → borrador
6. Admin aplica Plan 1 → activo
   - Plan 0 → completado (automático)
7. Usuario ve Plan 1
```

### Flujo con Refinamiento

```
1. Plan 1 está activo
2. Hay consulta médica con transcript
3. Admin genera Plan 1.1 → borrador
4. Admin aplica Plan 1.1 → activo
   - Plan 1 → completado (automático)
5. Usuario ve Plan 1.1
```

### Flujo con Error (Eliminación)

```
1. Plan 1 está activo
2. Admin elimina Plan 1 por error
3. Sistema detecta y reactiva Plan 0
   - Plan 0: completado → activo
   - Plan 1: eliminado
4. Usuario vuelve a ver Plan 0
```

---

## 🛠️ Implementación Técnica

### Archivos Principales

| Archivo | Función |
|---------|---------|
| `app/api/consultas/plans/route.ts` | POST - Generar planes |
| `app/api/consultas/plans/[id]/route.ts` | PATCH - Aplicar, DELETE - Eliminar |
| `types/models.ts` | Definición de `ChildPlan` interface |

### Función Clave: Comparación de Versiones

```typescript
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
```

**Uso**:
- Ordena planes de mayor a menor versión
- Considera refinamientos (ej: 1.1 > 1)
- Usado en reactivación al eliminar plan activo

---

## 📊 Estadísticas del Sistema

### Tipos de Planes

| Tipo | Código | Basado en | Versión |
|------|--------|-----------|---------|
| Inicial | `initial` | Survey + Stats + RAG | 0 |
| Eventos | `event_based` | Eventos + Plan anterior + RAG | 1, 2, 3... |
| Refinamiento | `transcript_refinement` | Transcript + Plan base | 1.1, 2.1... |

### Campos de Auditoría

| Campo | Descripción | Cuándo se registra |
|-------|-------------|--------------------|
| `createdAt` | Fecha de creación | Al generar plan |
| `createdBy` | Admin que creó | Al generar plan |
| `appliedAt` | Fecha de aplicación | Al aplicar plan |
| `appliedBy` | Admin que aplicó | Al aplicar plan |
| `reactivatedAt` | Fecha de reactivación | Al reactivar plan |
| `reactivatedBy` | Admin que causó reactivación | Al eliminar plan activo |
| `reactivatedReason` | Razón de reactivación | Al eliminar plan activo |

---

## ⚠️ Validaciones Importantes

### Al Aplicar Plan (PATCH)

- ✅ Plan debe estar en estado `borrador`
- ✅ Usuario admin autenticado
- ✅ Plan existe en la base de datos

### Al Eliminar Plan (DELETE)

- ✅ Usuario admin autenticado
- ✅ Plan existe en la base de datos
- ⚠️ Si es activo, se busca plan anterior para reactivar
- ⚠️ Si no hay plan anterior, niño queda sin plan activo

---

## 🎓 Glosario

| Término | Definición |
|---------|------------|
| **Plan Base** | Plan principal (ej: Plan 1) sobre el cual se hace un refinamiento |
| **Refinamiento** | Plan derivado de un plan base con ajustes menores (ej: Plan 1.1) |
| **Reactivación** | Proceso de volver a marcar un plan como activo |
| **Progresión** | Avance de Plan 0 → 1 → 2 basado en eventos |
| **Historial** | Planes completados visibles para el usuario |
| **Auditoría** | Registro de cambios y responsables |

---

## 📞 Soporte

### Para Consultas Técnicas

- Ver código fuente en `app/api/consultas/plans/`
- Revisar ejemplos en `EJEMPLOS_PRACTICOS.md`
- Consultar diagramas en `DIAGRAMA_FLUJO.md`

### Para Entender el Sistema

1. Lee `FLUJO_ESTADOS_PLANES.md` sección por sección
2. Revisa diagramas en `DIAGRAMA_FLUJO.md`
3. Practica con ejemplos en `EJEMPLOS_PRACTICOS.md`

---

## 📝 Notas de Versión

### Versión 1.0 (2025-01-24)

**Implementado**:
- ✅ Estados de planes (borrador, activo, completado)
- ✅ Aplicación de planes con progresión automática
- ✅ Eliminación con reactivación inteligente
- ✅ Comparación de versiones con refinamientos
- ✅ Auditoría completa de cambios
- ✅ Documentación completa del sistema

**Pendiente**:
- Interfaz de usuario para visualizar historial
- Notificaciones al usuario cuando se aplica nuevo plan
- Reportes de progreso entre planes

---

## 🚀 Próximos Pasos

### Para Desarrolladores

1. **Implementar UI**: Interface para ver historial de planes
2. **Notificaciones**: Avisar al usuario cuando se aplica nuevo plan
3. **Comparación**: Mostrar diferencias entre planes
4. **Reportes**: Análisis de progreso entre versiones

### Para el Sistema

1. **Optimización**: Cache de planes activos
2. **Validación**: Tests automáticos de transiciones
3. **Monitoreo**: Logs de cambios de estado
4. **Analytics**: Métricas de uso de planes

---

**Última actualización**: 2025-01-24

**Mantenido por**: Equipo de Desarrollo Happy Dreamers
