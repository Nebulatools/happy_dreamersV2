# Guia Rapida de QA - Happy Dreamers

**Fecha:** 2026-01-09
**URL:** http://localhost:3000

---

## Credenciales de Testing

| Rol | Email | Password |
|-----|-------|----------|
| Admin | mariana@admin.com | password |
| Usuario (Padre) | eljulius@nebulastudios.io | juls0925 |

---

## PRIORIDAD ALTA - Testing Critico

### 1. Cuestionario de Desarrollo y Salud

**Ruta:** `/dashboard/survey`

**Pasos:**
1. Login como usuario (padre)
2. Ir a "Cuestionario" o acceder via onboarding de nuevo hijo
3. Navegar hasta el paso "Desarrollo y Salud" (paso 4)

**Verificar:**
- [ ] El formulario carga correctamente con todas las secciones
- [ ] Campos de hitos del desarrollo funcionan (rodar, sentarse, gatear, pararse, caminar - en meses)
- [ ] Radio buttons de "Su hijo/a utiliza" (Vaso/Biberon/Ambas) funcionan
- [ ] Radio buttons de alimentacion funcionan con opciones condicionales
- [ ] Checkboxes de problemas del hijo funcionan (chupa dedo, chupon, etc.)
- [ ] Campos adicionales aparecen al seleccionar opciones que requieren detalle
- [ ] Los datos se guardan correctamente al avanzar/finalizar
- [ ] Los datos se cargan correctamente si se regresa al paso

**Campos criticos a probar:**
| Campo | Tipo | Verificar |
|-------|------|-----------|
| rodarMeses | number | Acepta numeros, guarda correctamente |
| sentarseMeses | number | Acepta numeros, guarda correctamente |
| gatearMeses | number | Acepta numeros, guarda correctamente |
| pararseMeses | select | Muestra 1-36 meses + "Aun no lo hace" |
| caminarMeses | number | Acepta numeros, guarda correctamente |
| hijoUtiliza | radio | Vaso/Biberon/Ambas |
| alimentacion | radio | Formula/Leche materna/Mixta/Vaca/Otro/Ninguna |
| comeSolidos | radio | Si/No |
| problemasHijo | checkbox multiple | Ver lista en seccion 9 |
| situacionesHijo | checkbox multiple | Ver lista en seccion 10 |

---

### 2. Visualizacion de Eventos (Lado Admin)

**Ruta:** `/dashboard/patients/child/[childId]` > Tab "Eventos"

**Pasos:**
1. Login como admin (mariana@admin.com)
2. Ir a Dashboard > Pacientes
3. Seleccionar un paciente con eventos registrados
4. Ir al Tab "Eventos"

**Verificar:**
- [ ] Lista de eventos se muestra correctamente
- [ ] Click en cualquier evento abre modal de detalles
- [ ] Modal muestra TODOS los campos del evento:
  - Tipo de evento con icono correcto
  - Hora de inicio y fin
  - Duracion
  - Estado emocional (si aplica)
  - Notas (si hay)
  - Detalles especificos segun tipo:
    - **Feeding:** Tipo (breast/bottle/solids), cantidad, duracion
    - **Medication:** Nombre del medicamento, dosis
    - **Sleep/Nap:** Latencia, despertar nocturno
    - **Activities:** Tipo de actividad, impacto
- [ ] Boton "Editar" abre formulario de edicion
- [ ] Boton "Eliminar" muestra confirmacion antes de eliminar
- [ ] Despues de editar/eliminar, la lista se actualiza automaticamente

**Tipos de evento a verificar:**
| Tipo | Icono | Color | Campos especificos |
|------|-------|-------|-------------------|
| sleep | Moon | indigo | Hora inicio/fin, duracion |
| nap | Sun | amber | Hora inicio/fin, duracion |
| wake | Sun | yellow | Solo hora |
| night_waking | Baby | purple | Hora inicio/fin |
| feeding | Utensils | green | feedingType, cantidad |
| night_feeding | Utensils | green | feedingType, cantidad |
| medication | Pill | blue | nombre, dosis |
| extra_activities | Activity | orange | tipo, impacto |

---

### 3. Edicion de Eventos (Lado Usuario)

**Ruta:** `/dashboard/children/[childId]` (Vista padre)

**Pasos:**
1. Login como usuario (padre)
2. Ir a perfil del hijo
3. Localizar la seccion de eventos/historial
4. Intentar editar un evento existente

