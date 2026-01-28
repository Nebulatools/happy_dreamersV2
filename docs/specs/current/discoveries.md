# Discoveries: QA Feedback Sprint 2026-01-26

Log de aprendizajes entre sesiones de Ralph Loop.

---

## Patrones Clave del Sprint

### Estado de Sueño (ITEM 9)
- **Problema**: localStorage guarda estado por dispositivo, no por niño
- **Solución**: Eliminar localStorage, usar 100% API via SWR
- **Lógica**: Último sleep/nap vs último wake determina estado
- **Archivos**: `hooks/use-sleep-state.ts`, `components/events/SleepButton.tsx`

### Edición endTime (ITEM 6)
- **Patrón**: Seguir `SleepDelayModal.tsx:76-90`
- **Modales**: FeedingModal, MedicationModal, ExtraActivityModal, NightWakingModal
- **Usar**: `buildLocalDate()` y `dateToTimestamp()` de `lib/datetime.ts`

### Roles (ITEM 5)
- **Variable**: `isAdminView` ya existe en calendar/page.tsx
- **Padres**: Solo Diario + Semanal
- **Admin**: Todos los tabs

---

## Archivos Clave Identificados

| Archivo | Propósito | Líneas Clave |
|---------|-----------|--------------|
| `hooks/use-sleep-state.ts` | Estado de sueño | 49-82 (localStorage a eliminar) |
| `components/events/SleepButton.tsx` | Botón dormir | 63-64 (storage keys) |
| `components/events/SleepDelayModal.tsx` | Patrón endTime | 76-90 |
| `app/dashboard/calendar/page.tsx` | Tabs por rol | 1828-1874 |
| `lib/icons/event-icons.ts` | Registry iconos | getEventIconConfig() |

---

## Sesiones

### Session 0 - 2026-01-27

**Setup inicial**
- Implementation plan generado con 26 tareas en 8 fases
- Archivos de ejecución creados en docs/specs/current/
- Sprint cubre 9 items activos + 2 verificación
- Listo para `./ralph-loop.sh`

**Prioridades identificadas:**
1. ITEM 9 (Estado por niño) - Crítico, cambio de arquitectura
2. ITEM 11 (Alimentación nocturna) - Complementa ITEM 9
3. ITEM 6 (Edición hora fin) - Bug reportado por QA

**Patrones a seguir:**
- Eliminar localStorage para estado de sueño
- Usar patrón de SleepDelayModal para edición de endTime
- Condicionar UI por isAdminView

---

### Session 1 - 2026-01-27

**Task:** [0.1, 0.2] - Verificación pre-sprint de ITEM 3 y ITEM 7

**Files verificados:**
- `lib/icons/event-icons.ts` - ITEM 3 siestas lavanda
- `components/calendar/SleepSessionBlock.tsx` - ITEM 7 estilos nocturnos

**Resultados:**
1. **ITEM 3 - Siestas en lavanda** ✅
   - `nap` usa icono `CloudMoon` (diferente de `Moon` para sleep)
   - Color: `#a78bfa` (violet-400/lavanda)
   - `bgColor: "bg-nap"`
   - Label: "Siesta"

2. **ITEM 7 - Estilos nocturnos** ✅
   - Sueño en progreso: `from-indigo-700 to-purple-800`
   - Sueño completado: gradiente `rgba(67,56,202) → rgba(107,33,168) → rgba(88,28,135)`
   - Los colores oscuros (indigo/purple) representan visualmente la noche

**Notes:** Ambos items ya estaban implementados correctamente. Build pasa sin errores. Lint tiene errores pre-existentes no relacionados con estos items.

---

### Session 2 - 2026-01-27

**Task:** [1.1, 1.2, 1.3] - ITEM 9: Estado por Niño (Crítico)

**Files modificados:**
- `hooks/use-sleep-state.ts` - Eliminado localStorage, solo API via SWR
- `components/events/SleepButton.tsx` - Eliminados storage keys y useEffects de persistencia

**Cambios realizados:**

