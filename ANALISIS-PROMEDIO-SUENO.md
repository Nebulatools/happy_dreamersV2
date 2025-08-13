# 🔍 Análisis Completo del Problema de Cálculo del Promedio de Sueño Nocturno

## 📊 Resumen del Problema
**Síntoma reportado**: El promedio diario de sueño nocturno muestra **3 horas 23 minutos** cuando debería mostrar aproximadamente **10-11 horas** basado en:
- Hora de acostarse: 21:00 (9 PM)
- Hora de despertar: 7:40 AM
- Duración esperada: ~10 horas 40 minutos

## 🔄 Flujo de Datos Actual

### 1. Registro de Eventos (SimpleSleepToggle.tsx)
```
Usuario registra "SE ACOSTÓ" (21:00)
    ↓
Se crea evento con:
- eventType: 'sleep' (nocturno)
- startTime: "2025-01-08T21:00:00.000Z"
- sleepDelay: X minutos (tiempo para dormirse)
    ↓
Usuario registra "SE DESPERTÓ" (7:40)
    ↓
Se crea evento con:
- eventType: 'wake'
- startTime: "2025-01-09T07:40:00.000Z"
```

### 2. Almacenamiento en MongoDB
Los eventos se guardan en el array `events` del documento del niño:
```javascript
{
  _id: "childId",
  events: [
    {
      _id: "event1",
      eventType: "sleep",
      startTime: "2025-01-08T21:00:00.000Z",
      sleepDelay: 30, // minutos para dormirse
      ...
    },
    {
      _id: "event2",
      eventType: "wake",
      startTime: "2025-01-09T07:40:00.000Z",
      ...
    }
  ]
}
```

### 3. Recuperación de Datos (API /api/children/events)
La API devuelve los eventos tal como están en la base de datos, sin procesamiento adicional.

### 4. Procesamiento en useSleepData Hook

#### Paso 4.1: Filtrado de eventos (líneas 70-77)
```javascript
const sleepEvents = allEvents.filter((e: any) => {
  if (!e.startTime) return false
  const date = parseISO(e.startTime)
  return ['sleep', 'nap', 'bedtime', 'wake', 'night_waking'].includes(e.eventType) 
    && date >= filterDate
})
```

#### Paso 4.2: Cálculo del promedio (línea 122)
```javascript
const avgSleepDuration = calculateInferredSleepDuration(events)
```

## 🐛 Análisis del Problema en calculateInferredSleepDuration

### Flujo del Cálculo (líneas 254-342)

```javascript
function calculateInferredSleepDuration(events: any[]): number {
  // 1. Ordena eventos por fecha
  const sortedEvents = events
    .filter(e => e.startTime && e.eventType !== 'night_waking')
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
  
  // 2. Busca pares bedtime/sleep → wake
  for (let i = 0; i < sortedEvents.length - 1; i++) {
    const currentEvent = sortedEvents[i]
    const nextEvent = sortedEvents[i + 1]
    
    if (['bedtime', 'sleep'].includes(currentEvent.eventType) &&
        nextEvent.eventType === 'wake') {
      
      const bedTime = parseISO(currentEvent.startTime)
      const wakeTime = parseISO(nextEvent.startTime)
      
      // 🔴 PROBLEMA IDENTIFICADO - Línea 286:
      const sleepDelay = currentEvent.sleepDelay || 0
      const actualSleepTime = new Date(bedTime.getTime() + sleepDelay * 60 * 1000)
      
      let duration = differenceInMinutes(wakeTime, actualSleepTime)
      
      // Si es negativo, suma 24 horas
      if (duration < 0) {
        duration += 24 * 60
      }
      
      // Solo acepta duraciones de 1-18 horas
      if (duration >= 60 && duration <= 1080) {
        sleepDurations.push(duration)
      }
    }
  }
}
```

## 🎯 Causa Raíz Identificada

