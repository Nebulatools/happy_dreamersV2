# Sistema de Design Tokens - Happy Dreamers

Este directorio contiene el sistema centralizado de tokens de diseño para mantener consistencia visual en toda la aplicación Happy Dreamers.

## 📋 Contenido

- **tokens.ts**: Todos los tokens de diseño (colores, espaciado, tipografía, etc.)
- **index.ts**: Punto de entrada principal con re-exportaciones convenientes

## 🎨 Uso Básico

### Importar tokens específicos

```typescript
import { colors, spacing, typography } from '@/lib/design-system'

// Usar colores
const primaryColor = colors.brand.primary // '#3B82F6'
const errorColor = colors.status.error

// Usar espaciado
const padding = spacing[4] // '1rem' (16px)
const margin = spacing[8] // '2rem' (32px)

// Usar tipografía
const fontSize = typography.fontSize.lg // ['1.125rem', { lineHeight: '1.75rem' }]
```

### Importar el sistema completo

```typescript
import { designSystem, theme, ds } from '@/lib/design-system'

// Las tres formas son equivalentes
const color = designSystem.colors.brand.primary
const color2 = theme.colors.brand.primary
const color3 = ds.colors.brand.primary
```

## 🎯 Helpers Disponibles

### getEventColor(eventType)
Obtiene el color apropiado para un tipo de evento de sueño:

```typescript
import { getEventColor } from '@/lib/design-system'

const sleepColor = getEventColor('sleep') // '#7DBFE2'
const napColor = getEventColor('nap') // '#a78bfa' (lavanda)
```

### getMoodColor(mood)
Obtiene el color para estados de ánimo:

```typescript
import { getMoodColor } from '@/lib/design-system'

const happyColor = getMoodColor('feliz') // '#FFBB28'
const calmColor = getMoodColor('tranquilo') // '#00C49F'
```

### getChartColor(index)
Obtiene colores para series de gráficos:

```typescript
import { getChartColor } from '@/lib/design-system'

const seriesColors = data.map((_, index) => getChartColor(index))
```

## 📐 Estructura de Tokens

### Colores
- **Base**: white, black
- **Grises**: Escala de 50 a 900
- **Azules**: Escala de marca principal
- **Brand**: Colores específicos de Happy Dreamers
- **Sleep**: Colores para eventos de sueño
- **Chart**: Paleta para gráficos
- **Mood**: Colores para estados de ánimo
- **Status**: success, warning, error, info

### Espaciado
Sistema consistente desde 0 hasta 96 (0 a 24rem)

### Tipografía
- **Familias**: sans, mono
- **Tamaños**: xs hasta 9xl
- **Pesos**: thin hasta black
- **Altura de línea**: none hasta loose
- **Espaciado entre letras**: tighter hasta widest

### Bordes y Sombras
- **Radio**: none hasta full (incluye xl = 12px estándar)
- **Ancho**: 0 hasta 8px
- **Sombras**: none hasta 2xl + inner

### Otros
- **Breakpoints**: sm, md, lg, xl, 2xl
- **Z-index**: Sistema consistente para capas
- **Animaciones**: Duraciones y funciones de timing

## 🔄 Migración de Componentes

### Antes (hardcoded):
```typescript
<div className="bg-[#628BE6] p-4 rounded-[12px]">
  <h2 className="text-[#2F2F2F] text-xl">Título</h2>
</div>
```

### Después (con sistema de diseño):
```typescript
import { colors, spacing, borders } from '@/lib/design-system'

<div 
  style={{
    backgroundColor: colors.brand.mediumBlue,
    padding: spacing[4],
    borderRadius: borders.radius.xl
  }}
>
  <h2 style={{ color: colors.gray[800] }}>Título</h2>
</div>
```

### Con Tailwind (recomendado):
```typescript
// En tailwind.config.ts los colores ya están configurados
<div className="bg-brand-mediumBlue p-4 rounded-xl">
  <h2 className="text-gray-800 text-xl">Título</h2>
</div>
```

## 🚀 Mejores Prácticas

1. **Nunca hardcodear valores**: Siempre usa tokens del sistema
2. **Usa los helpers**: Para eventos, moods y gráficos
3. **Mantén consistencia**: Si un color no existe, agrégalo al sistema
4. **Documenta nuevos tokens**: Explica su propósito y uso
5. **Revisa antes de agregar**: Verifica si ya existe un token similar

## 📊 Tokens Específicos de Happy Dreamers

### Gradientes
```typescript
happyDreamersTokens.gradients.sidebar // Gradiente del sidebar
happyDreamersTokens.gradients.button // Gradiente de botones
happyDreamersTokens.gradients.primary // Gradiente principal
```

### Recomendaciones de Sueño
```typescript
happyDreamersTokens.sleepRecommendations.toddler // { min: 11, max: 14 }
```

### Dimensiones de Gráficos
```typescript
happyDreamersTokens.chartDimensions.medium // { width: 350, height: 300 }
```

### Configuración de Componentes
```typescript
happyDreamersTokens.components.card // padding, borderRadius, shadow
happyDreamersTokens.components.button // paddingX, paddingY, etc.
happyDreamersTokens.components.input // Estilos de input
```

## 🔍 TypeScript Support

Todos los tokens están completamente tipados:

```typescript
import type { Colors, Spacing, Typography } from '@/lib/design-system'

// Los tipos están disponibles para uso en interfaces
interface ComponentProps {
  color: keyof Colors['brand']
  spacing: keyof Spacing
}
```

## 📝 Próximos Pasos

1. Migrar todos los componentes para usar el sistema
2. Eliminar colores hardcodeados
3. Crear variables CSS custom properties
4. Documentar patrones de uso común
5. Agregar herramientas de validación