1. **use-sleep-state.ts**
   - Eliminadas interfaces `SleepPending` y `NightWakePending` (ya no se usan)
   - Eliminados 3 useEffects que cargaban/persistían/polling localStorage
   - Estado ahora es 100% derivado de `data?.status` del API
   - SWR sigue con `refreshInterval: 30000` y `revalidateOnFocus: true`

2. **SleepButton.tsx**
   - Eliminadas constantes `sleepStorageKey` y `nightWakeStorageKey`
   - Eliminados 3 useEffects de localStorage (cargar, persistir sleep, persistir nightWake)
   - Estados locales `sleepPending` y `nightWakePending` se mantienen para flujo modal
   - La diferencia: ya no persisten entre recargas - solo viven durante la sesión

3. **current-sleep-state endpoint**
   - Verificado: lógica correcta para determinar estado
   - Eventos `sleep/nap` sin `endTime` → dormido
   - Eventos con `endTime` o `wake` → despierto

**Patterns:**
- Estado de sueño ahora sincroniza automáticamente entre dispositivos via API
- SWR revalida en focus, reconexión, y cada 30 segundos
- Flujo modal usa estados locales temporales (no persisten)

**Notes:** Build pasa correctamente. Task 1.4 (testing multi-dispositivo) será parte de Fase 8 E2E.

---

### Session 3 - 2026-01-27

**Task:** [2.1, 2.2] - ITEM 11: Alimentación Nocturna

**Files modificados:**
- `components/events/NightFeedingButton.tsx` - NUEVO componente
- `components/events/EventRegistration.tsx` - Integración del nuevo botón

**Cambios realizados:**

1. **NightFeedingButton.tsx** (nuevo)
   - Botón con gradiente indigo→purple (colores nocturnos)
   - Icono compuesto: Milk + Moon pequeña
   - Props: `{ childId, childName, onEventRegistered }`
   - Abre FeedingModal con `babyState: "asleep"` preseleccionado
   - Registra evento con `isNightFeeding: true` y `feedingContext`
   - NO cambia el estado de sueño del niño

2. **EventRegistration.tsx**
   - Import del nuevo NightFeedingButton
   - Nueva variable `showNightFeedingButton = isSleeping || isNapping`
   - FeedingButton normal ahora solo visible cuando `isAwake || isNightWaking`
   - Grid calcula columnas dinámicamente según botones visibles
   - NightFeedingButton se renderiza condicionalmente

**Patterns:**
- Separación clara: FeedingButton (despierto) vs NightFeedingButton (dormido)
- NightFeedingButton NO despierta al niño - solo registra alimentación
- El flag `isNightFeeding: true` permite analytics y reportes diferenciados
- El `feedingContext` indica si es durante sueño nocturno o siesta

**Notes:** Build pasa correctamente. Pendiente testing E2E en Fase 8.

---

### Session 4 - 2026-01-27

**Task:** [3.1] - ITEM 6: Agregar endTime a FeedingModal.tsx

**Files modificados:**
- `components/events/FeedingModal.tsx` - Agregados campos de edición de hora de fin

**Cambios realizados:**

1. **Interface FeedingModalProps.initialData**
   - Agregado campo opcional `endTime?: string`

2. **Nuevos estados**
   - `endDate`: fecha de fin (yyyy-MM-dd)
   - `endTimeValue`: hora de fin (HH:mm)
   - `hasEndTime`: booleano para controlar visibilidad

3. **Inicialización en useEffect**
   - Si `initialData.endTime` existe, se parsea y setea los estados
   - Si no existe, estados se inicializan vacíos

4. **UI condicional en modo edit**
   - Nueva sección "Hora de fin" visible solo en `mode === "edit"`
   - Botón "+ Agregar hora de fin" si no existe endTime
   - Grid de inputs fecha/hora si existe endTime
   - Botón "x" para quitar hora de fin

5. **handleConfirm modificado**
   - Ya no fuerza `endTime = getCurrentTime()`
   - Usa valores editados de `endDate` y `endTimeValue` si `hasEndTime`

6. **handleCancel actualizado**
   - Restaura estados de endTime en modo edit
   - Limpia estados de endTime en modo create

