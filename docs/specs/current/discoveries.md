# Discoveries: Vista Narrativa, Taxonomia Visual y Split Screen

Log de aprendizajes entre sesiones de Ralph Loop.

---

## Patrones Descubiertos

(Se llena durante la implementacion)

---

## Archivos Clave Identificados

| Archivo | Proposito | Notas |
|---------|-----------|-------|
| `components/calendar/EventGlobe.tsx:117-134` | Mapa de iconos actual | Reemplazar con nuevo registry |
| `lib/utils/sleep-sessions.ts` | Procesa sleep sessions | Agregar overlayEvents |
| `components/calendar/SleepSessionBlock.tsx` | Renderiza sesiones | Agregar render de overlays |
| `lib/datetime.ts` | Manejo de fechas | Usar buildLocalDate() |

---

## Sesiones

### Session 0 - 2026-01-20

**Setup inicial**
- Implementation plan generado con 28 tareas en 8 fases
- Archivos de ejecucion creados
- Credenciales de testing documentadas
- Listo para `./ralph-loop.sh` (usa docs/specs/current/ automaticamente)

**Patterns identificados:**
- Iconos actuales usan switch-case en EventGlobe.tsx
- Sleep sessions NO detectan feeding/medication durante sueno (bug conocido)
- Playwright MCP para testing, NO npx playwright test

### Session 1 - 2026-01-20

**Task:** 0.1 - Crear archivo `lib/icons/event-icons.ts` con estructura base
**Files:** `lib/icons/event-icons.ts` (nuevo)

**Patterns descubiertos:**
- ESLint requiere if-statements en lugar de switch-case para evitar errores de indentacion
- El proyecto tiene errores de lint pre-existentes en otros archivos (no bloquean build)
- TypeScript skipLibCheck es necesario para lucide-react (error ReactSVG)

**Estructura del registry:**
```typescript
export const EVENT_ICONS: Record<EventIconType, EventIconConfig>
export function getEventIconType(eventType, feedingType): EventIconType
export function getEventIconConfig(eventType, feedingType): EventIconConfig
```

**Taxonomia implementada:**
- sleep: Moon (indigo)
- nap: CloudMoon (violet) - DIFERENTE a sleep
- wake: Sun (yellow)
- night_waking: Baby (purple)
- feeding_breast: Heart (pink)
- feeding_bottle: Milk (sky)
- feeding_solids: UtensilsCrossed (emerald)
- medication: Pill (blue)
- extra_activities: Activity (orange)

**Notes para proxima sesion:**
- Tarea 1.1 debe implementar los colores exactos en el registry
- EventGlobe.tsx:117-134 debe ser reemplazado para usar getEventIconConfig()
- EventBlock.tsx tambien necesita actualizarse

### Session 2 - 2026-01-20

**Task:** 1.1 + 1.2 - Verificar registry completo y modificar EventGlobe.tsx
**Files:** `components/calendar/EventGlobe.tsx` (modificado)

**Patterns descubiertos:**
- Tarea 1.1 ya estaba implementada en session anterior (registro completo en lib/icons/event-icons.ts)
- EventGlobe.tsx tenia 3 funciones con switch-case que fueron reemplazadas:
  - `getColor()` -> ahora usa `getEventIconConfig().bgColor`
  - `getIcon()` -> ahora usa `getEventIconConfig().icon` con componente dinamico
  - `getName()` -> ahora usa `getEventIconConfig().label` con logica especial para feeding
- La importacion de Lucide icons individuales fue removida, solo se importa el registry

**Refactorizacion aplicada:**
```typescript
// ANTES (30+ lineas de switch-case)
const getIcon = () => {
  switch (event.eventType) {
    case "nap": return <Sun ... />
    case "sleep": return <Moon ... />
    // ... 8+ casos
  }
}

// DESPUES (5 lineas)
const getIcon = () => {
  const config = getEventIconConfig(event.eventType, event.feedingType)
  const IconComponent = config.icon
  return <IconComponent className={iconClass} style={{ color: config.color }} />
}
```

**Notes para proxima sesion:**
- EventBlock.tsx tiene la MISMA duplicacion (4 funciones con switch-case)
- CompactEventBlock tambien tiene funciones duplicadas (2 mas)
- Total ~100 lineas de codigo a eliminar en tarea 1.3
- Considerar si SleepSessionBlock tambien necesita actualizarse

