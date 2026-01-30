# feat: Vista Narrativa, Taxonomia Visual y Split Screen Admin

## Overview

Transformar la experiencia de lectura de la bitacora de eventos de bloques de calendario a una **narrativa fluida tipo feed** que permite a admins y padres entender "que paso hoy" de un vistazo.

**Alcance MVP:**
1. **Item 1:** Vista Narrativa de Bitacora (Timeline)
2. **Item 2:** Taxonomia Visual (Alimentacion y Sueno)
3. **Item 3:** Vista Dual Split Screen (Admin)

**Diferido:** Item 4 - Panel de Diagnostico AI (siguiente sprint)

---

## Problem Statement

### Problemas Actuales
1. Los bloques de calendario fragmentan visualmente el sueno nocturno
2. Iconografia generica (`Utensils`) no diferencia tipos de alimentacion (pecho vs biberon vs solidos)
3. Admin no puede leer rapidamente "que paso" - debe hacer hover en cada bloque
4. No hay sincronizacion visual entre calendario y lista de eventos

### Usuarios Afectados
- **Admin (Mariana):** Necesita revisar bitacoras de multiples pacientes rapidamente
- **Padres:** Quieren entender el resumen del dia sin scroll horizontal

---

## Proposed Solution

### Arquitectura de Alto Nivel

```
+------------------------------------------------------------------+
|                        ADMIN - BITACORA DIARIA                    |
+--------------------------------+---------------------------------+
|         CALENDARIO (50%)       |        NARRATIVA (50%)          |
|  +---------------------------+ | +-----------------------------+ |
|  | CalendarDayView           | | | NarrativeTimeline           | |
|  | (con taxonomia mejorada)  | | | (tarjetas cronologicas)     | |
|  +---------------------------+ | +-----------------------------+ |
|              ^                 |              ^                  |
|              |    MIRRORING    |              |                  |
|              +-------+---------+------+-------+                  |
|                      |                |                          |
|              selectedEventId   scrollIntoView                    |
|              (SplitScreenContext)                                |
+------------------------------------------------------------------+

+------------------------------------------------------------------+
|                        PADRES - HOME                              |
+------------------------------------------------------------------+
|  +------------------------------------------------------------+  |
|  | NarrativeTimeline (limit=5, collapsible)                   |  |
|  | [Ver todo] / [Colapsar]                                    |  |
|  +------------------------------------------------------------+  |
+------------------------------------------------------------------+
```

---

## Technical Approach

### Fase 1: Sistema de Iconos y Taxonomia Visual

**Archivos a crear:**
- `lib/icons/event-icons.ts` - Registry de iconos por tipo

**Archivos a modificar:**
- `components/calendar/EventGlobe.tsx:117-134` - Aplicar nuevos iconos
- `components/calendar/EventBlock.tsx:216-247` - Aplicar nuevos iconos
- `components/calendar/SleepSessionBlock.tsx` - Verificar layering existente

#### Mapa de Iconos Final

| Tipo Evento | Icono Lucide | Color Tailwind | Hex |
|-------------|--------------|----------------|-----|
| `sleep` | `Moon` | `text-indigo-500` | #6366f1 |
| `nap` | `CloudMoon` | `text-violet-400` | #a78bfa |
| `wake` | `Sun` | `text-yellow-500` | #eab308 |
| `night_waking` | `Baby` | `text-purple-500` | #a855f7 |
| `feeding` (breast) | `Heart` | `text-pink-500` | #ec4899 |
| `feeding` (bottle) | `Milk` | `text-sky-500` | #0ea5e9 |
| `feeding` (solids) | `UtensilsCrossed` | `text-emerald-500` | #10b981 |
| `medication` | `Pill` | `text-blue-500` | #3b82f6 |
| `extra_activities` | `Activity` | `text-orange-500` | #f97316 |
| `note` | `StickyNote` | `text-amber-500` | #f59e0b |

**Codigo:**

```typescript
// lib/icons/event-icons.ts
import {
  Moon, CloudMoon, Sun, Baby, Heart, Milk,
  UtensilsCrossed, Pill, Activity, StickyNote,
  type LucideIcon
} from 'lucide-react'

export type EventIconType =
  | 'sleep' | 'nap' | 'wake' | 'night_waking'
  | 'feeding_breast' | 'feeding_bottle' | 'feeding_solids'
  | 'medication' | 'extra_activities' | 'note'

interface IconConfig {
  icon: LucideIcon
  color: string
  bgColor: string
  label: string
}

export const EVENT_ICONS: Record<EventIconType, IconConfig> = {
  sleep: { icon: Moon, color: 'text-indigo-500', bgColor: 'bg-indigo-100', label: 'Sueno nocturno' },
  nap: { icon: CloudMoon, color: 'text-violet-400', bgColor: 'bg-violet-100', label: 'Siesta' },
  wake: { icon: Sun, color: 'text-yellow-500', bgColor: 'bg-yellow-100', label: 'Despertar' },
  night_waking: { icon: Baby, color: 'text-purple-500', bgColor: 'bg-purple-100', label: 'Despertar nocturno' },
  feeding_breast: { icon: Heart, color: 'text-pink-500', bgColor: 'bg-pink-100', label: 'Lactancia' },
  feeding_bottle: { icon: Milk, color: 'text-sky-500', bgColor: 'bg-sky-100', label: 'Biberon' },
  feeding_solids: { icon: UtensilsCrossed, color: 'text-emerald-500', bgColor: 'bg-emerald-100', label: 'Solidos' },
  medication: { icon: Pill, color: 'text-blue-500', bgColor: 'bg-blue-100', label: 'Medicamento' },
  extra_activities: { icon: Activity, color: 'text-orange-500', bgColor: 'bg-orange-100', label: 'Actividad' },
  note: { icon: StickyNote, color: 'text-amber-500', bgColor: 'bg-amber-100', label: 'Nota' },
}

export function getEventIconType(event: { eventType: string, feedingType?: string }): EventIconType {
  if (event.eventType === 'feeding') {
    switch (event.feedingType) {
      case 'breast': return 'feeding_breast'
      case 'bottle': return 'feeding_bottle'
      case 'solids': return 'feeding_solids'
      default: return 'feeding_bottle'
    }
  }
  return event.eventType as EventIconType
}
```

