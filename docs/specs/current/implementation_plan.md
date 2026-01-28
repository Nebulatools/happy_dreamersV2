# Implementation Plan: QA Feedback Sprint 2026-01-26

Generado desde: `docs/specs/current/SPRINT-QA-FEEDBACK-2026-01-26.md`
Fecha: 2026-01-27

---

## Credenciales de Testing

| Rol | Email | Password |
|-----|-------|----------|
| Admin | mariana@admin.com | password |
| Padre | eljulius@nebulastudios.io | juls0925 |

---

## Fase 0: Verificación Pre-Sprint

- [x] **0.1** Verificar ITEM 3 - Siestas en lavanda
  - Comportamiento: Abrir calendario, verificar que NAP usa color violet/lavanda
  - Validar: Visual inspection en timeline
  - Referencia: `lib/icons/event-icons.ts` - nap debe usar violet

- [x] **0.2** Verificar ITEM 7 - Estilos nocturnos
  - Comportamiento: Verificar que bloques de sueño nocturno tienen estilo diferenciado
  - Validar: Visual inspection en timeline nocturno (después de 20:00)
  - Referencia: `components/calendar/SleepSessionBlock.tsx`

Validación Fase 0:
• Ambos items visualizados correctamente
• Si hay problemas, documentar en discoveries.md

---

## Fase 1: Estado por Niño (ITEM 9) - CRÍTICO

- [x] **1.1** Remover localStorage de use-sleep-state.ts
  - Input: `hooks/use-sleep-state.ts`
  - Output: Hook que SOLO usa API, sin localStorage
  - Comportamiento: Eliminar lectura de `pending_sleep_event_*` y `pending_night_wake_*`
  - Referencia: Líneas 49-82 tienen lógica de localStorage a eliminar

- [x] **1.2** Remover localStorage de SleepButton.tsx
  - Input: `components/events/SleepButton.tsx`
  - Output: Componente sin sleepStorageKey ni nightWakeStorageKey
  - Comportamiento: Eliminar líneas 63-64 y useEffect que lee localStorage
  - Referencia: Estado viene de useSleepState que usa SWR + API

- [x] **1.3** Verificar endpoint current-sleep-state
  - Input: `app/api/children/[id]/current-sleep-state/route.ts`
  - Output: Endpoint retorna estado calculado desde BD
  - Comportamiento: Verificar lógica de último sleep vs wake
  - Referencia: Líneas 70-156

- [x] **1.4** Testing multi-dispositivo (→ movido a 8.3.1 E2E)
  - Comportamiento: Login con padre en 2 browsers, registrar sleep en uno, verificar estado en otro
  - Validar: Ambos ven mismo estado sin refresh manual

Validación Fase 1:
• `pnpm build` pasa
• Estado sincroniza entre dispositivos
• No hay referencias a localStorage para sleep state

---

## Fase 2: Alimentación Nocturna (ITEM 11)

- [x] **2.1** Crear NightFeedingButton.tsx
  - Props: `{ childId, childName, onEventRegistered }`
  - Output: Botón que abre FeedingModal con isNightFeeding=true preseleccionado
  - Comportamiento: Click → Modal → Registra feeding sin cambiar estado de sueño
  - Referencia: `components/events/FeedingButton.tsx` para estructura similar

- [x] **2.2** Integrar en EventRegistration.tsx
  - Input: `components/events/EventRegistration.tsx`
  - Output: Botón visible SOLO cuando sleepState.status === 'sleeping' || 'napping'
  - Comportamiento: Renderizar NightFeedingButton condicionalmente
  - Referencia: Líneas 43-53 para lógica de visibilidad existente

Validación Fase 2:
• `pnpm build` pasa
• Botón aparece solo cuando niño duerme
• Registrar alimentación nocturna NO despierta al niño

---

## Fase 3: Edición Hora Fin (ITEM 6)

- [x] **3.1** Agregar endTime a FeedingModal.tsx
  - Input: `components/events/FeedingModal.tsx`
  - Output: Modal con campos endDate/endTime en modo edit
  - Comportamiento: Mostrar inputs solo si mode === "edit" && initialData?.endTime
  - Referencia: `components/events/SleepDelayModal.tsx:76-90` para patrón

