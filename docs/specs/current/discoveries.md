# Discoveries: Panel de Diagnóstico (Estadísticas)

Log de aprendizajes entre sesiones de Ralph Loop.

---

## Patrones Clave del Feature

### Admin-Only Access
- **Patrón**: Verificar `session.user.role === "admin"` en server component
- **Referencia**: `app/dashboard/consultas/page.tsx` líneas 46-56
- **UI bloqueada**: Mostrar mensaje de acceso denegado, no redirect

### Prerequisito Plan Activo
- **Lógica**: Query `childPlans` donde `status === "active"`
- **Referencia**: `lib/rag/plan-context-builder.ts` función `getActivePlan()`
- **UI bloqueada**: Mostrar "Selecciona un paciente con plan activo"

### Semáforo de Status (Traffic Light)
- **ok** = verde = `CheckCircle` de Lucide
- **warning** = amarillo = `AlertTriangle` de Lucide
- **alert** = rojo = `AlertCircle` de Lucide
- **Referencia**: `components/dashboard/AdminStatistics.tsx` para colores

### OpenAI Integration
- **Patrón**: Singleton con `getChatAgent()` de `lib/rag/chat-agent.ts`
- **Modelo**: GPT-4 para clasificación de alimentos
- **Fallback**: Retornar `aiClassified: false` si falla

---

## Archivos Clave Identificados

| Archivo | Propósito | Líneas Clave |
|---------|-----------|--------------|
| `app/dashboard/consultas/page.tsx` | Patrón admin-only | 46-56, 161-173 |
| `components/dashboard/AdminStatistics.tsx` | Cards semáforo | ChildAlert, DashboardMetrics |
| `lib/sleep-calculations.ts` | Helpers de cálculo | ProcessedSleepStats |
| `lib/rag/chat-agent.ts` | Patrón OpenAI | getChatAgent() |
| `lib/rag/plan-context-builder.ts` | getActivePlan() | - |

---

## Sesiones

### Session 0 - 2026-02-03

**Setup inicial**
- Implementation plan generado con 36 tareas en 14 fases
- Archivos de ejecución creados en docs/specs/current/
- Feature: Panel de Diagnóstico (Estadísticas) - ÍTEM 4
- Listo para `./ralph-loop.sh`

**Prioridades identificadas:**
1. Fase 0: Activation & Smoke Test (ruta base + admin check)
2. Fase 1-2: Tipos, constantes y reglas base
3. Fases 3-6: Motores de validación (G1-G4)
4. Fase 7-8: API + Pasante AI
5. Fases 9-13: UI completa

**Patrones a seguir:**
- Admin-only pattern de consultas/page.tsx
- Cards semáforo de AdminStatistics.tsx
- OpenAI pattern de chat-agent.ts
- Tipos exportables desde lib/diagnostic/types.ts

---

### Session 1 - 2026-02-03
**Task:** 0.1 - Crear ruta base `/dashboard/diagnosticos`
**Files:** `app/dashboard/diagnosticos/page.tsx`
**Patterns:**
- Seguí el patrón de `consultas/page.tsx` para admin-only + estado vacío
- useEffect para toast de acceso denegado + early return con Card de bloqueo
- Estado vacío con Card centrado, icono `ClipboardList` y flecha animada
**Notes:**
- El build genera 2.37 kB para la ruta
- Errores de lint pre-existentes en otros archivos (no bloqueantes)

---