### Session 3 - 2026-01-20

**Task:** 1.3 - Modificar `EventBlock.tsx` para usar nuevo registry
**Files:** `components/calendar/EventBlock.tsx` (modificado)

**Cambios realizados:**
1. Eliminados imports individuales de Lucide icons (Moon, Sun, Clock, Baby, Utensils, etc.)
2. Agregado import de `getEventIconConfig` desde el registry centralizado
3. Reemplazado `getEventIcon()` en EventBlock (de 30 lineas switch-case a 7 lineas)
4. Reemplazado `getEventIcon()` en CompactEventBlock (de 25 lineas switch-case a 5 lineas)

**Funciones NO modificadas (por diseño):**
- `getEventColor()` - Usa clases Tailwind especificas del proyecto (bg-sleep, bg-nap, etc.)
- `getEventTypeName()` - Record estatico local, simple y funcional

**Reduccion de codigo:**
- Antes: ~55 lineas de switch-case para iconos
- Despues: ~12 lineas usando registry
- ~43 lineas eliminadas

**Patron reutilizable:**
```typescript
const getEventIcon = () => {
  const iconClass = "h-3 w-3" // o dinamico segun blockHeight
  const config = getEventIconConfig(event.eventType, event.feedingType)
  const IconComponent = config.icon
  return <IconComponent className={iconClass} style={{ color: config.color }} />
}
```

**Notes para proxima sesion:**
- Fase 1 COMPLETADA - Taxonomia Visual implementada en registry, EventGlobe, EventBlock
- Siguiente: Fase 2 - Componentes Narrativos (generate-narrative.ts)
- SleepSessionBlock podria beneficiarse del registry (pero no es parte del plan)

### Session 4 - 2026-01-20

**Task:** 2.1 - Crear `lib/narrative/generate-narrative.ts`
**Files:** `lib/narrative/generate-narrative.ts` (nuevo)

**Estructura implementada:**
- Interface `NarrativeEvent` - Subconjunto de EventData con campos para narrativa
- `generateNarrative(childName, event, timezone)` - Funcion principal
- `generateTimeMetadata(event, timezone)` - Genera string de hora/rango
- Generadores especificos por tipo de evento (feeding, sleep, nap, wake, etc.)

**Formatos de narrativa implementados (segun spec lines 52-61):**
- feeding_breast: "[nombre] tomo pecho por [X] minutos"
- feeding_bottle: "[nombre] tomo [X] ml de biberon"
- feeding_solids: "[nombre] comio [X] gr de solidos"
- sleep: "[nombre] durmio de [hora] a [hora]"
- nap: "[nombre] durmio una siesta de [X] minutos"
- wake: "[nombre] desperto a las [hora]"
- night_waking: "[nombre] desperto a las [hora]"
- medication: "[nombre] tomo [medicamento] ([dosis])"
- extra_activities: "[nombre] hizo [descripcion] por [X] minutos"
- note: "Nota: [texto]"

**Regla clave aplicada:**
- Si dato falta -> omitir (NO usar placeholders)
- Ejemplo: Si feedingAmount es undefined, muestra "Matias tomo biberon" en lugar de "Matias tomo undefined ml"

**Funciones auxiliares:**
- `formatTimeForNarrative()` - Formato "8:30 AM"
- `formatDuration()` - "45 minutos", "1 hora", "2 horas y 15 minutos"
- `calculateDurationMinutes()` - Calcula diferencia entre timestamps

**Notes para proxima sesion:**
- Siguiente: 2.2 - Crear tests Jest para `generateNarrative()`
- Los tests deben cubrir cada formato del spec
- Ubicacion: `__tests__/lib/narrative/generate-narrative.test.ts`

### Session 5 - 2026-01-20

**Task:** 2.2 - Crear test Jest para `generateNarrative()`
**Files:**
- `__tests__/lib/narrative/generate-narrative.test.ts` (nuevo)
- `jest.config.js` (nuevo - configuracion ts-jest)

**Descubrimiento critico:**
- Jest NO estaba configurado para TypeScript a pesar de tener ts-jest instalado
- Otros tests del proyecto tampoco funcionaban (ej: `event.test.ts`)
- Creado `jest.config.js` con preset ts-jest y moduleNameMapper para @/

