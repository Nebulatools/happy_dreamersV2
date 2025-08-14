# 🔧 Plan de Reset y Reconstrucción - Sistema de Registro de Eventos

## 📋 Análisis Previo

### Componentes a ELIMINAR:
```
/components/events/
├── EventRegistrationDualMode.tsx
├── EventRegistrationModal.tsx
├── EventRegistrationModalRefactored.tsx
├── FeedingModal.tsx
├── QuickEventSelector.tsx
├── SimpleSleepToggle.tsx
├── SimpleSleepToggleV2.tsx
├── SleepDelayCapture.tsx
├── TimeAdjuster.tsx
├── EventTypeSelector.tsx
├── EmotionalStateSelector.tsx
├── DurationSlider.tsx
├── SleepDelayInput.tsx
├── ExtraActivitiesInput.tsx
├── GuidedNotesField.tsx
├── index.ts
└── /primary/
    ├── UnifiedSleepCycle.tsx
    ├── UnifiedSleepCycleV2.tsx
    ├── SimplePrimaryMode.tsx
    ├── PrimaryFeedingButton.tsx
    └── SimpleSleepDelaySelector.tsx

/contexts/
└── EventRegistrationModeContext.tsx
```

### Componentes a PRESERVAR:
```
✅ /app/api/children/events/route.ts (Backend API)
✅ /app/api/children/[id]/current-sleep-state/route.ts (Backend API)
✅ /hooks/use-sleep-state.ts (Hook reutilizable)
✅ /hooks/use-child-plan.ts (Hook reutilizable)
✅ /lib/sleep-calculations.ts (Lógica de cálculo)
✅ /lib/date-utils.ts (Utilidades de fecha)
✅ MongoDB schemas y datos existentes
```

### Referencias a LIMPIAR:
```
1. /app/dashboard/page.tsx
   - Línea 14: import { EventRegistrationDualMode }
   - Línea 15: import { EventRegistrationModeProvider }
   - Uso en JSX (buscar y comentar)

2. /app/dashboard/children/[id]/page.tsx
   - Línea 9: import { EventRegistrationModal }
   - Uso del modal (comentar)

3. /app/dashboard/children/[id]/events/page.tsx
   - Revisar componentes de eventos

4. /app/dashboard/calendar/page.tsx
   - Verificar referencias
```

## 🚀 Plan de Ejecución

### FASE 1: Preparación (5 min)
1. [ ] Crear branch de seguridad: `git checkout -b reset-eventos-backup`
2. [ ] Commit estado actual: `git add . && git commit -m "backup: before event system reset"`
3. [ ] Crear archivo de tracking: `RESET-PROGRESS.md`

### FASE 2: Eliminación Controlada (10 min)
1. [ ] Comentar importaciones en páginas principales
2. [ ] Verificar que compile: `npm run build`
3. [ ] Eliminar carpeta `/components/events/`
4. [ ] Eliminar `/contexts/EventRegistrationModeContext.tsx`
5. [ ] Verificar compilación nuevamente

### FASE 3: Limpieza de Referencias (5 min)
1. [ ] Buscar y limpiar imports huérfanos
2. [ ] Comentar secciones de código que dependían de eventos
3. [ ] Asegurar que todas las páginas carguen sin errores

### FASE 4: Verificación del Sistema (5 min)
1. [ ] `npm run dev` - Verificar servidor de desarrollo
2. [ ] Navegar por todas las páginas principales
3. [ ] Verificar que APIs backend sigan funcionando
4. [ ] Confirmar que no hay errores en consola

## 🔨 Plan de Reconstrucción Iterativa

### Iteración 1: Estructura Base (30 min)
```
/components/events/
├── EventRegistration.tsx       # Componente principal simple
├── types.ts                    # Tipos TypeScript
└── index.ts                     # Exportaciones
```
- [ ] Crear botón básico "Registrar Evento"
- [ ] Modal simple con selector de tipo
- [ ] Integración con API existente
- [ ] **TEST**: Crear un evento de prueba

### Iteración 2: Registro de Sueño (45 min)
```
├── SleepButton.tsx             # Botón dormir/despertar
├── SleepStateManager.tsx       # Gestión de estado
```
- [ ] Botón que alterna dormir/despertar
- [ ] Usar hook `useSleepState` existente
- [ ] Clasificación automática (sueño/siesta)
- [ ] **TEST**: Ciclo completo dormir→despertar

### Iteración 3: Captura de Delay (30 min)
```
├── SleepDelayModal.tsx         # Modal para delay
```
- [ ] Modal para capturar tiempo para dormirse
- [ ] Opciones rápidas (0, 15, 30, 45, 60 min)
- [ ] Cálculo de hora real de sueño
- [ ] **TEST**: Verificar tiempos en base de datos

### Iteración 4: Alimentación (30 min)
```
├── FeedingButton.tsx           # Botón de alimentación
├── FeedingModal.tsx            # Modal de alimentación
```
- [ ] Botón prominente de alimentación
- [ ] Modal con tipos (pecho/biberón/sólidos)
- [ ] Pregunta nocturna (dormido/despierto)
- [ ] **TEST**: Registro de alimentación completo

### Iteración 5: Modo Dual (45 min)
```
├── EventModeSelector.tsx       # Selector de modo
├── SimpleMode.tsx              # Modo simple
├── AdvancedMode.tsx            # Modo avanzado
```
- [ ] Toggle entre modos
- [ ] Persistencia en localStorage
- [ ] Modo simple con eventos principales
- [ ] Modo avanzado con todos los campos
- [ ] **TEST**: Cambio de modo y persistencia

### Iteración 6: Pulido y Optimización (30 min)
- [ ] Mejorar UX con loading states
- [ ] Agregar validaciones
- [ ] Optimizar re-renders
- [ ] Agregar animaciones sutiles
- [ ] **TEST FINAL**: Flujo completo de usuario

## ✅ Criterios de Éxito

### Por Iteración:
- [ ] Compila sin errores
- [ ] No hay errores en consola
- [ ] Funcionalidad específica funciona
- [ ] Datos se guardan correctamente en MongoDB
- [ ] UI es responsive y accesible

### Global:
- [ ] Sistema más simple y mantenible
- [ ] Menos bugs que versión anterior
- [ ] Código mejor organizado
- [ ] Testing paso a paso documentado
- [ ] Usuario puede registrar todos los tipos de eventos

## 🚨 Puntos de Control

### Después de cada iteración:
1. Commit con mensaje descriptivo
2. Test manual de la funcionalidad
3. Verificar que no se rompió nada más
4. Documentar cualquier issue encontrado
5. Decidir si continuar o corregir

## 📝 Notas Importantes

- **NO TOCAR**: Backend APIs, hooks existentes, lógica de cálculo
- **PRESERVAR**: Estructura de datos MongoDB
- **MANTENER**: Compatibilidad con componentes de visualización
- **PRIORIDAD**: Funcionalidad sobre estética en primeras iteraciones

---

## ¿Procedemos con el Plan?

Este plan eliminará todos los componentes problemáticos del sistema de eventos y los reconstruirá de forma controlada e iterativa.

**Tiempo estimado total**: 
- Eliminación: 25 minutos
- Reconstrucción: 3-4 horas (con pruebas)

**Riesgo**: Mínimo (tenemos backup y procedemos paso a paso)

**Comando para proceder**:
```bash
# Si apruebas, ejecutaré:
git checkout -b reset-eventos-backup
git add . && git commit -m "backup: before event system reset"
# Luego comenzaré con FASE 2
```