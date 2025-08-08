# 🔍 Análisis de Debug - Cálculo de Promedio de Sueño

## Problema Actual
El promedio de sueño nocturno sigue mostrando valores incorrectos (~3h) cuando debería mostrar ~10h.

## Componentes Involucrados

### 1. SleepMetricsGrid (PROBLEMA)
- **Ubicación**: `/components/child-profile/SleepMetricsGrid.tsx`
- **Fuente de datos**: `useSleepData` hook
- **Muestra**: `sleepData.avgSleepDuration` 
- **Problema reportado**: Muestra ~3h en lugar de ~10h

### 2. SleepDataStorytellingCard (FUNCIONA BIEN)
- **Ubicación**: `/components/sleep-statistics/SleepDataStorytellingCard.tsx`
- **Fuente de datos**: `processSleepStatistics` día por día
- **Muestra**: `totalSleepHours` promedio
- **Estado**: Funciona correctamente según el usuario

### 3. EnhancedSleepMetricsCard (POSIBLE PROBLEMA)
- **Ubicación**: `/components/sleep-statistics/EnhancedSleepMetricsCard.tsx`
- **Fuente de datos**: `processSleepBreakdown` local
- **Problema identificado**: Divide entre TODOS los días del período, no solo días con datos

## Flujo de Cálculo

### En useSleepData (usado por SleepMetricsGrid):
```javascript
1. Obtiene eventos del período (30 días)
2. Filtra eventos sleep/wake/nap
3. Llama calculateInferredSleepDuration(events)
4. Esta función:
   - Busca pares sleep→wake
   - Aplica sleepDelay (máx 180 min tras mi fix)
   - Calcula duración de cada noche
   - Promedia SOLO las noches con datos
```

### En SleepDataStorytellingCard (funciona bien):
```javascript
1. Procesa CADA DÍA individualmente
2. Para cada día:
   - Filtra eventos de ESE día específico
   - Incluye wake del día siguiente si existe
   - Llama processSleepStatistics(eventosDelDía)
3. Muestra el promedio correcto
```

## Hipótesis del Problema

### PROBLEMA PRINCIPAL IDENTIFICADO:
**Emparejamiento incorrecto de eventos sleep→wake**

Cuando se procesan TODOS los eventos de 30 días juntos:
- Un evento sleep del día 1 puede emparejarse incorrectamente con un wake del día 15
- Esto causa duraciones incorrectas o muy cortas
- El promedio resultante es incorrecto

### Ejemplo del problema:
```
Día 1: sleep 21:00
Día 2: wake 7:40 ✅ (debería emparejarse con día 1)
...
Día 15: sleep 21:00
Día 16: wake 7:40 ✅

Pero si se procesan todos juntos:
- sleep día 1 → wake día 16 ❌ (15 días de "sueño")
- Esta duración se descarta por ser > 18 horas
- Se pierde el dato real del día 1
```

## Solución Propuesta

### Opción 1: Procesar día por día (como SleepDataStorytellingCard)
```javascript
function calculateInferredSleepDuration(events) {
  // Agrupar eventos por día
  const eventsByDay = groupEventsByDay(events)
  
  // Procesar cada día por separado
  const dailyDurations = []
  for (const dayEvents of eventsByDay) {
    const duration = processDaySleep(dayEvents)
    if (duration > 0) dailyDurations.push(duration)
  }
  
  // Promediar solo días con datos
  return average(dailyDurations)
}
```

### Opción 2: Mejorar emparejamiento de eventos
```javascript
// Verificar que wake sea dentro de 24 horas del sleep
if (nextEvent.eventType === 'wake') {
  const timeDiff = wakeTime - sleepTime
  if (timeDiff < 24 * 60 * 60 * 1000) { // menos de 24 horas
    // Es un par válido
  }
}
```

## Verificación Necesaria

Para confirmar el problema, necesitamos ver en los logs:
1. Cuántos eventos sleep y wake hay
2. Cómo se están emparejando
3. Qué duraciones se están calculando
4. Por qué el promedio es tan bajo

## Próximos Pasos

1. ✅ Implementar procesamiento día por día en calculateInferredSleepDuration
2. ✅ Asegurar que wake events se emparejen solo con sleep del día anterior
3. ✅ Verificar que no se pierdan datos por emparejamientos incorrectos
4. ✅ Probar con datos reales de Valentina