**Configuracion Jest agregada:**
```javascript
{
  preset: "ts-jest",
  testEnvironment: "node",
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/$1" },
  transform: { "^.+\\.tsx?$": ["ts-jest", {...}] }
}
```

**Tests creados (47 tests, 100% pasan):**
- Alimentacion: breast (2), bottle (3), solids (2), fallback (2)
- Sueno: sleep (4), nap (4)
- Despertares: wake (2), night_waking (4)
- Otros: medication (3), extra_activities (4), note (4), unknown (1)
- Formato duracion: minutos, horas, horas+minutos (4)
- generateTimeMetadata: 8 tests

**Mock de datetime:**
- Mock sin tipos TypeScript en funcion factory (Jest/Babel limitation)
- formatForDisplay mockeado para producir "8:30 PM" consistentemente
- parseTimestamp mockeado como wrapper de new Date()

**Notes para proxima sesion:**
- Fase 2 COMPLETADA - Narrativa logica + tests funcionando
- Siguiente: Fase 3 - Componentes Narrativos UI (NarrativeCard, NarrativeTimeline)
- jest.config.js permite ejecutar todos los tests del proyecto ahora

### Session 6 - 2026-01-20

**Task:** 3.1 - Crear `components/narrative/NarrativeCard.tsx`
**Files:** `components/narrative/NarrativeCard.tsx` (nuevo)

**Estructura del componente:**
```typescript
interface NarrativeCardProps {
  event: NarrativeEvent & { _id?: string }
  childName: string
  timezone?: string
  isHighlighted?: boolean  // Para mirroring
  onClick?: (eventId: string) => void  // Click simple -> scroll en calendario
  onEdit?: (eventId: string) => void   // Doble click o chevron -> modal edicion
  cardRef?: React.RefObject<HTMLDivElement>  // Para scroll-into-view
}
```

**Anatomia implementada (segun spec lines 36-48):**
1. Icono circular (izquierda) - usa `getEventIconConfig()` del registry
2. Narrativa (centro) - usa `generateNarrative()` + hora con `generateTimeMetadata()`
3. Chevron (derecha) - boton para abrir edicion

**Integraciones:**
- `lib/icons/event-icons.ts` - Taxonomia visual (Fase 1)
- `lib/narrative/generate-narrative.ts` - Texto narrativo (Fase 2)
- `lib/datetime.ts` - DEFAULT_TIMEZONE

**Interacciones implementadas:**
- Click simple -> `onClick(eventId)` (para mirroring con calendario)
- Doble click -> `onEdit(eventId)` (abre modal edicion)
- Click en chevron -> `onEdit(eventId)` con stopPropagation

**Clase CSS para highlight:**
- `animate-highlight-fade` - Requiere implementacion en tailwind.config.js (Fase 5)
- Por ahora usa fallback con `ring-2 ring-yellow-400 bg-yellow-50/50`

**Notes para proxima sesion:**
- Siguiente: 3.2 - Crear NarrativeTimeline.tsx (lista de NarrativeCards)
- NarrativeTimeline necesita: ordenamiento cronologico inverso, collapsible, empty state
- La clase `animate-highlight-fade` se implementara en Fase 5 (5.2)

### Session 7 - 2026-01-20

**Task:** 3.2 - Crear `components/narrative/NarrativeTimeline.tsx`
**Files:**
- `components/narrative/NarrativeTimeline.tsx` (nuevo)
- `components/narrative/NarrativeCard.tsx` (modificado - agregado data-event-id)

**Estructura del componente:**
```typescript
interface NarrativeTimelineProps {
  events: NarrativeTimelineEvent[]
  childName: string
  timezone?: string
  highlightedEventId?: string | null  // Para mirroring
  collapsible?: boolean               // Habilita Ver todo/Colapsar
  initialLimit?: number               // Default: 5 (segun spec)
  isLoading?: boolean                 // Muestra skeletons
  onEventClick?: (eventId: string) => void
  onEventEdit?: (eventId: string) => void
  emptyMessage?: string
}
```

**Funcionalidades implementadas:**
1. **Ordenamiento cronologico inverso** - useMemo con sort por timestamp descendente
2. **Sistema collapsible** - Estado local `isExpanded`, boton "Ver todo/Colapsar"
3. **Estado NO persistente** - `isExpanded` siempre inicia en `false` (spec line 69)
4. **Empty state** - Icono CalendarX + mensaje personalizable
5. **Skeleton loaders** - 5 skeletons durante carga
6. **Map de refs** - Para scroll-into-view eficiente en mirroring
7. **data-event-id** - Agregado a NarrativeCard para `scrollToNarrativeEvent()`

