# Guia de QA - Happy Dreamers

**Fecha:** 2026-01-12
**Ultima Actualizacion:** 2026-01-25
**URL:** http://localhost:3000

---

## TESTING CRITICO - Push Actual

### Resumen de Cambios

| Cambio | Descripcion |
|--------|-------------|
| EventsCalendarTabs | Nuevo componente reutilizable con tabs dia/semana/mes |
| NoteModal | Modal para crear/editar notas |
| Calendario Usuario | Toggle grafico/calendario habilitado |
| Mis Eventos | Vista tabla eliminada, solo calendario |
| Bitacora | Rediseño de chat a lista de notas |
| Notas | Estado emocional eliminado |

---

## TEST 1: Vista Calendario en "Mis Eventos" (Usuario)

**Ruta:** `/dashboard/children/[childId]/events`

**Pasos:**
1. Login como usuario (eljulius@nebulastudios.io / juls0925)
2. Ir a "Mis Eventos" de un hijo

**Verificar:**
- [ ] NO existe toggle "Calendario/Tabla" (fue eliminado)
- [ ] Solo se muestra vista calendario con tabs
- [ ] Tabs funcionan: Dia | Semana | Mes
- [ ] Navegacion de fechas funciona (flechas anterior/siguiente)
- [ ] Click en evento abre modal de detalles
- [ ] Boton "Editar" funciona desde el modal
- [ ] Eventos se muestran correctamente en cada vista

**Vista Dia:**
- [ ] Eventos se ordenan cronologicamente
- [ ] Eventos superpuestos se muestran lado a lado

**Vista Semana:**
- [ ] 7 columnas (Lun-Dom)
- [ ] Eventos posicionados en hora correcta

**Vista Mes:**
- [ ] Calendario mensual con eventos
- [ ] Click en dia muestra eventos de ese dia

---

## TEST 2: Bitacora Rediseñada (Dashboard Usuario)

**Ruta:** `/dashboard` (Dashboard principal de usuario)

**Pasos:**
1. Login como usuario
2. Localizar la seccion "Bitacora" en el dashboard

**Verificar UI:**
- [ ] NO es estilo chat/WhatsApp (burbujas de mensaje)
- [ ] ES estilo lista con tarjetas grises
- [ ] Cada nota tiene icono violeta (MessageSquare)
- [ ] Cada nota muestra texto y fecha/hora
- [ ] Input de texto esta ARRIBA de la lista
- [ ] Boton enviar tiene icono de flecha

**Verificar Funcionalidad:**
- [ ] Escribir nota y presionar Enter o click en boton
- [ ] Nota nueva aparece EN LA LISTA (no como burbuja)
- [ ] Lista muestra las 5 notas mas recientes
- [ ] Notas ordenadas de mas reciente a mas antigua
- [ ] Hover sobre nota muestra boton X (eliminar)
- [ ] Click en X elimina la nota

**Verificar Datos:**
- [ ] Notas se guardan correctamente en BD
- [ ] Al recargar pagina, notas persisten
- [ ] Notas NO tienen campo "emotionalState"

---

## TEST 3: Notas SIN Estado Emocional

**Ruta:** `/dashboard/children/[childId]/events` > Click en nota

**Pasos:**
1. Crear una nota desde Bitacora o registro manual
2. Ir a "Mis Eventos"
3. Localizar la nota en el calendario
4. Click para ver detalles

**Verificar:**
- [ ] Modal de detalles NO muestra "Estado emocional"
- [ ] Solo muestra: Tipo (Nota), Fecha/hora, Contenido
- [ ] Al editar, NO hay selector de estado emocional

**Comparar con otros eventos:**
- [ ] Evento de sleep SI muestra estado emocional
- [ ] Evento de feeding SI muestra estado emocional
- [ ] Evento de note NO muestra estado emocional

---

## TEST 4: Toggle Grafico/Calendario (Calendario Usuario)

**Ruta:** `/dashboard/calendar`

**Pasos:**
1. Login como usuario
2. Ir a "Calendario"

**Verificar:**
- [ ] Por defecto muestra vista "Grafico" (barras apiladas)
- [ ] Existe toggle/botones para cambiar: Grafico | Calendario
- [ ] Click en "Calendario" muestra vista calendario completa

**En modo Grafico:**
- [ ] Muestra grafico de barras "Ultimos 7 dias"
- [ ] Navegacion limitada (anterior/siguiente semana)

**En modo Calendario:**
- [ ] Tabs disponibles: Mensual | Semanal | Diario
- [ ] Navegacion libre de fechas (sin limite de 7 dias)
- [ ] Funciona igual que el calendario de admin
- [ ] Click en evento abre detalles

---

## TEST 5: EventsCalendarTabs en Admin