- [x] **3.2** Agregar endTime a MedicationModal.tsx
  - Input: `components/events/MedicationModal.tsx`
  - Output: Modal con campos endDate/endTime en modo edit
  - Comportamiento: Mismo patrón que FeedingModal
  - Referencia: `components/events/SleepDelayModal.tsx:76-90`

- [x] **3.3** Agregar endTime a ExtraActivityModal.tsx
  - Input: `components/events/ExtraActivityModal.tsx`
  - Output: Modal con campos endDate/endTime en modo edit
  - Comportamiento: Mismo patrón que FeedingModal
  - Referencia: `components/events/SleepDelayModal.tsx:76-90`

- [x] **3.4** Agregar endTime a NightWakingModal.tsx
  - Input: `components/events/NightWakingModal.tsx`
  - Output: Modal con campos endDate/endTime en modo edit
  - Comportamiento: Mismo patrón que FeedingModal
  - Referencia: `components/events/SleepDelayModal.tsx:76-90`

- [ ] **3.5** Testing edición hora fin
  - Comportamiento: Editar evento en timeline, cambiar hora fin, guardar
  - Validar: Evento actualizado con nueva hora fin

Validación Fase 3:
• `pnpm build` pasa
• Todos los modales permiten editar hora fin en modo edit
• API acepta y guarda endTime modificado

---

## Fase 4: Tabs por Rol (ITEM 5)

- [ ] **4.1** Ocultar tab Mensual para padres
  - Input: `app/dashboard/calendar/page.tsx`
  - Output: Tab "Mensual" visible SOLO si isAdminView
  - Comportamiento: Envolver botón Mensual en {isAdminView && ...}
  - Referencia: Líneas 1846-1874

- [ ] **4.2** Ocultar toggle Gráfico/Calendario para padres
  - Input: `app/dashboard/calendar/page.tsx`
  - Output: Toggle visible SOLO si isAdminView
  - Comportamiento: Envolver toggle en {isAdminView && ...}
  - Referencia: Líneas 1828-1845

- [ ] **4.3** Testing roles
  - Comportamiento: Login como padre, verificar solo Diario + Semanal. Login como admin, verificar todos los tabs
  - Validar: Tabs correctos por rol

Validación Fase 4:
• `pnpm build` pasa
• Padre ve: Diario, Semanal
• Admin ve: Diario, Semanal, Mensual, Gráfico

---

## Fase 5: Vista Narrativa Home (ITEM 1, 8, 4)

- [ ] **5.1** Cambiar initialLimit a 3 en dashboard
  - Input: `app/dashboard/page.tsx`
  - Output: NarrativeTimeline con initialLimit={3}
  - Comportamiento: Mostrar solo 3 eventos colapsados por default
  - Referencia: Buscar NarrativeTimeline en el archivo

- [ ] **5.2** Asegurar botón expandir siempre visible
  - Input: `app/dashboard/page.tsx` o `components/narrative/NarrativeTimeline.tsx`
  - Output: Botón "Ver más" visible aunque haya <=3 eventos
  - Comportamiento: showExpandButton={true} o prop equivalente

- [ ] **5.3** Layout responsivo narrativa + calendario
  - Input: `app/dashboard/page.tsx`
  - Output: Grid responsive: mobile vertical, desktop side-by-side
  - Comportamiento: `grid-cols-1 lg:grid-cols-2`
  - Referencia: Tailwind responsive patterns

- [ ] **5.4** Reducir texto en NarrativeTimeline (ITEM 8)
  - Input: `components/narrative/NarrativeTimeline.tsx`
  - Output: Formato "8:30 AM - Biberón 120ml" (sin duración)
  - Comportamiento: Modificar función de formateo de texto
  - Referencia: Ver función que genera texto de eventos

- [ ] **5.5** Remover scroll interno de calendario (ITEM 4)
  - Input: `components/calendar/CalendarMain.tsx`
  - Output: Calendario sin height fija ni overflow-auto
  - Comportamiento: Usar height: auto, overflow: visible
  - Referencia: Buscar estilos de contenedor del calendario