**Sub-componentes:**
- `NarrativeCardSkeleton` - Skeleton con icono circular + lineas
- `EmptyState` - Mensaje centrado con icono CalendarX

**Funcion auxiliar exportada:**
```typescript
export function scrollToNarrativeEvent(eventId: string, containerRef?): void
// Busca elemento por data-event-id y hace scrollIntoView smooth
```

**Notes para proxima sesion:**
- Siguiente: 3.3 - Agregar skeleton loader y empty state (YA COMPLETADO en 3.2)
- La tarea 3.3 puede marcarse como completada porque skeleton/empty ya estan en NarrativeTimeline
- Siguiente real: Fase 4 - Integracion Home Padres

### Session 8 - 2026-01-20

**Task:** 3.3 - Agregar skeleton loader y empty state (VERIFICACION)
**Files:** Ninguno modificado - tarea ya implementada en Session 7

**Verificacion realizada:**
- Confirmado que `NarrativeCardSkeleton` existe en lineas 59-75
- Confirmado que `EmptyState` existe en lineas 81-94
- Confirmado que `isLoading` prop funciona (lineas 162-170)
- Confirmado que muestra 5 skeletons por defecto usando `initialLimit`

**Resultado:** Tarea marcada como completada - fue implementada anticipadamente en 3.2

**Notes para proxima sesion:**
- Fase 3 COMPLETADA
- Siguiente: Fase 4 - Integracion Home Padres
- Primera tarea: 4.1 - Integrar NarrativeTimeline en dashboard Home

### Session 9 - 2026-01-20

**Task:** 4.1 + 4.2 - Integrar NarrativeTimeline en dashboard Home + Ver todo/Colapsar
**Files:** `app/dashboard/page.tsx` (modificado)

**Cambios realizados:**
1. Agregado import de `NarrativeTimeline` y `NarrativeTimelineEvent`
2. Agregado import de `useMemo` a React hooks
3. Expandido interface `Event` local para incluir todos los campos de narrativa:
   - feedingType, feedingAmount, feedingDuration, isNightFeeding
   - sleepDelay, awakeDelay
   - medicationName, medicationDose
   - activityDescription, activityDuration
   - duration
4. Agregado `todayNarrativeEvents` useMemo que:
   - Filtra eventos del dia actual
   - Excluye notas (tienen seccion separada)
   - Mapea todos los campos necesarios para narrativa
5. Nueva seccion "Hoy" con Card + NarrativeTimeline

**Props usadas en integracion:**
```typescript
<NarrativeTimeline
  events={todayNarrativeEvents}
  childName={child.firstName}
  collapsible={true}
  initialLimit={5}
  isLoading={isLoading}
  emptyMessage="No hay eventos registrados hoy"
  onEventEdit={(eventId) => { /* TODO: Fase 4.2 - modal */ }}
/>
```

**Descubrimiento clave:**
- La tarea 4.2 "Ver todo/Colapsar" ya estaba IMPLEMENTADA dentro de NarrativeTimeline
- Solo requiere `collapsible=true, initialLimit=5` como props
- El boton y logica de expansion/colapso es parte del componente
- Estado NO persiste (siempre inicia colapsado) - cumple spec line 69

**Notes para proxima sesion:**
- Fase 4 COMPLETADA (4.1 + 4.2)
- Falta implementar `onEventEdit` para abrir modal de edicion (tiene console.log placeholder)
- Siguiente: Fase 5 - Split Screen Context

### Session 10 - 2026-01-20

**Task:** 5.1 - Crear `context/SplitScreenContext.tsx`
**Files:** `context/SplitScreenContext.tsx` (nuevo)

**Estructura del contexto:**
```typescript
interface SplitScreenContextType {
  selectedEventId: string | null      // ID del evento seleccionado
  highlightedEventId: string | null   // ID con highlight visual activo
  selectionSource: SelectionSource | null  // "calendar" | "narrative"
  selectEvent: (eventId: string, source: SelectionSource) => void
  clearSelection: () => void
  isHighlightActive: boolean          // Para animaciones CSS
}
```

