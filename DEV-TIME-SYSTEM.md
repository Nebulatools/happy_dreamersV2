# 🕐 Sistema de Tiempo de Desarrollo - Happy Dreamers

## Descripción General

Sistema de simulación de tiempo para facilitar las pruebas de desarrollo. Permite adelantar/retroceder el tiempo para probar diferentes escenarios de sueño sin esperar horas reales.

**⚠️ IMPORTANTE**: Este sistema es SOLO para desarrollo y debe ser removido o deshabilitado antes de producción.

## Componentes Creados/Modificados

### 1. Archivos NUEVOS (Eliminar para producción)

#### `/components/dev/TimeAdjuster.tsx`
- **Propósito**: Widget visual de reloj en esquina inferior derecha
- **Características**:
  - Control de tiempo con botones +/-
  - Presets rápidos (7:00, 13:00, 15:30, 19:30, 21:00, 3:00)
  - Control de velocidad (1x, 10x, 60x, 360x)
  - Play/Pause para simular paso del tiempo
- **Para Producción**: ❌ ELIMINAR completamente

#### `/components/dev/DevTools.tsx`
- **Propósito**: Contenedor para herramientas de desarrollo
- **Para Producción**: ❌ ELIMINAR completamente

#### `/context/dev-time-context.tsx`
- **Propósito**: Context Provider para manejar tiempo simulado
- **Funciones**:
  - `getCurrentTime()`: Retorna tiempo simulado o real
  - `setSimulatedTime()`: Actualiza el tiempo simulado
  - Persiste en localStorage
- **Para Producción**: ❌ ELIMINAR completamente

### 2. Archivos MODIFICADOS (Revertir cambios)

#### `/app/layout.tsx`
```diff
- import { DevTimeProvider } from "@/context/dev-time-context"

  <AuthProvider>
-   <DevTimeProvider>
      {children}
      <Toaster />
-   </DevTimeProvider>
  </AuthProvider>
```

#### `/app/dashboard/layout.tsx`
```diff
- import { DevTools } from "@/components/dev/DevTools"

  </div>
- {/* Herramientas de desarrollo - solo en desarrollo */}
- <DevTools />
```

#### `/components/events/SleepButton.tsx`
```diff
- import { useDevTime } from '@/context/dev-time-context'

export function SleepButton({ ... }) {
- const { getCurrentTime } = useDevTime()
- const [localDuration, setLocalDuration] = useState<number | null>(null)

- // Calcular duración localmente usando tiempo simulado
- useEffect(() => {
-   // ... todo el código de cálculo local de duración
- }, [sleepState.lastEventTime, sleepState.status, getCurrentTime])

  // Reemplazar todas las llamadas a getCurrentTime() con new Date()
- const hour = getCurrentTime().getHours()
+ const hour = new Date().getHours()

- const now = getCurrentTime()
+ const now = new Date()

  // Cambiar la lógica de duración de vuelta a usar sleepState.duration
- const showDuration = localDuration !== null && (isAsleep || sleepState.status === 'awake')
+ const sleepDuration = isAsleep ? sleepState.duration : null

- {formatDuration(localDuration, isAsleep)}
+ {formatDuration(sleepDuration)}
}
```

#### `/components/events/EventRegistration.tsx`
```diff
/**
 * Componente principal para registro de eventos
- * VERSION 2.3 - Duración corregida con tiempo simulado
+ * VERSION PRODUCCIÓN - Sin tiempo simulado
 */
```

## Checklist para Producción

### Paso 1: Eliminar archivos de desarrollo
```bash
# Eliminar componentes de desarrollo
rm -rf components/dev/

# Eliminar context de tiempo de desarrollo
rm context/dev-time-context.tsx
```

### Paso 2: Revertir imports en layouts
- [ ] Remover import de `DevTimeProvider` en `/app/layout.tsx`
- [ ] Remover wrapper `<DevTimeProvider>` en `/app/layout.tsx`
- [ ] Remover import de `DevTools` en `/app/dashboard/layout.tsx`
- [ ] Remover `<DevTools />` en `/app/dashboard/layout.tsx`

### Paso 3: Revertir SleepButton.tsx
- [ ] Remover import de `useDevTime`
- [ ] Remover estado `localDuration`
- [ ] Remover `useEffect` de cálculo local de duración
- [ ] Reemplazar `getCurrentTime()` con `new Date()`
- [ ] Volver a usar `sleepState.duration` del API
- [ ] Simplificar lógica de formatDuration

### Paso 4: Verificación
- [ ] Buscar en todo el proyecto: `DevTime` (no debe existir)
- [ ] Buscar en todo el proyecto: `getCurrentTime` (no debe existir)
- [ ] Buscar en todo el proyecto: `TimeAdjuster` (no debe existir)
- [ ] Buscar en todo el proyecto: `DevTools` (no debe existir)

## Comando Git para revertir (alternativa)

Si los cambios están en commits específicos, puedes revertirlos:

```bash
# Ver los commits relacionados con el sistema de tiempo
git log --grep="reloj\|tiempo\|dev\|TimeAdjuster"

# Revertir commits específicos (reemplazar con los hashes reales)
git revert <commit-hash-1> <commit-hash-2>
```

## Configuración de Variables de Entorno

El sistema usa `process.env.NODE_ENV` para detectar desarrollo. Asegúrate de que en producción:

```env
NODE_ENV=production
```

## Funcionalidad que se pierde al remover

1. **Simulación de tiempo**: No se podrá adelantar/retroceder el tiempo
2. **Pruebas rápidas**: Las pruebas requerirán esperar tiempos reales
3. **Presets de hora**: No habrá acceso rápido a diferentes momentos del día

## Alternativas para Testing en Producción

Si necesitas hacer pruebas en producción sin el sistema de desarrollo:

1. **Usar datos de prueba**: Crear eventos con timestamps específicos directamente en la base de datos
2. **Tests E2E**: Usar herramientas como Playwright con mocks de tiempo
3. **Staging environment**: Mantener un ambiente de staging con el sistema de desarrollo habilitado

## Notas Importantes

- **localStorage**: El sistema guarda `devSimulatedTime` en localStorage. Se puede limpiar manualmente si es necesario.
- **Performance**: El cálculo local de duración con intervalos puede impactar performance en dispositivos lentos.
- **Zona horaria**: El sistema asume zona horaria local del navegador.

---

**Última actualización**: Iteración 2.4 - Sistema completo de tiempo de desarrollo
**Autor**: Claude AI Assistant
**Fecha**: 2025