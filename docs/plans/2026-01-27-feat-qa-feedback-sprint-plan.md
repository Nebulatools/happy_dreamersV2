---
title: "feat: QA Feedback Sprint 2026-01-26"
type: feat
date: 2026-01-27
priority: high
estimated_items: 9
---

# QA Feedback Sprint 2026-01-26

## Overview

Resolver el feedback completo de QA para mejorar la experiencia de usuario en Happy Dreamers. Incluye correcciones de bugs, cambios de lógica de negocio, y ajustes de UX solicitados por Mariana.

## Problem Statement

El equipo de QA identificó 11 items durante testing:
- **Bug crítico**: Estado de botones de sueño guardado en localStorage (no sincroniza entre dispositivos)
- **Bug**: Edición de eventos no permite cambiar hora fin
- **UX**: Vistas de calendario muestran tabs innecesarios para padres
- **UX**: Falta botón de alimentación nocturna (caso edge de bebé que come dormido)
- **UI**: Layout y formateo de texto en vistas narrativas

---

## Technical Approach

### Fase 1: Infraestructura Crítica (ITEM 9 + 11)

#### ITEM 9: Estado de Botones por Niño

**Problema**: `localStorage` guarda estado por dispositivo, no por niño.

**Archivos a modificar**:

| Archivo | Cambio |
|---------|--------|
| `hooks/use-sleep-state.ts` | Eliminar lectura de localStorage, confiar 100% en API |
| `components/events/SleepButton.tsx` | Remover `sleepStorageKey` y `nightWakeStorageKey` |
| `app/api/children/[id]/current-sleep-state/route.ts` | Ya existe - ajustar lógica si es necesario |

**Lógica de estado**:
```typescript
// hooks/use-sleep-state.ts
function calculateSleepStatus(events: Event[]): SleepStatus {
  // Ordenar por startTime descendente
  const sorted = events.sort((a, b) =>
    new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
  )

  // Buscar último sleep/nap y último wake
  const lastSleepOrNap = sorted.find(e =>
    e.eventType === 'sleep' || e.eventType === 'nap'
  )
  const lastWake = sorted.find(e => e.eventType === 'wake')

  if (!lastSleepOrNap) return 'awake' // Nunca se ha dormido
  if (!lastWake) return 'sleeping' // Dormido sin despertar

  // Comparar timestamps
  const sleepTime = new Date(lastSleepOrNap.startTime).getTime()
  const wakeTime = new Date(lastWake.startTime).getTime()

  return sleepTime > wakeTime ? 'sleeping' : 'awake'
}
```

**Cambios en SleepButton.tsx**:
```typescript
// ANTES (líneas 63-64)
const sleepStorageKey = `pending_sleep_event_${childId}`
const nightWakeStorageKey = `pending_night_wake_${childId}`

// DESPUÉS
// Eliminar estas líneas y el useEffect que lee localStorage
// El estado viene de useSleepState que ya usa SWR + API
```

---

#### ITEM 11: Botón Alimentación Nocturna

**Crear**: `components/events/NightFeedingButton.tsx`

```typescript
// components/events/NightFeedingButton.tsx
interface NightFeedingButtonProps {
  childId: string
  childName: string
  onEventRegistered?: () => void
}

export function NightFeedingButton({
  childId,
  childName,
  onEventRegistered
}: NightFeedingButtonProps) {
  const [showModal, setShowModal] = useState(false)

  const handleConfirm = async (feedingData: FeedingData) => {
    // Marcar automáticamente como alimentación nocturna
    const eventData = {
      ...feedingData,
      isNightFeeding: true,
      feedingContext: 'during_sleep',
      childId,
    }

    await createEvent(eventData)
    // NO registrar wake - el niño sigue dormido
    onEventRegistered?.()
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowModal(true)}
        className="text-xs"
      >
        <Utensils className="h-3 w-3 mr-1" />
        Alimentación Nocturna
      </Button>

      <FeedingModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onConfirm={handleConfirm}
        childName={childName}
        // Preseleccionar opciones nocturnas
        defaultFeedingType="bottle"
        defaultBabyState="asleep"
      />
    </>
  )
}
```

