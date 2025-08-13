# Documentation Structure - Happy Dreamers 🌙

*Última actualización: 8 de Enero, 2025*

## 📁 Estructura de Documentación

El proyecto Happy Dreamers utiliza una estructura organizada de documentación para mantener la información accesible y manejable.

## 🗂️ Organización de Carpetas

### `/docs/` - Documentación Permanente
Documentación arquitectónica y técnica del sistema que no cambia frecuentemente.

- **ARCHITECTURE.md** - Diseño del sistema y decisiones arquitectónicas
- **API_REFERENCE.md** - Endpoints, formatos de request/response
- **DATABASE.md** - Esquemas MongoDB, relaciones, índices
- **COMPONENTS.md** - Biblioteca de componentes y patrones UI
- **AI_INTEGRATION.md** - Sistema RAG, OpenAI, LangChain
- **SECURITY.md** - Prácticas de seguridad y autenticación
- **TESTING.md** - Estrategias de testing y cobertura
- **DEPLOYMENT.md** - Configuración Vercel, variables de entorno
- **DEVELOPMENT.md** - Workflow de desarrollo, estándares
- **TROUBLESHOOTING.md** - Problemas comunes y soluciones
- **DOCUMENTATION-STRUCTURE.md** - Este archivo

### `/reference/` - Documentación de Referencia
Documentación específica de features y sistemas que se consulta ocasionalmente.

- **workflow.md** - Flujo técnico detallado del sistema
- **survey.md** - Estructura completa del sistema de encuestas
- **CONSULTAS.md** - Sistema de consultas médicas con IA
- **ADMIN_DASHBOARD_TRIAGE.md** - Sistema de triage del dashboard administrativo

### `/session-archive/` - Archivo Histórico
Contextos de sesiones anteriores organizados por fecha.

```
/session-archive/
  /2025-01/     # Enero 2025
  /2024-12/     # Diciembre 2024
  /2024-11/     # Noviembre 2024
```

### Archivos Raíz - Documentación Activa

- **CLAUDE.md** - Instrucciones y workflow para Claude AI
- **SESSION-CONTEXT.md** - Contexto actual del proyecto (MAX 500 líneas)
- **SESSION-DEBUG.md** - Historial de debugging técnico
- **README.md** - Documentación principal del proyecto
- **PROTECTED_FILES.md** - Lista de archivos protegidos

### `/tasks/` - Gestión de Tareas

- **TODO.md** - Tareas actuales y prioridades
- **DASHBOARD_IMPLEMENTATION.md** - Tareas específicas del dashboard

## 📏 Reglas de Mantenimiento

### Límites de Tamaño
- **SESSION-CONTEXT.md**: Máximo 500 líneas
- **Información antigua**: Archivar después de 1 semana
- **No duplicación**: Usar referencias a /docs/ en lugar de copiar

### Rotación de Contexto
1. **Semanalmente** (preferiblemente lunes):
   - Mover contexto antiguo a `/session-archive/YYYY-MM/`
   - Limpiar SESSION-CONTEXT.md
   - Actualizar solo con información reciente

2. **Al final de cada sesión**:
   - Verificar que SESSION-CONTEXT.md < 500 líneas
   - Eliminar información obsoleta
   - Actualizar referencias si es necesario

### Archivos Obsoletos Eliminados (8 de Enero, 2025)
Los siguientes archivos fueron eliminados por ser obsoletos o temporales:
- OPTIMIZATION-ROADMAP.md
- OPTIMIZATION-SUMMARY.md
- PHASE3-OPTIMIZATION-SUMMARY.md
- COMPONENT-COMPLEXITY-ANALYSIS.md
- TESTING-ANALYSIS.md
- modificaciones.md
- FUNCIONALIDAD-ENCUESTA-COMPLETADA.md
- figma-screens-documentation.md

## 🔄 Flujo de Trabajo de Documentación

### Durante el Desarrollo
1. Consultar **SESSION-CONTEXT.md** para estado actual
2. Usar **/docs/** para referencias arquitectónicas
3. Consultar **/reference/** para detalles de features
4. Actualizar **/tasks/TODO.md** con progreso

### Al Final de la Sesión
1. Actualizar **SESSION-CONTEXT.md** con cambios recientes
2. Verificar límite de 500 líneas
3. Mover información antigua a **/session-archive/** si es necesario
4. Actualizar **SESSION-DEBUG.md** si hubo problemas técnicos

### Mantenimiento Semanal
1. Revisar y limpiar **SESSION-CONTEXT.md**
2. Archivar contextos antiguos en **/session-archive/YYYY-MM/**
3. Eliminar archivos markdown temporales no necesarios
4. Actualizar referencias en documentación si cambió la estructura

## 📊 Métricas de Documentación

### Estado Actual (8 de Enero, 2025)
- **Total archivos .md**: 26 (reducido de 33)
- **SESSION-CONTEXT.md**: 135 líneas (reducido de 1,941)
- **Reducción de tokens**: -93%
- **Archivos eliminados**: 8
- **Nueva estructura**: 100% implementada

## 🎯 Beneficios de Esta Estructura

1. **Procesamiento Eficiente**: SESSION-CONTEXT pequeño y manejable
2. **Información Organizada**: Separación clara por tipo de documentación
3. **Historial Preservado**: Archivo completo en /session-archive/
4. **Mantenimiento Simple**: Reglas claras y estructura definida
5. **Acceso Rápido**: Documentación categorizada por propósito

## 🚀 Mejores Prácticas

- **Mantener SESSION-CONTEXT.md bajo 500 líneas** siempre
- **Usar referencias** en lugar de duplicar información
- **Archivar regularmente** contextos antiguos
- **Documentar decisiones importantes** en /docs/
- **Limpiar archivos temporales** al final de cada sprint
- **Mantener README.md actualizado** con cambios mayores

---

*Esta estructura fue implementada el 8 de Enero de 2025 para mejorar la eficiencia y mantenibilidad de la documentación del proyecto.*