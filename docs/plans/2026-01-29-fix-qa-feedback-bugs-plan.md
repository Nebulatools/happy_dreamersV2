---
title: "fix: QA Feedback - Sleep state reset, NightFeeding en siestas, scroll mobile"
type: fix
date: 2026-01-29
---

# Fix: 3 Bugs de QA Feedback

## Overview

Tres bugs reportados por QA durante el sprint de Mejoras UX Calendario:

1. **Sleep state se resetea durante la madrugada** - El bebe aparece como "despierto" despues de medianoche
2. **NightFeeding aparece durante siestas** - Solo deberia aparecer en sueno nocturno
3. **Scroll interno en mobile para padres** - Scroll-dentro-de-scroll en calendario mobile

---

## Bug 1: Sleep state se resetea durante la madrugada

### Causa raiz

El endpoint `app/api/children/[id]/current-sleep-state/route.ts` filtra eventos solo desde "inicio del dia actual":

```typescript
// Linea ~67: Solo busca eventos de HOY
const startOfToday = getStartOfDayAsDate(new Date(), userTimeZone)
const recentEvents = await db.collection("events").find({
  childId: new ObjectId(childId),
  createdAt: { $gte: startOfToday.toISOString() },
})
```

Si el bebe se durmio a las 10 PM del 28 de enero, y son las 12:01 AM del 29, el evento de sleep queda excluido del query. La API no encuentra ningun evento abierto y devuelve `status: "awake"`.

### Solucion

Cambiar el filtro de fecha para buscar eventos de las ultimas 48 horas en vez de solo "hoy":

**Archivo:** `app/api/children/[id]/current-sleep-state/route.ts`

```typescript
// ANTES
const startOfToday = getStartOfDayAsDate(new Date(), userTimeZone)

// DESPUES: Buscar ultimas 48 horas para cubrir sueno que cruza medianoche
const queryStart = new Date()
queryStart.setHours(queryStart.getHours() - 48)
```

### Acceptance Criteria

- [x] Si el bebe se durmio antes de medianoche, el estado sigue como "dormido" despues de medianoche
- [x] El boton muestra "despertar nocturno" toda la noche hasta que el padre registre un wake
- [x] No afecta el rendimiento (48h es un rango razonable para la query)

---

## Bug 2: NightFeeding aparece durante siestas

### Causa raiz

En `components/events/EventRegistration.tsx`, la condicion para mostrar el boton NightFeeding es:

```typescript
// Linea ~52
const showNightFeedingButton = isSleeping || isNapping
```

Deberia ser solo `isSleeping` (sueno nocturno), no durante siestas.

### Solucion

**Archivo:** `components/events/EventRegistration.tsx`

```typescript
// ANTES
const showNightFeedingButton = isSleeping || isNapping

// DESPUES: Solo durante sueno nocturno
const showNightFeedingButton = isSleeping && !isNapping
// O mas explicito: solo cuando sleepType === "night" o eventType === "sleep"
```

Verificar que `isSleeping` ya distingue entre sleep y nap. Si no, verificar que el hook `use-sleep-state.ts` expone `sleepType` y usarlo en la condicion.

### Acceptance Criteria

- [x] Boton NightFeeding NO aparece durante siestas (nap)
- [x] Boton NightFeeding SI aparece durante sueno nocturno (sleep)
- [x] El boton de alimentacion normal sigue disponible durante siestas

---

## Bug 3: Scroll interno en mobile para padres

### Causa raiz

En `app/dashboard/calendar/page.tsx`, la vista de padres tiene mas overhead que la de admin:

| Vista | Tailwind Height | Inline Max-Height | Padding Extra |
|-------|----------------|-------------------|---------------|
| Admin | `h-[calc(100vh-150px)]` | `calc(100vh - 120px)` | `px-6 pb-6` |
| Padre | `h-[calc(100vh-170px)]` | `calc(100vh - 150px)` | `px-4 pt-4 pb-10` |

La vista de padre tiene:
- 20px mas de overhead en el header (170px vs 150px)
- 32px mas de padding (pt-4 + pb-10 vs pb-6)
- En mobile esto crea un contenedor demasiado pequeno que genera scroll interno

### Solucion

**Archivo:** `app/dashboard/calendar/page.tsx`

Opcion recomendada: responsive height que da mas espacio en mobile:

```tsx
// ANTES (linea ~1941, vista padre)
<Card className="p-4 h-[calc(100vh-170px)] overflow-auto"
  style={{ minHeight: "450px", maxHeight: "calc(100vh - 150px)" }}>

// DESPUES: Menos overhead en mobile
<Card className="p-4 h-auto md:h-[calc(100vh-170px)] overflow-auto md:overflow-auto"
  style={{ minHeight: "450px" }}>
```

Tambien reducir padding en mobile:

```tsx
// ANTES
<div className="space-y-6 px-4 pt-4 pb-10 md:px-6">

// DESPUES
<div className="space-y-4 px-4 pt-2 pb-4 md:space-y-6 md:pt-4 md:pb-10 md:px-6">
```

### Acceptance Criteria

- [x] En mobile (padre): calendario sin scroll-dentro-de-scroll
- [x] En desktop (padre): comportamiento sin cambio
- [x] En mobile (admin): comportamiento sin cambio
- [x] En desktop (admin): comportamiento sin cambio

---

## Archivos a Modificar

| Bug | Archivo | Cambio |
|-----|---------|--------|
| 1 | `app/api/children/[id]/current-sleep-state/route.ts` | Cambiar filtro de fecha a 48h |
| 2 | `components/events/EventRegistration.tsx` | NightFeeding solo en sleep nocturno |
| 3 | `app/dashboard/calendar/page.tsx` | Height responsive + reducir padding mobile |

## Orden de Implementacion

1. **Bug 2** (NightFeeding) - Fix mas simple, cambio de una linea
2. **Bug 1** (Sleep state) - Fix en API, requiere verificar el query
3. **Bug 3** (Scroll mobile) - CSS responsive, requiere testing visual

## Referencias

- QA Feedback: `docs/dev-qa/QA_FEEDBACK_NOTES.md`
- QA Release Notes: `docs/dev-qa/QA_RELEASE_NOTES.md`
- Hook sleep state: `hooks/use-sleep-state.ts`
- API sleep state: `app/api/children/[id]/current-sleep-state/route.ts`