**Modificar**: `components/events/EventRegistration.tsx`

```typescript
// Agregar botón visible solo cuando niño está dormido
const isSleeping = sleepState?.status === 'sleeping' || sleepState?.status === 'napping'

return (
  <div className="...">
    {/* Botones existentes */}
    <SleepButton ... />

    {/* Nuevo: Alimentación nocturna solo cuando duerme */}
    {isSleeping && (
      <NightFeedingButton
        childId={childId}
        childName={childName}
        onEventRegistered={onEventRegistered}
      />
    )}

    {/* Otros botones */}
  </div>
)
```

---

### Fase 2: Bug de Edición (ITEM 6)

**Problema**: Solo se puede editar hora inicio, no hora fin.

**Patrón a seguir** (de `SleepDelayModal.tsx` líneas 76-90):

```typescript
// Estado para hora fin
const [endDate, setEndDate] = useState<string>(() => {
  if (mode === "edit" && initialData?.endTime) {
    return format(new Date(initialData.endTime), "yyyy-MM-dd")
  }
  return format(getCurrentTime(), "yyyy-MM-dd")
})

const [endTimeValue, setEndTimeValue] = useState<string>(() => {
  if (mode === "edit" && initialData?.endTime) {
    return format(new Date(initialData.endTime), "HH:mm")
  }
  return format(getCurrentTime(), "HH:mm")
})

// En handleConfirm
if (mode === "edit" && endTimeValue) {
  const endDateTime = buildLocalDate(endDate, endTimeValue)
  editOptions.endTime = dateToTimestamp(endDateTime, timezone)
}
```

**Archivos a modificar**:

| Modal | Cambio |
|-------|--------|
| `components/events/FeedingModal.tsx` | Agregar campos endDate/endTime en modo edit |
| `components/events/MedicationModal.tsx` | Agregar campos endDate/endTime en modo edit |
| `components/events/ExtraActivityModal.tsx` | Agregar campos endDate/endTime en modo edit |
| `components/events/NightWakingModal.tsx` | Agregar campos endDate/endTime en modo edit |

---

### Fase 3: UX - Tabs por Rol (ITEM 5)

**Archivo**: `app/dashboard/calendar/page.tsx`

**Cambio** (líneas 1846-1874):

```typescript
// ANTES: Todos los tabs para usuarios
{userViewMode === "calendar" && (
  <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
    <Button onClick={() => handleViewChange("month")}>Mensual</Button>
    <Button onClick={() => handleViewChange("week")}>Semanal</Button>
    <Button onClick={() => handleViewChange("day")}>Diario</Button>
  </div>
)}

// DESPUÉS: Solo Diario y Semanal para padres
{userViewMode === "calendar" && (
  <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
    {/* Mensual SOLO para admin */}
    {isAdminView && (
      <Button onClick={() => handleViewChange("month")}>Mensual</Button>
    )}
    <Button onClick={() => handleViewChange("week")}>Semanal</Button>
    <Button onClick={() => handleViewChange("day")}>Diario</Button>
  </div>
)}

// TAMBIÉN: Remover toggle "Gráfico/Calendario" para padres (líneas 1828-1845)
{isAdminView && (
  <div className="flex items-center gap-1">
    <Button onClick={() => setUserViewMode("graph")}>Gráfico</Button>
    <Button onClick={() => setUserViewMode("calendar")}>Calendario</Button>
  </div>
)}
```

---

### Fase 4: UX - Vista Narrativa (ITEM 1, 8, 4)

#### ITEM 1: Home con Narrativa

**Archivo**: `app/dashboard/page.tsx`