**Patterns:**
- Seguí exactamente el patrón de `SleepDelayModal.tsx:76-90`
- Usé `buildLocalDate()` y `dateToTimestamp()` de `lib/datetime.ts`
- Color de acento verde (green-600) para consistencia con el modal de feeding

**Notes:** Build pasa correctamente. Próxima tarea: [3.2] MedicationModal.tsx

---

### Session 5 - 2026-01-27

**Task:** [3.2] - ITEM 6: Agregar endTime a MedicationModal.tsx

**Files modificados:**
- `components/events/MedicationModal.tsx` - Agregados campos de edición de hora de fin

**Cambios realizados:**

1. **Imports nuevos**
   - `X`, `Plus` de lucide-react (iconos para botones)
   - `useUser` de UserContext
   - `buildLocalDate`, `dateToTimestamp`, `DEFAULT_TIMEZONE` de datetime
   - `EditOptions` de types

2. **Interface initialData**
   - Agregado campo opcional `endTime?: string`

3. **Firma onConfirm actualizada**
   - Ahora acepta `EditOptions` opcional como segundo parámetro

4. **Nuevos estados**
   - `endDate`: fecha de fin (yyyy-MM-dd)
   - `endTimeValue`: hora de fin (HH:mm)
   - `hasEndTime`: booleano para controlar visibilidad
   - `timezone`: del UserContext para conversiones

5. **useEffect de inicialización**
   - Inicializa endDate, endTimeValue, hasEndTime si existe initialData.endTime

6. **resetForm actualizado**
   - Restaura o limpia estados de endTime según modo

7. **handleConfirm con EditOptions**
   - Construye startTime desde eventDate + medicationTime
   - Construye endTime desde endDate + endTimeValue si hasEndTime
   - Pasa EditOptions al onConfirm

8. **UI nueva sección "Hora de fin"**
   - Solo visible en mode === "edit"
   - Botón "+ Agregar hora de fin" si no existe
   - Grid de inputs fecha/hora si existe
   - Botón "x" para quitar hora de fin
   - Color amber (consistente con modal de medicamentos)

**Patterns:**
- Mismo patrón que FeedingModal (Session 4)
- Color de acento amber-600 para consistencia con el modal de medicamentos
- Botón de quitar hora de fin posicionado con absolute

**Notes:** Build pasa correctamente. Próxima tarea: [3.3] ExtraActivityModal.tsx

---

### Session 6 - 2026-01-27

**Task:** [3.3] - ITEM 6: Agregar endTime a ExtraActivityModal.tsx

**Files modificados:**
- `components/events/ExtraActivityModal.tsx` - Agregados campos de edición de hora de fin

**Cambios realizados:**

1. **Imports nuevos**
   - `Plus`, `X` de lucide-react (iconos para botones)

2. **Interface initialData**
   - Agregado campo opcional `endTime?: string`

3. **Nuevos estados**
   - `endDate`: fecha de fin (yyyy-MM-dd)
   - `endTimeValue`: hora de fin (HH:mm)
   - `hasEndTime`: booleano para controlar visibilidad

4. **useEffect de inicialización**
   - Inicializa endDate, endTimeValue, hasEndTime si existe initialData.endTime

5. **resetForm actualizado**
   - Restaura o limpia estados de endTime según modo

6. **handleConfirm modificado**
   - Ya NO fuerza `endTime = getCurrentTime()` automáticamente
   - Construye endTime desde endDate + endTimeValue solo si `hasEndTime`

7. **UI nueva sección "Hora de fin"**
   - Solo visible en mode === "edit"
   - Botón "+ Agregar hora de fin" si no existe
   - Grid de inputs fecha/hora si existe
   - Botón "x" para quitar hora de fin
   - Color cyan-600 (consistente con modal de actividades)

**Patterns:**
- Mismo patrón que FeedingModal y MedicationModal
- El modal ahora usa editOptions controlados por usuario en vez de auto-calcular endTime
- Color de acento cyan para consistencia visual con el theme del modal

**Notes:** Build pasa correctamente. Próxima tarea: [3.4] NightWakingModal.tsx

---

