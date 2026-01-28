# QA Release Notes - Sprint Actual

**Fecha:** 2026-01-28
**Sprint:** Mejoras UX Calendario, Edicion de Eventos, Sync y Orden Cronologico
**URL:** http://localhost:3000

---

## Resumen de Cambios

| Item | Descripcion | Estado |
|------|-------------|--------|
| Item 1 | Home: NarrativeTimeline con limite 3, grid responsive, boton expandir siempre visible | COMPLETADO |
| Item 2 | Iconos centralizados en perfil admin del nino | COMPLETADO |
| Item 4 | Eliminar scroll interno fijo en calendario | COMPLETADO |
| Item 5 | Ocultar tab Mensual y toggle Grafico/Calendario para padres | COMPLETADO |
| Item 6 | Edicion de endTime en todos los modales (Feeding, Medication, ExtraActivity, NightWaking) | COMPLETADO |
| Item 8 | Reducir texto en NarrativeTimeline | COMPLETADO |
| Item 9 | Eliminar localStorage para sleep state, usar solo API | COMPLETADO |
| Item 10 | Card Plan vs Eventos comparativa en vista diaria | COMPLETADO |
| Item 11 | Boton NightFeeding para alimentacion durante sueno | COMPLETADO |
| Fix | Vista por defecto = Calendario (no Eventos) para padres | COMPLETADO |
| Fix | Altura del contenedor calendario corregida para padres | COMPLETADO |
| Fix | Fondos neutros en tabs EventsCalendarTabs | COMPLETADO |
| Fix | Iconos estandarizados en EventsCalendarTabs | COMPLETADO |
| Fix | Eliminar selector redundante de baby state en FeedingModal | COMPLETADO |
| Fix | Sync instantaneo de eventos sleep/nap entre navegadores | COMPLETADO |
| Fix | Orden cronologico ascendente en NarrativeTimeline del calendario | COMPLETADO |

---

## TEST 1: Home - NarrativeTimeline con limite 3 y grid responsive

**Ruta:** `/dashboard` (Home del padre)

### Pasos

1. Login como USUARIO/PADRE (eljulius@nebulastudios.io / juls0925)
2. Ir al Dashboard principal (Home)
3. Localizar la seccion de eventos narrativos

### Verificar

- [ ] Muestra maximo 3 eventos por defecto (no 5)
- [ ] Boton "Ver todo" SIEMPRE visible (aunque haya menos de 3 eventos)
- [ ] Layout responsive: narrativa + calendario lado a lado en desktop
- [ ] Click en "Ver todo" expande la lista completa
- [ ] Click en "Colapsar" vuelve a mostrar solo 3
- [ ] Eventos ordenados cronologicamente INVERSO (mas reciente primero)

---

## TEST 2: Ocultar tabs para padres en Calendario

**Ruta:** `/dashboard/calendar`

### Pasos

1. Login como USUARIO/PADRE
2. Ir a Calendario

### Verificar

- [ ] Tab "Mensual" NO visible para padres
- [ ] Toggle "Grafico/Calendario" NO visible para padres
- [ ] Vista por defecto es "Calendario" (NO "Eventos")
- [ ] Tabs "Dia" y "Semana" SI visibles

### Verificar como Admin

1. Login como ADMIN (mariana@admin.com / password)
2. Ir a Calendario

- [ ] Tab "Mensual" SI visible para admin
- [ ] Toggle "Grafico/Calendario" SI visible para admin

---

## TEST 3: Edicion de endTime en todos los modales

**Ruta:** `/dashboard/calendar` > Click en evento > Editar

### Pasos

1. Login como usuario
2. Ir a Calendario > Vista Dia
3. Click en un evento de alimentacion para editarlo

### Verificar por tipo de evento

#### Alimentacion (Feeding)

- [ ] Al editar, aparece campo de fecha/hora de inicio
- [ ] Al editar, aparece campo de fecha/hora de fin (endTime)
- [ ] Al guardar, se actualiza correctamente el startTime
- [ ] Al guardar, se actualiza correctamente el endTime

#### Medicamento (Medication)

- [ ] Al editar, aparece campo de fecha/hora de inicio
- [ ] Al editar, aparece campo de fecha/hora de fin (endTime)
- [ ] Al guardar, se actualizan ambos timestamps

#### Actividad Extra (ExtraActivity)

- [ ] Al editar, aparece campo de fecha/hora de inicio
- [ ] Al editar, aparece campo de fecha/hora de fin (endTime)
- [ ] Al guardar, se actualizan ambos timestamps

#### Despertar Nocturno (NightWaking)

- [ ] Al editar, aparece campo de fecha/hora de inicio
- [ ] Al editar, aparece campo de fecha/hora de fin (endTime)
- [ ] Al guardar, se actualizan ambos timestamps

---

## TEST 4: Card Plan vs Eventos

**Ruta:** `/dashboard/calendar` > Vista Dia

### Pasos

1. Login como usuario con un nino que tenga plan activo
2. Ir a Calendario > Vista Dia
3. Localizar la card "Plan vs Eventos"

### Verificar

- [ ] Card visible arriba de la narrativa en vista diaria
- [ ] Muestra los eventos del plan (horario meta) a la izquierda
- [ ] Muestra los eventos reales registrados a la derecha
- [ ] Comparacion visual clara entre plan y realidad
- [ ] Si no hay plan activo, la card no se muestra (o muestra mensaje)