**Ruta:** `/dashboard/patients/child/[childId]` > Tab "Eventos"

**Pasos:**
1. Login como admin (mariana@admin.com / password)
2. Ir a Pacientes > Seleccionar paciente
3. Click en tab "Eventos"

**Verificar:**
- [ ] Vista calendario con tabs (Dia/Semana/Mes)
- [ ] Mismo componente que "Mis Eventos" del usuario
- [ ] Click en evento abre modal de detalles
- [ ] Boton editar funciona
- [ ] Boton eliminar funciona

---

## TEST 6: NoteModal (Crear/Editar Notas)

**Ruta:** Registro manual > Tipo "Nota"

**Pasos:**
1. Click en boton "+" o "Registrar evento"
2. Seleccionar tipo "Nota"
3. Completar el formulario

**Verificar Creacion:**
- [ ] Campo de texto para la nota (obligatorio)
- [ ] Selector de fecha
- [ ] Selector de hora
- [ ] Boton guardar funciona
- [ ] Nota aparece en calendario

**Verificar Edicion:**
1. Ir a "Mis Eventos"
2. Click en una nota existente
3. Click en "Editar"

- [ ] Modal de edicion carga datos correctos
- [ ] Se puede modificar texto
- [ ] Se puede modificar fecha/hora
- [ ] Cambios se guardan correctamente

---

## TEST 7: Tipos de Evento en Calendario

**Verificar que todos los tipos se muestran correctamente:**

| Tipo | Icono | Color | Verificar |
|------|-------|-------|-----------|
| sleep | Moon | indigo | Bloque 100% ancho |
| nap | CloudMoon | violet | Bloque 100% ancho |
| wake | Sun | yellow | Punto en timeline |
| night_waking | Baby | purple | Evento normal |
| feeding | Utensils | green | Evento normal |
| medication | Pill | amber | Evento normal |
| extra_activities | Activity | orange | Evento normal |
| note | MessageSquare | violet | Evento normal |

---

## Credenciales de Testing

| Rol | Email | Password |
|-----|-------|----------|
| Admin | mariana@admin.com | password |
| Usuario | eljulius@nebulastudios.io | juls0925 |

---

## Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `components/events/EventsCalendarTabs.tsx` | NUEVO - Componente reutilizable |
| `components/events/NoteModal.tsx` | NUEVO - Modal notas |
| `app/dashboard/children/[id]/events/page.tsx` | Eliminada vista tabla |
| `app/dashboard/page.tsx` | Rediseño Bitacora |
| `app/dashboard/calendar/page.tsx` | Toggle grafico/calendario |
| `components/events/EventDetailsModal.tsx` | Ocultar estado emocional en notas |
| `AdminChildDetailClient.tsx` | Usa EventsCalendarTabs |

---

## TEST 8: Modales Rapidos - Hora de Inicio (FeedingModal, ExtraActivityModal)

**Commit:** 055b2c0, 99cab24
**Descripcion:** Los modales rapidos ahora usan patron "Hora de inicio" donde el usuario puede editar la hora de inicio y la duracion se calcula automaticamente.

### 8.1 Alimentacion Rapida (FeedingModal)

**Ruta:** Dashboard > Botones rapidos > Icono de biberon

**Pasos:**
1. Login como usuario
2. En dashboard, click en boton rapido de Alimentacion (icono biberon)
3. Completar el formulario

**Verificar UI:**
- [ ] Campo "Hora de inicio" visible y editable
- [ ] Hora por defecto es la hora actual
- [ ] Se puede cambiar la hora manualmente
- [ ] NO hay campo de "duracion" separado

**Verificar Guardado:**
- [ ] Seleccionar tipo "Pecho" y guardar
- [ ] NO debe dar error 400
- [ ] Evento se guarda correctamente
- [ ] Seleccionar tipo "Biberon" con cantidad y guardar - OK
- [ ] Seleccionar tipo "Solidos" con descripcion y guardar - OK

**Verificar Calculo de Duracion:**
1. Registrar alimentacion con hora de inicio hace 15 minutos
2. Ir a "Mis Eventos" y localizar el evento
3. Click para ver detalles
- [ ] Duracion calculada automaticamente (ej: "15 min")
- [ ] startTime = hora que seleccionaste
- [ ] endTime = hora en que guardaste

### 8.2 Actividad Extra Rapida (ExtraActivityModal)

**Ruta:** Dashboard > Botones rapidos > Icono de actividad

**Pasos:**
1. Login como usuario
2. En dashboard, click en boton rapido de Actividad Extra
3. Completar el formulario

**Verificar UI:**
- [ ] Campo "Hora de inicio" visible y editable
- [ ] Campo de descripcion obligatorio
- [ ] Hora por defecto es la hora actual

