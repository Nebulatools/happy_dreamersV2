# 📚 Documentación del Sistema de Planes - Happy Dreamers

Documentación completa del sistema de gestión de planes personalizados para niños.

---

## 📂 Estructura de la Documentación

Esta carpeta contiene toda la documentación técnica y práctica del sistema de planes de Happy Dreamers:

### 1. **FLUJO_GENERACION_PLAN_1.md** 🆕 ⭐
Documentación completa del flujo de generación del Plan 1 (basado en eventos).

**Contenido**:
- Visión general del Plan 1 vs Plan 0
- Entrada de datos y parámetros
- Procesamiento de eventos desde el Plan 0
- Cálculo detallado de estadísticas (sueño, siestas, comidas)
- Integración con RAG (docs/RAG_SUMMARY_OPTIMIZED.md)
- Generación con IA (GPT-4)
- Estructura completa del plan generado
- Ejemplo práctico completo (Sofía, 15 meses)
- Diagrama de flujo completo
- Estrategia progresiva de ajustes

**Cuándo usar**: Para entender cómo se genera un plan basado en eventos reales y cómo funciona la progresión de Plan 0 → Plan 1.

---

### 2. **FLUJO_ESTADOS_PLANES.md** 📖
Documentación principal del sistema de estados de planes.

**Contenido**:
- Resumen ejecutivo del sistema
- Descripción detallada de cada estado (borrador, activo, completado)
- Flujo de transiciones entre estados
- Casos de uso con ejemplos de datos
- Implementación técnica de endpoints
- Validaciones y reglas de negocio
- Referencias técnicas

**Cuándo usar**: Para entender el ciclo de vida de los planes y las transiciones de estado (borrador → activo → completado).

---

### 3. **EJEMPLOS_PRACTICOS.md** 💡
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

### 4. **DIAGRAMA_FLUJO.md** 📊
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
3. **Entiende Plan 1**: `FLUJO_GENERACION_PLAN_1.md` (sección "Visión General")
4. **Finalmente practica**: `EJEMPLOS_PRACTICOS.md` (Caso 1 y Caso 2)

### Para Desarrolladores Experimentados

1. **Consulta rápida**: `FLUJO_ESTADOS_PLANES.md` → Sección específica
2. **Ver generación Plan 1**: `FLUJO_GENERACION_PLAN_1.md` → Sección específica
3. **Ver código**: `EJEMPLOS_PRACTICOS.md` → Caso específico
4. **Visualizar flujo**: `DIAGRAMA_FLUJO.md` → Diagrama correspondiente

### Para Debugging

1. **Ver estado actual**: `DIAGRAMA_FLUJO.md` → Matriz de transiciones
2. **Verificar lógica**: `FLUJO_ESTADOS_PLANES.md` → Implementación técnica
3. **Ver cálculos**: `FLUJO_GENERACION_PLAN_1.md` → Cálculo de Estadísticas
4. **Comparar con ejemplo**: `EJEMPLOS_PRACTICOS.md` → Caso similar

---

## 🔑 Conceptos Clave

### Estados de Planes

| Estado | Descripción | Visible Usuario | Editable |
|--------|-------------|-----------------|----------|
| `borrador` | Plan recién generado | ❌ No | ✅ Sí |
| `active` | Plan en uso actual | ✅ Sí | ⚠️ Solo admin |
| `superseded` | Plan anterior reemplazado | ✅ Sí (historial) | ❌ No |

### Tipos de Planes

| Tipo | Código | Basado en | Versión | Documentación |
|------|--------|-----------|---------|---------------|
| Inicial | `initial` | Survey + Stats + RAG | 0 | - |
| Eventos | `event_based` | Eventos + Plan anterior + RAG | 1, 2, 3... | `FLUJO_GENERACION_PLAN_1.md` |
| Refinamiento | `transcript_refinement` | Transcript + Plan base | 1.1, 2.1... | - |

### Reglas Fundamentales