**Comportamientos implementados (segun spec lines 135-145):**
1. `selectEvent(id, source)` establece highlight + programa auto-clear en 6 segundos
2. Click rapido cancela timeout anterior (useRef para NodeJS.Timeout)
3. `clearSelection()` limpia todo manualmente y cancela timeout
4. `selectionSource` permite saber de donde vino el click (para mirroring bidireccional)
5. `isHighlightActive` facilita aplicar clases CSS condicionales

**Patron aplicado:**
- Mismo patron que `ActiveChildContext.tsx` (estructura probada en proyecto)
- `useCallback` para funciones estables
- `useRef` para timeout mutable
- Constante `HIGHLIGHT_DURATION_MS = 6000` (6 segundos segun spec "5-7 seg")

**Notes para proxima sesion:**
- Siguiente: 5.2 - Agregar animacion `highlight-fade` a tailwind.config.js
- La clase `animate-highlight-fade` se usa en NarrativeCard.tsx (ya tiene fallback)
- Despues de 5.2, Fase 5 queda COMPLETA

### Session 11 - 2026-01-20

**Task:** 5.2 - Agregar animacion highlight-fade a Tailwind
**Files:** `tailwind.config.ts` (modificado)

**Cambios realizados:**
1. Agregada keyframe `highlight-fade` que transiciona de:
   - backgroundColor: `rgb(254 249 195)` (yellow-100)
   - boxShadow: `0 0 0 2px rgb(250 204 21)` (ring-yellow-400)
   - A transparente
2. Agregada animacion `animate-highlight-fade` con duracion 6s, ease-out, forwards

**Detalles tecnicos:**
```javascript
"highlight-fade": {
  "0%": {
    backgroundColor: "rgb(254 249 195)", // yellow-100
    boxShadow: "0 0 0 2px rgb(250 204 21)" // ring-yellow-400
  },
  "100%": {
    backgroundColor: "transparent",
    boxShadow: "0 0 0 0 transparent"
  },
},
animation: {
  "highlight-fade": "highlight-fade 6s ease-out forwards",
}
```

**Pattern aplicado:**
- `forwards` mantiene el estado final (transparente) despues de terminar
- 6 segundos coincide con `HIGHLIGHT_DURATION_MS` de SplitScreenContext.tsx
- NarrativeCard.tsx ya usa la clase (linea 101)

**Notes para proxima sesion:**
- Fase 5 COMPLETADA (5.1 SplitScreenContext + 5.2 animacion)
- Siguiente: Fase 6 - Split Screen Bitacora Admin
- Primera tarea: 6.1 - Crear `components/bitacora/SplitScreenBitacora.tsx`

### Session 12 - 2026-01-20

**Task:** 6.1 + 6.2 + 6.3 - Crear SplitScreenBitacora con mirroring bidireccional
**Files:** `components/bitacora/SplitScreenBitacora.tsx` (nuevo)

**Estructura del componente:**
```typescript
// Wrapper que provee contexto
export function SplitScreenBitacora(props) {
  return (
    <SplitScreenProvider>
      <SplitScreenBitacoraInner {...props} />
    </SplitScreenProvider>
  )
}
```

**Funcionalidades implementadas:**
1. **Layout responsive** - `flex flex-col lg:grid lg:grid-cols-2`:
   - Desktop (>=1024px): Grid 50/50
   - Tablet/Mobile (<1024px): Stack vertical
2. **Mirroring Cal->Narr** (6.2): `handleCalendarEventClick` + `scrollToNarrativeEvent()`
3. **Mirroring Narr->Cal** (6.3): `handleNarrativeEventClick` + scroll por `[data-calendar-event-id]`
4. **Integracion modular**: Reutiliza `CalendarDayView` y `NarrativeTimeline` sin modificarlos

**Props del componente:**
```typescript
interface SplitScreenBitacoraProps {
  events: BitacoraEvent[]
  childName: string
  selectedDate: Date
  timezone?: string
  hourHeight?: number
  onEventEdit?: (eventId: string) => void
  onDayNavigateBack?: () => void
  onDayNavigateForward?: () => void
  onCalendarClick?: (clickEvent, dayDate) => void
  isLoading?: boolean
}
```

**Pattern clave - mapeo de eventos:**
- `narrativeEvents` mapea BitacoraEvent a NarrativeTimelineEvent
- Mantiene ambos tipos compatibles sin modificar componentes internos

