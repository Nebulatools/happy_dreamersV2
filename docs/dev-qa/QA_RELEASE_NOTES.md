# QA Release Notes - Sprint Actual

**Fecha:** 2026-01-25
**Sprint:** Mejoras UX/UI Dashboard - Vista Narrativa y Taxonomia Visual
**URL:** http://localhost:3000

---

## Resumen de Cambios (SPEC-SPRINT)

| Item | Descripcion | Estado |
|------|-------------|--------|
| Item 2 | Taxonomia Visual (colores por tipo alimentacion, siestas lavanda) | COMPLETADO |
| Item 3 | Split Screen Admin / Narrativa Parent en vista Diaria | COMPLETADO |
| Fix | Eventos dentro de bloques de sueno en columnas | COMPLETADO |
| UI | Estilos nocturnos oscuros para bloques de sueno | COMPLETADO |

---

## TEST 1: Taxonomia Visual - Colores por Tipo de Alimentacion

**Ruta:** `/dashboard/calendar`

**Descripcion:** Los eventos de alimentacion ahora tienen colores diferenciados segun el tipo.

### Colores Esperados

| Tipo | Color | Icono |
|------|-------|-------|
| Pecho (breast) | Rosa (#EC4899) | Icono pecho |
| Biberon (bottle) | Azul cielo (#0EA5E9) | Icono biberon |
| Solidos (solids) | Esmeralda (#10B981) | Cubiertos cruzados |

### Pasos

1. Login como usuario (eljulius@nebulastudios.io / juls0925)
2. Ir a Calendario
3. Verificar eventos de alimentacion en vistas Dia, Semana, Mes

### Verificar

- [ ] Alimentacion pecho = color ROSA
- [ ] Alimentacion biberon = color AZUL CIELO
- [ ] Alimentacion solidos = color ESMERALDA/VERDE
- [ ] Iconos son BLANCOS sobre el fondo de color
- [ ] Colores consistentes en vista Diaria, Semanal y Mensual

---

## TEST 2: Taxonomia Visual - Siestas en Lavanda

**Ruta:** `/dashboard/calendar`

**Descripcion:** Las siestas (nap) ahora usan color lavanda claro para diferenciarse del sueno nocturno.

### Colores Esperados

| Tipo | Color |
|------|-------|
| Siesta (nap) | Lavanda (#a78bfa / violet-400) - CLARO |
| Sueno nocturno (sleep) | Indigo-purpura OSCURO |

### Pasos

1. Login como usuario
2. Ir a Calendario > Vista Diaria
3. Localizar eventos de siesta y sueno nocturno

### Verificar

- [ ] Siestas tienen color LAVANDA CLARO (no naranja)
- [ ] Sueno nocturno tiene color INDIGO/PURPURA OSCURO
- [ ] Diferencia visual clara entre siesta y sueno nocturno
- [ ] Graficos de barras usan mismos colores (consistencia)

---

## TEST 3: Split Screen para Admin (Vista Diaria)

**Ruta:** `/dashboard/calendar` > Vista "Dia"

**Descripcion:** Admins ven layout 50/50 con calendario a la izquierda y narrativa a la derecha.

### Pasos

1. Login como ADMIN (mariana@admin.com / password)
2. Ir a Calendario
3. Seleccionar vista "Dia"

### Verificar Layout

- [ ] Pantalla dividida 50% / 50%
- [ ] Lado IZQUIERDO = Calendario (bloques de tiempo)
- [ ] Lado DERECHO = Narrativa (tarjetas de texto)
- [ ] Ambos paneles muestran los mismos eventos

### Verificar Mirroring Bidireccional

- [ ] Click en evento del CALENDARIO -> Narrativa hace scroll + highlight
- [ ] Click en evento de NARRATIVA -> Calendario hace scroll + highlight
- [ ] Highlight se desvanece gradualmente (5-7 segundos)
- [ ] Doble click abre modal de edicion

---

## TEST 4: Narrativa Vertical para Padres (Vista Diaria)

**Ruta:** `/dashboard/calendar` > Vista "Dia"

**Descripcion:** Padres ven narrativa vertical completa (sin split screen).

### Pasos

1. Login como USUARIO/PADRE (eljulius@nebulastudios.io / juls0925)
2. Ir a Calendario
3. Seleccionar vista "Dia"

### Verificar

- [ ] NO hay split screen (pantalla completa)
- [ ] Se muestra narrativa vertical (timeline de tarjetas)
- [ ] Cada evento tiene: icono + texto narrativo + hora
- [ ] Click en chevron (>) abre modal de edicion
- [ ] Eventos ordenados cronologicamente

### Formato de Narrativa Esperado

| Tipo | Ejemplo |
|------|---------|
| Alimentacion pecho | "[Nombre] tomo pecho por [X] minutos" |
| Alimentacion biberon | "[Nombre] tomo [X] oz de leche" |
| Siesta | "[Nombre] durmio una siesta de [X] min" |
| Sueno nocturno | "[Nombre] durmio de [hora] a [hora]" |

---

## TEST 5: Eventos Dentro de Bloques de Sueno en Columnas

**Ruta:** `/dashboard/calendar` > Vista Diaria o Semanal

**Descripcion:** Eventos que ocurren DURANTE un bloque de sueno (despertares, alimentacion nocturna) se muestran en columnas lado a lado.

### Pasos

1. Login como usuario
2. Ir a Calendario
3. Localizar un bloque de sueno nocturno que tenga eventos internos

### Verificar

- [ ] Despertares nocturnos (night_waking) visibles DENTRO del bloque de sueno
- [ ] Alimentaciones nocturnas visibles DENTRO del bloque de sueno
- [ ] Si hay 2+ eventos simultaneos, se muestran LADO A LADO (columnas)
- [ ] Eventos internos solo muestran ICONO (sin texto)
- [ ] Click en evento interno abre sus detalles
- [ ] Maximo 3 columnas visibles ("+N mas" si hay mas)

---

## TEST 6: Estilos Nocturnos en Bloques de Sueno

**Ruta:** `/dashboard/calendar`

**Descripcion:** Los bloques de sueno nocturno tienen colores oscuros (indigo/purpura) para dar sensacion de "noche".

### Cambios Visuales

| Elemento | Valor |
|----------|-------|
| Gradiente fondo | Indigo-700 -> Purple-800 -> Purple-900 |
| Iconos Moon/Sun | BLANCO con sombra negra |
| Opacidad | Alta (0.45+) - NO tenue |

### Pasos

1. Login como usuario
2. Ir a Calendario > Vista Diaria
3. Localizar bloque de sueno nocturno completado

### Verificar Sueno Completado

- [ ] Gradiente azul-purpura OSCURO visible
- [ ] Icono Moon (arriba) es BLANCO
- [ ] Icono Sun (abajo) es BLANCO
- [ ] Buen contraste - se ve claramente

### Verificar Sueno en Progreso

1. Registrar un nuevo sueno (boton "DORMIR")
2. Verificar en calendario:

- [ ] Header tiene gradiente SOLIDO (indigo-purpura)
- [ ] Icono Moon es BLANCO
- [ ] Fade hacia abajo es purpura oscuro
- [ ] Puntos animados son BLANCOS

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
| `lib/colors/event-colors.ts` | Sistema centralizado de colores |
| `lib/icons/event-icons.ts` | Iconos por tipo de evento |
| `components/calendar/SleepSessionBlock.tsx` | Estilos nocturnos, columnas internas |
| `components/calendar/CalendarDayView.tsx` | Usa sistema centralizado |
| `components/calendar/CalendarWeekView.tsx` | Usa sistema centralizado |
| `components/bitacora/SplitScreenBitacora.tsx` | Split screen admin |
| `components/narrative/NarrativeTimeline.tsx` | Narrativa vertical |
| `app/dashboard/calendar/page.tsx` | Integra Split/Narrativa segun rol |
| `app/globals.css` | Color siesta lavanda |

---

## Reporte de Bugs

Si encuentras un bug, documenta en `QA_FEEDBACK_NOTES.md`:

1. **Ruta:** URL donde ocurrio
2. **Pasos para reproducir:** Numerados
3. **Resultado esperado:** Que deberia pasar
4. **Resultado actual:** Que paso realmente
5. **Screenshot:** Si es visual
6. **Consola:** Errores en DevTools (F12)
