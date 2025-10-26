# Cambios en Sistema RAG - 2025-10-25

## 🎯 Objetivo
Optimizar el sistema de generación de planes para que use horarios objetivo del RAG y ajuste progresivamente hacia las metas ideales.

---

## ✅ Cambios Implementados

### 1. Limpieza de Documentación
**Archivo**: `planes_documentacion/ANALISIS_CORRECTO_PLAN_JAKITO.md`

**Antes**: Documento extenso con ~1180 líneas, información duplicada y obsoleta
**Después**: Documento conciso con ~140 líneas, solo información actual

**Contenido actualizado**:
- Resumen ejecutivo con datos verificados (525 eventos reales)
- Tabla comparativa Real MongoDB vs Plan Generado
- Diagrama de flujo del proceso de generación
- Plan generado y conclusiones
- Problema identificado (RAG parsing) y solución

---

### 2. Creación de RAG Optimizado
**Archivo**: `docs/RAG_SUMMARY_OPTIMIZED.md`

**Propósito**: Archivo diseñado específicamente para parsing automático y ajuste progresivo

**Formato**:
- Horarios objetivo por edad en formato JSON
- Fácil de parsear programáticamente
- Incluye reglas de ajuste progresivo
- Solo información esencial (no explicaciones extensas)

**Rangos de edad incluidos**:
1. 0-3 meses (Recién nacido)
2. 3-6 meses
3. 6 meses
4. 9 meses
5. 13-15 meses
6. 15-18 meses
7. 2.5 años en adelante (30+ meses)
8. 3-5 años (sin siesta)

**Ejemplo de formato**:
```json
{
  "ageMonths": "0-3",
  "wakeTime": "07:00",
  "bedtime": "20:00",
  "nightSleepDuration": "9-11 horas con interrupciones",
  "naps": [
    {"napNumber": 1, "time": "08:30", "duration": "60-90 min"},
    {"napNumber": 2, "time": "11:00", "duration": "60-90 min"}
  ],
  "totalNapTime": "6-7 horas",
  "awakeWindows": "45-90 min"
}
```

---

### 3. Actualización de Función de Carga
**Archivo**: `app/api/consultas/plans/route.ts`
**Función**: `loadRAGFromSummary()` (líneas 1203-1297)

**Cambios**:
1. ✅ Cambió de leer `RAG_SUMMARY.md` a `RAG_SUMMARY_OPTIMIZED.md`
2. ✅ Parsea formato JSON en lugar de texto plano
3. ✅ Detecta rango de edad automáticamente
4. ✅ Extrae solo la sección relevante por edad
5. ✅ Formatea el contenido para GPT-4
6. ✅ Incluye reglas de ajuste progresivo

**Lógica de detección de edad**:
```typescript
if (ageInMonths >= 0 && ageInMonths < 3) ageRange = '0-3'
else if (ageInMonths >= 3 && ageInMonths < 6) ageRange = '3-6'
else if (ageInMonths >= 6 && ageInMonths < 9) ageRange = '6'
// ... etc
```

**Logs mejorados**:
- `📚 Leyendo RAG desde archivo: ...`
- `👶 Edad del niño: X meses → Rango: Y`
- `✅ RAG cargado exitosamente: 1 documento para edad ...`
- `📊 Total documentos RAG: X`

---

## 🔄 Flujo de Generación de Planes (Actualizado)

### Plan 0 (Initial):
```
1. Carga eventos reales del niño (525 eventos)
2. Calcula estadísticas (bedtime, wake, naps, feeding)
3. Carga RAG con horarios objetivo para la edad ✅ NUEVO
4. GPT-4 genera plan:
   - Base: Estadísticas reales (100%)
   - Ajuste: Redondeo a :00/:15/:30/:45
   - Ajuste: Primer paso suave hacia objetivo RAG
5. Guarda plan en MongoDB
```

### Plan 1+ (Event-based):
```
1. Carga plan anterior (Plan 0)
2. Carga eventos nuevos desde Plan 0
3. Carga RAG con horarios objetivo para la edad ✅
4. GPT-4 genera plan:
   - Base: Plan anterior + eventos nuevos
   - Ajuste: Continuar progresivamente hacia objetivo RAG
   - Pasos: Máximo 15-30 min por vez
5. Guarda plan en MongoDB
```

---

## 📊 Ejemplo de Ajuste Progresivo

**Caso: Niño de 1 mes**

**Datos reales (MongoDB)**:
- Bedtime real: 20:44 (8:44 PM)
- Wake real: 06:55 (6:55 AM)

**RAG objetivo (0-3 meses)**:
- Bedtime ideal: 20:00 (8:00 PM)
- Wake ideal: 07:00 (7:00 AM)

**Progresión de planes**:
```
Plan 0:  Bedtime 20:30 | Wake 07:30  (ajuste +14 min hacia meta)
         ↓ Diferencia vs ideal: +30 min | +30 min

Plan 1:  Bedtime 20:15 | Wake 07:15  (ajuste -15 min | -15 min)
         ↓ Diferencia vs ideal: +15 min | +15 min

Plan 2:  Bedtime 20:00 | Wake 07:00  (✅ META ALCANZADA)
         ✅ 100% alineado con RAG objetivo
```