**Pendiente para proxima sesion:**
- 6.4: Implementar doble click para editar (requiere modificar CalendarDayView o EventGlobe)
- 6.5: Integrar en pagina admin (`/dashboard/patients/child/[childId]`)
- Nota: El calendario necesita `data-calendar-event-id` en bloques para scroll funcione

### Session 13 - 2026-01-20

**Task:** 6.4 - Implementar doble click para editar
**Files:**
- `components/calendar/CalendarDayView.tsx` (modificado)
- `components/calendar/EventGlobe.tsx` (modificado)
- `components/calendar/SleepSessionBlock.tsx` (modificado)
- `components/bitacora/SplitScreenBitacora.tsx` (modificado)

**Cambios realizados:**

1. **CalendarDayView.tsx:**
   - Agregada prop `onEventDoubleClick?: (event: Event) => void`
   - Pasada a `EventGlobe` y `SleepSessionBlock`
   - Para SleepSessionBlock: tambien `onNightWakingDoubleClick`

2. **EventGlobe.tsx:**
   - Agregada prop `onDoubleClick?: (event: Event) => void`
   - Handler `handleDoubleClick` que cierra tooltip y llama callback
   - `onDoubleClick={handleDoubleClick}` en el div principal

3. **SleepSessionBlock.tsx:**
   - Agregada prop `onDoubleClick?: () => void`
   - Agregada prop `onNightWakingDoubleClick?: (waking: Event) => void`
   - Handler `handleDoubleClick` en bloque de sleep (en progreso y completado)
   - `onDoubleClick` handler en night wakings individuales

4. **SplitScreenBitacora.tsx:**
   - Importado `EventEditRouter`
   - Estado `editingEvent` y `isEditModalOpen` para modal interno
   - `handleCalendarEventDoubleClick` que busca evento y abre modal
   - `handleEventEdit` actualizado: si no hay `onEventEdit` externo, usa modal interno
   - `handleCloseEditModal` y `handleEventUpdated` para ciclo de vida del modal
   - Agregada prop `onEventUpdate?: () => void` para refrescar datos despues de editar
   - `EventEditRouter` renderizado con estado y callbacks

**Patron descubierto - Modal interno vs externo:**
```typescript
// Si hay callback externo, usarlo
if (onEventEdit) {
  onEventEdit(eventId)
  return
}
// Si no, usar modal interno
const event = events.find((e) => e._id === eventId)
if (event) {
  setEditingEvent(event)
  setIsEditModalOpen(true)
}
```

**Comportamiento implementado:**
- Click simple -> highlight + scroll bidireccional (mirroring)
- Doble click -> abre modal de edicion via EventEditRouter
- Chevron en NarrativeCard -> tambien abre edicion

**Notes para proxima sesion:**
- Siguiente: 6.5 - Integrar SplitScreenBitacora en pagina admin
- Ruta: `/dashboard/patients/child/[childId]`
- Verificar que la pagina admin puede usar SplitScreenBitacora

### Session 14 - 2026-01-20

**Task:** 6.5 - Integrar SplitScreenBitacora en pagina admin
**Files:** `app/dashboard/patients/child/[childId]/AdminChildDetailClient.tsx` (modificado)

**Cambios realizados:**

1. **Imports agregados:**
   - `useMemo` de React
   - `Button` de shadcn/ui
   - Iconos: `ChevronLeft`, `ChevronRight`, `Columns`, `List`
   - `SplitScreenBitacora` desde `@/components/bitacora/SplitScreenBitacora`
   - Funciones de date-fns: `startOfDay`, `endOfDay`, `addDays`, `subDays`, `isWithinInterval`

2. **Nuevos estados:**
   - `eventsViewMode`: "split" | "list" - Controla vista activa
   - `splitScreenDate`: Date - Fecha seleccionada para Split Screen

3. **Nuevos memos y handlers:**
   - `splitScreenEvents`: Filtra eventos del dia seleccionado
   - `handleSplitScreenDayBack/Forward`: Navegacion de fecha
   - `splitScreenDayTitle`: Titulo formateado del dia

4. **UI del Tab Eventos:**
   - Toggle Split Screen / Lista (botones con iconos Columns/List)
   - Navegacion de fecha solo visible en modo Split
   - `SplitScreenBitacora` renderizado cuando `eventsViewMode === "split"`
   - `EventsCalendarTabs` renderizado cuando `eventsViewMode === "list"`

