# Sprint: QA Feedback 2026-01-26

## Visión

Resolver el feedback completo de QA para mejorar la experiencia de usuario en Happy Dreamers, incluyendo correcciones de UI, cambios de lógica de negocio, y ajustes de UX solicitados por Mariana.

---

## Items del Sprint

### ITEM 1: Vista Narrativa en Home (Padres)

**Problema:** El dashboard de padres muestra gráficos que deberían ser reemplazados por la vista narrativa (como en bitácora).

**Cambios requeridos:**
1. En dashboard reemplazar los gráficos por vista narrativa igual que en bitácora
2. Layout responsivo:
   - **Mobile:** Narrativa ARRIBA, calendario ABAJO (vertical)
   - **Web:** Narrativa y calendario SIDE BY SIDE (horizontal)
3. Botón Expandir/Colapsar debe aparecer SIEMPRE
4. **Estado inicial: COLAPSADO** - mostrar solo los últimos 3 eventos del día
5. **Día = ciclo de despertar a despertar** (no 24 hrs calendario)

**Archivos probables:**
- `app/dashboard/page.tsx`
- `components/narrative/NarrativeCard.tsx`

---

### ITEM 2: Taxonomía Visual - Iconos de Alimentación

**Problema:** Los nuevos iconos de alimentación (biberón, pecho, sólidos) solo están en Dashboard/Bitácora/Calendario, pero NO en la ruta admin `/dashboard/patient/child/[id]` tab Eventos.

**Cambios requeridos:**
1. Actualizar iconos de alimentación en el tab Eventos del perfil de niño (vista admin)
2. Asegurar consistencia de iconos en TODA la app

**Archivos probables:**
- `app/dashboard/patients/child/[id]/page.tsx`
- Componentes de lista de eventos en vista admin

---

### ITEM 3: Taxonomía Visual - Siestas en Lavanda

**Estado:** ✅ Ya implementado (confirmar que está correcto)

---

### ITEM 4: Split Screen Admin (Vista Diaria)

**Problema:** La vista 50/50 está bien, pero el calendario necesita extenderse hacia abajo sin scroll interno.

**Cambios requeridos:**
1. Calendario completo sin scroll interno
2. El usuario NO debe hacer scroll dentro del componente calendario
3. **El calendario CRECE y el usuario hace scroll de PÁGINA** (no del calendario)
4. Solo debe existir scroll del navegador (página completa)

**Archivos probables:**
- `components/calendar/CalendarMain.tsx`
- CSS/estilos del calendario en vista admin

---

### ITEM 5: Narrativa Vertical para Padres (Vista Diaria)

**Problema:** La vista diaria para padres tiene elementos que no deberían estar.

**Cambios requeridos:**
1. **Quitar tab 'gráfico'** de sueño y despertares nocturnos en barras (SOLO para padres)
2. **Quitar tab 'mensual'** (SOLO para padres)
3. **Tabs finales para PADRES:**
   - ✅ Tab "Diario"
   - ✅ Tab "Semanal"
   - ❌ ~~Tab "Mensual"~~ (eliminado)
   - ❌ ~~Tab "Gráfico"~~ (eliminado)
4. **Tab 'semanal':** ajustar UI para que NO tenga scroll interno
   - Desktop: solo scroll del navegador
   - Mobile: card más alto para que quepa al 100%
5. **Tab 'diario':** asegurar que el evento DESPERTAR (wake) aparece como PRIMER evento
   - Esto debe coincidir con el orden del plan (despertar primero)

**Nota:** Admin mantiene TODAS las vistas sin cambios.

**Archivos probables:**
- `app/dashboard/calendar/page.tsx`
- Lógica de tabs por rol de usuario

---

### ITEM 6: Edición de Hora Fin en Timeline

**Problema (BUG):** La edición de eventos dentro del timeline solo permite editar hora inicio, NO hora fin.

**Cambios requeridos:**
1. Permitir edición de hora fin en TODOS los eventos del timeline
2. Aplica tanto para admin como para users

**Archivos probables:**
- `components/calendar/EventBlock.tsx`
- `components/events/EventEditRouter.tsx`
- Modales de edición de eventos

---

### ITEM 7: Estilos Nocturnos en Bloques de Sueño

**Estado:** ✅ Ya implementado (confirmar que está correcto)

---

### ITEM 8: Reducir Detalle en Texto de Bitácora

**Problema:** Los eventos en bitácora muestran demasiada información.

**Formato actual:** `8:30 AM - Alimentación: Biberón 120ml, 15 min`
**Formato deseado:** `8:30 AM - Biberón 120ml`

**Cambios requeridos:**
1. Reducir texto a: Tipo + Cantidad (sin duración, sin palabra "Alimentación:")
2. Similar al formato del tab Eventos del perfil del niño

**Archivos probables:**
- `components/narrative/NarrativeCard.tsx`
- Funciones de formateo de texto de eventos

---

### ITEM 9: Estado de Botones por Niño (NO por Dispositivo)

**Problema CRÍTICO de lógica:** Actualmente el estado de los botones de eventos (dormido/despierto) se guarda en `localStorage` del dispositivo. Si papá registra "se durmió" en su celular, mamá NO ve ese estado en su dispositivo.

**Cambios requeridos:**
1. El estado del niño (dormido/despierto) debe venir de la BASE DE DATOS
2. Calcular estado basado en el ÚLTIMO EVENTO registrado para ese niño
3. CUALQUIER cuidador debe ver el estado REAL del niño, sin importar:
   - Quién registró el último evento
   - En qué dispositivo se registró
   - Qué sesión está activa
4. **Lo visualizable debe estar en función del NIÑO SELECCIONADO**