---

### Fase 2: Componente NarrativeCard

**Archivos a crear:**
- `components/narrative/NarrativeCard.tsx`
- `components/narrative/NarrativeTimeline.tsx`
- `lib/narrative/generate-narrative.ts`

#### Generacion de Narrativa

```typescript
// lib/narrative/generate-narrative.ts
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface NarrativeEvent {
  eventType: string
  startTime: string
  endTime?: string
  duration?: number
  feedingType?: string
  feedingAmount?: number
  feedingDuration?: number
  medicationName?: string
  medicationDose?: string
  activityDescription?: string
  noteText?: string
  emotionalState?: string
}

export function generateNarrative(childName: string, event: NarrativeEvent): string {
  const hora = format(new Date(event.startTime), 'HH:mm')

  switch (event.eventType) {
    case 'sleep':
      if (event.endTime) {
        const horaFin = format(new Date(event.endTime), 'HH:mm')
        return `${childName} durmio de ${hora} a ${horaFin}`
      }
      return `${childName} se durmio a las ${hora}`

    case 'nap':
      if (event.duration) {
        return `${childName} tomo una siesta de ${event.duration} minutos`
      }
      return `${childName} esta tomando una siesta`

    case 'wake':
      return `${childName} desperto a las ${hora}`

    case 'night_waking':
      if (event.duration) {
        return `${childName} desperto en la noche por ${event.duration} minutos`
      }
      return `${childName} desperto en la noche`

    case 'feeding':
      return generateFeedingNarrative(childName, event)

    case 'medication':
      if (event.medicationName && event.medicationDose) {
        return `${childName} tomo ${event.medicationDose} de ${event.medicationName}`
      }
      return `${childName} tomo su medicamento`

    case 'extra_activities':
      if (event.activityDescription) {
        return `${childName} ${event.activityDescription}`
      }
      return `${childName} realizo una actividad`

    case 'note':
      return event.noteText || 'Nota registrada'

    default:
      return `Evento registrado para ${childName}`
  }
}

function generateFeedingNarrative(childName: string, event: NarrativeEvent): string {
  const { feedingType, feedingAmount, feedingDuration } = event

  switch (feedingType) {
    case 'breast':
      if (feedingDuration) {
        return `${childName} tomo pecho por ${feedingDuration} minutos`
      }
      return `${childName} tomo pecho`

    case 'bottle':
      if (feedingAmount) {
        return `${childName} tomo ${feedingAmount} ml de biberon`
      }
      return `${childName} tomo biberon`

    case 'solids':
      if (feedingAmount) {
        return `${childName} comio ${feedingAmount} gr de solidos`
      }
      return `${childName} comio solidos`

    default:
      return `${childName} se alimento`
  }
}
```

#### Componente NarrativeCard

```typescript
// components/narrative/NarrativeCard.tsx
'use client'

import { forwardRef } from 'react'
import { format } from 'date-fns'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EVENT_ICONS, getEventIconType } from '@/lib/icons/event-icons'
import { generateNarrative } from '@/lib/narrative/generate-narrative'

interface NarrativeCardProps {
  event: EventData
  childName: string
  isHighlighted?: boolean
  onClick?: () => void
  onEdit?: () => void
  className?: string
}

export const NarrativeCard = forwardRef<HTMLDivElement, NarrativeCardProps>(
  ({ event, childName, isHighlighted, onClick, onEdit, className }, ref) => {
    const iconType = getEventIconType(event)
    const config = EVENT_ICONS[iconType]
    const Icon = config.icon
    const narrative = generateNarrative(childName, event)
    const timeDisplay = formatTimeDisplay(event)

    return (
      <div
        ref={ref}
        onClick={onClick}
        className={cn(
          'flex items-start gap-3 p-3 rounded-lg cursor-pointer',
          'transition-all duration-300 hover:bg-muted/50',
          isHighlighted && 'animate-highlight-fade ring-2 ring-primary/50',
          className
        )}
      >
        {/* Icono circular */}
        <div className={cn(
          'flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center',
          config.bgColor
        )}>
          <Icon className={cn('h-5 w-5', config.color)} />
        </div>

        {/* Contenido */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">
            {narrative}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {timeDisplay}
          </p>
        </div>

        {/* Chevron para editar */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onEdit?.()
          }}
          className="flex-shrink-0 p-1 rounded hover:bg-muted"
        >
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    )
  }
)

function formatTimeDisplay(event: EventData): string {
  const start = format(new Date(event.startTime), 'HH:mm')
  if (event.endTime) {
    const end = format(new Date(event.endTime), 'HH:mm')
    return `${start} - ${end}`
  }
  return start
}
```

---

### Fase 3: NarrativeTimeline Component

```typescript
// components/narrative/NarrativeTimeline.tsx
'use client'

import { useRef, forwardRef, useImperativeHandle, useState } from 'react'
import { NarrativeCard } from './NarrativeCard'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronUp } from 'lucide-react'

export interface NarrativeTimelineRef {
  scrollToEvent: (eventId: string) => void
  highlightEvent: (eventId: string) => void
}

interface NarrativeTimelineProps {
  events: EventData[]
  childName: string
  highlightedEventId?: string | null
  isLoading?: boolean
  collapsible?: boolean
  initialLimit?: number
  onEventClick?: (event: EventData) => void
  onEventEdit?: (event: EventData) => void
}

export const NarrativeTimeline = forwardRef<NarrativeTimelineRef, NarrativeTimelineProps>(
  ({
    events,
    childName,
    highlightedEventId,
    isLoading,
    collapsible = false,
    initialLimit = 5,
    onEventClick,
    onEventEdit
  }, ref) => {
    const [isExpanded, setIsExpanded] = useState(false)
    const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map())

    useImperativeHandle(ref, () => ({
      scrollToEvent: (eventId: string) => {
        const element = itemRefs.current.get(eventId)
        element?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      },
      highlightEvent: (eventId: string) => {
        // El highlight se maneja via prop highlightedEventId
      }
    }))

    // Ordenamiento cronologico inverso
    const sortedEvents = [...events].sort(
      (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    )

    const displayedEvents = collapsible && !isExpanded
      ? sortedEvents.slice(0, initialLimit)
      : sortedEvents

    const hasMore = collapsible && sortedEvents.length > initialLimit

    if (isLoading) {
      return <NarrativeTimelineSkeleton count={initialLimit} />
    }

    if (events.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          No hay eventos registrados hoy
        </div>
      )
    }

    return (
      <div className="space-y-1">
        {displayedEvents.map((event) => (
          <NarrativeCard
            key={event._id}
            ref={(node) => {
              if (node) itemRefs.current.set(event._id!, node)
              else itemRefs.current.delete(event._id!)
            }}
            event={event}
            childName={childName}
            isHighlighted={highlightedEventId === event._id}
            onClick={() => onEventClick?.(event)}
            onEdit={() => onEventEdit?.(event)}
          />
        ))}

        {hasMore && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full mt-2"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4 mr-2" />
                Colapsar
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-2" />
                Ver todo ({sortedEvents.length - initialLimit} mas)
              </>
            )}
          </Button>
        )}
      </div>
    )
  }
)

function NarrativeTimelineSkeleton({ count }: { count: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 p-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/4" />
          </div>
        </div>
      ))}
    </div>
  )
}
```