### Session 7 - 2026-01-27

**Task:** [3.4] - ITEM 6: Agregar endTime a NightWakingModal.tsx

**Files modificados:**
- `components/events/NightWakingModal.tsx` - Agregados campos de edición de hora de fin

**Cambios realizados:**

1. **Imports nuevos**
   - `Plus`, `X` de lucide-react (iconos para botones)

2. **Interface initialData**
   - Agregado campo opcional `endTime?: string`

3. **Nuevos estados**
   - `endDate`: fecha de fin (yyyy-MM-dd)
   - `endTimeValue`: hora de fin (HH:mm)
   - `hasEndTime`: booleano para controlar visibilidad

4. **useEffect de inicialización**
   - Inicializa endDate, endTimeValue, hasEndTime si existe initialData.endTime

5. **handleConfirm modificado**
   - Si `hasEndTime && endTimeValue` → usa hora de fin editada manualmente
   - Si no → calcula endTime automáticamente como startTime + awakeDelay
   - Agrega reset de estados de endTime al final

6. **UI nueva sección "Hora de fin (volvió a dormir)"**
   - Solo visible en mode === "edit"
   - Botón "+ Agregar hora de fin" si no existe
   - Grid de inputs fecha/hora si existe
   - Botón "x" para quitar hora de fin
   - Color indigo-600 (consistente con modal de despertar nocturno)
   - Mensaje informativo si no hay hora de fin manual

7. **Labels actualizados**
   - "Fecha" → "Fecha inicio"
   - "Hora" → "Hora inicio"
   - Para claridad al tener también hora de fin

**Patterns:**
- Mismo patrón que FeedingModal, MedicationModal y ExtraActivityModal
- NightWaking es único: si no se especifica endTime manual, se calcula desde startTime + awakeDelay
- Color indigo para consistencia con theme del modal de despertar nocturno

**Notes:** Build pasa correctamente. Próxima tarea: [3.5] Testing edición hora fin

---

### Session 8 - 2026-01-27

**Task:** [3.5] - Testing edición hora fin

**Files modificados:**
- `components/events/EventEditRouter.tsx` - Agregado endTime a initialData de todos los modales

**Bug encontrado:**
El EventEditRouter no pasaba `endTime` en `initialData` para los modales de edición. Los modales tenían la UI implementada (Sessions 4-7) pero el router no les pasaba el valor del evento original.

**Correcciones:**
1. **MedicationModal** (líneas 121-153):
   - Cambiado onConfirm para aceptar `EditOptions`
   - Agregado `endTime: event.endTime` a initialData
   - Ahora usa `editOptions?.startTime` y `editOptions?.endTime`

2. **FeedingModal** (líneas 194-202):
   - Agregado `endTime: event.endTime` a initialData

3. **ExtraActivityModal** (líneas 225-233):
   - Agregado `endTime: event.endTime` a initialData

4. **NightWakingModal** (líneas 293-300):
   - Agregado `endTime: event.endTime` a initialData

**Patterns:**
- Todos los modales ya tenían la UI de endTime implementada (Sessions 4-7)
- El problema era que el router no pasaba el valor inicial al modal
- Ahora el flujo completo es: API → evento.endTime → initialData → modal → editOptions → updateEvent

**Notes:**
- Build pasa correctamente
- Task 3.5 completada con fixes adicionales necesarios
- Testing E2E completo será en Fase 8

---

### Session 9 - 2026-01-27

**Task:** [4.1, 4.2] - ITEM 5: Tabs por Rol

**Files modificados:**
- `app/dashboard/calendar/page.tsx` - Ocultar toggle Gráfico/Calendario y tab Mensual para padres

**Cambios realizados:**

1. **Toggle Gráfico/Calendario** (líneas 1827-1844)
   - Envuelto en `{isAdminView && (...)}`
   - Solo visible para admin/professional

2. **Tab Mensual** (líneas 1848-1856)
   - Envuelto en `{isAdminView && (...)}` dentro del grupo de tabs
   - Padres solo ven: Diario + Semanal

