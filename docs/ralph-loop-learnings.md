# Ralph Loop - Learnings & Improvements

Documento para capturar aprendizajes durante la ejecución del Ralph Loop y proponer mejoras para futuras iteraciones.

---

## Issue #1: GAP en User Flow / Entry Points

**Fecha:** 2026-02-03
**Feature:** Panel de Diagnóstico (Estadísticas)
**Detectado por:** Testing manual post-implementación

### Problema

Ralph implementó correctamente las 45 tareas del plan, pero al hacer testing manual el usuario no podía acceder fácilmente al panel de diagnóstico. La página `/dashboard/diagnosticos` mostraba "No hay niños registrados" en lugar de integrarse con el selector de pacientes existente.

### Root Cause

El plan de implementación especificó:
```markdown
- [x] **0.1** Crear ruta base `/dashboard/diagnosticos`
  - Output: Pagina accesible en `/dashboard/diagnosticos`
  - Comportamiento: Muestra "Panel de Diagnostico - Selecciona un paciente" con icono
```

Pero **NO especificó**:
1. Integración con `ActiveChildContext` (el contexto de niño seleccionado)
2. Redirección automática cuando hay niño seleccionado
3. Cómo el usuario navega desde la página base al panel del niño

### Impacto

- Usuario confundido al entrar a `/diagnosticos`
- Flujo UX roto - no había forma obvia de llegar al panel
- Requirió fix manual post-Ralph

### Fix Aplicado

```typescript
// app/dashboard/diagnosticos/page.tsx
import { useActiveChild } from "@/context/active-child-context"

export default function DiagnosticosPage() {
  const { activeChildId, isInitialized } = useActiveChild()

  // Redirigir al panel del niño activo si hay uno seleccionado
  useEffect(() => {
    if (activeChildId && session?.user.role === "admin") {
      router.push(`/dashboard/diagnosticos/${activeChildId}`)
    }
  }, [activeChildId, session, router])

  // Si no hay niño, mostrar instrucciones
  // ...
}
```

### Mejora Propuesta para Ralph Loop

**Agregar sección obligatoria en specs/plans:**

```markdown
## User Flow / Entry Points (OBLIGATORIO)

### Flujo Principal
1. [Descripción del primer paso del usuario]
2. [Cómo llega al feature]
3. [Qué ve en cada estado]

### Estados de la UI
| Estado | Condición | Comportamiento |
|--------|-----------|----------------|
| Loading | Cargando datos | Spinner |
| Empty | Sin datos | Mensaje + CTA |
| Active | Con datos | Mostrar contenido |
| Error | Fallo | Mensaje de error |

### Integraciones con Contexto Existente
- [ ] ¿Usa ActiveChildContext? → Especificar comportamiento
- [ ] ¿Usa UserContext? → Especificar permisos
- [ ] ¿Tiene sidebar link? → Especificar navegación
```

### Checklist para Plan Reviews

Antes de ejecutar Ralph Loop, verificar:

- [ ] ¿El plan especifica cómo el usuario LLEGA al feature?
- [ ] ¿El plan especifica qué pasa en CADA estado de la UI?
- [ ] ¿El plan menciona integraciones con contextos existentes?
- [ ] ¿El plan tiene referencias a componentes/patrones existentes para reusar?

---

## Issue #2: Datos inconsistentes entre componentes (Edad)

**Fecha:** 2026-02-03
**Feature:** Panel de Diagnóstico - ProfileHeader
**Detectado por:** Testing manual E2E
**Severidad:** Baja (cosmético)

### Problema

El ProfileHeader muestra "Edad no disponible" mientras que el selector de pacientes en el header muestra correctamente "1a 5m" para el mismo niño.

### Root Cause

El ProfileHeader recibe `childAgeMonths` del API pero lo muestra como "no disponible". Posibles causas:
1. El campo viene como `null` o `undefined` del API
2. El componente tiene lógica de fallback incorrecta
3. El cálculo de edad falla silenciosamente

### Impacto

- Inconsistencia visual confusa para el admin
- El dato SÍ está disponible (el selector lo muestra)
- No bloquea funcionalidad, solo es cosmético

### Fix Pendiente

Investigar:
1. `components/diagnostic/ProfileHeader.tsx` - verificar prop `childAgeMonths`
2. `app/api/admin/diagnostics/[childId]/route.ts` - verificar que retorna edad
3. Comparar con cómo el selector obtiene la edad

### Mejora Propuesta para Ralph Loop