---

### Fase 4: Split Screen Layout y Mirroring

**Archivos a crear:**
- `context/SplitScreenContext.tsx`
- `components/bitacora/SplitScreenBitacora.tsx`
- `hooks/use-highlight.ts`

#### Context para Sincronizacion

```typescript
// context/SplitScreenContext.tsx
'use client'

import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react'

interface SplitScreenContextType {
  selectedEventId: string | null
  highlightedEventId: string | null
  selectEvent: (eventId: string, source: 'calendar' | 'narrative') => void
  clearSelection: () => void
}

const SplitScreenContext = createContext<SplitScreenContextType | null>(null)

export function SplitScreenProvider({ children }: { children: ReactNode }) {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [highlightedEventId, setHighlightedEventId] = useState<string | null>(null)
  const highlightTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const selectEvent = useCallback((eventId: string, source: 'calendar' | 'narrative') => {
    setSelectedEventId(eventId)
    setHighlightedEventId(eventId)

    // Clear previous timeout
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current)
    }

    // Fade out highlight after 6 seconds
    highlightTimeoutRef.current = setTimeout(() => {
      setHighlightedEventId(null)
    }, 6000)
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedEventId(null)
    setHighlightedEventId(null)
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current)
    }
  }, [])

  return (
    <SplitScreenContext.Provider value={{
      selectedEventId,
      highlightedEventId,
      selectEvent,
      clearSelection
    }}>
      {children}
    </SplitScreenContext.Provider>
  )
}

export function useSplitScreen() {
  const context = useContext(SplitScreenContext)
  if (!context) {
    throw new Error('useSplitScreen must be used within SplitScreenProvider')
  }
  return context
}
```

#### Split Screen Component

```typescript
// components/bitacora/SplitScreenBitacora.tsx
'use client'

import { useRef, useEffect } from 'react'
import { SplitScreenProvider, useSplitScreen } from '@/context/SplitScreenContext'
import { CalendarDayView } from '@/components/calendar/CalendarDayView'
import { NarrativeTimeline, NarrativeTimelineRef } from '@/components/narrative/NarrativeTimeline'
import { Card } from '@/components/ui/card'

interface SplitScreenBitacoraProps {
  events: EventData[]
  sleepSessions: SleepSession[]
  childName: string
  selectedDate: Date
  onEventClick?: (event: EventData) => void
  onCreateEvent?: (time: Date) => void
}

export function SplitScreenBitacora(props: SplitScreenBitacoraProps) {
  return (
    <SplitScreenProvider>
      <SplitScreenContent {...props} />
    </SplitScreenProvider>
  )
}

function SplitScreenContent({
  events,
  sleepSessions,
  childName,
  selectedDate,
  onEventClick,
  onCreateEvent
}: SplitScreenBitacoraProps) {
  const { selectedEventId, highlightedEventId, selectEvent } = useSplitScreen()
  const narrativeRef = useRef<NarrativeTimelineRef>(null)
  const calendarRef = useRef<HTMLDivElement>(null)

  // Scroll narrativa cuando se selecciona desde calendario
  useEffect(() => {
    if (selectedEventId) {
      narrativeRef.current?.scrollToEvent(selectedEventId)
    }
  }, [selectedEventId])

  const handleCalendarEventClick = (event: EventData) => {
    selectEvent(event._id!, 'calendar')
  }

  const handleNarrativeEventClick = (event: EventData) => {
    selectEvent(event._id!, 'narrative')
    // TODO: Scroll calendario al bloque correspondiente
  }

  const handleEventEdit = (event: EventData) => {
    onEventClick?.(event)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 h-[calc(100vh-200px)]">
      {/* Panel Calendario */}
      <Card ref={calendarRef} className="h-full overflow-auto border-r-0 lg:border-r rounded-r-none lg:rounded-r-lg">
        <div className="p-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Calendario</h3>
          <CalendarDayView
            events={events}
            sleepSessions={sleepSessions}
            selectedDate={selectedDate}
            highlightedEventId={highlightedEventId}
            onEventClick={handleCalendarEventClick}
            onCreateEvent={onCreateEvent}
          />
        </div>
      </Card>

      {/* Panel Narrativa */}
      <Card className="h-full overflow-auto rounded-l-none lg:rounded-l-lg">
        <div className="p-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Bitacora</h3>
          <NarrativeTimeline
            ref={narrativeRef}
            events={events}
            childName={childName}
            highlightedEventId={highlightedEventId}
            onEventClick={handleNarrativeEventClick}
            onEventEdit={handleEventEdit}
          />
        </div>
      </Card>
    </div>
  )
}
```

---

### Fase 5: Animacion de Highlight