**Verificar Guardado:**
- [ ] Escribir descripcion (min 3 caracteres) y guardar
- [ ] Evento se guarda correctamente
- [ ] Duracion se calcula automaticamente

---

## TEST 9: API - Calculo Automatico de Duracion Alimentacion

**Descripcion:** La API ahora calcula automaticamente `feedingDuration` desde `startTime` y `endTime`. Ya no es campo obligatorio.

**Verificar en Base de Datos:**
1. Registrar evento de alimentacion
2. Revisar documento en MongoDB

- [ ] Campo `feedingDuration` existe y es > 0
- [ ] Campo `duration` existe y es igual a `feedingDuration`
- [ ] Campo `durationReadable` existe (ej: "15 min")
- [ ] `startTime` es la hora que selecciono el usuario
- [ ] `endTime` es la hora en que se guardo

**Casos de Prueba API:**

| Tipo | Campos Requeridos | Campos Opcionales |
|------|-------------------|-------------------|
| breast | feedingType, babyState | feedingAmount |
| bottle | feedingType, babyState | feedingAmount |
| solids | feedingType, babyState | feedingAmount, notes |

**Errores que NO deben ocurrir:**
- [ ] Error 400 por feedingDuration faltante
- [ ] Error 400 por feedingAmount faltante en breast
- [ ] Error 400 por feedingAmount faltante en solids

---

## Archivos Modificados (Session 2)

| Archivo | Cambio |
|---------|--------|
| `components/events/FeedingModal.tsx` | Agregado campo "Hora de inicio", removido feedingDuration |
| `components/events/ExtraActivityModal.tsx` | Agregado campo "Hora de inicio" |
| `components/events/FeedingButton.tsx` | Usa startTime del modal, endTime = getCurrentTime() |
| `components/events/ExtraActivityButton.tsx` | Usa startTime del modal, endTime = getCurrentTime() |
| `app/api/children/events/route.ts` | Removida validacion obligatoria feedingDuration, agregado calculo automatico |

---

---

## TEST 10: Estilos Nocturnos en Bloques de Sueno

**Commit:** 64b16c8
**Fecha:** 2026-01-25
**Descripcion:** Los bloques de sueno nocturno ahora tienen colores mas oscuros (indigo/purpura profundo) para diferenciarse de las siestas y dar sensacion de "noche".

### Cambios Visuales

| Elemento | Antes | Ahora |
|----------|-------|-------|
| Gradiente fondo | Azul claro (0.18 opacidad) | Indigo-purpura oscuro (0.45+ opacidad) |
| Icono Moon | Indigo (#6366f1) | Blanco |
| Icono Sun | Amarillo (#eab308) | Blanco |
| Header (sueno en progreso) | Azul 50% | Gradiente indigo-700 a purple-800 |

### Rutas a Verificar

- `/dashboard/calendar` (Vista Diario, Semanal, Mensual)
- `/dashboard/children/[id]/events`

### Pasos de Testing

1. Login como usuario (eljulius@nebulastudios.io / juls0925)
2. Ir a Calendario > Vista Diaria
3. Localizar un bloque de sueno nocturno (sleep)

### Verificar Sueno Completado

- [ ] Bloque tiene gradiente azul-purpura OSCURO (no tenue/transparente)
- [ ] Icono Moon (arriba) es BLANCO con sombra negra
- [ ] Icono Sun (abajo) es BLANCO con sombra negra
- [ ] El color es claramente diferente a las siestas (que son lavanda claro)
- [ ] Buen contraste - se puede leer/ver claramente

### Verificar Sueno en Progreso

1. Registrar un nuevo sueno (boton "DORMIR")
2. Verificar en el calendario:

- [ ] Header tiene gradiente indigo-purpura SOLIDO
- [ ] Icono Moon es BLANCO
- [ ] Fade hacia abajo es purpura oscuro (no azul claro)
- [ ] Puntos animados de "continua..." son BLANCOS

### Comparacion Visual

| Tipo | Color Esperado |
|------|----------------|
| Sueno nocturno (sleep) | Indigo/purpura OSCURO - sensacion nocturna |
| Siesta (nap) | Lavanda CLARO (#a78bfa) - sensacion de dia |

**Resultado esperado:** El sueno nocturno debe verse "de noche" (oscuro) mientras las siestas se ven "de dia" (claras).

### Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `components/calendar/SleepSessionBlock.tsx` | Gradientes oscuros, iconos blancos |

---

## Reporte de Bugs

Si encuentras un bug, documenta:

1. **Ruta:** URL donde ocurrio
2. **Pasos para reproducir:** Numerados
3. **Resultado esperado:** Que deberia pasar
4. **Resultado actual:** Que paso realmente
5. **Screenshot:** Si es visual
6. **Consola:** Errores en DevTools (F12)