**Agregar validación de consistencia de datos en specs:**

```markdown
## Data Consistency Checks (OBLIGATORIO para features con datos compartidos)

### Datos que se muestran en múltiples lugares
| Dato | Componente 1 | Componente 2 | Fuente única |
|------|--------------|--------------|--------------|
| Edad | ProfileHeader | ChildSelector | child.birthDate |

### Validación
- [ ] Todos los componentes usan la misma fuente de datos
- [ ] Los cálculos derivados (ej: edad desde birthDate) son consistentes
```

---

## Issue #3: Pasante AI falla con Error 500

**Fecha:** 2026-02-03
**Feature:** Panel de Diagnóstico - Pasante AI
**Detectado por:** Testing manual E2E
**Severidad:** Media (funcionalidad bloqueada)
**Relacionado con:** Issue #2

### Problema

Al hacer clic en "Analizar" en la sección Pasante AI, retorna:
- "Error al generar análisis"
- "Error interno del servidor"

### Root Cause

El endpoint `/api/admin/diagnostics/ai-summary` requiere `childAgeMonths` como número positivo. El componente `DiagnosticPanelClient.tsx` tiene un bug en línea 274-280:

```tsx
// ESTADO SUCCESS - BUG: construye objeto manualmente
<ProfileHeader
  child={{
    _id: childId,
    firstName: diagnosticResult.childName.split(" ")[0],
    lastName: diagnosticResult.childName.split(" ").slice(1).join(" "),
    birthDate: undefined,  // <-- BUG: debería usar childData?.birthDate
  }}
  ...
/>
```

Mientras que en el estado "blocked" (línea 242-248) usa `childData` correctamente.

**Conexión con Issue #2:**
- El mismo bug causa "Edad no disponible" en ProfileHeader
- Y probablemente causa que `childAgeMonths` sea 0 o NaN al llamar al AI

### Impacto

- Pasante AI no funciona
- Característica principal del panel bloqueada
- Admin no puede obtener resumen AI del diagnóstico

### Fix Aplicado

**Commit:** Se agregó `childBirthDate` al API y se corrigió el cliente.

1. `lib/diagnostic/types.ts` - Agregado `childBirthDate?: string`
2. `app/api/admin/diagnostics/[childId]/route.ts` - Incluye `childBirthDate` en respuesta
3. `app/dashboard/diagnosticos/[childId]/DiagnosticPanelClient.tsx` - Usa `childBirthDate`

**Resultado:** Issue #2 (edad) FIXED. Issue #3 persiste pero es problema de API key de OpenAI, no de código.

**Nota sobre Issue #3:** El error 500 del Pasante AI es un problema de configuración de ambiente (API key de OpenAI sin acceso a GPT-4 o sin créditos), no un bug de código.

### Mejora Propuesta para Ralph Loop

**Agregar testing de integración entre componentes en el plan:**

```markdown
## Integration Testing Checklist (OBLIGATORIO)

### Datos compartidos entre componentes
| Componente origen | Componente destino | Dato | Test |
|-------------------|-------------------|------|------|
| API /diagnostics | ProfileHeader | birthDate | Verificar que se pasa |
| API /diagnostics | PasanteAISection | childAgeMonths | Verificar != 0 |

### Flujos críticos a probar
- [ ] Click en "Analizar" → AI responde sin error
- [ ] Datos del header coinciden con datos del API
```

---

## Issue #4: [Próximo issue]

*Agregar aquí el siguiente aprendizaje...*

---

## Resumen de Mejoras Propuestas

| # | Área | Mejora | Prioridad |
|---|------|--------|-----------|
| 1 | Spec/Plan | Sección obligatoria "User Flow / Entry Points" | Alta |
| 2 | Spec/Plan | Data Consistency Checks para datos compartidos | Media |
| 3 | Spec/Plan | Integration Testing Checklist para flujos críticos | Alta |
| 4 | | | |

---

## Template para Nuevos Issues

```markdown
## Issue #N: [Título corto]

**Fecha:** YYYY-MM-DD
**Feature:** [Nombre del feature]
**Detectado por:** [Testing manual / Build error / Usuario]

### Problema
[Descripción del problema encontrado]

### Root Cause
[Por qué pasó - qué faltó en el plan/spec/proceso]

### Impacto
[Consecuencias del problema]

### Fix Aplicado
[Código o cambios que solucionaron el issue]

### Mejora Propuesta para Ralph Loop
[Cómo evitar este problema en el futuro]
```
