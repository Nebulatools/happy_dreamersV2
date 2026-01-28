# Sprint: QA Feedback 2026-01-26

## Visión

Resolver el feedback completo de QA para mejorar la experiencia de usuario en Happy Dreamers, incluyendo correcciones de UI, cambios de lógica de negocio, y ajustes de UX solicitados por Mariana.

---

## Items del Sprint (9 activos + 2 verificación)

### ITEM 9: Estado de Botones por Niño (CRÍTICO)

**Problema:** Estado de sueño guardado en localStorage por dispositivo. Papá registra "se durmió" → mamá no lo ve en su celular.

**Solución:** Estado viene 100% de BD, calculado por último evento sleep/nap vs wake.

**Lógica:**
```
Si último 'sleep/nap' es MÁS RECIENTE que último 'wake' → DORMIDO
Si último 'wake' es MÁS RECIENTE que último 'sleep/nap' → DESPIERTO
```

**Archivos:**
- `hooks/use-sleep-state.ts` - Eliminar localStorage, solo API
- `components/events/SleepButton.tsx` - Remover sleepStorageKey

---

### ITEM 11: Botón Alimentación Nocturna

**Problema:** Bebé come "medio dormido" pero sistema obliga registrar wake primero.

**Solución:** Nuevo botón visible SOLO cuando niño duerme. Marca `isNightFeeding: true`. NO cambia estado del niño.

**Archivos:**
- CREAR: `components/events/NightFeedingButton.tsx`
- MODIFICAR: `components/events/EventRegistration.tsx`

---

### ITEM 6: Edición Hora Fin (BUG)

**Problema:** Solo se puede editar hora inicio, no hora fin en timeline.

**Solución:** Agregar campos endDate/endTime a modales en modo edit. Seguir patrón de `SleepDelayModal.tsx:76-90`.

**Archivos (4 modales):**
- `components/events/FeedingModal.tsx`
- `components/events/MedicationModal.tsx`
- `components/events/ExtraActivityModal.tsx`
- `components/events/NightWakingModal.tsx`

---

### ITEM 5: Tabs por Rol

**Problema:** Padres ven tabs que no deberían (Mensual, Gráfico).

**Solución:** Condicionar renderizado: Padres solo ven Diario + Semanal. Admin mantiene todo.

**Archivo:** `app/dashboard/calendar/page.tsx` (líneas 1828-1874)

---

### ITEM 1: Vista Narrativa Home

**Problema:** Home muestra gráficos en lugar de narrativa.

**Solución:**
- `initialLimit={3}` (colapsado por default)
- Botón expandir visible SIEMPRE
- Layout: Mobile vertical | Web side-by-side
- Día = despertar a despertar (no 24hrs)

**Archivo:** `app/dashboard/page.tsx`

---

### ITEM 8: Reducir Texto Bitácora

**Formato actual:** `8:30 AM - Alimentación: Biberón 120ml, 15 min`
**Formato nuevo:** `8:30 AM - Biberón 120ml` (tipo + cantidad, sin duración)

**Archivo:** `components/narrative/NarrativeTimeline.tsx`

---

### ITEM 4: Calendario sin Scroll

**Problema:** Calendario tiene scroll interno en admin split-screen.

**Solución:** Remover height fija y overflow. Calendario crece, scroll de página.

**Archivo:** `components/calendar/CalendarMain.tsx`

---

### ITEM 10: Card Plan vs Eventos

**Diseño:**
```
| PLAN (izq)      | EVENTOS (der)    |
| 07:00 Despertar | 07:15 Despertó   |
| 09:00 Siesta    | 09:30 Siesta     |
```

**Comportamiento:**
- Nueva card ARRIBA del calendario
- Aplica para AMBOS roles
- Sin plan: solo muestra eventos
- Eventos extras se incrustan cronológicamente

**Archivos:**
- CREAR: `components/calendar/PlanVsEventsCard.tsx`
- MODIFICAR: `app/dashboard/calendar/page.tsx`

---

### ITEM 2: Iconos Consistentes Admin

**Problema:** Iconos de alimentación no están en admin `/dashboard/patients/child/[id]`

**Solución:** Usar `getEventIconConfig()` de `lib/icons/event-icons.ts`

**Archivo:** `app/dashboard/patients/child/[id]/page.tsx`

---

### Items Ya Implementados (Solo Verificar)

- **ITEM 3:** Siestas en lavanda
- **ITEM 7:** Estilos nocturnos en bloques de sueño

---

## Credenciales de Testing

| Rol | Email | Password |
|-----|-------|----------|
| Admin | mariana@admin.com | password |
| Padre | eljulius@nebulastudios.io | juls0925 |

---

## Referencias

- Patrones de eventos: `.claude/rules/events.md`
- Patrones de modales: `.claude/rules/patterns.md`
- Manejo de fechas: `.claude/rules/datetime.md`
- Patrón endTime edit: `components/events/SleepDelayModal.tsx:76-90`
