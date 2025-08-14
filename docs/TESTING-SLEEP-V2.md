# 🧪 Guía de Pruebas - Sistema de Eventos de Sueño V2

## 🚀 Cambios Activados

El nuevo sistema de eventos de sueño (SimpleSleepToggleV2) ya está activo y listo para probar.

## 📋 Casos de Prueba Recomendados

### 1. Prueba de Contexto Temporal (Plan del Niño)
- **Objetivo**: Verificar que el sistema usa los horarios del plan personalizado
- **Pasos**:
  1. Abre el dashboard y selecciona un niño
  2. Click en "Registro Rápido de Eventos"
  3. Selecciona "Registro de Sueño"
  4. Verifica que muestre los horarios del plan (bedtime/wakeTime)
  5. Si es horario nocturno, el botón debe decir "SE ACOSTÓ"
  6. Si es horario diurno, el botón debe decir "SIESTA"

### 2. Prueba de Alternancia de Estados
- **Objetivo**: Verificar que los botones alternan correctamente
- **Escenario Día (antes de bedtime)**:
  1. Click "SIESTA" → Registra inicio de siesta
  2. Espera que actualice → Debe mostrar "SE DESPERTÓ"
  3. Click "SE DESPERTÓ" → Registra fin de siesta
  4. Debe volver a "SIESTA" para la siguiente

- **Escenario Noche (después de bedtime)**:
  1. Click "SE ACOSTÓ" → Registra inicio de sueño nocturno
  2. Espera que actualice → Debe mostrar "DESPERTAR NOCTURNO"
  3. Click "DESPERTAR NOCTURNO" → Registra despertar
  4. Debe mostrar "VOLVIÓ A DORMIR"
  5. Click "VOLVIÓ A DORMIR" → Vuelve al sueño

### 3. Prueba de Bloques de Eventos
- **Objetivo**: Verificar que se crean bloques con startTime y endTime
- **Pasos**:
  1. Registra un "SE ACOSTÓ"
  2. Registra un "DESPERTAR NOCTURNO"
  3. Ve a la página de eventos del niño
  4. Verifica que el evento de sueño tenga endTime
  5. Verifica que se calculó la duración correctamente

### 4. Prueba de Sincronización Multi-dispositivo
- **Objetivo**: Verificar que el estado se sincroniza entre dispositivos
- **Pasos**:
  1. Abre la app en dos navegadores/dispositivos
  2. En dispositivo 1: Registra "SE ACOSTÓ"
  3. En dispositivo 2: Espera 30 segundos o refresca
  4. Debe mostrar "DESPERTAR NOCTURNO" en ambos

### 5. Prueba de Plan por Defecto
- **Objetivo**: Verificar que funciona sin plan personalizado
- **Pasos**:
  1. Prueba con un niño sin plan activo
  2. Debe usar horarios por defecto (20:00 bedtime, 07:00 wakeTime)
  3. Debe mostrar badge "Plan por defecto"

## 🔍 Qué Verificar

### ✅ Comportamiento Esperado:
- Los botones muestran la acción correcta según el contexto
- Se muestra información del plan activo
- Los estados alternan correctamente (no se quedan "pegados")
- Se muestra la duración actual cuando está durmiendo
- Los eventos se registran con timestamps correctos

### ❌ Posibles Problemas:
- Si el botón no cambia después de registrar → Revisar consola para errores
- Si muestra horarios incorrectos → Verificar el plan del niño
- Si no alterna correctamente → Verificar eventos anteriores en BD

## 📊 Monitoreo

### Consola del Navegador
Abre la consola (F12) y busca:
- Errores de red (fetch failed)
- Errores de permisos (401, 403)
- Errores de datos (400, 500)

### Network Tab
Verifica las llamadas a:
- `/api/children/[id]/active-plan` - Debe retornar el plan
- `/api/children/[id]/current-sleep-state` - Debe retornar el estado actual
- `/api/children/events` - POST para crear eventos
- `/api/children/events` - PATCH para actualizar endTime

## 🐛 Reporte de Bugs

Si encuentras algún problema:

1. **Captura el error**:
   - Screenshot del problema
   - Errores en consola
   - Hora exacta del problema

2. **Contexto**:
   - ¿Qué niño estabas usando?
   - ¿Tiene plan personalizado?
   - ¿Qué hora era cuando ocurrió?
   - ¿Qué acción intentaste?

3. **Estado anterior**:
   - ¿Qué mostraba el botón antes?
   - ¿Había eventos previos?

## 🔄 Rollback (si es necesario)

Si necesitas volver a la versión anterior:

1. Edita `/components/events/QuickEventSelector.tsx`
2. Cambia línea 8: `import SimpleSleepToggleV2` → `import SimpleSleepToggle`
3. Cambia línea 130: `<SimpleSleepToggleV2` → `<SimpleSleepToggle`

---

**Nota**: El sistema V2 está diseñado para ser más preciso y confiable. Los datos de sueño serán más exactos para los reportes y análisis.