### Problema Principal: Ajuste por sleepDelay

**Escenario del problema**:
1. **Bedtime**: 21:00 (9 PM)
2. **sleepDelay**: 30 minutos (ejemplo)
3. **Tiempo real de sueño calculado**: 21:30
4. **Wake**: 7:40 AM (día siguiente)
5. **Diferencia calculada**: 7:40 - 21:30 = 10h 10min

**PERO** si el cálculo está dando 3h 23min (203 minutos), esto sugiere varios posibles problemas:

### Hipótesis 1: Problema con el emparejamiento de eventos
Los eventos sleep y wake no se están emparejando correctamente debido a:
- Eventos intermedios que rompen la secuencia
- Múltiples eventos sleep sin wake correspondiente
- Eventos wake sin sleep previo

### Hipótesis 2: Problema con el manejo de fechas
El cálculo de diferencias podría estar fallando cuando:
- Las fechas cruzan la medianoche
- El ajuste de +24*60 minutos no se aplica correctamente
- Los eventos tienen zonas horarias inconsistentes

### Hipótesis 3: Problema con sleepDelay excesivo
Si sleepDelay es muy grande (ej: 437 minutos = 7h 17min), entonces:
- Bedtime: 21:00
- sleepDelay: 437 minutos
- Tiempo real de sueño: 4:17 AM (21:00 + 7h 17min)
- Wake: 7:40 AM
- Diferencia: 3h 23min ✅ (coincide con el síntoma)

## 📍 Puntos de Debug Recomendados

### 1. Verificar los eventos reales en la base de datos
```javascript
// En use-sleep-data.ts, línea 266-268
logger.debug('Procesando eventos para duración', { count: sortedEvents.length })
sortedEvents.forEach((e, i) => {
  logger.debug(`Evento ${i}`, { 
    tipo: e.eventType, 
    inicio: new Date(e.startTime).toLocaleString(), 
    delay: e.sleepDelay  // ← VERIFICAR ESTE VALOR
  })
})
```

### 2. Verificar el cálculo de duración
```javascript
// En use-sleep-data.ts, línea 297-299
logger.debug('Duración válida', { 
  minutos: duration, 
  horas: (duration/60).toFixed(1),
  sleepDelay: currentEvent.sleepDelay, // ← AGREGAR ESTO
  bedtime: bedTime.toLocaleString(),
  wake: wakeTime.toLocaleString(),
  actualSleepTime: actualSleepTime.toLocaleString()
})
```

## 🔧 Soluciones Propuestas (sin modificar código)

### Solución Inmediata: Verificar los datos
1. **Revisar los eventos en MongoDB** para el niño específico
2. **Verificar el valor de sleepDelay** en los eventos de tipo 'sleep'
3. **Confirmar que los eventos wake** existen y están correctamente emparejados

### Comandos de Verificación
```bash
# En la consola del navegador:
localStorage.getItem('sleep-state-[childId]')

# En MongoDB:
db.children.findOne(
  { firstName: "Valentina" },
  { events: { $slice: -10 } }  // Últimos 10 eventos
)
```

## 📋 Conclusión

El problema más probable es que **sleepDelay tiene un valor incorrecto o excesivamente grande** (Hipótesis 3), causando que el "tiempo real de sueño" se calcule mucho más tarde de lo esperado, resultando en una duración de sueño mucho menor.

### Verificación Rápida
Para confirmar esta hipótesis, necesitamos ver:
1. Los eventos reales de Valentina en los últimos 30 días
2. El valor específico de sleepDelay en los eventos de tipo 'sleep'
3. Si hay eventos wake correspondientes para cada sleep

### Impacto
Este problema afecta:
- El cálculo del promedio de sueño nocturno
- Las métricas de salud del sueño
- Los reportes médicos
- La percepción de los padres sobre los patrones de sueño

---

*Análisis completado el 8 de Enero de 2025*
*Sin modificaciones de código realizadas*