3. **Lógica condicional de tabs** (línea 1847)
   - Cambiado de `{userViewMode === "calendar" && (...)}`
   - A: `{(isAdminView ? userViewMode === "calendar" : true) && (...)}`
   - Para padres: tabs siempre visibles (no tienen toggle)
   - Para admin: tabs visibles solo en modo calendario

**Patterns:**
- `isAdminView` ya existía: `session?.user?.role === "admin" || session?.user?.role === "professional"`
- Los padres ahora tienen experiencia simplificada: solo Diario y Semanal
- El toggle Gráfico/Calendario es funcionalidad de admin para análisis avanzado

**Notes:**
- Build pasa correctamente
- Próxima tarea: [4.3] Testing roles (será parte de Fase 8 E2E)

---

### Session 10 - 2026-01-27

**Task:** [5.1] - ITEM 1: Cambiar initialLimit a 3 en dashboard

**Files modificados:**
- `app/dashboard/page.tsx` - Línea 590: cambió `initialLimit={5}` a `initialLimit={3}`

**Cambios realizados:**

1. **NarrativeTimeline initialLimit**
   - Reducido de 5 a 3 eventos visibles por default
   - Componente en modo colapsado (`collapsible={true}`)
   - Usuarios verán resumen más compacto
   - Botón "Ver más" disponible para expandir

**Patterns:**
- El componente NarrativeTimeline ya soporta `initialLimit` y `collapsible`
- El cambio es mínimo y directo (una propiedad)
- Mejora UX reduciendo carga visual inicial

**Notes:**
- Build pasa correctamente
- Próxima tarea: [5.2] Asegurar botón expandir siempre visible

---

### Session 11 - 2026-01-27

**Task:** [5.2] - Asegurar botón expandir siempre visible

**Files modificados:**
- `components/narrative/NarrativeTimeline.tsx` - Nueva prop y lógica de visibilidad
- `app/dashboard/page.tsx` - Agregada prop `alwaysShowExpandButton={true}`

**Cambios realizados:**

1. **NarrativeTimelineProps**
   - Nueva prop: `alwaysShowExpandButton?: boolean`
   - Default: `false` (comportamiento original)

2. **Lógica de visibilidad del botón**
   - Antes: `hasMoreEvents = sortedEvents.length > initialLimit`
   - Ahora: `showExpandButton = hasMoreEvents || alwaysShowExpandButton`

3. **Texto del botón contextual**
   - Si hay más eventos: "Ver todo (N más)"
   - Si no hay más pero está expandible: "Ver detalles"
   - Colapsado: "Colapsar"

4. **Dashboard**
   - `alwaysShowExpandButton={true}` para que siempre esté el botón

**Patterns:**
- Prop opt-in mantiene comportamiento por defecto intacto
- Texto contextual "Ver detalles" cuando no hay más eventos ocultos
- Separación clara: `hasMoreEvents` (hay más) vs `showExpandButton` (mostrar botón)

**Notes:**
- Build pasa correctamente
- Próxima tarea: [5.3] Layout responsivo narrativa + calendario

---

### Session 12 - 2026-01-27

**Task:** [5.3] - Layout responsivo narrativa + calendario

**Files modificados:**
- `app/dashboard/page.tsx` - Grid responsivo para narrativa + calendario

**Cambios realizados:**

1. **Grid responsivo**
   - Envuelto narrativa (Card "Hoy") y SleepMetricsCombinedChart en un div grid
   - Clases: `grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6`
   - Móvil: 1 columna (narrativa arriba, calendario abajo)
   - Desktop (lg+): 2 columnas lado a lado

2. **Reordenamiento**
   - Narrativa ahora es el primer hijo del grid (izquierda en desktop)
   - Calendario es el segundo hijo (derecha en desktop)
   - El orden también afecta mobile: narrativa primero, más accesible

3. **Fallback agregado**
   - Si `activeChildId` existe pero `child` aún no se ha cargado, solo muestra calendario
   - Previene errores durante estados de carga

**Patterns:**
- `lg:grid-cols-2` es el breakpoint estándar para side-by-side (1024px+)
- Gap responsivo: `gap-4 md:gap-6` para mejor espaciado en desktop
- El orden del DOM es importante para mobile-first