**Agregar a tailwind.config.js:**

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      keyframes: {
        'highlight-fade': {
          '0%': {
            backgroundColor: 'rgb(254 249 195)', // yellow-100
            boxShadow: '0 0 0 2px rgb(250 204 21)' // yellow-400
          },
          '20%': {
            backgroundColor: 'rgb(254 249 195)',
            boxShadow: '0 0 0 2px rgb(250 204 21)'
          },
          '100%': {
            backgroundColor: 'transparent',
            boxShadow: '0 0 0 0 transparent'
          }
        }
      },
      animation: {
        'highlight-fade': 'highlight-fade 6s ease-out forwards'
      }
    }
  }
}
```

---

## Implementation Phases

### Phase 1: Taxonomia Visual (2-3 tareas)
- [ ] Crear `lib/icons/event-icons.ts` con registry de iconos
- [ ] Modificar `EventGlobe.tsx` para usar nuevo sistema de iconos
- [ ] Modificar `EventBlock.tsx` para usar nuevo sistema de iconos
- [ ] Verificar diferenciacion breast/bottle/solids

**Verificacion Phase 1 (Playwright MCP):**

> **Usar herramientas MCP:** `browser_navigate`, `browser_snapshot`, `browser_take_screenshot`

**Test: Taxonomia Visual de Iconos**
```
USUARIO: Padre (eljulius@nebulastudios.io / juls0925)

1. LOGIN:
   - browser_navigate → /auth/login
   - browser_snapshot → obtener refs
   - browser_type → email: eljulius@nebulastudios.io
   - browser_type → password: juls0925
   - browser_click → submit
   - browser_wait_for → "Dashboard"

2. NAVEGAR A CALENDARIO SEMANAL:
   - browser_navigate → /dashboard/calendar?view=week
   - browser_snapshot → verificar pagina cargada

3. VERIFICAR ICONOS DIFERENCIADOS:
   - browser_snapshot → buscar elementos con data-event-type="feeding"
   - Verificar que:
     - feeding con feedingType="breast" muestra icono Heart (rosa/pink)
     - feeding con feedingType="bottle" muestra icono Milk (azul/sky)
     - feeding con feedingType="solids" muestra icono UtensilsCrossed (verde/emerald)
   - Verificar que:
     - event-type="nap" muestra CloudMoon (violeta)
     - event-type="sleep" muestra Moon (indigo)

4. SCREENSHOT COMPARATIVO:
   - browser_take_screenshot → filename: "taxonomy-icons-phase1.png"
   - Guardar como baseline para futuras comparaciones
```

**Criterios de Exito:**
- [ ] Iconos de alimentacion visualmente diferenciados por color y forma
- [ ] Siesta (nap) usa icono diferente a sueno nocturno (sleep)
- [ ] Screenshot guardado sin errores

---

### Phase 2: Componente Narrativo (3-4 tareas)
- [ ] Crear `lib/narrative/generate-narrative.ts`
- [ ] Crear `components/narrative/NarrativeCard.tsx`
- [ ] Crear `components/narrative/NarrativeTimeline.tsx`
- [ ] Agregar skeleton loaders y empty state

**Verificacion Phase 2:**

### A) Tests de Logica (Jest/Vitest) - `npm test`

```typescript
// __tests__/lib/narrative/generate-narrative.test.ts
import { generateNarrative } from '@/lib/narrative/generate-narrative'

describe('generateNarrative', () => {
  const childName = 'Matias'

  test('genera narrativa correcta para pecho', () => {
    const event = { eventType: 'feeding', feedingType: 'breast', feedingDuration: 15, startTime: '2026-01-20T08:00:00' }
    expect(generateNarrative(childName, event)).toBe('Matias tomo pecho por 15 minutos')
  })

  test('genera narrativa correcta para biberon', () => {
    const event = { eventType: 'feeding', feedingType: 'bottle', feedingAmount: 120, startTime: '2026-01-20T08:00:00' }
    expect(generateNarrative(childName, event)).toBe('Matias tomo 120 ml de biberon')
  })

  test('omite dato faltante sin placeholder', () => {
    const event = { eventType: 'feeding', feedingType: 'bottle', startTime: '2026-01-20T08:00:00' }
    expect(generateNarrative(childName, event)).toBe('Matias tomo biberon')
    expect(generateNarrative(childName, event)).not.toContain('[')
  })

  test('genera narrativa para siesta con duracion', () => {
    const event = { eventType: 'nap', duration: 45, startTime: '2026-01-20T14:00:00' }
    expect(generateNarrative(childName, event)).toBe('Matias tomo una siesta de 45 minutos')
  })

  test('genera narrativa para sueno nocturno con rango', () => {
    const event = { eventType: 'sleep', startTime: '2026-01-20T21:00:00', endTime: '2026-01-21T07:00:00' }
    expect(generateNarrative(childName, event)).toBe('Matias durmio de 21:00 a 07:00')
  })
})
```

- [ ] Ejecutar `npm test -- generate-narrative.test.ts`
- [ ] Todos los tests deben pasar

### B) Tests E2E (Playwright MCP)

**Test: NarrativeTimeline muestra eventos**
```
USUARIO: Padre (eljulius@nebulastudios.io / juls0925)

1. LOGIN (ver flujo en seccion Credenciales)

2. VERIFICAR ESTRUCTURA DE TARJETA:
   - browser_navigate → /dashboard
   - browser_snapshot → buscar [data-testid="narrative-card"]
   - Verificar que cada tarjeta tiene:
     - Icono circular a la izquierda
     - Texto narrativo en espanol
     - Hora/rango debajo del texto
     - Chevron a la derecha

3. VERIFICAR CANTIDAD INICIAL:
   - browser_snapshot → contar narrative-cards
   - Debe haber exactamente 5 tarjetas visibles (limit inicial)

4. SCREENSHOT:
   - browser_take_screenshot → filename: "narrative-cards-structure.png"
```

**Test: Empty State sin eventos**
```
USUARIO: Padre

1. LOGIN

2. NAVEGAR A FECHA SIN EVENTOS:
   - browser_navigate → /dashboard/calendar?date=2025-01-01
   - browser_snapshot → buscar texto "No hay eventos registrados hoy"
   - Verificar que mensaje es visible

3. SCREENSHOT:
   - browser_take_screenshot → filename: "empty-state.png"
