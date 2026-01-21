# Implementation Plan: Vista Narrativa, Taxonomia Visual y Split Screen

Generado desde: `docs/dev-qa/SPEC-SPRINT.md`
Fecha: 2026-01-20

---

## Credenciales de Testing (Playwright MCP)

| Rol | Email | Password |
|-----|-------|----------|
| **Admin** | `mariana@admin.com` | `password` |
| **Padre** | `eljulius@nebulastudios.io` | `juls0925` |

---

## Fase 0: Activation & Smoke Test

- [x] **0.1** Crear archivo `lib/icons/event-icons.ts` con estructura base
  - Output: Archivo exporta `EVENT_ICONS` y `getEventIconType()`
  - Comportamiento: Retorna config de icono segun eventType + feedingType
  - Referencia: ver `components/calendar/EventGlobe.tsx:117-134` para mapa actual

Validacion Fase 0:
• `npm run build` pasa
• Archivo importable sin errores

---

## Fase 1: Taxonomia Visual - Registry de Iconos

- [x] **1.1** Implementar `EVENT_ICONS` record completo
  - Input: EventType (sleep, nap, wake, feeding, etc.)
  - Output: `{ icon: LucideIcon, color: string, bgColor: string, label: string }`
  - Comportamiento:
    - `feeding_breast` -> Heart (pink)
    - `feeding_bottle` -> Milk (sky)
    - `feeding_solids` -> UtensilsCrossed (emerald)
    - `nap` -> CloudMoon (violet) - diferente a sleep
  - Referencia: ver mapa de iconos en spec lines 77-89

- [x] **1.2** Modificar `EventGlobe.tsx` para usar nuevo registry
  - Input: Importar `getEventIconType()` y `EVENT_ICONS`
  - Output: Iconos renderizados con colores correctos
  - Comportamiento: Reemplazar switch case por lookup en registry
  - Referencia: `EventGlobe.tsx:117-134` (codigo actual a reemplazar)

- [x] **1.3** Modificar `EventBlock.tsx` para usar nuevo registry
  - Input: Importar `getEventIconType()` y `EVENT_ICONS`
  - Output: Iconos consistentes con EventGlobe
  - Comportamiento: Mismo lookup que EventGlobe
  - Referencia: `EventBlock.tsx` (buscar getIcon o switch de iconos)

Validacion Fase 1 (Playwright MCP):
• Login como Padre -> `/dashboard/calendar?view=week`
• Verificar: feeding-breast=Heart(pink), feeding-bottle=Milk(sky), feeding-solids=UtensilsCrossed(emerald)
• Verificar: nap=CloudMoon(violet), sleep=Moon(indigo)
• Screenshot: `taxonomy-icons-phase1.png`

---

## Fase 2: Componentes Narrativos - Logica

- [x] **2.1** Crear `lib/narrative/generate-narrative.ts`
  - Input: `(childName: string, event: NarrativeEvent)`
  - Output: String con oracion en espanol
  - Comportamiento:
    - `feeding + breast` -> "[nombre] tomo pecho por [X] minutos"
    - `feeding + bottle` -> "[nombre] tomo [X] ml de biberon"
    - `sleep` con endTime -> "[nombre] durmio de [hora] a [hora]"
    - Dato faltante -> omitir (NO placeholder)
  - Referencia: ver spec lines 52-61

- [ ] **2.2** Crear test Jest para `generateNarrative()`
  - Input: Casos de prueba por tipo de evento
  - Output: Tests pasan
  - Comportamiento: Verificar cada formato de narrativa
  - Referencia: crear en `__tests__/lib/narrative/generate-narrative.test.ts`

Validacion Fase 2:
• `npm test -- generate-narrative` pasa
• Todos los casos cubren formatos del spec

---

## Fase 3: Componentes Narrativos - UI

- [ ] **3.1** Crear `components/narrative/NarrativeCard.tsx`
  - Props: `{ event, childName, isHighlighted?, onClick?, onEdit? }`
  - Render: Icono circular + texto narrativo + hora + chevron
  - Comportamiento: Click en chevron llama `onEdit`, click en card llama `onClick`
  - Referencia: ver shadcn Card, anatomia en spec lines 36-48