Validación Fase 5:
• `pnpm build` pasa
• Home muestra 3 eventos colapsados
• Layout responsivo funciona
• Texto reducido en eventos
• Calendario crece sin scroll interno

---

## Fase 6: Card Plan vs Eventos (ITEM 10)

- [ ] **6.1** Crear PlanVsEventsCard.tsx
  - Props: `{ plan, events, selectedDate, timezone }`
  - Output: Card con 2 columnas (Plan | Eventos)
  - Comportamiento: Si no hay plan, solo mostrar eventos. Eventos extras se incrustan cronológicamente
  - Referencia: `components/ui/card.tsx` para estructura base

- [ ] **6.2** Integrar card en calendar page
  - Input: `app/dashboard/calendar/page.tsx`
  - Output: PlanVsEventsCard renderizado ARRIBA del calendario
  - Comportamiento: Visible en vista diaria para ambos roles
  - Referencia: Ver estructura actual de vista diaria

- [ ] **6.3** Testing Plan vs Eventos
  - Comportamiento: Verificar card con niño CON plan y SIN plan
  - Validar: Layout correcto en ambos casos

Validación Fase 6:
• `pnpm build` pasa
• Card visible arriba del calendario
• Funciona con y sin plan activo

---

## Fase 7: Iconos Admin (ITEM 2)

- [ ] **7.1** Usar getEventIconConfig en admin child profile
  - Input: `app/dashboard/patients/child/[id]/page.tsx`
  - Output: Tab Eventos usa iconos del registry centralizado
  - Comportamiento: Importar getEventIconConfig, reemplazar iconos hardcodeados
  - Referencia: `lib/icons/event-icons.ts`

- [ ] **7.2** Testing consistencia iconos
  - Comportamiento: Comparar iconos en admin vs dashboard de padres
  - Validar: Mismos iconos en todas las vistas

Validación Fase 7:
• `pnpm build` pasa
• Iconos consistentes en toda la app

---

## Fase 8: E2E Testing Exhaustivo con Agent Browser

**IMPORTANTE**: Esta fase es OBLIGATORIA. El sprint NO está completo hasta que TODOS los tests pasen. Los padres usan principalmente MÓVIL, así que el testing móvil es CRÍTICO.

**MODO HEADED (OBLIGATORIO)**: Ejecutar agent-browser en modo `--headed` para que el usuario pueda observar el testing en tiempo real. NO usar modo headless.

```bash
# Ejemplo de comando con headed mode
agent-browser --headed --url "http://localhost:3000" ...
```

### 8.1 Testing Visual Desktop - Vista Padre

- [ ] **8.1.1** Test Home Dashboard (Desktop)
  - Input: Login como padre en http://localhost:3000
  - Output: Screenshot `test-desktop-home.png`
  - Comportamiento:
    - Verificar narrativa con 3 eventos colapsados
    - Verificar botón "Ver más" visible
    - Verificar layout side-by-side (narrativa + calendario)
    - Verificar botones de eventos (SleepButton, etc.)
  - Validar: Sin elementos cortados, sin overflow, sin errores en consola

- [ ] **8.1.2** Test Calendario Vista Diaria (Desktop)
  - Input: Navegar a /dashboard/calendar
  - Output: Screenshot `test-desktop-calendar-daily.png`
  - Comportamiento:
    - Verificar SOLO tabs Diario + Semanal (NO Mensual, NO Gráfico)
    - Verificar card Plan vs Eventos arriba del calendario
    - Verificar calendario sin scroll interno
    - Verificar eventos con iconos correctos
  - Validar: Tabs correctos para rol padre

- [ ] **8.1.3** Test Calendario Vista Semanal (Desktop)
  - Input: Click en tab Semanal
  - Output: Screenshot `test-desktop-calendar-weekly.png`
  - Comportamiento:
    - Verificar gráfico sin scroll interno
    - Verificar datos de la semana visibles
  - Validar: Layout completo sin scroll interno

### 8.2 Testing Móvil - CRÍTICO (375px width)

**REGLA**: Los padres usan MÓVIL. Todo debe verse PERFECTO en 375px. Si algo se ve apretado, cortado, o mal alineado, Ralph tiene LIBERTAD de ajustar el layout móvil.