**Notes:**
- Build pasa correctamente

---

### Session 13 - 2026-01-27

**Task:** [5.4] - Reducir texto en NarrativeTimeline (ITEM 8)

**Files modificados:**
- `lib/narrative/generate-narrative.ts` - Funciones de narrativa simplificadas

**Cambios realizados:**

1. **generateFeedingNarrative()**
   - Antes: "Matías tomó pecho por 15 minutos" / "tomó 120 ml de biberón"
   - Ahora: "Matías tomó pecho" / "tomó biberón 120ml"
   - Eliminada la duración (feedingDuration) de las narrativas
   - Formato más compacto: cantidad pegada a unidad (120ml, 50gr)

2. **generateActivityNarrative()**
   - Antes: "Matías hizo paseo por 30 minutos"
   - Ahora: "Matías hizo paseo"
   - Eliminada la duración (activityDuration) de las narrativas

3. **Narrativas no modificadas:**
   - Sleep/Nap: Mantienen duración porque es el dato principal
   - NightWaking: Mantiene "estuvo despierto X minutos" - dato crítico
   - Medication: Mantiene formato actual (nombre + dosis)
   - Wake: Sin cambios necesarios

**Patterns:**
- El spec pedía: "8:30 AM - Biberón 120ml" (tipo + cantidad, sin duración)
- La hora viene de `generateTimeMetadata()`, no de la narrativa
- La narrativa ahora es más corta y enfocada en el dato principal

**Notes:**
- Build pasa correctamente
- Próxima tarea: [5.5] Remover scroll interno de calendario (ITEM 4)

---

### Session 14 - 2026-01-27

**Task:** [5.5] - Remover scroll interno de calendario (ITEM 4)

**Files modificados:**
- `components/calendar/CalendarDayView.tsx` - Removida altura fija inline
- `components/calendar/CalendarWeekView.tsx` - Removida altura fija inline

**Cambios realizados:**

1. **CalendarDayView.tsx (línea 50)**
   - Antes: `<div className={...} style={{ height: '${24 * hourHeight + 32}px' }}>`
   - Ahora: `<div className={...}>`
   - La altura fija de 752px causaba scroll interno en contenedores más pequeños

2. **CalendarWeekView.tsx (línea 95)**
   - Mismo cambio: removida altura fija inline
   - El contenedor ahora crece naturalmente según su contenido

**Problema original:**
- Los calendarios tenían altura fija de 752px (`24 * 30 + 32`)
- En admin split-screen (50/50), esto generaba scroll interno
- El spec pedía que el calendario crezca y use scroll de página

**Solución:**
- Los contenedores hijos (TimeAxis, eventos) ya definen su propia altura
- El contenedor padre ahora usa altura automática
- El calendario crece con el contenido, scroll de página en lugar de interno

**Patterns:**
- Los sub-contenedores tienen `height: ${24 * hourHeight}px` para las 24 horas
- El header del día tiene `h-8` (32px) fijo
- El total visual es el mismo, pero sin forzar altura en el contenedor padre

**Notes:**
- Build pasa correctamente
- Próxima tarea: [6.1] Crear PlanVsEventsCard.tsx (ITEM 10)

---

### Session 15 - 2026-01-27

**Task:** [6.1, 6.2] - ITEM 10: Card Plan vs Eventos

**Files creados/modificados:**
- `components/calendar/PlanVsEventsCard.tsx` - NUEVO componente
- `components/calendar/index.ts` - Export del nuevo componente
- `app/dashboard/calendar/page.tsx` - Integración en vistas diarias

**Cambios realizados:**

1. **PlanVsEventsCard.tsx** (nuevo)
   - Props: `{ plan, events, selectedDate, timezone }`
   - Layout de 2 columnas: Plan (izquierda) | Eventos (derecha)
   - Si no hay plan activo (isDefault), solo muestra eventos
   - Ordena items cronológicamente por hora
   - Usa iconos de `lib/icons/event-icons.ts` para consistencia
   - Estilo diferenciado: plan en gris tenue, eventos con colores del registry