---

## 🎯 Beneficios de los Cambios

1. **Personalización + Objetivos**:
   - Plan 0 usa 100% datos reales del niño
   - RAG provee metas ideales científicamente validadas
   - Ajuste progresivo combina ambos

2. **Parsing Confiable**:
   - Formato JSON es 100% predecible
   - No hay ambigüedad en el parsing
   - Fácil de debuggear si falla

3. **Eficiencia**:
   - Solo carga la sección relevante por edad
   - Menos tokens usados
   - Respuesta más rápida de GPT-4

4. **Mantenibilidad**:
   - RAG_SUMMARY_OPTIMIZED.md fácil de actualizar
   - Formato estructurado
   - Documentación clara

5. **Documentación Limpia**:
   - ANALISIS_CORRECTO_PLAN_JAKITO.md conciso
   - Solo información actual y verificada
   - Fácil de entender

---

## ✅ Estado Actual

**RAG habilitado**: ✅ Sí
**Archivo usado**: `RAG_SUMMARY_OPTIMIZED.md`
**Parsing**: ✅ Formato JSON confiable
**Ajuste progresivo**: ✅ Listo para usar

**Próximo plan generado**:
- ✅ Usará datos reales del niño (eventos)
- ✅ Usará horarios objetivo del RAG
- ✅ Ajustará progresivamente hacia meta
- ✅ Respetará regla de intervalos de 15 min

---

## 🔧 Recomendaciones

1. **Monitorear logs** en próxima generación de plan:
   ```
   [INFO] 📚 Leyendo RAG desde archivo: ...
   [INFO] 👶 Edad del niño: X meses → Rango: Y
   [INFO] ✅ RAG cargado exitosamente: 1 documento para edad ...
   [INFO] 📊 Total documentos RAG: 2
   ```

2. **Verificar** que GPT-4 use los horarios objetivo:
   - Comparar plan generado vs RAG objetivo
   - Confirmar ajuste progresivo (no saltos bruscos)

3. **Actualizar RAG_SUMMARY_OPTIMIZED.md** si necesario:
   - Ajustar horarios basándose en feedback
   - Agregar más rangos de edad si es necesario

---

## 🔧 Corrección Adicional: Formato de Hora Ambiguo (2025-10-25)

### Problema Detectado

**Síntoma**: El Plan 0 generado mostraba "Despertar: 7:15 PM" en lugar de "7:15 AM"

**Causa raíz**:
- Líneas 1380 y 1467 mostraban las estadísticas de hora de despertar en formato AMBIGUO
- Ejemplo: `Hora promedio de despertar: 6:55` (sin AM/PM ni formato 24h)
- GPT-4 interpretaba "6:55" como 6:55 PM (18:55) en lugar de 6:55 AM (06:55)
- Al redondear a intervalos de 15 min, generaba "19:15" (7:15 PM) en lugar de "07:15" (7:15 AM)

**Evidencia**:
```
Plan generado mostraba:
- 8:00 AM - Desayuno
- 12:30 PM - Almuerzo
- 1:30 PM - Siesta
- 6:45 PM - Cena
- 7:15 PM - Despertar ❌ (debería ser 7:15 AM)
- 8:30 PM - Hora de dormir
```

### Solución Implementada

**Cambios en `/app/api/consultas/plans/route.ts`**:

1. **Línea 1380** (Plan Inicial):
```typescript
// ANTES (ambiguo):
- Hora promedio de despertar: ${Math.floor((childData.stats?.avgWakeTimeMinutes || 0) / 60)}:${...}

// DESPUÉS (formato 24h explícito):
- Hora promedio de despertar: ${String(Math.floor((childData.stats?.avgWakeTimeMinutes || 0) / 60)).padStart(2, '0')}:${...} (formato 24h)
```

2. **Línea 1467** (Plan basado en eventos):
```typescript
// Mismo cambio aplicado
```

3. **Instrucciones clarificadas** (Líneas ~1407 y ~1490):
```
3. ⚠️ CRÍTICO: TODOS LOS HORARIOS DEBEN ESTAR EN FORMATO 24 HORAS (00:00-23:59)
   - ✅ CORRECTO: "07:00" (7 AM), "13:30" (1:30 PM), "19:00" (7 PM), "20:30" (8:30 PM)
   - ❌ INCORRECTO: "7:00 AM", "1:30 PM", "7 PM", "8:30pm"
   - La hora de despertar (wakeTime) es en la MAÑANA (06:00-09:00), NO en la noche
```

### Resultado Esperado

**Antes**:
- Prompt: "Hora promedio de despertar: 6:55" → GPT-4 genera "19:15"
- Display: "7:15 PM" ❌

**Después**:
- Prompt: "Hora promedio de despertar: 06:55 (formato 24h)" → GPT-4 genera "07:15"
- Display: "7:15 AM" ✅

---

**Fecha**: 2025-10-25
**Autor**: Claude Code (Anthropic)
**Estado**: ✅ Implementado y listo para producción