```

**Criterios de Exito:**
- [ ] Tests de Jest pasan al 100%
- [ ] Tarjetas de narrativa tienen estructura correcta
- [ ] Empty state se muestra cuando no hay eventos

---

### Phase 3: Integracion Home Padres (2 tareas)
- [ ] Integrar NarrativeTimeline en dashboard Home
- [ ] Implementar "Ver todo" / "Colapsar" (limit=5)

**Verificacion Phase 3 (Playwright MCP):**

> **USUARIO:** Padre (eljulius@nebulastudios.io / juls0925)

**Test: Ver todo / Colapsar funcionalidad**
```
1. LOGIN como Padre

2. VERIFICAR ESTADO INICIAL (5 eventos):
   - browser_navigate → /dashboard
   - browser_snapshot → contar [data-testid="narrative-card"]
   - Debe haber exactamente 5 tarjetas
   - browser_take_screenshot → "home-collapsed-initial.png"

3. EXPANDIR CON "Ver todo":
   - browser_snapshot → buscar boton "Ver todo"
   - browser_click → boton "Ver todo"
   - browser_snapshot → contar narrative-cards
   - Debe haber MAS de 5 tarjetas (lista completa)
   - browser_take_screenshot → "home-expanded.png"

4. COLAPSAR:
   - browser_snapshot → buscar boton "Colapsar"
   - browser_click → boton "Colapsar"
   - browser_snapshot → contar narrative-cards
   - Debe volver a 5 tarjetas
   - browser_take_screenshot → "home-collapsed-again.png"

5. VERIFICAR PERSISTENCIA (siempre inicia colapsado):
   - browser_click → "Ver todo" (expandir)
   - browser_navigate → /dashboard (refresh)
   - browser_snapshot → contar narrative-cards
   - Debe haber 5 tarjetas (NO persistio estado expandido)
```

**Test: Click en chevron abre modal de edicion**
```
1. LOGIN como Padre

2. ABRIR MODAL:
   - browser_navigate → /dashboard
   - browser_snapshot → buscar [data-testid="edit-chevron"] en primera tarjeta
   - browser_click → chevron
   - browser_snapshot → verificar [role="dialog"] visible
   - browser_take_screenshot → "edit-modal-from-narrative.png"

3. CERRAR MODAL:
   - browser_click → boton cerrar o backdrop
   - browser_snapshot → verificar dialog ya no visible
```

**Criterios de Exito:**
- [ ] Feed inicia con exactamente 5 eventos
- [ ] "Ver todo" expande a lista completa
- [ ] "Colapsar" vuelve a 5 eventos
- [ ] Estado NO persiste (siempre inicia colapsado)
- [ ] Click en chevron abre modal de edicion

---

### Phase 4: Split Screen Admin (4-5 tareas)
- [ ] Crear `context/SplitScreenContext.tsx`
- [ ] Crear `components/bitacora/SplitScreenBitacora.tsx`
- [ ] Agregar animacion highlight-fade a Tailwind config
- [ ] Integrar en pagina de bitacora admin
- [ ] Implementar mirroring bidireccional

**Verificacion Phase 4 (Playwright MCP):**

> **USUARIO:** Admin (mariana@admin.com / password)

**Test: Layout Split Screen 50/50**
```
1. LOGIN como Admin:
   - browser_navigate → /auth/login
   - browser_snapshot → obtener refs
   - browser_type → email: mariana@admin.com
   - browser_type → password: password
   - browser_click → submit
   - browser_wait_for → "Dashboard"

2. NAVEGAR A BITACORA DE PACIENTE:
   - browser_navigate → /dashboard/patients
   - browser_snapshot → buscar lista de pacientes
   - browser_click → primer paciente de la lista
   - browser_snapshot → verificar pagina de detalle
   - browser_click → tab "Bitacora" o link a vista diaria

3. VERIFICAR LAYOUT 50/50:
   - browser_snapshot → verificar estructura
   - Debe haber 2 paneles lado a lado:
     - Panel izquierdo: Calendario (Gantt chart)
     - Panel derecho: Narrativa (timeline)
   - browser_take_screenshot → "split-screen-layout.png"
```

**Test: Mirroring Calendario → Narrativa**
```
1. LOGIN como Admin + navegar a bitacora

2. CLICK EN BLOQUE CALENDARIO:
   - browser_snapshot → buscar [data-testid="event-block"] en calendario
   - browser_click → un bloque de evento
   - browser_snapshot → verificar:
     - Narrativa hizo scroll al evento correspondiente
     - Tarjeta tiene clase de highlight (ring/glow amarillo)
   - browser_take_screenshot → "mirroring-calendar-to-narrative.png"

3. ESPERAR FADE (6 segundos):
   - browser_wait_for → time: 7
   - browser_snapshot → verificar que highlight desaparecio
   - browser_take_screenshot → "highlight-faded.png"
```

**Test: Mirroring Narrativa → Calendario**
```
1. LOGIN como Admin + navegar a bitacora

2. CLICK EN TARJETA NARRATIVA:
   - browser_snapshot → buscar [data-testid="narrative-card"]
   - browser_click → una tarjeta de narrativa
   - browser_snapshot → verificar:
     - Calendario hizo scroll al bloque correspondiente
     - Bloque tiene clase de highlight
   - browser_take_screenshot → "mirroring-narrative-to-calendar.png"
```

**Test: Doble Click abre Modal de Edicion**
```
1. LOGIN como Admin + navegar a bitacora

2. DOBLE CLICK EN CALENDARIO:
   - browser_snapshot → buscar bloque de evento
   - browser_click → bloque (doubleClick: true)
   - browser_snapshot → verificar [role="dialog"] visible
   - browser_take_screenshot → "edit-modal-from-calendar.png"
   - browser_click → cerrar modal

3. DOBLE CLICK EN NARRATIVA:
   - browser_snapshot → buscar tarjeta narrativa
   - browser_click → tarjeta (doubleClick: true)
   - browser_snapshot → verificar [role="dialog"] visible
   - browser_take_screenshot → "edit-modal-from-narrative-admin.png"
```

**Test: Responsive (Tablet < 1024px)**
```
1. LOGIN como Admin

2. RESIZE A TABLET:
   - browser_resize → width: 768, height: 1024
   - browser_navigate → bitacora de paciente
   - browser_snapshot → verificar layout
   - Debe colapsar a:
     - Stack vertical (calendario arriba, narrativa abajo), O
     - Tabs (Calendario | Narrativa)
   - browser_take_screenshot → "split-screen-tablet.png"