- [ ] **3.2** Crear `components/narrative/NarrativeTimeline.tsx`
  - Props: `{ events, childName, highlightedEventId?, collapsible?, initialLimit? }`
  - Render: Lista de NarrativeCards ordenadas cronologico inverso
  - Comportamiento:
    - `collapsible=true` -> muestra boton "Ver todo/Colapsar"
    - `initialLimit=5` -> muestra solo 5 primeros
    - Empty state: "No hay eventos registrados hoy"
  - Referencia: ver spec lines 64-77

- [ ] **3.3** Agregar skeleton loader y empty state
  - Input: `isLoading` prop en NarrativeTimeline
  - Output: Skeleton circular + lineas mientras carga
  - Comportamiento: Mostrar 5 skeletons por defecto
  - Referencia: ver shadcn Skeleton

Validacion Fase 3 (Playwright MCP):
• Login como Padre -> `/dashboard`
• Verificar: tarjetas con icono, texto, hora, chevron
• Verificar: exactamente 5 tarjetas visibles
• Screenshot: `narrative-cards-structure.png`

---

## Fase 4: Integracion Home Padres

- [ ] **4.1** Integrar NarrativeTimeline en dashboard Home
  - Input: Eventos del dia actual
  - Output: Feed de narrativa visible en Home
  - Comportamiento: `collapsible=true, initialLimit=5`
  - Referencia: ver `app/dashboard/page.tsx` o similar

- [ ] **4.2** Implementar "Ver todo" / "Colapsar"
  - Input: Click en boton
  - Output: Lista expande/colapsa
  - Comportamiento: Estado NO persiste (siempre inicia colapsado)
  - Referencia: spec lines 64-69

Validacion Fase 4 (Playwright MCP):
• Login como Padre -> `/dashboard`
• Verificar: 5 tarjetas iniciales
• Click "Ver todo" -> mas de 5 tarjetas
• Click "Colapsar" -> 5 tarjetas
• Refresh -> 5 tarjetas (no persiste)
• Click chevron -> modal de edicion abre
• Screenshots: `home-collapsed.png`, `home-expanded.png`

---

## Fase 5: Split Screen Context

- [ ] **5.1** Crear `context/SplitScreenContext.tsx`
  - Props: `selectedEventId`, `highlightedEventId`, `selectEvent()`, `clearSelection()`
  - Render: Provider que envuelve children
  - Comportamiento:
    - `selectEvent(id, source)` -> setea highlight + timeout 6s para clear
    - Click rapido cancela timeout anterior
  - Referencia: spec lines 135-145

- [ ] **5.2** Agregar animacion highlight-fade a Tailwind
  - Input: Nueva keyframe en tailwind.config.js
  - Output: Clase `animate-highlight-fade` disponible
  - Comportamiento: Fade de amarillo a transparente en 6s
  - Referencia: spec fase 5 lines 644-671

Validacion Fase 5:
• Build pasa
• Clase `animate-highlight-fade` existe

---

## Fase 6: Split Screen Bitacora Admin

- [ ] **6.1** Crear `components/bitacora/SplitScreenBitacora.tsx`
  - Props: `{ events, sleepSessions, childName, selectedDate }`
  - Render: Grid 50/50 - Calendario | Narrativa
  - Comportamiento:
    - Desktop (>=1024px): 2 columnas
    - Tablet (<1024px): stack vertical o tabs
  - Referencia: spec lines 34-59

- [ ] **6.2** Implementar mirroring Calendario -> Narrativa
  - Input: Click en bloque de calendario
  - Output: Narrativa hace scroll + highlight
  - Comportamiento: scrollIntoView smooth + clase highlight-fade
  - Referencia: spec lines 137-139

- [ ] **6.3** Implementar mirroring Narrativa -> Calendario
  - Input: Click en tarjeta de narrativa
  - Output: Calendario hace scroll + highlight
  - Comportamiento: scrollIntoView smooth + clase highlight-fade
  - Referencia: spec lines 141-143

- [ ] **6.4** Implementar doble click para editar
  - Input: Doble click en bloque o tarjeta
  - Output: Modal de edicion abre
  - Comportamiento: Reusar EventEditRouter existente
  - Referencia: `components/events/EventEditRouter.tsx`

- [ ] **6.5** Integrar SplitScreenBitacora en pagina admin
  - Input: Pagina de bitacora de paciente
  - Output: Split screen visible para admin
  - Comportamiento: Solo admin ve split screen
  - Referencia: `/dashboard/patients/child/[id]` o similar

