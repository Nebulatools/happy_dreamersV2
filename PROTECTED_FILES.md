# 🚨 ARCHIVOS PROTEGIDOS - NO MODIFICAR

Este documento lista los archivos críticos del sistema de consultas que **NO DEBEN SER MODIFICADOS** sin autorización explícita. Estos archivos contienen lógica compleja de backend desarrollada específicamente para el análisis de consultas médicas pediátricas.

## 📋 Lista de Archivos Protegidos

### 🔧 Backend API Routes

#### 1. `/app/api/consultas/analyze/route.ts`
**Funcionalidad**: Análisis integral de consultas médicas
- Analiza conversaciones completas (padres + médico)
- Extrae acuerdos realistas y viables
- Integración con OpenAI GPT-4
- Calcula estadísticas del niño usando `processSleepStatistics`
- Guarda reportes en MongoDB

#### 2. `/app/api/consultas/history/route.ts`
**Funcionalidad**: Gestión del historial de consultas
- GET: Obtiene historial con información agregada
- POST: Búsqueda por contenido en transcripts
- Calcula estadísticas del historial
- Soporte para filtrado por fechas

#### 3. `/app/api/consultas/plans/route.ts`
**Funcionalidad**: Gestión de planes personalizados
- GET: Obtiene todos los planes de un niño
- POST: Genera nuevos planes (Plan 0 o Plan N+1)
- Plan 0: Basado en survey + estadísticas + RAG
- Plan N+1: Basado en análisis de transcript
- Extracción inteligente de horarios acordados

### 🎨 Frontend Components

#### 4. `/components/consultas/ConsultationHistory.tsx`
**Funcionalidad**: Visualización del historial de consultas
- Muestra consultas anteriores con formato
- Modal para ver detalles completos
- Descarga de reportes en formato texto
- Integración con API de historial

#### 5. `/components/consultas/PlanDisplay.tsx`
**Funcionalidad**: Visualización de planes estructurados
- Timeline visual de rutinas diarias
- Muestra horarios, actividades y siestas
- Panel de objetivos y recomendaciones
- Información de ajustes para planes actualizados

#### 6. `/components/consultas/PlanManager.tsx`
**Funcionalidad**: Gestión de planes en la UI
- Generación de Plan 0 (inicial)
- Generación de planes basados en transcript
- Validación de requisitos para cada tipo de plan
- Lista de planes existentes con estado activo

### 📄 Pages

#### 7. `/app/dashboard/consultas/page.tsx`
**Funcionalidad**: Página principal de consultas
- Tabs: Transcript, Plan, Análisis, Historial
- Selector de usuario y niño
- Integración de todos los componentes
- Control de permisos (solo admin)

### 📝 Types (Parcial)

#### 8. `/types/models.ts` (Sección ChildPlan)
**Funcionalidad**: Definición del tipo ChildPlan
- Estructura de planes personalizados
- Horarios, objetivos y recomendaciones
- Metadata de origen (survey vs transcript)

## ⚠️ Razones de Protección

1. **Complejidad de Lógica**: Estos archivos implementan algoritmos complejos de análisis de conversaciones médicas
2. **Integración con IA**: Prompts específicos para extraer información médica relevante
3. **Consistencia de Datos**: Mantienen la integridad entre análisis, planes y visualización
4. **Funcionalidad Crítica**: Son esenciales para el flujo de trabajo médico de la aplicación

## 📌 Protocolo de Modificación

Si es absolutamente necesario modificar alguno de estos archivos:

1. **Solicitar Autorización**: Pedir permiso explícito antes de cualquier cambio
2. **Documentar Razón**: Explicar por qué es necesario el cambio
3. **Backup**: Crear respaldo del archivo antes de modificar
4. **Pruebas Exhaustivas**: Verificar que no se rompa la funcionalidad existente
5. **Actualizar Documentación**: Reflejar cambios en SESSION-CONTEXT.md

## 🔍 Verificación Rápida

Antes de realizar cualquier cambio en el proyecto, ejecutar:
```bash
# Verificar si un archivo está en la lista protegida
grep -l "archivo_a_modificar" PROTECTED_FILES.md
```

---

**IMPORTANTE**: Este documento debe ser consultado antes de cualquier sesión de desarrollo para evitar modificaciones no autorizadas a estos archivos críticos.