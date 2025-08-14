# 🕐 Lógica del Sleep Delay en Happy Dreamers

## ¿Qué es el Sleep Delay?

El **Sleep Delay** es el tiempo que tarda un niño en dormirse después de acostarse. Es un dato importante para entender patrones de sueño y posibles problemas.

## 📊 Flujo de Datos del Sleep Delay

### 1. CAPTURA (Frontend)
**Ubicación**: `/components/events/SleepDelayModal.tsx`

- **Cuándo se captura**: 
  - Después de registrar "SE DURMIÓ" (sueño nocturno)
  - Después de registrar "SIESTA" (siesta diurna)
  
- **Opciones disponibles**:
  - 0 minutos: Se durmió inmediatamente
  - 15 minutos
  - 30 minutos  
  - 45 minutos
  - 60 minutos: 1 hora o más
  - Omitir: Se asume 0 minutos

### 2. ALMACENAMIENTO (MongoDB)
**Ubicación**: Campo `sleepDelay` y `duration` en el evento

```javascript
// Estructura del evento en MongoDB (v3.1+)
{
  _id: "event-id",
  eventType: "sleep" | "nap",
  startTime: "2025-01-14T21:00:00",  // Hora que se acostó
  endTime: "2025-01-15T07:00:00",     // Hora que despertó
  sleepDelay: 30,                     // Tardó 30 minutos en dormirse
  duration: 570,                      // Duración real calculada automáticamente (570min = 9.5h)
  emotionalState: "tranquilo",
  notes: "Se fue a dormir"
}
```

**🆕 CÁLCULO AUTOMÁTICO DE DURACIÓN (v3.1)**:
- El backend calcula automáticamente `duration` en eventos `sleep/nap/night_waking`
- Fórmula: `duration = totalMinutes - sleepDelay`
- Se aplica tanto en POST (crear evento) como PATCH (agregar endTime)

**Diferencias entre Siesta y Sueño Nocturno**:
- **Siesta (`nap`)**: El sleepDelay afecta el cálculo de duración real
- **Sueño Nocturno (`sleep`)**: El sleepDelay afecta múltiples métricas

### 3. USO EN CÁLCULOS (Backend)

#### A. Cálculo Automático de Duración (v3.1)
**Ubicación**: `/app/api/children/events/route.ts`

```typescript
function calculateSleepDuration(startTime: string, endTime: string, sleepDelay: number = 0): number {
  const totalMinutes = differenceInMinutes(parseISO(endTime), parseISO(startTime))
  const limitedSleepDelay = Math.min(Math.max(sleepDelay || 0, 0), 180) // Máximo 3 horas
  const realSleepDuration = Math.max(0, totalMinutes - limitedSleepDelay)
  return realSleepDuration
}
```

**Cuándo se calcula automáticamente:**
- **POST**: Al crear evento con `startTime` + `endTime` (sin `duration` manual)
- **PATCH**: Al agregar `endTime` a evento existente
- **Solo aplica a**: `sleep`, `nap`, `night_waking`

#### B. Cálculo de Duración en Estadísticas (Existente)
**Ubicación**: `/lib/sleep-calculations.ts`

```typescript
// LÓGICA ANTERIOR (aún válida para estadísticas complejas)
horaRealDeSueño = horaAcostarse + sleepDelay
duración = horaDespertar - horaRealDeSueño
```

**🔄 Ejemplo Práctico (v3.1)**:
- Se acostó: 21:00 (`startTime`)
- Sleep Delay: 30 minutos (`sleepDelay`)
- Despertó: 07:00 (`endTime`)
- **Cálculo automático**: 
  - Total en cama: 600 minutos (10 horas)
  - Tiempo para dormirse: 30 minutos
  - **Duración real**: 570 minutos = 9.5 horas

#### C. Límites de Seguridad

```typescript
const sleepDelay = Math.min(rawSleepDelay, 180) // Máximo 3 horas
```
- Se limita a máximo 180 minutos (3 horas) para evitar datos erróneos
- Duración mínima: 0 minutos (no valores negativos)

### 4. ESTADÍSTICAS Y MÉTRICAS

#### Métricas Calculadas (v3.1):

1. **Duración Real de Sueño** 🆕:
   - **v3.1**: Se guarda automáticamente en campo `duration` al crear/actualizar evento
   - **Estadísticas**: También se calcula en `/lib/sleep-calculations.ts` para análisis histórico
   - Más preciso que solo usar hora de acostarse

2. **Promedio de Sleep Delay**:
   - **Ubicación**: `/lib/sleep-calculations.ts` - función `calculateAverageSleepDelay`
   - Se calcula el promedio de todos los sleepDelay de la última semana
   - Se muestra como "Tiempo para dormirse" en estadísticas