```typescript
// Cambiar línea ~595
<NarrativeTimeline
  events={todayNarrativeEvents}
  childName={child.firstName}
  collapsible={true}
  initialLimit={3}  // CAMBIAR de 5 a 3
  showExpandButton={true}  // Agregar si no existe
  ...
/>

// Layout responsivo
<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
  {/* Narrativa */}
  <Card>
    <NarrativeTimeline ... />
  </Card>

  {/* Calendario del día */}
  <Card>
    <TodayCalendar ... />
  </Card>
</div>
```

#### ITEM 8: Reducir Texto en Bitácora

**Archivo**: `components/narrative/NarrativeTimeline.tsx` o función de formateo

```typescript
// ANTES
"8:30 AM - Alimentación: Biberón 120ml, 15 min"

// DESPUÉS
"8:30 AM - Biberón 120ml"

// Función de formateo
function formatEventText(event: Event): string {
  const time = format(new Date(event.startTime), "h:mm a")

  switch (event.eventType) {
    case 'feeding':
      const type = event.feedingType === 'bottle' ? 'Biberón'
                 : event.feedingType === 'breast' ? 'Pecho'
                 : 'Sólidos'
      const amount = event.feedingAmount
        ? `${event.feedingAmount}${event.feedingType === 'solids' ? 'gr' : 'ml'}`
        : ''
      return `${time} - ${type} ${amount}`.trim()

    case 'medication':
      return `${time} - ${event.medicationName}`

    // ... otros casos
  }
}
```

#### ITEM 4: Calendario sin Scroll

**Archivo**: `components/calendar/CalendarMain.tsx`

```css
/* Remover altura fija y overflow */
.calendar-container {
  /* ANTES */
  height: 600px;
  overflow-y: auto;

  /* DESPUÉS */
  height: auto;
  overflow: visible;
}
```

---

### Fase 5: Nuevo Componente (ITEM 10)

**Crear**: `components/calendar/PlanVsEventsCard.tsx`

```typescript
// components/calendar/PlanVsEventsCard.tsx
interface PlanVsEventsCardProps {
  plan: ChildPlan | null
  events: Event[]
  selectedDate: Date
  timezone: string
}

export function PlanVsEventsCard({
  plan,
  events,
  selectedDate,
  timezone
}: PlanVsEventsCardProps) {
  // Si no hay plan, solo mostrar eventos
  if (!plan) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Eventos del Día</CardTitle>
        </CardHeader>
        <CardContent>
          <EventsList events={events} />
        </CardContent>
      </Card>
    )
  }

  // Combinar plan con eventos cronológicamente
  const combined = combineScheduleWithEvents(plan.schedule, events, selectedDate)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Plan vs Eventos</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {/* Columna Plan */}
          <div>
            <h4 className="font-medium mb-2 text-gray-500">Plan</h4>
            {combined.map(item => (
              <div key={item.id} className="text-sm py-1">
                {item.planTime && `${item.planTime} ${item.planLabel}`}
              </div>
            ))}
          </div>

          {/* Columna Eventos */}
          <div>
            <h4 className="font-medium mb-2 text-gray-500">Real</h4>
            {combined.map(item => (
              <div key={item.id} className="text-sm py-1">
                {item.eventTime && `${item.eventTime} ${item.eventLabel}`}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
```

**Integrar en**: `app/dashboard/calendar/page.tsx`

```typescript
// Agregar ARRIBA del calendario
<PlanVsEventsCard
  plan={activePlan}
  events={dayEvents}
  selectedDate={selectedDate}
  timezone={userData?.timezone || DEFAULT_TIMEZONE}
/>

{/* Calendario existente */}
<CalendarMain ... />
```

---

### Fase 6: Consistencia de Iconos (ITEM 2)

**Archivo**: `app/dashboard/patients/child/[id]/page.tsx` (tab Eventos)

**Verificar que use**: `getEventIconConfig()` de `lib/icons/event-icons.ts`

```typescript
// Usar el registry centralizado
import { getEventIconConfig } from '@/lib/icons/event-icons'

// En el renderizado de eventos
const iconConfig = getEventIconConfig(event.eventType, event.feedingType)
return (
  <div className="flex items-center gap-2">
    <iconConfig.icon className={`h-4 w-4 ${iconConfig.color}`} />
    <span>{event.label}</span>
  </div>
)
```