- [ ] **8.2.1** Test Home Dashboard (Móvil 375px)
  - Input: Resize viewport a 375px width
  - Output: Screenshot `test-mobile-home.png`
  - Comportamiento:
    - Verificar narrativa ARRIBA, calendario ABAJO (vertical)
    - Verificar botones de eventos no se salen del viewport
    - Verificar texto legible, no truncado
    - Verificar espaciado adecuado (no apretado)
  - Validar: Usabilidad perfecta con un dedo
  - **Si hay problemas**: Ralph puede ajustar paddings, font-sizes, flex-wrap

- [ ] **8.2.2** Test EventRegistration Botones (Móvil)
  - Input: Home con niño despierto
  - Output: Screenshot `test-mobile-buttons-awake.png`
  - Comportamiento:
    - Verificar todos los botones visibles sin scroll horizontal
    - Verificar botones tienen tamaño táctil adecuado (min 44px height)
    - Click en botón de dormir → verificar modal se ve bien en móvil
  - Validar: Botones accesibles con pulgar

- [ ] **8.2.3** Test Botón Alimentación Nocturna (Móvil)
  - Input: Registrar que niño duerme, luego verificar botones
  - Output: Screenshot `test-mobile-buttons-sleeping.png`
  - Comportamiento:
    - Verificar botón "Alimentación Nocturna" visible
    - Verificar botón "SE DESPERTÓ" visible
    - Verificar no hay overflow ni elementos cortados
  - Validar: Ambos botones accesibles

- [ ] **8.2.4** Test Calendario Vista Diaria (Móvil)
  - Input: Navegar a /dashboard/calendar en móvil
  - Output: Screenshot `test-mobile-calendar-daily.png`
  - Comportamiento:
    - Verificar tabs Diario + Semanal visibles y clickeables
    - Verificar card Plan vs Eventos legible
    - Verificar calendario ocupa ancho completo
    - Verificar eventos clickeables para editar
  - Validar: Toda la UI funcional en móvil

- [ ] **8.2.5** Test Modales en Móvil
  - Input: Click en evento para editar
  - Output: Screenshot `test-mobile-modal-edit.png`
  - Comportamiento:
    - Verificar modal no se sale de pantalla
    - Verificar campos de fecha/hora accesibles
    - Verificar botones de confirmar/cancelar visibles
    - Verificar campos de hora FIN visibles en modo edit
  - Validar: Modal usable sin scroll excesivo

- [ ] **8.2.6** Test Narrativa Expandida (Móvil)
  - Input: Click en "Ver más" en narrativa
  - Output: Screenshot `test-mobile-narrative-expanded.png`
  - Comportamiento:
    - Verificar todos los eventos visibles
    - Verificar texto reducido (tipo + cantidad, sin duración)
    - Verificar iconos correctos por tipo de evento
  - Validar: Lista legible y scrolleable

### 8.3 Testing Funcional por Item

- [ ] **8.3.1** Test ITEM 9: Sincronización Multi-Dispositivo
  - Input: 2 ventanas de browser (simular 2 dispositivos)
  - Output: Documentar resultado en discoveries.md
  - Comportamiento:
    - Browser 1: Login padre, registrar "SE DURMIÓ"
    - Browser 2: Login mismo padre, verificar estado = dormido SIN refresh
    - Browser 2: Registrar "SE DESPERTÓ"
    - Browser 1: Verificar estado = despierto SIN refresh
  - Validar: Estado sincroniza vía API, NO localStorage

- [ ] **8.3.2** Test ITEM 11: Alimentación Nocturna
  - Input: Niño en estado dormido
  - Output: Documentar resultado
  - Comportamiento:
    - Verificar botón "Alimentación Nocturna" aparece
    - Click → Modal → Registrar alimentación
    - Verificar niño SIGUE DORMIDO después de registrar
    - Verificar evento tiene isNightFeeding: true
  - Validar: Estado no cambia, evento se registra correctamente

