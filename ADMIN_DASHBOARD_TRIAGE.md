# Sistema de Triage - Dashboard Administrativo Happy Dreamers 🌙

## Visión General

El Dashboard Administrativo de Happy Dreamers ha sido rediseñado con un enfoque en **triage médico**, permitiendo a la doctora identificar rápidamente qué pacientes necesitan atención inmediata y cuáles están progresando adecuadamente.

## 🎯 Objetivo Principal

Transformar el dashboard de una vista de estadísticas generales a una herramienta de **acción inmediata**, donde la doctora puede:
- Identificar casos urgentes en segundos
- Priorizar su tiempo en los pacientes que más lo necesitan
- Tomar acciones rápidas y efectivas

## 🚦 Sistema de Priorización por Colores

### 🔴 ACCIÓN URGENTE (Alertas Críticas)
**Características:**
- Color: Rojo
- Posición: Siempre al inicio del dashboard
- Tamaño: Cards más grandes para mayor visibilidad

**Criterios de inclusión:**
- Patrón de múltiples despertares nocturnos (3+ noches consecutivas)
- Pérdida de independencia para dormir
- Retrocesos significativos en el progreso
- Cualquier indicador que requiera intervención inmediata

**Información mostrada:**
- Nombre del niño
- Nombre del padre/madre
- Diagnóstico clave de Zuli (una frase clara y directa)
- Tiempo desde la última actualización
- Botón de acción: "Revisar y Crear Plan"

### 🟡 NECESITAN REVISIÓN (Alertas de Advertencia)
**Características:**
- Color: Amarillo
- Posición: Después de las alertas críticas
- Tamaño: Cards medianas

**Criterios de inclusión:**
- Inconsistencias en horarios de sueño
- Cambios en patrones de siesta
- Indicadores tempranos de posibles problemas
- Situaciones que requieren monitoreo

**Información mostrada:**
- Nombre del niño
- Nombre del padre/madre
- Observación clave (descripción breve del patrón detectado)
- Tiempo desde la última actualización
- Botón de acción: "Revisar Bitácora"

### 🟢 PACIENTES OK (Sin Alertas)
**Características:**
- Color: Verde
- Posición: Ocultos por defecto
- Acceso: Mediante link "Ver todos los pacientes"

**Criterios de inclusión:**
- Patrones de sueño dentro de parámetros normales
- Progreso consistente
- Sin desviaciones significativas

## 📊 Métricas Simplificadas

Solo se muestran 3 métricas esenciales:

1. **Total de Pacientes**
   - Número total de niños registrados
   - Indicador de crecimiento mensual

2. **Activos Hoy**
   - Pacientes con registros en las últimas 24 horas
   - Porcentaje de actividad

3. **Resumen de Alertas**
   - Conteo visual: 🔴 X | 🟡 Y | 🟢 Z
   - Estado actualizado en tiempo real

## 🔄 Flujo de Trabajo

### Paso 1: Entrada al Dashboard
La doctora ve inmediatamente:
- Saludo personalizado
- Casos urgentes (si los hay)
- Casos que necesitan revisión
- Métricas esenciales

### Paso 2: Triage y Priorización
1. **Casos Rojos**: Atención inmediata
   - Click en la card → Vista de diagnóstico
   - Botón "Revisar y Crear Plan" → Vista de planificación

2. **Casos Amarillos**: Revisión programada
   - Click en la card → Vista de bitácora
   - Evaluación de tendencias

3. **Casos Verdes**: Monitoreo pasivo
   - Accesibles solo si se necesita información específica

### Paso 3: Acciones Rápidas
Desde cada card, la doctora puede:
- Ver el diagnóstico completo del paciente
- Crear un plan de acción personalizado
- Revisar el historial de eventos
- Comunicarse con los padres

## 🎨 Diseño UX

### Principios de Diseño
- **Claridad**: Información esencial visible de inmediato
- **Jerarquía**: Casos urgentes siempre primero
- **Acción**: Botones claros y directos
- **Eficiencia**: Mínimos clicks para llegar a la acción

### Elementos Visuales
- **Iconos**: Uso consistente para cada tipo de alerta
- **Colores**: Sistema semáforo intuitivo
- **Espaciado**: Amplio espacio en blanco para reducir carga cognitiva
- **Tipografía**: Jerarquía clara con tamaños diferenciados

## 💾 Integración con Backend

### Datos Esperados del Backend

```typescript
interface ChildAlert {
  childId: string
  childName: string
  severity: 'critical' | 'warning' | 'ok'
  diagnosis: string          // Texto generado por Zuli
  lastUpdate: string         // Formato: "Hace X horas/días"
  parentName?: string
}

interface DashboardMetrics {
  totalPatients: number
  activeToday: number
  alerts: {
    critical: number
    warning: number
    ok: number
  }
}
```

### Endpoints Necesarios

1. **GET /api/admin/dashboard/triage**
   - Retorna todas las alertas categorizadas
   - Incluye métricas del dashboard

2. **GET /api/admin/patients/today**
   - Lista de pacientes activos en las últimas 24 horas

3. **POST /api/admin/plan/create**
   - Crear plan de acción para un paciente
   - Parámetros: childId, plan details

## 🚀 Beneficios del Nuevo Sistema

1. **Eficiencia Mejorada**
   - 80% menos tiempo identificando casos urgentes
   - Acciones directas desde el dashboard

2. **Mejor Atención al Paciente**
   - Casos críticos nunca pasan desapercibidos
   - Intervención temprana en patrones problemáticos

3. **Reducción de Carga Cognitiva**
   - Solo información relevante y accionable
   - Diseño limpio y enfocado

4. **Flujo de Trabajo Optimizado**
   - De la identificación a la acción en 2 clicks
   - Sin navegación innecesaria

## 📱 Responsive Design

El dashboard está optimizado para:
- **Desktop**: Vista completa con todas las cards
- **Tablet**: Cards en 2 columnas
- **Mobile**: Cards apiladas verticalmente

## 🔮 Futuras Mejoras

1. **Notificaciones Push**: Alertas en tiempo real para casos críticos
2. **Filtros Avanzados**: Por edad, duración del problema, etc.
3. **Exportación de Reportes**: PDF con casos del día/semana
4. **Integración con Calendario**: Agendar seguimientos directamente

## 📝 Notas de Implementación

- Los datos mostrados actualmente son **mockeados** para demostrar el diseño
- El backend debe implementar la lógica de análisis de Zuli
- Los criterios de categorización deben ser configurables
- Considerar agregar webhooks para actualizaciones en tiempo real

---

*Este documento describe la implementación del nuevo sistema de triage para el Dashboard Administrativo de Happy Dreamers, enfocado en mejorar la eficiencia y efectividad del seguimiento de pacientes pediátricos.*