---

## Acceptance Criteria

### Funcionales

- [ ] **ITEM 9**: Múltiples dispositivos ven el mismo estado del niño
- [ ] **ITEM 9**: Estado persiste después de cerrar/abrir app
- [ ] **ITEM 11**: Botón "Alimentación Nocturna" visible solo cuando niño duerme
- [ ] **ITEM 11**: Alimentación nocturna NO cambia estado del niño
- [ ] **ITEM 6**: Todos los eventos permiten editar hora fin en timeline
- [ ] **ITEM 5**: Padres solo ven tabs Diario y Semanal
- [ ] **ITEM 5**: Admin mantiene todos los tabs
- [ ] **ITEM 1**: Narrativa colapsada por default (3 eventos)
- [ ] **ITEM 1**: Layout responsivo (mobile vertical, web side-by-side)
- [ ] **ITEM 8**: Texto de eventos reducido (tipo + cantidad)
- [ ] **ITEM 4**: Calendario sin scroll interno
- [ ] **ITEM 10**: Card Plan vs Eventos visible arriba del calendario
- [ ] **ITEM 2**: Iconos de alimentación consistentes en admin

### No Funcionales

- [ ] Sin regresiones en funcionalidad existente
- [ ] Performance: Estado de sueño carga en <500ms
- [ ] Compatibilidad: Funciona en Chrome, Safari, Firefox

---

## Dependencies & Prerequisites

1. **Endpoint existente**: `/api/children/[id]/current-sleep-state` - revisar si necesita ajustes
2. **FeedingModal**: Ya soporta props para preseleccionar valores
3. **getEventIconConfig**: Verificar que existe en `lib/icons/`

---

## Risk Analysis

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| ITEM 9 rompe flujo existente | Media | Alto | Testing exhaustivo con múltiples dispositivos |
| Conflictos de edición simultánea | Baja | Medio | Timestamp de última modificación |
| Regresiones en modales | Media | Medio | Tests de cada modal en modo edit |

---

## Implementation Order

```
Fase 1 (Crítico)
├── ITEM 9: Estado por niño (4-6 horas)
└── ITEM 11: Botón alimentación nocturna (2-3 horas)

Fase 2 (Bug)
└── ITEM 6: Edición hora fin (3-4 horas, 4 modales)

Fase 3 (UX Rápido)
└── ITEM 5: Tabs por rol (1 hora)

Fase 4 (UI/UX)
├── ITEM 1: Vista narrativa home (2-3 horas)
├── ITEM 8: Reducir texto (1 hora)
└── ITEM 4: Calendario sin scroll (1 hora)

Fase 5 (Nuevo)
└── ITEM 10: PlanVsEventsCard (3-4 horas)

Fase 6 (Polish)
└── ITEM 2: Iconos consistentes (1 hora)

Verificación
├── ITEM 3: Siestas lavanda (verificar)
└── ITEM 7: Estilos nocturnos (verificar)
```

---

## References

### Internal References
- Spec completo: `docs/specs/current/SPRINT-QA-FEEDBACK-2026-01-26.md`
- Patrones de eventos: `.claude/rules/events.md`
- Patrones de modales: `.claude/rules/patterns.md`
- Manejo de fechas: `.claude/rules/datetime.md`
- Session fixes anterior: `docs/SESSION_2026-01-05_BETATESTING_FIXES.md`

### Key Files
- `hooks/use-sleep-state.ts:49-82` - Lógica actual de localStorage
- `components/events/SleepButton.tsx:63-64` - Keys de localStorage
- `app/api/children/[id]/current-sleep-state/route.ts:70-156` - Endpoint existente
- `components/events/SleepDelayModal.tsx:76-90` - Patrón de edición endTime
- `app/dashboard/calendar/page.tsx:1846-1874` - Tabs de usuario

---

**Última actualización:** 2026-01-27