3. RESTORE A DESKTOP:
   - browser_resize → width: 1440, height: 900
   - browser_snapshot → verificar que vuelve a 50/50
```

**Criterios de Exito:**
- [ ] Layout 50/50 visible en desktop (>= 1024px)
- [ ] Click en calendario hace scroll + highlight en narrativa
- [ ] Click en narrativa hace scroll + highlight en calendario
- [ ] Highlight hace fade gradual en ~6 segundos
- [ ] Doble click en cualquier panel abre modal de edicion
- [ ] En tablet (<1024px) colapsa a stack o tabs

---

### Phase 5: Fix Bug Eventos Fragmentados en Sesiones de Sueno (3-4 tareas)
- [ ] Modificar `processSleepSessions()` para detectar eventos durante sueno
- [ ] Agregar campo `overlayEvents` a `SleepSession` interface
- [ ] Modificar `SleepSessionBlock` para renderizar overlays con sistema de columnas interno
- [ ] Modificar `CalendarWeekView` para excluir eventos durante sueno de `calculateEventColumns()`

**Verificacion Phase 5 (Jest + Playwright MCP):**

### A) Tests de Logica (Jest/Vitest)

```typescript
// __tests__/lib/utils/sleep-sessions.test.ts
import { processSleepSessions } from '@/lib/utils/sleep-sessions'

describe('processSleepSessions - overlay events', () => {
  const mockEvents = [
    // Sueno nocturno 9pm - 7am
    { _id: '1', eventType: 'sleep', startTime: '2026-01-20T21:00:00', endTime: '2026-01-21T07:00:00' },
    // Night waking a las 2am (ya capturado como nightWaking)
    { _id: '2', eventType: 'night_waking', startTime: '2026-01-21T02:00:00' },
    // Feeding a las 2:30am (durante sueno) - DEBE ser overlay
    { _id: '3', eventType: 'feeding', feedingType: 'bottle', startTime: '2026-01-21T02:30:00' },
    // Feeding a las 8am (fuera de sueno) - NO es overlay
    { _id: '4', eventType: 'feeding', feedingType: 'breast', startTime: '2026-01-21T08:00:00' },
  ]

  test('detecta eventos durante sueno como overlayEvents', () => {
    const { sessions, otherEvents } = processSleepSessions(mockEvents, new Date('2026-01-20'))

    expect(sessions).toHaveLength(1)
    expect(sessions[0].overlayEvents).toContainEqual(
      expect.objectContaining({ _id: '3' })
    )
    expect(sessions[0].nightWakings).toContainEqual(
      expect.objectContaining({ _id: '2' })
    )
  })

  test('eventos fuera de sueno permanecen en otherEvents', () => {
    const { otherEvents } = processSleepSessions(mockEvents, new Date('2026-01-20'))

    expect(otherEvents).toContainEqual(
      expect.objectContaining({ _id: '4' })
    )
    expect(otherEvents).not.toContainEqual(
      expect.objectContaining({ _id: '3' }) // Este NO debe estar aqui
    )
  })
})
```

- [ ] Ejecutar `npm test -- sleep-sessions.test.ts`

### B) Tests E2E (Playwright MCP)

> **USUARIO:** Padre (eljulius@nebulastudios.io / juls0925)
> **PREREQUISITO:** Crear datos de prueba con multiples feedings durante sueno nocturno

**Test: Eventos durante sueno NO fragmentados**
```
1. LOGIN como Padre

2. CREAR DATOS DE PRUEBA (si no existen):
   - Registrar sueno nocturno: 9pm - 7am
   - Registrar feeding durante sueno: 2:30am
   - Registrar feeding durante sueno: 4:00am
   - Registrar medication durante sueno: 3:00am

3. NAVEGAR A VISTA SEMANAL:
   - browser_navigate → /dashboard/calendar?view=week
   - browser_snapshot → buscar bloque de sueno nocturno

4. VERIFICAR OVERLAYS CONSISTENTES:
   - browser_snapshot → inspeccionar eventos dentro del bloque de sueno
   - VERIFICAR QUE:
     - Eventos de feeding/medication aparecen DENTRO del bloque de sueno
     - Todos los overlays tienen el MISMO ancho (no fragmentados en columnas)
     - Overlays estan alineados verticalmente (uno debajo del otro si hay overlap)
   - browser_take_screenshot → "overlays-during-sleep-AFTER-fix.png"

5. VERIFICAR BLOQUE BASE CONTINUO:
   - browser_snapshot → verificar que el bloque azul de sueno es UNA sola barra
   - NO debe haber "huecos" o fragmentacion del bloque base

6. CLICK EN OVERLAY ABRE MODAL CORRECTO:
   - browser_click → primer overlay (feeding)
   - browser_snapshot → verificar que modal muestra datos del feeding correcto
   - browser_take_screenshot → "overlay-click-opens-correct-modal.png"
```

**Test: Comparacion Visual Antes/Despues**
```
1. ANTES DEL FIX:
   - Tomar screenshot del estado actual (fragmentado)
   - Guardar como "sleep-overlays-BEFORE.png"

2. DESPUES DEL FIX:
   - Implementar cambios
   - Tomar screenshot del estado nuevo
   - Guardar como "sleep-overlays-AFTER.png"

3. COMPARAR:
   - Visualmente verificar que:
     - ANTES: eventos dispersos en columnas diferentes
     - DESPUES: eventos alineados como overlays consistentes
```

**Criterios de Exito:**
- [ ] Test de Jest pasa: `processSleepSessions` detecta overlayEvents
- [ ] Eventos durante sueno NO se fragmentan en columnas diferentes
- [ ] Overlays se ven alineados y consistentes (mismo ancho)
- [ ] Click en overlay abre modal de edicion correcto
- [ ] Bloque de sueno base permanece como barra continua
- [ ] Screenshots muestran mejora visual clara

---

### Phase 6: QA Final y Regression Testing

**Verificacion Phase 6 (Playwright MCP):**

> **USUARIOS:** Ambos - Admin Y Padre

**Test Suite: Interacciones Completas (Admin)**
```
USUARIO: Admin (mariana@admin.com / password)