- [ ] **8.3.3** Test ITEM 6: Edición Hora Fin
  - Input: Evento existente con endTime
  - Output: Documentar resultado
  - Comportamiento:
    - Click en evento para editar
    - Verificar campos endDate y endTime visibles
    - Cambiar hora fin
    - Guardar y verificar cambio persistió
  - Validar: Hora fin editable en todos los modales

- [ ] **8.3.4** Test ITEM 5: Tabs por Rol
  - Input: Login como padre y como admin
  - Output: Screenshots comparativos
  - Comportamiento:
    - Padre: Verificar SOLO Diario + Semanal
    - Admin: Verificar Diario + Semanal + Mensual + Gráfico
  - Validar: Tabs correctos por rol

### 8.4 Testing Admin (Desktop)

- [ ] **8.4.1** Test Vista Admin Split Screen
  - Input: Login como admin, ir a calendario diario
  - Output: Screenshot `test-admin-split.png`
  - Comportamiento:
    - Verificar vista 50/50 (calendario + narrativa)
    - Verificar calendario sin scroll interno
    - Verificar todos los tabs visibles
  - Validar: Layout admin completo

- [ ] **8.4.2** Test Iconos en Admin Child Profile
  - Input: Navegar a /dashboard/patients/child/[id] → tab Eventos
  - Output: Screenshot `test-admin-child-events.png`
  - Comportamiento:
    - Verificar iconos de alimentación diferenciados (biberón, pecho, sólidos)
    - Comparar con iconos en dashboard de padre
  - Validar: Iconos consistentes en toda la app

---

## REGLAS CRÍTICAS DE TESTING

**NO TERMINAR HASTA QUE TODO PASE:**

1. **NO CERRAR BROWSER** si encuentra bugs visuales o funcionales
2. **DOCUMENTAR** cada bug en discoveries.md con screenshot
3. **ITERAR Y FIXEAR** antes de continuar al siguiente test
4. **SOLO MARCAR [x]** cuando el test pase COMPLETAMENTE
5. **LIBERTAD MÓVIL**: Si algo se ve mal en móvil (apretado, cortado, overflow), Ralph puede ajustar:
   - Paddings y margins
   - Font sizes
   - Flex direction y wrap
   - Grid columns
   - Breakpoints
6. **MAX 10 INTENTOS** por bug - si persiste → RALPH_BLOCKED
7. **SCREENSHOTS OBLIGATORIOS** para cada test visual

**Checklist Final:**
- [ ] Todos los screenshots guardados
- [ ] Todos los tests funcionales pasan
- [ ] Móvil se ve PERFECTO (no solo "funciona")
- [ ] Sin errores en consola del browser
- [ ] Documentado en discoveries.md

Validación Fase 8:
• 12+ screenshots guardados en carpeta de proyecto
• TODOS los tests marcados [x]
• Móvil 375px usable con un dedo
• Sin bugs pendientes documentados
• Browser permanece abierto para inspección manual final

---

## Summary

| Fase | Tareas | Descripción | Items |
|------|--------|-------------|-------|
| 0 | 2 | Verificación pre-sprint | 3, 7 |
| 1 | 4 | Estado por niño (crítico) | 9 |
| 2 | 2 | Alimentación nocturna | 11 |
| 3 | 5 | Edición hora fin | 6 |
| 4 | 3 | Tabs por rol | 5 |
| 5 | 5 | Vista narrativa + scroll | 1, 4, 8 |
| 6 | 3 | Plan vs Eventos | 10 |
| 7 | 2 | Iconos admin | 2 |
| **8** | **14** | **E2E Testing exhaustivo** | **TODOS** |
| **Total** | **40** | | |

---

## Prioridad de Testing Móvil

```
CRÍTICO: Los padres usan MÓVIL (375px)

Viewport de testing:
- Desktop: 1280px+
- Tablet: 768px (opcional)
- Móvil: 375px (OBLIGATORIO)

Ralph tiene LIBERTAD de ajustar layouts móviles:
✓ Cambiar paddings/margins
✓ Reducir font-sizes
✓ Cambiar flex-direction
✓ Apilar elementos verticalmente
✓ Ajustar breakpoints

Lo que importa: USABILIDAD con un dedo
```

---

**Última actualización:** 2026-01-27