**Patron de integracion:**
```typescript
// Toggle entre vistas
{eventsViewMode === "split" ? (
  <SplitScreenBitacora
    events={splitScreenEvents}  // Solo eventos del dia
    childName={childName}
    selectedDate={splitScreenDate}
    onEventUpdate={refetchEvents}  // Refrescar al editar
  />
) : (
  <EventsCalendarTabs ... />  // Vista original
)}
```

**Descubrimiento arquitectonico:**
- `AdminChildDetailClient` ya tenia `EventsCalendarTabs` con tabs dia/semana/mes
- Para admin, **vista diaria** ahora usa Split Screen por defecto
- Vista lista mantiene compatibilidad con semana/mes
- El toggle permite al admin elegir su preferencia

**Notes para proxima sesion:**
- Fase 6 COMPLETADA (6.1-6.5)
- Siguiente: Fase 7 - Bug Fix Eventos Fragmentados en Sesiones de Sueno
- Primera tarea: 7.1 - Agregar campo `overlayEvents` a interface SleepSession

### Session 15 - 2026-01-20

**Task:** 7.1 - Agregar campo `overlayEvents` a interface SleepSession
**Files:** `lib/utils/sleep-sessions.ts` (modificado)

**Cambios realizados:**
1. Agregado campo `overlayEvents: Event[]` a interface `SleepSession` (linea 24)
2. Inicializado `overlayEvents: []` en la funcion `processSleepSessions()` (linea 111)

**Proposito del campo:**
- Capturar eventos que ocurren DURANTE una sesion de sueno (feeding, medication, etc.)
- Estos eventos actualmente se renderizan como bloques separados, fragmentando visualmente el sueno
- Con `overlayEvents`, se renderizaran como superposiciones sobre el bloque base de sueno

**Estructura actualizada:**
```typescript
export interface SleepSession {
  type: "sleep-session"
  startTime: string
  endTime?: string
  originalStartTime: string
  originalEndTime?: string
  nightWakings: Event[]
  overlayEvents: Event[]  // NUEVO - eventos durante sueno
  originalEvent: Event
  isContinuationFromPrevious: boolean
  continuesNextDay: boolean
}
```

**Notes para proxima sesion:**
- Siguiente: 7.2 - Modificar `processSleepSessions()` para detectar y poblar overlayEvents
- La logica debe filtrar eventos con startTime dentro del rango [sleep.startTime, sleep.endTime]
- Excluir night_waking (ya capturado en campo separado)

### Session 16 - 2026-01-20

**Task:** 7.2 - Modificar `processSleepSessions()` para detectar overlays
**Files:** `lib/utils/sleep-sessions.ts` (modificado)

**Cambios realizados:**
1. Creado Set de tipos excluidos: `sleep`, `wake`, `night_waking`, `nap`
2. Agregada logica de filtrado para `overlayEvents`:
   - Evento no es tipo excluido
   - Evento no es el sleep actual
   - Evento no ya procesado
   - `startTime` > `event.startTime` (despues del inicio del sueno)
   - `startTime` < `event.endTime` (antes del fin del sueno, si existe)
3. Marcado de `overlayEvents` como procesados para evitar duplicacion en `otherEvents`
4. Actualizado el push de sesion para usar `overlayEvents` en lugar de array vacio

**Logica de filtrado:**
```typescript
const excludedTypes = new Set(["sleep", "wake", "night_waking", "nap"])
const overlayEvents = dayEvents.filter(e => {
  if (excludedTypes.has(e.eventType)) return false
  if (e._id === event._id) return false
  if (processedEventIds.has(e._id)) return false
  if (e.startTime <= event.startTime) return false
  if (event.endTime && e.startTime >= event.endTime) return false
  return true
})
overlayEvents.forEach(oe => processedEventIds.add(oe._id))
```

**Patron clave - deteccion de overlays:**
- Los eventos durante sueno (feeding, medication) ahora se capturan en `overlayEvents`
- Esto permite renderizarlos como capas superpuestas sobre el bloque de sueno
- Evita la fragmentacion visual que ocurria antes (eventos mostrados como columnas separadas)

**Notes para proxima sesion:**
- Siguiente: 7.3 - Crear test Jest para overlayEvents
- Ubicacion: `__tests__/lib/utils/sleep-sessions.test.ts`
- Tests deben verificar que overlayEvents contiene feeding/medication durante sueno