1. INTERACCION CLICK 1 (Highlight):
   - browser_navigate → bitacora de paciente
   - browser_click → bloque en calendario
   - Verificar: narrativa hace scroll + highlight
   - browser_click → tarjeta en narrativa
   - Verificar: calendario hace scroll + highlight

2. INTERACCION CLICK 2 (Doble click = Editar):
   - browser_click → bloque en calendario (doubleClick: true)
   - Verificar: modal de edicion abierto
   - browser_click → cerrar modal
   - browser_click → tarjeta narrativa (doubleClick: true)
   - Verificar: modal de edicion abierto

3. INTERACCION CLICK RAPIDO (Cancel previous):
   - browser_click → bloque A
   - browser_click → bloque B (inmediatamente)
   - Verificar: solo bloque B tiene highlight
   - browser_take_screenshot → "rapid-click-test.png"
```

**Test Suite: Interacciones Completas (Padre)**
```
USUARIO: Padre (eljulius@nebulastudios.io / juls0925)

1. HOME FEED:
   - browser_navigate → /dashboard
   - Verificar: 5 tarjetas visibles
   - browser_click → "Ver todo"
   - Verificar: mas de 5 tarjetas
   - browser_click → "Colapsar"
   - Verificar: 5 tarjetas

2. CLICK EN CHEVRON:
   - browser_click → chevron de primera tarjeta
   - Verificar: modal de edicion abierto
   - browser_take_screenshot → "padre-edit-modal.png"
```

**Test Suite: Responsive**
```
1. MOBILE (375x667 - iPhone):
   - browser_resize → width: 375, height: 667
   - browser_navigate → /dashboard
   - Verificar: feed vertical funciona
   - browser_take_screenshot → "responsive-mobile.png"

2. TABLET (768x1024 - iPad):
   - browser_resize → width: 768, height: 1024
   - LOGIN como Admin
   - browser_navigate → bitacora de paciente
   - Verificar: split screen colapsa a stack/tabs
   - browser_take_screenshot → "responsive-tablet.png"

3. DESKTOP (1440x900):
   - browser_resize → width: 1440, height: 900
   - Verificar: split screen 50/50 funciona
   - browser_take_screenshot → "responsive-desktop.png"
```

**Test Suite: Edge Cases**
```
1. DIA SIN EVENTOS:
   - browser_navigate → /dashboard/calendar?date=2020-01-01
   - Verificar: mensaje "No hay eventos registrados hoy"
   - browser_take_screenshot → "edge-case-no-events.png"

2. EVENTO EN PROGRESO (sleep sin endTime):
   - Registrar evento sleep SIN endTime (bebe durmiendo ahora)
   - browser_navigate → /dashboard
   - Verificar: narrativa muestra "esta durmiendo desde las X"
   - browser_take_screenshot → "edge-case-in-progress.png"

3. DATOS INCOMPLETOS:
   - Registrar feeding sin feedingAmount
   - browser_navigate → /dashboard
   - Verificar: narrativa omite dato (NO muestra placeholder)
   - browser_take_screenshot → "edge-case-incomplete-data.png"
```

**Test Suite: Regression**
```
1. REGISTRO DE EVENTOS (funcionalidad existente):
   - browser_navigate → /dashboard
   - browser_click → boton "Se durmio"
   - Verificar: evento registrado correctamente
   - browser_click → boton de alimentacion
   - Completar formulario
   - Verificar: evento registrado correctamente

2. CALENDARIO (funcionalidad existente):
   - browser_navigate → /dashboard/calendar
   - Verificar: vista mensual funciona
   - browser_click → cambiar a semanal
   - Verificar: vista semanal funciona
   - browser_click → cambiar a diaria
   - Verificar: vista diaria funciona

3. EDICION DE EVENTOS (funcionalidad existente):
   - browser_click → un evento existente
   - Modificar un campo
   - browser_click → guardar
   - Verificar: cambios guardados correctamente
```

**Criterios de Exito Phase 6:**
- [ ] Todas las interacciones funcionan (click 1, click 2, doble click)
- [ ] Responsive funciona en mobile, tablet y desktop
- [ ] Edge cases manejados correctamente
- [ ] Funcionalidad existente NO se rompio (regression)
- [ ] Screenshots documentan estado final

---

## Acceptance Criteria

### Functional Requirements

- [ ] Admin ve Split Screen en vista diaria (50% calendario | 50% narrativa)
- [ ] Padres ven feed de 5 eventos en Home con "Ver todo"
- [ ] Click en bloque calendario hace scroll + highlight en narrativa
- [ ] Click en tarjeta narrativa hace scroll + highlight en calendario
- [ ] Doble click abre modal de edicion
- [ ] Highlight hace fade gradual en 5-7 segundos
- [ ] Iconos diferencian: pecho (Heart), biberon (Milk), solidos (UtensilsCrossed)
- [ ] Siestas usan icono CloudMoon (diferente a Moon de nocturno)
- [ ] Narrativa genera oraciones automaticas en espanol

### Non-Functional Requirements

- [ ] Split Screen colapsa a tabs en pantallas < 1024px
- [ ] Skeleton loaders durante carga
- [ ] Empty state cuando no hay eventos
- [ ] Animaciones suaves (scroll-behavior: smooth)

---

## Edge Cases

| Caso | Manejo |
|------|--------|
| Dia sin eventos | Empty state: "No hay eventos registrados hoy" |
| Datos incompletos | Omitir dato faltante en narrativa |
| Evento en progreso (sleep sin endTime) | Mostrar "esta durmiendo desde las X" |
| Click rapido multiples bloques | Cancelar scroll anterior, hacer nuevo |
| Sueno que cruza medianoche | Pertenece al dia donde inicia |

---

## Bug Conocido: Eventos Fragmentados Dentro de Sesiones de Sueno

### Descripcion del Problema

En la vista semanal/diaria, cuando hay multiples eventos (feeding, medication, night_waking) que ocurren **durante** una sesion de sueno nocturno, se fragmentan visualmente de manera inconsistente.

### Causa Raiz

**Archivos involucrados:**
- `components/calendar/CalendarWeekView.tsx:246-282`
- `components/calendar/SleepSessionBlock.tsx:161-167`
- `lib/utils/sleep-sessions.ts:83-90`

**Flujo actual:**
1. `processSleepSessions()` separa eventos en `sessions` y `otherEvents`
2. `sessions` (SleepSessionBlock) se renderizan con `column=0, totalColumns=1` (100% ancho)
3. `otherEvents` (EventGlobe) pasan por `calculateEventColumns()` que los fragmenta en columnas
4. Los `nightWakings` heredan el ancho del bloque padre

**Problema:**
Los eventos de tipo `feeding`, `medication`, etc. que ocurren durante el rango de tiempo de una sesion de sueno:
- Se procesan como `otherEvents` (no como `nightWakings`)
- Se fragmentan en columnas por `calculateEventColumns()`
- Visualmente aparecen sobre el bloque de sueno pero en columnas diferentes
- Resultado: fragmentacion inconsistente (algunos eventos en col 0, otros en col 1, etc.)

### Solucion Propuesta

**Opcion A: Tratar eventos durante sueno como overlays**
```typescript
// En processSleepSessions(), agregar:
const eventsDuringSleep = dayEvents.filter(e =>
  e.eventType !== "sleep" &&
  e.eventType !== "night_waking" &&
  e.startTime > sleepEvent.startTime &&
  (!sleepEvent.endTime || e.startTime < sleepEvent.endTime)
)

