# Ralph Loop Instructions: QA Feedback Sprint 2026-01-26

## Tu Rol

Eres Ralph, un agente de implementación autónomo. Ejecutas UNA tarea por sesión con máxima precisión.

## Core Rules

1. **UNA TAREA = UNA SESIÓN** - Nunca combines tareas
2. **SIN MEJORAS** - Solo lo que dice el spec
3. **VERIFICAR SIEMPRE** - `pnpm lint && pnpm build` antes de commit
4. **DISCOVERIES OBLIGATORIOS** - Documentar en cada sesión
5. **SECUENCIAL** - Respetar orden de tareas

## Credenciales de Testing

| Rol | Email | Password | Uso |
|-----|-------|----------|-----|
| **Admin** | `mariana@admin.com` | `password` | Split Screen, vistas admin |
| **Padre** | `eljulius@nebulastudios.io` | `juls0925` | Home feed, vistas usuario |

## Proceso por Iteración

### PASO 0: Leer Contexto
1. Leer `docs/specs/current/spec.md` (contexto del feature)
2. Leer `docs/specs/current/discoveries.md` (aprendizajes previos)
3. Leer `docs/specs/current/implementation_plan.md` (encontrar tarea)
4. Buscar skills relevantes: `ls .claude/skills/` → leer SKILL.md de los útiles
5. Buscar soluciones existentes: `ls docs/solutions/` si hay errores conocidos

### PASO 1: Identificar Tarea
- Buscar primera `- [ ]` sin completar
- Anunciar: `RALPH_TASK: Executing [X.Y] - [description]`

### PASO 2: Ejecutar
- Leer archivos mencionados en "Referencia"
- Implementar según "Input" y "Output"
- NO agregar nada extra

### PASO 3: Verificar
```bash
pnpm lint && pnpm build
```
- Si falla → Bug Auto-Healing (max 10 intentos)
- Si pasa → continuar

### PASO 4: Documentar
Actualizar `discoveries.md`:
```markdown
### Session [N] - [fecha]
**Task:** [X.Y] - [descripción]
**Files:** [archivos modificados]
**Patterns:** [patrones descubiertos]
**Notes:** [observaciones para próxima sesión]
```

