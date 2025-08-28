# 🏗️ ARQUITECTURA DEL SISTEMA DE EVENTOS - Happy Dreamers

## 📋 RESUMEN EJECUTIVO

Happy Dreamers implementa una **arquitectura dual de eventos** para separar operaciones diarias de análisis profesional.

### 🎯 DISEÑO INTENCIONAL
- **Sistema Operativo**: Para CRUD diario de eventos
- **Sistema Analítico**: Para IA, análisis profesional y consultas

---

## 🏛️ ARQUITECTURA DUAL

### 🟦 Sistema Operativo (`children.events[]`)

#### **Propósito**: Operaciones diarias de eventos
- ✅ Registro rápido de eventos 
- ✅ Dashboard y calendario
- ✅ Edición y eliminación
- ✅ Validaciones de negocio

#### **Almacenamiento**: Array embebido en `children`
```typescript
children: {
  _id: ObjectId,
  firstName: string,
  events: [
    {
      _id: string,
      eventType: string,
      startTime: string,
      // ... campos específicos
    }
  ]
}
```

#### **API**: `/api/children/events`
- `GET` - Obtener eventos de un niño
- `POST` - Crear nuevo evento
- `PUT` - Actualizar evento completo  
- `PATCH` - Actualización parcial
- `DELETE` - Eliminar evento

#### **Componentes que usan**:
- `SleepButton.tsx`
- `FeedingButton.tsx` 
- `MedicationButton.tsx`
- `ExtraActivityButton.tsx`
- `ManualEventModal.tsx`
- Dashboard y Calendario

---

### 🟨 Sistema Analítico (`collection("events")`)

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

## 🎯 FLUJO DE DATOS

```mermaid
graph TD
    A[Usuario registra evento] --> B[POST /api/children/events]
    B --> C[Validaciones operativas]
    C --> D[Guardar en children.events[]]
    D --> E[Sincronizar a collection('events')]
    
    F[Sistema IA/Profesional] --> G[GET /api/events]
    G --> H[collection('events')]
    
    I[Dashboard/Calendario] --> J[GET /api/children/events]
    J --> K[children.events[]]
    
    E --> H
    
    style A fill:#e1f5fe
    style D fill:#c8e6c9
    style H fill:#fff3e0
```

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

*Documentación generada el 2025-01-28 - Sistema v4.0*