3. **Calidad del Sueño**:
   - Si sleepDelay > 30 min → Indicador de posible problema
   - Si sleepDelay < 10 min → Buen indicador de sueño

### 5. INSIGHTS Y RECOMENDACIONES
**Ubicación**: `/app/api/sleep-analysis/insights/route.ts`

#### Generación de Insights:

```typescript
if (sleepDelayMinutes > 20) {
  // Genera insight: "Tarda en dormirse"
  // Prioridad: Alta si > 30 min, Media si 20-30 min
  // Recomendación: Revisar rutina de sueño
}
```

**Umbrales**:
- **Normal**: 0-15 minutos
- **Atención**: 15-30 minutos
- **Problema**: > 30 minutos

### 6. VISUALIZACIÓN (Frontend)

#### Dashboard Principal
- **NO se muestra directamente** el sleepDelay individual
- Se usa para calcular duración real en gráficas
- Afecta el promedio semanal mostrado

#### Estadísticas de Sueño
- Aparece como "Tiempo para dormirse: X min" (promedio)
- Se incluye en el análisis de calidad de sueño

## 🔄 Diferencias entre Siesta y Sueño Nocturno

### SIESTA (eventType: "nap")
1. **Captura**: Modal pregunta cuánto tardó
2. **Almacenamiento**: `sleepDelay` en el evento
3. **Cálculo**: Resta del tiempo total para duración real
4. **Visualización**: Afecta duración mostrada en estadísticas
5. **Insights**: No genera insights específicos (las siestas son más variables)

### SUEÑO NOCTURNO (eventType: "sleep")
1. **Captura**: Modal pregunta cuánto tardó
2. **Almacenamiento**: `sleepDelay` en el evento
3. **Cálculo**: 
   - Resta del tiempo total para duración real
   - Se incluye en promedio semanal
   - Afecta cálculo de eficiencia del sueño
4. **Visualización**: 
   - Aparece en "Tiempo para dormirse" (promedio)
   - Afecta gráficas de duración
5. **Insights**: 
   - Genera alertas si > 20 min consistentemente
   - Sugiere revisar rutina si > 30 min

## 📈 Impacto en Métricas

### Métricas Afectadas:
1. **Duración Total de Sueño**: Se resta el sleepDelay
2. **Eficiencia del Sueño**: (Tiempo dormido / Tiempo en cama) × 100
3. **Promedio Semanal**: Incluye el ajuste por sleepDelay
4. **Calidad del Sueño**: Factor en el score de calidad

### Métricas NO Afectadas:
1. **Hora de Acostarse**: Sigue siendo la hora registrada
2. **Hora de Despertar**: No cambia
3. **Número de Despertares**: Independiente del sleepDelay

## 🎯 Casos de Uso Médico

### Para Profesionales de Salud:
1. **Diagnóstico**: Identificar problemas de conciliación del sueño
2. **Seguimiento**: Ver evolución del sleepDelay en el tiempo
3. **Intervención**: Datos para ajustar rutinas o tratamientos
4. **Comparación**: Contrastar con valores normales por edad

### Valores de Referencia (por edad):
- **0-3 meses**: Variable, no aplica
- **3-12 meses**: 10-20 minutos normal
- **1-3 años**: 15-30 minutos normal
- **3-5 años**: 10-20 minutos normal
- **> 5 años**: 10-15 minutos normal

## 🔧 Consideraciones Técnicas

### Validación de Datos:
- Mínimo: 0 minutos
- Máximo: 180 minutos (3 horas)
- Default: 0 si se omite el modal

### Retrocompatibilidad:
- Eventos antiguos sin sleepDelay asumen 0
- Sistema funciona con o sin el campo
- Migración gradual de datos históricos

### Performance:
- Cálculo en tiempo real no afectado
- Estadísticas se cachean por 5 minutos
- Insights se recalculan cada vez (no cachean)

## 🔧 Historial de Cambios

### v3.1 - Agosto 2025
- **🆕 Cálculo Automático de Duración**: Backend calcula automáticamente `duration` en eventos sleep/nap/night_waking
- **🔧 API Mejorada**: POST y PATCH calculan duración usando `differenceInMinutes` y `sleepDelay`
- **🛡️ Validación**: Límites de seguridad para sleepDelay (máximo 180 min) y duration (mínimo 0)
- **📊 Precisión**: Los eventos ahora tienen duración real calculada que aparece en estadísticas

### v3.0 - Enero 2025
- Implementación inicial del sistema sleepDelay
- Modal de captura de tiempo para dormirse
- Integración con estadísticas y cálculos

---

**Última actualización**: Sistema v3.1 - Agosto 2025