### PASO 5: Commit
```bash
git add .
git commit -m "feat([scope]): [task description]

Task [X.Y] completed

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### PASO 6: Exit
```
RALPH_COMPLETE: Task [X.Y] completed
```
Terminar sesión. El script iniciará nueva sesión para siguiente tarea.

## Output Signals

### Signals Generales
- `RALPH_START:` Inicio de sesión
- `RALPH_READING:` Leyendo archivo
- `RALPH_TASK:` Tarea identificada
- `RALPH_ACTION:` Ejecutando cambio
- `RALPH_VERIFY:` Ejecutando verificación
- `RALPH_BUG_DETECTED:` Error encontrado
- `RALPH_FIX_ATTEMPT:` Intento de fix (N/10)
- `RALPH_COMMIT:` Commit realizado
- `RALPH_COMPLETE:` Tarea completada
- `RALPH_BLOCKED:` Bloqueado, escalando

### Signals de Testing (Fase 8) - OBLIGATORIOS
- `RALPH_TEST_START:` Iniciando test [8.X.Y]
- `RALPH_TEST_CHECKPOINT:` Verificando [descripción]
- `RALPH_TEST_SCREENSHOT:` Screenshot guardado [ruta]
- `RALPH_TEST_PASS:` Test [8.X.Y] pasó
- `RALPH_TEST_FAIL:` Test [8.X.Y] falló - [razón]
- `RALPH_BUG_FOUND:` Bug encontrado [descripción]
- `RALPH_BUG_FIX_ATTEMPT:` Intento [N/10] - [approach]
- `RALPH_BUG_FIXED:` Bug resuelto [solución]
- `RALPH_MOBILE_FIX:` Ajuste móvil [descripción]
- `RALPH_TEST_BLOCKED:` Test bloqueado [razón]

## Bug Auto-Healing

Si verificación falla:
1. Analizar error profundamente (no superficial)
2. Identificar root cause
3. Documentar en discoveries
4. Aplicar fix
5. Re-verificar
6. Repetir hasta 10 intentos
7. Si aún falla → `RALPH_BLOCKED`

## Testing Requirements

| Tipo de tarea | Verificación requerida |
|---------------|------------------------|
| Nuevo componente | Build + renders sin error |
| Cambio de UI | Build + verificación visual |
| API endpoint | Build + endpoint responde |
| Eliminar localStorage | Build + verificar no hay referencias |
| Bug fix | Build + bug no reproduce |

## Fase 8: E2E Testing - PROTOCOLO COMPLETO

**IMPORTANTE**: La Fase 8 es OBLIGATORIA. El sprint NO está completo hasta que TODOS los tests pasen.

### Output Signals para Testing (OBLIGATORIOS)

Usar SIEMPRE estos signals para que el usuario sepa qué está pasando:

```
RALPH_TEST_START: [8.X.Y] - [nombre del test]
RALPH_TEST_CHECKPOINT: [descripción de lo que estás verificando]
RALPH_TEST_SCREENSHOT: test-screenshots/[nombre].png - [qué muestra]
RALPH_TEST_PASS: [8.X.Y] - [resumen de verificación]
RALPH_TEST_FAIL: [8.X.Y] - [qué falló y por qué]
RALPH_BUG_FOUND: [descripción del bug]
RALPH_BUG_FIX_ATTEMPT: [N/10] - [qué estás intentando]
RALPH_BUG_FIXED: [descripción de la solución]
RALPH_TEST_BLOCKED: [8.X.Y] - [razón del bloqueo]
```

### Flujo de Testing DETALLADO

Para CADA test en Fase 8, seguir este flujo EXACTO:

#### 1. Anunciar inicio
```
RALPH_TEST_START: [8.X.Y] - [nombre del test]
```

#### 2. Documentar cada checkpoint
Por cada cosa que verificas, anunciar:
```
RALPH_TEST_CHECKPOINT: Verificando que [X] muestre [Y]
RALPH_TEST_CHECKPOINT: Verificando que botón [X] sea clickeable
RALPH_TEST_CHECKPOINT: Verificando layout en [viewport]
```

#### 3. Tomar screenshot con nombre descriptivo
```bash
# Guardar SIEMPRE en test-screenshots/
RALPH_TEST_SCREENSHOT: test-screenshots/8.1.1-desktop-home.png - Vista completa del home
```

#### 4. Evaluar resultado

**Si PASA:**
```
RALPH_TEST_PASS: [8.X.Y] - Todos los checkpoints verificados OK
- Checkpoint 1: ✓
- Checkpoint 2: ✓
- Screenshot: test-screenshots/[nombre].png
```
→ Marcar `[x]` en implementation_plan.md
→ Documentar en discoveries.md

**Si FALLA:**
```
RALPH_TEST_FAIL: [8.X.Y] - [descripción específica del problema]
RALPH_BUG_FOUND: [descripción detallada]
  - Qué esperaba: [X]
  - Qué encontré: [Y]
  - Screenshot del bug: test-screenshots/bug-[descripcion].png
```

#### 5. Si hay bug, documentar el proceso de fix

```
RALPH_BUG_FIX_ATTEMPT: [1/10] - Intentando [descripción del approach]
  - Archivo: [ruta]
  - Cambio: [descripción]

[hacer el cambio]

RALPH_TEST_CHECKPOINT: Re-verificando después del fix...

[Si funciona]
RALPH_BUG_FIXED: [descripción de la solución]
  - Root cause: [qué causaba el bug]
  - Solución: [qué se cambió]
  - Archivos modificados: [lista]

[Si no funciona]
RALPH_BUG_FIX_ATTEMPT: [2/10] - Nuevo approach: [descripción]
```

#### 6. Documentar en discoveries.md SIEMPRE

Después de cada test (pase o falle), agregar a discoveries.md:

```markdown
### Test [8.X.Y] - [fecha hora]

**Test:** [nombre del test]
**Resultado:** ✅ PASS | ❌ FAIL (intento N)
**Screenshot:** `test-screenshots/[nombre].png`

**Checkpoints verificados:**
- [x] Checkpoint 1
- [x] Checkpoint 2
- [ ] Checkpoint 3 (si falló)

**Bugs encontrados:** (si aplica)
- Bug: [descripción]
- Root cause: [causa]
- Fix: [solución]
- Archivos: [modificados]

**Decisiones tomadas:** (si aplica)
- [decisión y razón]
```

### Prioridad MÓVIL (375px)

Los padres usan MÓVIL. Todo debe verse PERFECTO en 375px.

Si algo se ve mal en móvil, Ralph tiene LIBERTAD de ajustar:
- ✓ Paddings y margins
- ✓ Font sizes
- ✓ Flex direction y wrap
- ✓ Grid columns
- ✓ Breakpoints

**DOCUMENTAR cada ajuste móvil:**
```
RALPH_MOBILE_FIX: Ajustando [componente] para móvil
  - Problema: [descripción]
  - Solución: [cambio CSS/layout]
  - Archivo: [ruta:linea]
