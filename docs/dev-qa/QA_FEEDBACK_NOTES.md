# Notas de testing en QA - Happy Dreamers

**Fecha:** 2026-01-28

## TEST 1: Home - NarrativeTimeline con limite 3 y grid responsive

## TEST 2: Ocultar tabs para padres en Calendario

## TEST 3: Edicion de endTime en todos los modales

## TEST 4: Card Plan vs Eventos

## TEST 5: Boton NightFeeding durante sueno

- Error en lógica que de repente el botón de "despertar nocturno" ahora aparecía como "dormir" y no se sabe por qué se cambió de estatus durante la madrugada.

## TEST 6: Sync instantaneo de sleep/nap entre navegadores

- Sí hace sync exitoso, pero en el test le puse una "siesta" al hijo y apareció el botón de nightFeeding
cuando ese botón sólo debería aparecer cuando el padre hace clic en el botón "dormir" (sueño nocturno).

## TEST 7: Eliminar selector redundante en FeedingModal

## TEST 8: Orden cronologico en NarrativeTimeline del calendario

## TEST 9: Fondos neutros y iconos estandarizados en tabs

## TEST 10: Altura del contenedor calendario para padres

- En mobile sí persiste el scroll interno del gráfico (tanto en semanal como diario)





## TEST 5: Boton NightFeeding durante sueno

- [ ] Mientras el bebe duerme, hay boton para registrar alimentacion nocturna
- [ ] Al registrar, el evento se crea con `isNightFeeding: true`
- [ ] El evento aparece como tipo "feeding" (NO como tipo separado "night_feeding")
- [ ] En calendario, el evento se muestra dentro del bloque de sueno