1. **Solo un plan activo**: Garantizado por el sistema
2. **Progresión automática**: Al aplicar plan, anterior → superseded
3. **Estrategia progresiva**: Ajustes graduales hacia horarios ideales (NO saltos bruscos)
4. **Auditoría completa**: Todos los cambios registrados

---

## 📌 Endpoints Principales

### Generar Plan
```
POST /api/consultas/plans
Body: { userId, childId, planType }
```

### Validar Posibilidad de Generar Plan
```
PUT /api/consultas/plans
Body: { userId, childId, planType }
```

### Aplicar Plan (borrador → active)
```
PATCH /api/consultas/plans
Body: { planId, childId, userId }
```

### Obtener Planes
```
GET /api/consultas/plans?childId=[id]&userId=[id]
```

### Obtener Plan Activo (para padres)
```
GET /api/children/[id]/active-plan
```

---

## 🔄 Flujo Típico

### Flujo Normal (Usuario Nuevo)

```
1. Admin genera Plan 0 → borrador
2. Admin valida y aplica Plan 0 → active
3. Usuario ve Plan 0 y sigue horarios
4. Se registran eventos durante 7+ días
5. Admin valida posibilidad de Plan 1 (PUT endpoint)
6. Admin genera Plan 1 → borrador
7. Admin aplica Plan 1 → active
   - Plan 0 → superseded (automático)
8. Usuario ve Plan 1
```

### Flujo con Refinamiento

```
1. Plan 1 está activo
2. Hay consulta médica con transcript
3. Admin genera Plan 1.1 → borrador
4. Admin aplica Plan 1.1 → active
   - Plan 1 → superseded (automático)
5. Usuario ve Plan 1.1
```

### Estrategia Progresiva (Plan 0 → Plan 1)

```
Plan 0 (Inicial):
├─ Usa estadísticas históricas completas
├─ Identifica horarios actuales vs horarios ideales (RAG)
└─ Da PRIMER PASO suave hacia ideal (no salto directo)

Plan 1 (Basado en Eventos):
├─ Analiza eventos desde Plan 0
├─ Calcula estadísticas del período
├─ Evalúa progreso hacia ideal
└─ Da SIGUIENTE PASO progresivo (continúa avanzando)

Ejemplo:
- Niño se duerme a las 22:00 (actual)
- Ideal es 19:30 (RAG)
- Plan 0 propone: 21:00 (primer paso)
- Eventos muestran tolerancia a 21:00
- Plan 1 propone: 20:30 (siguiente paso)
- Eventual Plan 2 propone: 20:00 o 19:30 (objetivo)
```

---

## 🛠️ Implementación Técnica

### Archivos Principales

| Archivo | Función |
|---------|---------|
| `app/api/consultas/plans/route.ts` | POST - Generar planes, PUT - Validar, PATCH - Aplicar |
| `app/api/children/[id]/active-plan/route.ts` | GET - Obtener plan activo para padres |
| `lib/sleep-calculations.ts` | Cálculo de estadísticas de sueño |
| `lib/plan-policies.ts` | Políticas de ajuste progresivo |
| `docs/RAG_SUMMARY_OPTIMIZED.md` | Horarios ideales por edad |
| `types/models.ts` | Definición de `ChildPlan` interface |

### Función Clave: Procesamiento de Estadísticas

```typescript
// Ver detalles completos en FLUJO_GENERACION_PLAN_1.md
const stats = processSleepStatistics(events, eventsFromDate)

// Métricas calculadas:
// - avgSleepDuration: Duración promedio sueño nocturno
// - avgWakeTime: Hora promedio de despertar
// - avgBedtime: Hora promedio de acostarse
// - napStats: Estadísticas de siestas (count, duration, typicalTime)
// - feedingStats: Comidas típicas (breakfast, lunch, snack, dinner)
// - totalWakeups: Despertares nocturnos
```

### Integración RAG