2. **calendar/index.ts**
   - Export agregado: `export { PlanVsEventsCard } from "./PlanVsEventsCard"`

3. **calendar/page.tsx**
   - Import de PlanVsEventsCard desde components/calendar
   - Vista admin (view === "day"): PlanVsEventsCard arriba de SplitScreenBitacora
   - Vista padre (view === "day"): PlanVsEventsCard arriba de NarrativeTimeline
   - Usa `activePlan` existente y `dayEvents` ya filtrados

**Patterns:**
- El componente reutiliza el estado `activePlan` que ya se cargaba en el calendario
- Usa `getEventIconConfig()` para iconos consistentes con el resto de la app
- Formato de hora "HH:MM" (24h) para simplicidad
- El plan se muestra tenue (gris) para distinguir de eventos reales
- Sin plan activo → solo columna de eventos

**Notes:**
- Build pasa correctamente (errores de lint son pre-existentes)
- El componente devuelve `null` si no hay plan ni eventos
- Próxima tarea: [6.3] Testing Plan vs Eventos

---

### Session 16 - 2026-01-27

**Task:** [7.1] - ITEM 2: Usar getEventIconConfig en admin child profile

**Files modificados:**
- `app/dashboard/patients/child/[childId]/AdminChildDetailClient.tsx` - Reemplazado iconos hardcodeados con registry

**Cambios realizados:**

1. **Imports actualizados**
   - Eliminados: `Moon, Sun, Utensils, UtensilsCrossed, Pill, Activity, Baby` (iconos individuales)
   - Agregado: `getEventIconConfig` desde `@/lib/icons/event-icons`

2. **getEventIcon() refactorizado**
   - Antes: Switch-case de 25 líneas con iconos hardcodeados
   - Ahora: 3 líneas usando `getEventIconConfig(eventType, feedingType)`
   - El color se aplica via `style={{ color: config.color }}`

3. **Función formatDuration eliminada**
   - No estaba siendo usada (dead code)
   - `getEventTypeName` se mantiene porque se usa en DeleteConfirmationModal

**Inconsistencias corregidas:**
- `nap` ahora usa `CloudMoon` (violet) en lugar de `Sun` (amber)
- `feeding_breast` ahora usa `Heart` (pink) en lugar de `Utensils` (green)
- `feeding_bottle` ahora usa `Milk` (sky) en lugar de `Utensils` (green)
- Todos los iconos ahora tienen colores consistentes con el registry central

**Patterns:**
- El registry `lib/icons/event-icons.ts` es la única fuente de verdad para iconos
- Los componentes solo llaman a `getEventIconConfig()` sin duplicar lógica
- El color se aplica via inline style para usar valores hex del registry

**Notes:**
- Build pasa correctamente
- Próxima tarea: [7.2] Testing consistencia iconos (será parte de Fase 8 E2E)

---

### Session 17 - 2026-01-27

**Task:** [8.1.1] - Test Home Dashboard (Desktop)

**Test:** E2E visual testing del Home Dashboard en Desktop (1280px)
**Resultado:** ✅ PASS
**Screenshot:** `test-screenshots/8.1.1-desktop-home.png`

**Checkpoints verificados:**
- [x] Saludo personalizado: "¡Buenas noches, Julius!"
- [x] Botones de eventos visibles (DORMIR, ALIMENTACIÓN, MEDICAMENTO, ACTIVIDAD)
- [x] NarrativeTimeline ("Hoy") visible
- [x] Layout side-by-side (narrativa izquierda, calendario/métricas derecha)
- [x] Plan Summary con horarios visible
- [x] Métricas de sueño visibles (06:00, 7h 30m, 20:00)

**Observaciones:**
- El niño está en estado "despierto" (botón "DORMIR" visible)
- La narrativa muestra "Cargando registros recientes..." inicialmente
- Layout responsivo funciona correctamente en 1280px
- Colores y gradientes se muestran correctamente
- No hay elementos cortados ni overflow

**Decisiones tomadas:**
- Playwright instalado para tests E2E automatizados
- Scripts de test guardados en `test-screenshots/` para reutilización
