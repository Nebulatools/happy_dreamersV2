# QA Feedback - Bugs a Resolver

**Fecha:** 2026-01-28
**Sprint:** Mejoras UX Calendario, Edicion de Eventos, Sync y Orden Cronologico

---

## Bug 1: Sleep state se resetea durante la madrugada (TEST 5)

### Descripcion
El boton de "despertar nocturno" cambia a "dormir" durante la madrugada sin que el usuario haga nada. El tester registro que el bebe se durmio y lo dejo toda la noche; al dia siguiente el estado habia cambiado solo.

### Comportamiento esperado
Si el bebe fue marcado como dormido (sleep nocturno), el estado debe mantenerse como "dormido" hasta que el padre registre manualmente un despertar (wake o night_waking). No debe resetearse automaticamente.

### Comportamiento actual
En algun momento de la madrugada, el sleep state se resetea y el boton vuelve a mostrar "dormir" en vez de "despertar nocturno".

### Hipotesis
- Posible logica de auto-reset basada en hora (ej: despues de medianoche o a las 6am)
- El hook `use-sleep-state.ts` podria tener un timeout o logica de expiracion
- El polling de API podria no encontrar el evento de sleep y asumir que esta despierto

### Archivos a investigar
- `hooks/use-sleep-state.ts`
- `app/api/children/events/route.ts` (endpoint que devuelve sleep state)

---

## Bug 2: NightFeeding aparece durante siestas (TEST 6)

### Descripcion
Al registrar una siesta (nap), aparece el boton de NightFeeding. Este boton solo deberia aparecer cuando el bebe esta en sueno nocturno (sleep), no durante siestas.

### Comportamiento esperado
- Boton NightFeeding visible SOLO durante sueno nocturno (`sleep`)
- Durante siestas (`nap`), NO debe aparecer el boton NightFeeding

### Comportamiento actual
El boton NightFeeding aparece siempre que el bebe esta dormido, sin distinguir entre sleep y nap.

### Causa probable
La condicion para mostrar el boton NightFeeding solo verifica `isAsleep === true` sin chequear si `sleepType === "night"`.

### Archivos a investigar
- `components/events/EventRegistration.tsx` (donde se renderea el boton)
- `hooks/use-sleep-state.ts` (donde se expone sleepType)

---

## Bug 3: Scroll interno en mobile para padres (TEST 10)

### Descripcion
En mobile, el contenedor general del calendario tiene scroll interno en vista semanal y diaria. Esto solo afecta la vista de padres; en admin mobile funciona correctamente, y en desktop para padres tambien esta bien.

### Comportamiento esperado
- En mobile (padre): el calendario usa scroll de pagina, sin scroll interno fijo
- Consistente con el comportamiento de admin en mobile y padre en desktop

### Comportamiento actual
El contenedor del calendario en mobile (padre) tiene overflow con scroll interno, creando una experiencia de scroll-dentro-de-scroll.

### Causa probable
Alguna clase CSS con `overflow-y-auto` o `max-height` fija que aplica solo en la vista de padres, no de admin. Posiblemente una media query faltante o una condicion de role que agrega estilos diferentes.

### Archivos a investigar
- `app/dashboard/calendar/page.tsx` (layout del calendario para padres)
- Comparar con la vista admin del calendario para encontrar la diferencia

---

## Alcance
Los 3 bugs deben resolverse en este sprint.

## Exito
- Bug 1: El sleep state se mantiene toda la noche sin resetearse
- Bug 2: NightFeeding solo aparece durante sueno nocturno, nunca durante siestas
- Bug 3: Sin scroll interno en mobile para padres, consistente con admin mobile

## Notas de la Entrevista
- El tester dejo al bebe dormido toda la noche (sin acciones intermedias) y el estado cambio solo
- El scroll en mobile solo afecta la vista de padres, no de admin
- El contenedor general es el afectado, no un chart especifico