```typescript
// Leer horarios ideales según edad del niño
const ragContext = await searchRAGForPlan(ageInMonths)

// Fuente: docs/RAG_SUMMARY_OPTIMIZED.md
// Rangos: 0-3, 3-6, 6, 9, 13-15, 15-18, 30+, 36-60 meses
// Incluye: wakeTime, bedtime, naps, awakeWindows, notes
```

---

## 📊 Estadísticas del Sistema

### Campos de Auditoría

| Campo | Descripción | Cuándo se registra |
|-------|-------------|--------------------|
| `createdAt` | Fecha de creación | Al generar plan |
| `createdBy` | Admin que creó | Al generar plan |
| `updatedAt` | Última actualización | Al modificar plan |
| `activatedAt` | Fecha de activación | Al aplicar plan |
| `activatedBy` | Admin que activó | Al aplicar plan |

---

## ⚠️ Validaciones Importantes

### Al Generar Plan (POST)

- ✅ Usuario admin autenticado
- ✅ Plan 0: No debe existir plan inicial previo
- ✅ Plan N: Deben existir eventos desde el último plan
- ✅ Plan N.1: Debe existir transcript de consulta

### Al Aplicar Plan (PATCH)

- ✅ Plan debe estar en estado `borrador`
- ✅ Usuario admin autenticado
- ✅ Plan existe en la base de datos
- ✅ Se marcan planes anteriores como `superseded`

### Al Validar Posibilidad (PUT)

- ✅ Usuario autenticado (admin o padre)
- ✅ Para Plan N: Verifica eventos disponibles
- ✅ Para Plan N.1: Verifica transcript disponible
- ✅ Retorna `canGenerate: true/false` con razón

---

## 🎓 Glosario

| Término | Definición |
|---------|------------|
| **Plan Base** | Plan principal (ej: Plan 1) sobre el cual se hace un refinamiento |
| **Refinamiento** | Plan derivado de un plan base con ajustes menores (ej: Plan 1.1) |
| **Progresión** | Avance gradual de Plan 0 → 1 → 2 basado en eventos |
| **Estrategia Progresiva** | Ajustes graduales hacia horarios ideales, NO saltos directos |
| **RAG** | Retrieval-Augmented Generation - horarios ideales según edad |
| **Historial** | Planes superseded visibles para el usuario |
| **Auditoría** | Registro de cambios y responsables |

---

## 📞 Soporte

### Para Consultas Técnicas

- Ver código fuente en `app/api/consultas/plans/`
- Revisar ejemplos en `EJEMPLOS_PRACTICOS.md`
- Consultar diagramas en `DIAGRAMA_FLUJO.md`
- Ver flujo Plan 1 en `FLUJO_GENERACION_PLAN_1.md`

### Para Entender el Sistema

1. Lee `FLUJO_ESTADOS_PLANES.md` sección por sección
2. Lee `FLUJO_GENERACION_PLAN_1.md` para entender generación de planes
3. Revisa diagramas en `DIAGRAMA_FLUJO.md`
4. Practica con ejemplos en `EJEMPLOS_PRACTICOS.md`

---

## 📝 Notas de Versión

### Versión 2.0 (2025-01-27)

**Actualizado**:
- ✅ Limpieza de documentación (eliminados archivos desactualizados)
- ✅ Nuevo documento: `FLUJO_GENERACION_PLAN_1.md` con flujo completo
- ✅ Actualización de README con nueva estructura
- ✅ Documentación de estrategia progresiva
- ✅ Integración RAG optimizada

### Versión 1.0 (2025-01-24)

**Implementado**:
- ✅ Estados de planes (borrador, active, superseded)
- ✅ Aplicación de planes con progresión automática
- ✅ Comparación de versiones con refinamientos
- ✅ Auditoría completa de cambios
- ✅ Documentación completa del sistema

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

**Última actualización**: 2025-01-27

**Mantenido por**: Equipo de Desarrollo Happy Dreamers