session.overlayEvents = eventsDuringSleep // Nuevo campo
```

Luego en `SleepSessionBlock`, renderizar `overlayEvents` con su propio sistema de columnas interno.

**Opcion B: Forzar eventos durante sueno a 100% ancho**
```typescript
// En calculateEventColumns(), detectar si evento esta dentro de una sesion de sueno
// y forzar column=0, totalColumns=1 para esos eventos
```

**Opcion C: Offset vertical en lugar de columnas**
```typescript
// En lugar de fragmentar horizontalmente, apilar eventos verticalmente
// con pequeno offset (stacking) cuando se superponen
```

### Archivos a Modificar

1. `lib/utils/sleep-sessions.ts` - Agregar deteccion de eventos durante sueno
2. `components/calendar/SleepSessionBlock.tsx` - Renderizar overlays internamente
3. `components/calendar/CalendarWeekView.tsx` - Excluir eventos durante sueno de `calculateEventColumns()`

### Criterio de Exito

- Eventos durante una sesion de sueno se ven como "overlays" consistentes
- No hay fragmentacion horizontal inconsistente
- Click en overlay abre modal de edicion correcto
- El bloque de sueno base permanece continuo (no fragmentado)

---

## Credenciales de Testing (Para Playwright MCP)

> **IMPORTANTE:** Todas las pruebas E2E se ejecutan usando **Playwright MCP**, NO `npx playwright test`.
> El agente debe usar las herramientas `mcp__plugin_playwright_playwright__*` para interactuar con el navegador.

### Usuarios de Prueba

| Rol | Email | Password | Proposito |
|-----|-------|----------|-----------|
| **Admin** | `mariana@admin.com` | `password` | Testing de Split Screen, vistas de pacientes, funcionalidad admin |
| **Padre** | `eljulius@nebulastudios.io` | `juls0925` | Testing de Home feed, vista de padre, funcionalidad usuario normal |

### URLs Clave

| Pagina | URL | Rol Requerido |
|--------|-----|---------------|
| Login | `/auth/login` | - |
| Dashboard Home | `/dashboard` | Ambos |
| Calendario Semanal | `/dashboard/calendar?view=week` | Ambos |
| Calendario Diario | `/dashboard/calendar?view=day` | Ambos |
| Bitacora Admin (paciente) | `/dashboard/patients/child/[id]` | Admin |

### Flujo de Login con Playwright MCP

```
1. browser_navigate → https://localhost:3000/auth/login
2. browser_snapshot → obtener refs de inputs
3. browser_type → email input
4. browser_type → password input
5. browser_click → submit button
6. browser_wait_for → dashboard loaded
```

---

## Dependencies & Prerequisites

### Existentes (ya implementados)
- `components/calendar/CalendarDayView.tsx` - Vista de calendario
- `components/calendar/EventBlock.tsx` - Bloques de evento
- `components/calendar/SleepSessionBlock.tsx` - Sesiones de sueno
- `components/events/EventDetailsModal.tsx` - Modal de edicion

### Nuevos (a crear)
- `lib/icons/event-icons.ts`
- `lib/narrative/generate-narrative.ts`
- `components/narrative/NarrativeCard.tsx`
- `components/narrative/NarrativeTimeline.tsx`
- `context/SplitScreenContext.tsx`
- `components/bitacora/SplitScreenBitacora.tsx`

---

## Risk Analysis

| Riesgo | Probabilidad | Impacto | Mitigacion |
|--------|--------------|---------|------------|
| Performance con muchos eventos | Media | Alto | Virtualizar lista si >50 eventos |
| Sincronizacion bidireccional buggy | Media | Medio | Testing exhaustivo de clicks |
| Iconos no se ven bien en mobile | Baja | Bajo | Usar tamanos responsive |
| Conflicto con CSS existente | Baja | Medio | Usar clases con prefijo |

---

## References & Research

### Internal References
- `components/calendar/EventGlobe.tsx:117-134` - Mapa de iconos actual
- `components/events/EventDetailsModal.tsx:61-79` - getEventTypeName
- `app/globals.css:134-142` - Variables CSS de colores
- `components/events/types.ts:3-45` - Tipos de eventos

### External References
- [Lucide Icons](https://lucide.dev/icons/) - Libreria de iconos
- [shadcn/ui Card](https://ui.shadcn.com/docs/components/card) - Componente Card
- [react-scroll-sync](https://github.com/okonet/react-scroll-sync) - Scroll sincronizado

---

## Success Metrics

1. **Admin puede leer bitacora del dia en < 30 segundos**
2. **Padres entienden "que paso" sin scroll horizontal**
3. **Taxonomia visual permite identificar tipo de evento de un vistazo**
4. **Mirroring nunca pierde sincronizacion**
5. **Sueno nocturno se ve como UNA barra continua**