Validacion Fase 6 (Playwright MCP):
• Login como Admin -> bitacora de paciente
• Verificar: layout 50/50 en desktop
• Click bloque calendario -> narrativa scroll + highlight
• Click tarjeta narrativa -> calendario scroll + highlight
• Esperar 7s -> highlight desaparece
• Doble click -> modal de edicion abre
• Resize 768px -> layout colapsa
• Screenshots: `split-screen-layout.png`, `mirroring-calendar.png`, `mirroring-narrative.png`

---

## Fase 7: Bug Fix - Eventos Fragmentados en Sesiones de Sueno

- [ ] **7.1** Agregar campo `overlayEvents` a interface SleepSession
  - Input: Modificar `lib/utils/sleep-sessions.ts`
  - Output: Interface tiene `overlayEvents: Event[]`
  - Referencia: `sleep-sessions.ts:17-27`

- [ ] **7.2** Modificar `processSleepSessions()` para detectar overlays
  - Input: Eventos durante rango de sleep
  - Output: `overlayEvents` contiene feeding/medication durante sueno
  - Comportamiento:
    - Filtrar eventos con startTime dentro de [sleep.startTime, sleep.endTime]
    - Excluir night_waking (ya capturado)
    - Agregar a session.overlayEvents
  - Referencia: `sleep-sessions.ts:82-90`

- [ ] **7.3** Crear test Jest para overlayEvents
  - Input: Mock de eventos con feedings durante sueno
  - Output: Test verifica que overlayEvents contiene los correctos
  - Referencia: crear en `__tests__/lib/utils/sleep-sessions.test.ts`

- [ ] **7.4** Modificar `SleepSessionBlock` para renderizar overlays
  - Input: `overlayEvents` del session
  - Output: Eventos renderizados dentro del bloque de sueno
  - Comportamiento: Overlays con z-index mayor, mismo ancho que bloque base
  - Referencia: `SleepSessionBlock.tsx`

- [ ] **7.5** Excluir overlayEvents de calculateEventColumns
  - Input: Modificar `CalendarWeekView.tsx`
  - Output: Eventos durante sueno NO se fragmentan
  - Comportamiento: Filtrar eventos que ya estan en overlayEvents de alguna sesion
  - Referencia: `CalendarWeekView.tsx:246-282`

Validacion Fase 7 (Jest + Playwright MCP):
• `npm test -- sleep-sessions` pasa
• Login como Padre -> `/dashboard/calendar?view=week`
• Verificar: eventos durante sueno NO fragmentados en columnas
• Verificar: overlays alineados verticalmente dentro del bloque
• Verificar: bloque de sueno base es UNA barra continua
• Click overlay -> modal de edicion correcto
• Screenshots: `sleep-overlays-AFTER-fix.png`

---

## Fase 8: QA Final y Regression Testing

- [ ] **8.1** Test suite completo Admin
  - Verificar: Split screen, mirroring bidireccional, highlight fade, doble click editar

- [ ] **8.2** Test suite completo Padre
  - Verificar: Home feed 5 eventos, Ver todo/Colapsar, click chevron editar

- [ ] **8.3** Test suite Responsive
  - Verificar: Mobile (375px), Tablet (768px), Desktop (1440px)

- [ ] **8.4** Test suite Edge Cases
  - Verificar: Dia sin eventos, evento en progreso, datos incompletos

- [ ] **8.5** Test suite Regression
  - Verificar: Registro eventos funciona, calendario funciona, edicion funciona

Validacion Fase 8 (Playwright MCP):
• Todos los tests anteriores pasan
• Screenshots finales documentan estado completo
• Build de produccion pasa

---

## Summary

| Fase | Tareas | Descripcion |
|------|--------|-------------|
| 0 | 1 | Activation |
| 1 | 3 | Taxonomia Visual |
| 2 | 2 | Narrativa Logica + Tests |
| 3 | 3 | Narrativa UI |
| 4 | 2 | Home Padres |
| 5 | 2 | Split Screen Context |
| 6 | 5 | Split Screen Admin |
| 7 | 5 | Bug Fix Overlays |
| 8 | 5 | QA Final |
| **Total** | **28** | |