---

## TEST 5: Boton NightFeeding durante sueno

**Ruta:** `/dashboard` (Home)

### Pasos

1. Login como usuario
2. Registrar que el bebe se durmio (boton "DORMIR")
3. Verificar que aparece opcion de alimentacion nocturna

### Verificar

- [ ] Mientras el bebe duerme, hay boton para registrar alimentacion nocturna
- [ ] Al registrar, el evento se crea con `isNightFeeding: true`
- [ ] El evento aparece como tipo "feeding" (NO como tipo separado "night_feeding")
- [ ] En calendario, el evento se muestra dentro del bloque de sueno

---

## TEST 6: Sync instantaneo de sleep/nap entre navegadores

**Ruta:** `/dashboard` (Home)

### Pasos

1. Login como usuario en 2 navegadores/tabs diferentes
2. En el navegador A, registrar que el bebe se durmio
3. Observar el navegador B

### Verificar

- [ ] El estado de sueno se actualiza en el navegador B sin recargar
- [ ] No hay dependencia de localStorage (solo API)
- [ ] Al despertar en navegador A, el navegador B refleja el cambio

---

## TEST 7: Eliminar selector redundante en FeedingModal

**Ruta:** `/dashboard` > Registrar alimentacion

### Pasos

1. Login como usuario
2. Click en boton de alimentacion (icono cubiertos)

### Verificar

- [ ] NO aparece selector redundante de "estado del bebe" (awake/asleep) si ya se determina automaticamente
- [ ] Modal funciona correctamente sin el selector eliminado
- [ ] El campo `babyState` se asigna automaticamente segun el contexto

---

## TEST 8: Orden cronologico en NarrativeTimeline del calendario

**Ruta:** `/dashboard/calendar` > Vista Dia

### Pasos

1. Login como USUARIO/PADRE
2. Ir a Calendario > Vista Dia
3. Verificar el orden de eventos en la lista narrativa

### Verificar como Padre

- [ ] Eventos en orden ASCENDENTE (cronologico: 8:00, 10:30, 13:00...)
- [ ] El primer evento del dia aparece ARRIBA
- [ ] El ultimo evento del dia aparece ABAJO

### Verificar como Admin (Split Screen)

1. Login como ADMIN
2. Ir a Calendario > Vista Dia

- [ ] Panel derecho (narrativa) en orden ASCENDENTE
- [ ] Orden consistente con el calendario visual (panel izquierdo)

### Verificar Home (NO debe cambiar)

1. Login como usuario
2. Ir a Dashboard Home

- [ ] Eventos en orden DESCENDENTE (mas reciente primero) - SIN CAMBIO

---

## TEST 9: Fondos neutros y iconos estandarizados en tabs

**Ruta:** `/dashboard/calendar`

### Pasos

1. Login como usuario
2. Ir a Calendario
3. Observar los tabs de Eventos y Calendario

### Verificar

- [ ] Fondos de tabs son neutros (no colores fuertes)
- [ ] Iconos en tabs son consistentes con el sistema de iconos centralizado
- [ ] No hay conflictos visuales entre tabs activos/inactivos

---

## TEST 10: Altura del contenedor calendario para padres

**Ruta:** `/dashboard/calendar`

### Pasos

1. Login como USUARIO/PADRE
2. Ir a Calendario > Vista Dia

### Verificar

- [ ] El contenedor del calendario ocupa el alto correcto (no cortado)
- [ ] No hay scroll interno innecesario dentro del calendario
- [ ] El contenido es visible sin tener que hacer scroll dentro del componente

---

## Credenciales de Testing

| Rol | Email | Password |
|-----|-------|----------|
| Admin | mariana@admin.com | password |
| Usuario/Padre | eljulius@nebulastudios.io | juls0925 |

---

## Archivos Modificados (Sprint Actual)

| Archivo | Cambio |
|---------|--------|
| `components/narrative/NarrativeTimeline.tsx` | Prop sortOrder, limite 3, texto reducido |
| `app/dashboard/calendar/page.tsx` | sortOrder="asc", ocultar tabs padre, vista default calendario, altura |
| `components/bitacora/SplitScreenBitacora.tsx` | sortOrder="asc" |
| `components/events/FeedingModal.tsx` | Edicion endTime, eliminar selector babyState redundante |
| `components/events/MedicationModal.tsx` | Edicion endTime |
| `components/events/ExtraActivityModal.tsx` | Edicion endTime |
| `components/events/NightWakingModal.tsx` | Edicion endTime |
| `components/events/EventEditRouter.tsx` | Pasar endTime a todos los modales |
| `components/events/EventsCalendarTabs.tsx` | Fondos neutros, iconos estandarizados |
| `components/calendar/PlanVsEventsCard.tsx` | Card comparativa plan vs eventos |
| `hooks/use-sleep-state.ts` | Sync API-only, sin localStorage |

---

## Reporte de Bugs

Si encuentras un bug, documenta en `QA_FEEDBACK_NOTES.md`:

1. **Ruta:** URL donde ocurrio
2. **Pasos para reproducir:** Numerados
3. **Resultado esperado:** Que deberia pasar
4. **Resultado actual:** Que paso realmente
5. **Screenshot:** Si es visual
6. **Consola:** Errores en DevTools (F12)