**Impacto:**
- `components/events/SleepButton.tsx`
- `hooks/use-sleep-state.ts`
- Posiblemente necesite nuevo endpoint o modificar existente

**Lógica de estado (CONFIRMADA):**
```
Si último 'sleep' o 'nap' es MÁS RECIENTE que último 'wake' → Niño DORMIDO
Si último 'wake' es MÁS RECIENTE que último 'sleep/nap' → Niño DESPIERTO
```

Los eventos `feeding` con `isNightFeeding: true` NO afectan el cálculo (no son sleep ni wake).

---

### ITEM 11: Botón Alimentación Nocturna (Registro en Vivo)

**Contexto:** Cuando el niño está dormido, actualmente el padre debe registrar `wake` antes de poder registrar `feeding`. Pero hay casos donde el bebé come "medio dormido" sin despertar realmente.

**Cambios requeridos:**
1. **Nuevo botón** "Alimentación Nocturna" en el panel de registro en vivo
2. **Visible SOLO cuando:** el niño está dormido (`sleep` o `nap` activo)
3. **NO requiere** registrar `wake` previo
4. **Automáticamente** marca `isNightFeeding: true`
5. **NO cambia** el estado del niño (sigue dormido después)

**Alcance:**
- Solo aplica a **registro en vivo** (botones rápidos)
- El **registro manual** ya permite registrar lo que el usuario quiera

**UI propuesta:**
```
[Cuando niño está dormido]

Botones visibles:
- "SE DESPERTÓ" (botón principal)
- "Alimentación Nocturna" (botón secundario, más pequeño)
- "Medicamento" (si aplica)
```

**Archivos probables:**
- `components/events/EventRegistration.tsx`
- `components/events/FeedingModal.tsx` (reutilizar con flag)
- Nuevo: `components/events/NightFeedingButton.tsx`

---

### ITEM 10: Layout Plan vs Eventos (Izquierda/Derecha)

**Estado:** ✅ CONFIRMADO

**Diseño:**
```
| PLAN (izquierda)  | EVENTOS (derecha)  |
|-------------------|---------------------|
| 07:00 Despertar   | 07:15 Despertó     |
| 09:00 Siesta      | 09:30 Siesta       |
| 12:00 Comida      | 11:45 Comida       |
```

**Especificaciones confirmadas:**
1. **Es una NUEVA CARD** que se agrega ARRIBA del calendario (no reemplaza)
2. **Aplica para AMBOS:** Padres y Admin
3. **Si NO hay plan activo:** Solo muestra los eventos capturados (columna derecha)
4. **Eventos extras (no en plan):** Se incrustan cronológicamente aunque no estén contemplados en el plan

**Archivos probables:**
- Nuevo componente: `components/calendar/PlanVsEventsCard.tsx`
- Modificar: `app/dashboard/calendar/page.tsx`

---

## Prioridades Sugeridas

### Alta Prioridad (Bugs/Lógica)
1. **ITEM 9** - Estado de botones por niño (cambio de arquitectura)
2. **ITEM 11** - Botón Alimentación Nocturna (complementa ITEM 9)
3. **ITEM 6** - Bug de edición hora fin

### Media Prioridad (UX Crítico)
4. **ITEM 5** - Quitar tabs para padres
5. **ITEM 1** - Vista narrativa en home
6. **ITEM 4** - Calendario sin scroll interno
7. **ITEM 10** - Layout Plan vs Eventos

### Baja Prioridad (Polish)
8. **ITEM 8** - Reducir texto en bitácora
9. **ITEM 2** - Iconos consistentes en admin

### Ya Implementados (Solo Verificar)
- ITEM 3 - Siestas lavanda
- ITEM 7 - Estilos nocturnos

---

## Éxito

El sprint será exitoso cuando:
1. Todos los bugs reportados estén corregidos
2. QA pueda verificar cada item individualmente
3. No haya regresiones en funcionalidad existente
4. El estado del niño se sincronice entre dispositivos/cuidadores

---

## Notas de la Entrevista

### Respuestas Confirmadas (2026-01-27)

**ITEM 10 - Layout Plan vs Eventos:**
- Se agrega como card ARRIBA del calendario (para padres Y admin)
- Aplica para AMBOS roles
- Si no tiene plan, solo muestra eventos capturados
- Eventos extras se incrustan cronológicamente aunque no estén en el plan

**ITEM 1 - Vista Narrativa:**
- Colapsado por default, mostrando solo los últimos 3 eventos
- Día = ciclo de despertar a despertar (no 24hrs calendario)
- Mobile: narrativa arriba, calendario abajo
- Web: side by side

**ITEM 5 - Tabs:**
- Confirmado: Padres solo ven "Diario" y "Semanal"
- Admin mantiene todo

**ITEM 4 - Scroll:**
- El calendario crece y el usuario hace scroll de PÁGINA

**ITEM 9 - Estado por niño:**
- Confirmado: lo visualizable debe estar en función del niño seleccionado

### Decisiones Adicionales (2026-01-27)

**Lógica de estado ambiguo - RESUELTO:**
- El flujo actual YA obliga `wake` antes de `feeding` cuando el niño está dormido
- Se agrega **ITEM 11: Botón Alimentación Nocturna** para el caso edge donde el bebé come "medio dormido"
- Este botón NO cambia el estado del niño (sigue dormido)
- Resultado: La lógica `sleep/nap más reciente que wake = dormido` funciona sin ambigüedad

**Alcance del botón nocturno:**
- Solo aplica a registro en vivo (botones rápidos)
- Registro manual ya permite registrar libremente

### Preguntas Pendientes

1. **¿Hay mockups/Figma** para el layout Plan vs Eventos?

2. **¿Cuál es la fecha límite** para este sprint?

---

**Última actualización:** 2026-01-27
