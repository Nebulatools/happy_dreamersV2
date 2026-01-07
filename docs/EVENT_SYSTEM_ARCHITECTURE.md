# 🏗️ ARQUITECTURA DEL SISTEMA DE EVENTOS - Happy Dreamers

## 📋 RESUMEN EJECUTIVO

Happy Dreamers implementa una **arquitectura unificada de eventos** con `collection("events")` como única fuente de verdad.

### 🎯 DISEÑO SIMPLIFICADO (v5.0 - Enero 2025)
- **Colección única**: `collection("events")` es la fuente de verdad
- **Sincronización automática**: Con analytics para IA y análisis profesional
- **Array legacy eliminado**: `children.events[]` ya no se utiliza

---

## 🏛️ ARQUITECTURA UNIFICADA

### 🟦 Sistema Principal (`collection("events")`)

#### **Propósito**: Todas las operaciones de eventos
- ✅ Registro de eventos (POST)
- ✅ Consulta de eventos (GET)
- ✅ Edición de eventos (PUT/PATCH)
- ✅ Eliminación de eventos (DELETE)
- ✅ Dashboard y calendario
- ✅ Sistema de IA y análisis

#### **Almacenamiento**: Colección MongoDB separada
```typescript
events: {
  _id: ObjectId,
  childId: ObjectId,
  parentId: ObjectId,
  eventType: string,
  startTime: string,
  endTime?: string,
  duration?: number,
  emotionalState?: string,
  sleepDelay?: number,
  // ... campos específicos por tipo
  createdAt: string,
  updatedAt?: string
}
```

#### **API**: `/api/children/events`
- `GET` - Lee de `collection("events")`
- `POST` - Escribe a `collection("events")` + sync analytics
- `PUT` - Actualiza en `collection("events")` + sync analytics
- `PATCH` - Actualiza parcial en `collection("events")` + sync analytics
- `DELETE` - Elimina de `collection("events")` + sync analytics

#### **Componentes que usan**:
- `SleepButton.tsx`
- `FeedingButton.tsx`
- `MedicationButton.tsx`
- `ExtraActivityButton.tsx`
- `ManualEventModal.tsx`
- `EventEditRouter.tsx`
- Dashboard y Calendario
- Sistema de IA (RAG Chat)
- Análisis de sueño

---

### 🟨 Sistema Analítico (Sincronización automática)

#### **Propósito**: Análisis e IA profesional
- 📊 Sistema RAG/Chat
- 📈 Análisis de sueño
- 📋 Planes profesionales
- 🧠 Consultas e insights

#### **Almacenamiento**: Colección MongoDB separada
```typescript
events: {
  _id: string,
  childId: string,
  parentId: string,
  eventType: string,
  startTime: Date,
  // ... campos normalizados para análisis
}
```

#### **API**: `/api/events` 
- Principalmente para consulta/análisis
- Usado por sistema de IA y profesionales

#### **Servicios que usan**:
- `/api/consultas/analyze` - Análisis de consultas
- `/api/consultas/plans` - Generación de planes
- `/api/rag/chat` - Sistema RAG
- `/api/chat` - Chat con IA
- `/api/sleep-analysis/insights` - Análisis de sueño

---

## 🔄 SISTEMA DE SINCRONIZACIÓN

### 📡 Sincronización Automática

**Archivo**: `lib/event-sync.ts`

#### Funciones Principales:
- `syncEventToAnalyticsCollection()` - Sincroniza evento operativo → analítico  
- `removeEventFromAnalyticsCollection()` - Elimina evento del sistema analítico
- `syncChildEventsToAnalytics()` - Sincroniza todos los eventos de un niño
- `syncAllChildrenEvents()` - Migración masiva

### 🚀 Integración Automática

**En `POST /api/children/events`**:
```typescript
// 1. Crear evento en children.events[]
await db.collection("children").updateOne(
  { _id: new ObjectId(data.childId) },
  { $push: { events: event } }
)

// 2. Sincronizar automáticamente a analytics
await syncEventToAnalyticsCollection({
  _id: event._id,
  childId: event.childId,
  parentId: session.user.id,
  // ... todos los campos
})
```

**En `DELETE /api/children/events`**:
```typescript
// 1. Eliminar de children.events[]
await db.collection("children").updateOne(
  { _id: new ObjectId(childId) },
  { $pull: { events: { _id: eventId } } }
)

// 2. Sincronizar eliminación
await removeEventFromAnalyticsCollection(eventId)
```