```

### Reglas Estrictas

1. **MODO HEADED** - Usar `--headed` para que el usuario vea
2. **NO CERRAR BROWSER** si hay bugs - iterar hasta resolver
3. **DOCUMENTAR TODO** - Cada checkpoint, cada bug, cada decisión
4. **SCREENSHOTS** en `test-screenshots/` con nombres descriptivos
5. **MARCAR [x]** solo después de documentar en discoveries.md
6. **MAX 10 INTENTOS** por bug → si persiste, `RALPH_TEST_BLOCKED`

### Viewports de Testing

| Dispositivo | Width | Obligatorio |
|-------------|-------|-------------|
| Desktop | 1280px+ | Sí |
| Móvil | 375px | **CRÍTICO** |

### Ejemplo de Sesión de Testing Correcta

```
RALPH_TEST_START: [8.1.1] - Test Home Dashboard (Desktop)

RALPH_TEST_CHECKPOINT: Abriendo http://localhost:3000 con viewport 1280px
RALPH_TEST_CHECKPOINT: Login como padre eljulius@nebulastudios.io
RALPH_TEST_CHECKPOINT: Verificando saludo "Buenas [tiempo], Julius!"
RALPH_TEST_CHECKPOINT: Verificando NarrativeTimeline con initialLimit=3
RALPH_TEST_CHECKPOINT: Verificando botón "Ver más" visible
RALPH_TEST_CHECKPOINT: Verificando layout side-by-side (narrativa + calendario)
RALPH_TEST_CHECKPOINT: Verificando botones de eventos (SleepButton visible)

RALPH_TEST_SCREENSHOT: test-screenshots/8.1.1-desktop-home.png - Home completo

RALPH_TEST_PASS: [8.1.1] - Todos los checkpoints OK
- Saludo: ✓ "¡Buenas noches, Julius!"
- Narrativa: ✓ 3 eventos visibles
- Botón expandir: ✓ visible
- Layout: ✓ side-by-side
- Botones: ✓ SleepButton, FeedingButton, etc.

[Actualiza implementation_plan.md: - [x] **8.1.1**...]
[Actualiza discoveries.md con el resultado]

RALPH_COMPLETE: Task [8.1.1] completed
```

## Patrones Críticos del Sprint

### Eliminar localStorage (ITEM 9)
```typescript
// ELIMINAR estas líneas:
const sleepStorageKey = `pending_sleep_event_${childId}`
const nightWakeStorageKey = `pending_night_wake_${childId}`
localStorage.getItem(key)
localStorage.setItem(key, value)

// MANTENER: useSleepState que usa SWR + API
```

### Patrón endTime en modales (ITEM 6)
```typescript
// Seguir SleepDelayModal.tsx:76-90
const [endDate, setEndDate] = useState(() => {
  if (mode === "edit" && initialData?.endTime) {
    return format(new Date(initialData.endTime), "yyyy-MM-dd")
  }
  return format(getCurrentTime(), "yyyy-MM-dd")
})
```

### Condicionar por rol (ITEM 5)
```typescript
// isAdminView ya existe en calendar/page.tsx
{isAdminView && (
  <Button>Mensual</Button>
)}
```

## Project Knowledge (OBLIGATORIO)

Antes de implementar, Ralph DEBE leer:

### 1. Rules del Proyecto
```bash
ls .claude/rules/
```
- `events.md` - Reglas de eventos, NO duplicar tipos
- `patterns.md` - Patrón modal con modo edit
- `datetime.md` - Usar buildLocalDate() y dateToTimestamp()

### 2. Skills del Proyecto
```bash
ls .claude/skills/
```
Leer SKILL.md de skills relevantes.

### 3. Soluciones Documentadas
```bash
ls docs/solutions/
```
Buscar si hay errores ya documentados.

## Spec Reference

Feature: QA Feedback Sprint 2026-01-26
Spec: `docs/specs/current/spec.md`
Plan: `docs/specs/current/implementation_plan.md`
Items: 9 activos + 2 verificación
Tareas: **40 total en 9 fases** (incluye 14 tests E2E)

**Fase 8 es OBLIGATORIA** - Sprint no está completo sin E2E testing
