# Correcciones Sistema de Eventos de Sueño - 14 Enero 2025

## ✅ ACTUALIZACIÓN: Todas las correcciones funcionando correctamente

### Estado Final:
- ✅ Posicionamiento en calendario: CORREGIDO - Los eventos aparecen en la hora correcta
- ✅ Doble registro de despertar: CORREGIDO - Solo se crea un evento por despertar
- ✅ Alternancia de botones: FUNCIONANDO - Los botones cambian correctamente entre estados

## Problemas Identificados y Resueltos

### 1. ❌ Problema de Posicionamiento en Calendario
**Síntoma**: Los eventos aparecían en posiciones incorrectas en el calendario. Un evento de las 19:06 aparecía cerca de las 21:00-24:00.

**Causa**: La función `toLocalISOString` guardaba las fechas con offset de zona horaria (ej: "2025-01-14T19:06:00.000-06:00"). Cuando `EventBlock.tsx` usaba `new Date(event.startTime)`, JavaScript interpretaba incorrectamente el timezone causando el desplazamiento visual.

**Solución Aplicada en `/components/calendar/EventBlock.tsx`**:
- Agregada función `parseLocalISODate()` para parsear correctamente fechas ISO locales
- Reemplazadas todas las llamadas a `new Date(event.startTime)` con `parseLocalISODate(event.startTime)`
- Esto asegura que las horas se interpreten correctamente sin desplazamientos de timezone

### 2. ❌ Problema de Doble Registro de Despertar
**Síntoma**: Al registrar un despertar, se creaban dos eventos (despertar de mañana Y despertar de siesta) cuando debería ser solo uno según el contexto.

**Causa**: La lógica no distinguía correctamente entre los diferentes contextos de despertar (siesta vs sueño nocturno vs despertar matutino).

**Solución Aplicada en `/components/events/primary/UnifiedSleepCycleV2.tsx`**:
- Refactorizada la función `handleWakeUp()` con lógica más clara:
  - Si estado es 'napping' → Despertar de siesta
  - Si es de noche y estado es 'sleeping' → Despertar nocturno
  - Si es de día y estado es 'sleeping' → Despertar de la mañana
- Agregados logs de debug para monitorear el comportamiento
- Solo se crea UN evento por despertar según el contexto actual

## Archivos Modificados

1. **`/components/calendar/EventBlock.tsx`**
   - Agregada función `parseLocalISODate()`
   - Actualizadas todas las referencias de parseo de fechas
   - Corregido cálculo de posición vertical

2. **`/components/events/primary/UnifiedSleepCycleV2.tsx`**
   - Refactorizada lógica de `handleWakeUp()`
   - Mejorada distinción entre tipos de despertar
   - Agregados logs de debug para diagnóstico
   - Mejorados mensajes de toast para cada contexto

## Logs de Debug Agregados

Para monitorear el comportamiento, se agregaron los siguientes logs:
```javascript
console.log('[DEBUG] handleWakeUp iniciado:', {
  sleepState,
  isNightTime: isNightTime(),
  wakeTime: toLocalISOString(wakeTime)
})

console.log('[DEBUG] handleSleepConfirm:', {
  eventType,
  isNightTime: isNightTime(),
  sleepTime: toLocalISOString(sleepTime),
  delay
})
```

## Comportamiento Esperado Después de las Correcciones

### Calendario:
- Los eventos deben aparecer en la posición correcta según su hora real
- Un evento de las 19:06 debe aparecer exactamente en la línea de las 19:00 del calendario

### Registro de Eventos:
- **Durante el día (fuera del horario de sueño):**
  - Botón muestra "SIESTA" → registra evento tipo 'nap'
  - Al despertar → registra UN solo evento 'wake' con nota "Despertar de siesta"

- **Durante la noche (dentro del horario de sueño):**
  - Botón muestra "SE DURMIÓ" → registra evento tipo 'sleep'
  - Al despertar durante la noche → registra evento 'night_waking'
  - Al volver a dormir → registra nuevo evento 'sleep'
  - Al despertar en la mañana → registra evento 'wake' con nota "Despertar de la mañana"

### Alternancia de Botones:
1. Estado inicial: "SIESTA" (día) o "SE DURMIÓ" (noche)
2. Después de registrar sueño: "SE DESPERTÓ"
3. Después de registrar despertar: Vuelve a "SIESTA" o "SE DURMIÓ"
4. Si es despertar nocturno: "VOLVIÓ A DORMIR"

## Próximos Pasos

1. ✅ Problema de posicionamiento en calendario corregido
2. ✅ Problema de doble registro de despertar corregido
3. ✅ Alternancia de botones funcionando correctamente
4. ⏳ Remover logs de debug en próxima sesión
5. ✅ Commit final con todas las correcciones realizado

## Notas Técnicas

- La función `parseLocalISODate()` maneja correctamente fechas con y sin timezone
- La lógica de despertar ahora es mutuamente exclusiva (solo un tipo de despertar por vez)
- Los logs de debug pueden removerse una vez confirmado el funcionamiento correcto