**Verificar:**
- [ ] Usuario puede ver sus eventos registrados
- [ ] Existe opcion para editar eventos (si aplica)
- [ ] Formulario de edicion carga datos correctos
- [ ] Cambios se guardan correctamente
- [ ] Validaciones funcionan (campos requeridos, formatos)

---

### 4. Calendario Admin (Visualizacion Correcta)

**Ruta:** `/dashboard/calendar`

**Pasos:**
1. Login como admin (mariana@admin.com)
2. Ir a Dashboard > Calendario
3. Probar vistas: Semana, Dia, Mes

**Verificar Vista Semanal:**
- [ ] Eventos se posicionan en hora correcta (no desplazados)
- [ ] SleepSessionBlock (sleep/nap) ocupa 100% del ancho
- [ ] Otros eventos (feeding, medication) se escalonan si se superponen
- [ ] Iconos tienen buen contraste (stroke negro visible)
- [ ] Tooltip aparece ARRIBA del evento, no a la derecha
- [ ] Eventos de madrugada (02:00 AM) aparecen en su dia REAL (no dia anterior)

**Verificar Vista Diaria:**
- [ ] Eventos superpuestos aparecen lado a lado (no tapandose)
- [ ] Sistema de columnas funciona correctamente
- [ ] Click en evento abre modal de detalles

---

## PRIORIDAD MEDIA

### 5. Plan de Sueno - Dia Logico

**Ruta:** `/dashboard/consultas` (Admin) o `/dashboard/planes` (Padre)

**Pasos:**
1. Abrir un plan de sueno existente con eventos de madrugada
2. Verificar el orden de los eventos en el timeline

**Verificar:**
- [ ] Eventos aparecen en orden logico del dia del nino:
  1. Despertar (wakeTime) - PRIMERO
  2. Actividades diurnas (en orden cronologico)
  3. Dormir (bedtime) - ANTES de eventos nocturnos
  4. Eventos de madrugada (night_feeding 02:00 AM) - AL FINAL
- [ ] Etiqueta dice "Dormir" (NO "Hora de dormir")
- [ ] NO hay descripcion "Ir a la cama" redundante
- [ ] NO hay evento separado de "Acostado" (solo debe haber UN evento de dormir)

### 6. GlobalActivityMonitor

**Verificar:**
- [ ] Alerta aparece SOLO para night_waking pendientes > 20 min
- [ ] NO aparece alerta para sleep/nap en progreso (pueden durar horas)

---

## RESUMEN DE ESTADO

### Implementado y Listo para QA

| Feature | Commit | Estado |
|---------|--------|--------|
| Dia logico en planes | 074960d | Listo |
| Etiqueta "Dormir" simplificada | 074960d | Listo |
| EventDetailsModal reutilizable | e84bc4a | Listo |
| Tab Eventos clickeable (Admin) | e84bc4a | Listo |
| Contraste iconos (stroke negro) | 67e3fdb | Listo |
| SleepSessionBlock 100% ancho | 67e3fdb | Listo |
| Posicionamiento EventGlobe | f606207 | Listo |
| Tooltip arriba del evento | 554412a | Listo |
| Sistema columnas vista diaria | 554412a | Listo |
| GlobalActivityMonitor night_waking | 554412a | Listo |

### Pendiente de Verificar

| Feature | Descripcion | Prioridad |
|---------|-------------|-----------|
| Cuestionario desarrollo/salud | Verificar guardado y carga de datos | ALTA |
| Edicion eventos (usuario) | Verificar flujo completo de edicion | ALTA |
| Visualizacion medicamentos | Admin debe ver nombre y dosis | ALTA |

### Pendiente de Implementar

| Feature | Descripcion | Estado |
|---------|-------------|--------|
| Validacion medicamentos | Hacer nombre/dosis obligatorios | Por implementar |
| Script migracion latencia | migrate-bedtime-latency.ts | Por implementar |

---

## Reporte de Bugs

Si encuentras un bug, documenta:

1. **Ruta:** URL donde ocurrio
2. **Pasos para reproducir:** Numerados
3. **Resultado esperado:** Que deberia pasar
4. **Resultado actual:** Que paso realmente
5. **Screenshot:** Si es visual
6. **Consola:** Errores en DevTools (F12)

---

## Contacto

Reportar issues en el repositorio o documentar en este archivo.