---

## 📊 TIPOS DE EVENTOS UNIFICADOS

### 🎯 Definición Única en `lib/event-types.ts`

```typescript
export const eventTypes: EventType[] = [
  { id: "sleep", label: "Dormir", hasEndTime: true, hasSleepDelay: true },
  { id: "nap", label: "Siesta", hasEndTime: true },
  { id: "wake", label: "Despertar", hasEndTime: false },
  { id: "night_waking", label: "Despertar nocturno", hasEndTime: true, hasSleepDelay: true },
  { id: "feeding", label: "Alimentación", hasEndTime: false },
  { id: "night_feeding", label: "Tomas Nocturnas", hasEndTime: true, requiresDescription: true },
  { id: "medication", label: "Medicamentos", hasEndTime: false, requiresDescription: true },
  { id: "extra_activities", label: "Actividades Extra", hasEndTime: false, requiresDescription: true }
]
```

### ✅ Tipos Actualizados en `components/events/types.ts`
- ❌ Eliminado: `'note'` (no existía en definición principal)
- ✅ Agregado: `'night_feeding'` (faltaba en componentes)
- ✅ Consistente con definición principal

---

## 🔧 VALIDACIONES POR SISTEMA

### Sistema Operativo (Complejo)
- ✅ Validación de traslapes temporales
- ✅ Campos específicos por tipo de evento
- ✅ Rangos de duración apropiados
- ✅ Estados emocionales válidos

### Sistema Analítico (Simple)
- ✅ Campos requeridos básicos
- ✅ Autorización por usuario/admin
- ✅ Fechas válidas

---

## 🚨 PROBLEMAS RESUELTOS

### ❌ Problemas Identificados:
1. Hook `useEventForm` no utilizado → **ELIMINADO** ✅
2. Tipo `'note'` inexistente → **CORREGIDO** ✅  
3. Falta `'night_feeding'` → **AGREGADO** ✅
4. Sin sincronización automática → **IMPLEMENTADO** ✅

### ✅ Estado Actual:
- 🟦 Sistema operativo funcional
- 🟨 Sistema analítico funcional  
- 🔄 Sincronización automática activa
- 📝 Documentación completa

---

## 🎯 FLUJO DE DATOS (Simplificado v5.0)

```mermaid
graph TD
    A[Usuario registra/edita evento] --> B[API /api/children/events]
    B --> C[Validaciones]
    C --> D[collection('events')]
    D --> E[Sync a analytics]

    F[Dashboard/Calendario] --> G[GET /api/children/events]
    G --> D

    H[Sistema IA/Profesional] --> I[collection('events')]
    D --> I

    style A fill:#e1f5fe
    style D fill:#c8e6c9
    style I fill:#fff3e0
```

### Flujo simplificado:
1. **Todas las operaciones** (POST, PUT, PATCH, DELETE) van a `collection("events")`
2. **Sincronización automática** a analytics después de cada operación
3. **Una sola lectura** - todos leen de `collection("events")`
4. **Sin duplicación** - no hay array embebido `children.events[]`

---

## 📋 CHECKLIST DE MANTENIMIENTO

### 🔄 Operaciones Regulares:
- [ ] Verificar sincronización entre sistemas
- [ ] Monitorear logs de `event-sync.ts`
- [ ] Validar consistencia de datos

### 🧹 Limpieza Periódica:
- [ ] Ejecutar `syncAllChildrenEvents()` si hay inconsistencias
- [ ] Verificar eventos huérfanos en analytics
- [ ] Auditar tipos de eventos utilizados

### 📊 Monitoreo:
- [ ] Performance de queries en ambas colecciones
- [ ] Volumen de datos en `collection('events')`
- [ ] Logs de errores de sincronización

---

## 🚀 PRÓXIMOS PASOS

### Mejoras Futuras:
1. **Queue de sincronización** para alta concurrencia
2. **Validación cruzada** entre sistemas
3. **Dashboard de monitoreo** de sincronización
4. **Tests automatizados** para ambos sistemas

### Migración:
- Sistema ya preparado para datos existentes
- Función `syncAllChildrenEvents()` disponible
- Logs completos para auditoría

---

*Documentación actualizada el 2025-01-07 - Sistema v5.0 (Arquitectura Unificada)*