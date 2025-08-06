# 🧩 Guía de Componentes - Happy Dreamers

## 📋 Tabla de Contenidos

- [Visión General](#visión-general)
- [Estructura de Componentes](#estructura-de-componentes)
- [Componentes UI Base](#componentes-ui-base)
- [Componentes de Dashboard](#componentes-de-dashboard)
- [Componentes de Eventos](#componentes-de-eventos)
- [Componentes de Consultas](#componentes-de-consultas)
- [Componentes de Estadísticas](#componentes-de-estadísticas)
- [Componentes de Encuesta](#componentes-de-encuesta)
- [Hooks Personalizados](#hooks-personalizados)
- [Context Providers](#context-providers)
- [Mejores Prácticas](#mejores-prácticas)

## 🎯 Visión General

Los componentes de Happy Dreamers siguen una arquitectura modular con:
- **Componentes UI Base**: Reutilizables desde shadcn/ui
- **Componentes de Dominio**: Específicos del negocio
- **Composición**: Componentes complejos desde simples
- **Type Safety**: TypeScript en todo

## 📁 Estructura de Componentes

```
components/
├── ui/                 # Componentes base (shadcn/ui)
│   ├── button.tsx
│   ├── card.tsx
│   ├── dialog.tsx
│   └── ...
├── dashboard/          # Componentes del dashboard
│   ├── sidebar.tsx
│   ├── header.tsx
│   └── ...
├── events/            # Gestión de eventos
│   ├── EventRegistrationModal.tsx
│   ├── EventTypeSelector.tsx
│   └── ...
├── consultas/         # Sistema de consultas
│   ├── ConsultationWizard.tsx
│   ├── AnalysisReport.tsx
│   └── ...
├── stats/             # Visualizaciones
│   ├── SleepHoursChart.tsx
│   ├── SleepPatternChart.tsx
│   └── ...
└── survey/            # Wizard de encuesta
    ├── SurveyWizard.tsx
    ├── SurveyProgress.tsx
    └── steps/
```

## 🎨 Componentes UI Base

### Button
```tsx
import { Button } from "@/components/ui/button"

// Variantes disponibles
<Button variant="default">Default</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Cancel</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>

// Tamaños
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
<Button size="icon"><Icon /></Button>
```

### Card
```tsx
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

<Card>
  <CardHeader>
    <CardTitle>Título</CardTitle>
    <CardDescription>Descripción</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Contenido */}
  </CardContent>
  <CardFooter>
    {/* Acciones */}
  </CardFooter>
</Card>
```

### Dialog
```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

<Dialog>
  <DialogTrigger asChild>
    <Button>Abrir</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Título</DialogTitle>
      <DialogDescription>Descripción</DialogDescription>
    </DialogHeader>
    {/* Contenido */}
  </DialogContent>
</Dialog>
```

### Form Components
```tsx
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
```

## 🏠 Componentes de Dashboard

### Sidebar
**Ubicación:** `components/dashboard/sidebar.tsx`

```tsx
interface SidebarProps {
  // No props, usa session internamente
}

// Características:
- Navegación principal
- Indicador de ruta activa
- Responsive (drawer en móvil)
- Roles-based menu items
```

### Header
**Ubicación:** `components/dashboard/header.tsx`

```tsx
interface HeaderProps {
  // Usa PageHeaderContext
}

// Características:
- Título dinámico de página
- Child selector
- User menu
- Theme toggle
```

### ChildSelector
**Ubicación:** `components/dashboard/child-selector.tsx`

```tsx
interface ChildSelectorProps {
  onChildSelect?: (childId: string) => void
}

// Uso:
<ChildSelector onChildSelect={handleChildChange} />

// Características:
- Lista de niños del usuario
- Crear nuevo niño
- Indicador de niño activo
- Persiste selección
```

## 😴 Componentes de Eventos

### EventRegistrationModal
**Ubicación:** `components/events/EventRegistrationModal.tsx`

```tsx
interface EventRegistrationModalProps {
  isOpen: boolean
  onClose: () => void
  childId: string
  onSuccess?: () => void
}

// Uso:
<EventRegistrationModal
  isOpen={modalOpen}
  onClose={() => setModalOpen(false)}
  childId={activeChildId}
  onSuccess={refreshEvents}
/>
```

### EventTypeSelector
**Ubicación:** `components/events/EventTypeSelector.tsx`

```tsx
interface EventTypeSelectorProps {
  value: EventType
  onChange: (type: EventType) => void
  compact?: boolean
}

// Tipos de evento:
- NIGHT_SLEEP: Sueño nocturno
- NAP: Siesta
- NIGHT_WAKING: Despertar nocturno
```

### EmotionalStateSelector
**Ubicación:** `components/events/EmotionalStateSelector.tsx`

```tsx
interface EmotionalStateSelectorProps {
  value: EmotionalState
  onChange: (state: EmotionalState) => void
  compact?: boolean
}

// Estados emocionales:
- CALM: Tranquilo
- HAPPY: Feliz
- ANXIOUS: Ansioso
- IRRITABLE: Irritable
- SAD: Triste
- ENERGETIC: Enérgico
- TIRED: Cansado
- FRUSTRATED: Frustrado
```

### TimeSelector
**Ubicación:** `components/events/TimeSelector.tsx`

```tsx
interface TimeSelectorProps {
  value: string  // HH:mm format
  onChange: (time: string) => void
  label?: string
}
```

## 🤖 Componentes de Consultas

### ConsultationWizard
**Ubicación:** `components/consultas/ConsultationWizard.tsx`

```tsx
interface ConsultationWizardProps {
  childId: string
  onComplete: (consultation: Consultation) => void
}

// Pasos:
1. Transcripción de consulta
2. Análisis con IA
3. Generación de plan
4. Revisión y guardado
```

### AnalysisReport
**Ubicación:** `components/consultas/AnalysisReport.tsx`

```tsx
interface AnalysisReportProps {
  analysis: SleepAnalysis
  childName: string
  onGeneratePDF?: () => void
}

// Secciones:
- Resumen ejecutivo
- Patrones identificados
- Recomendaciones
- Plan de acción
```

### TranscriptInput
**Ubicación:** `components/consultas/TranscriptInput.tsx`

```tsx
interface TranscriptInputProps {
  value: string
  onChange: (transcript: string) => void
  placeholder?: string
  maxLength?: number
}
```

## 📊 Componentes de Estadísticas

### SleepHoursChart
**Ubicación:** `components/stats/SleepHoursChart.tsx`

```tsx
interface SleepHoursChartProps {
  data: SleepData[]
  period: "week" | "month" | "year"
  height?: number
}

// Visualiza:
- Horas totales de sueño
- Tendencia
- Promedio
```

### SleepPatternChart
**Ubicación:** `components/stats/SleepPatternChart.tsx`

```tsx
interface SleepPatternChartProps {
  events: SleepEvent[]
  view: "timeline" | "heatmap"
}

// Modos:
- Timeline: Vista cronológica
- Heatmap: Mapa de calor por horas
```

### SleepDistributionChart
**Ubicación:** `components/stats/SleepDistributionChart.tsx`

```tsx
interface SleepDistributionChartProps {
  data: DistributionData
  type: "pie" | "donut" | "bar"
}
```

### ProgressSummaryCard
**Ubicación:** `components/stats/ProgressSummaryCard.tsx`

```tsx
interface ProgressSummaryCardProps {
  childId: string
  period: number  // días
}

// Muestra:
- Mejora porcentual
- Métricas clave
- Indicadores de progreso
```

## 📝 Componentes de Encuesta

### SurveyWizard
**Ubicación:** `components/survey/SurveyWizard.tsx`

```tsx
interface SurveyWizardProps {
  childId?: string
  initialData?: SurveyData
  onComplete: (data: SurveyData) => void
  mode: "create" | "edit"
}

// Pasos:
1. Información familiar
2. Dinámica familiar
3. Historial del niño
4. Desarrollo y salud
5. Actividad física
6. Rutina y hábitos
```

### SurveyProgress
**Ubicación:** `components/survey/SurveyProgress.tsx`

```tsx
interface SurveyProgressProps {
  currentStep: number
  totalSteps: number
  completedSections: string[]
}
```

### Survey Form Steps
```tsx
// Cada paso es un componente:
- FamilyInfoStep
- FamilyDynamicsStep
- ChildHistoryStep
- HealthDevStep
- PhysicalActivityStep
- RoutineHabitsStep

// Props comunes:
interface StepProps {
  data: Partial<SurveyData>
  onChange: (data: Partial<SurveyData>) => void
  onNext: () => void
  onBack: () => void
}
```

## 🪝 Hooks Personalizados

### useChildren
```tsx
const {
  children,
  isLoading,
  error,
  fetchChildren,
  createChild,
  updateChild,
  deleteChild
} = useChildren()
```

### useSleepData
```tsx
const {
  events,
  stats,
  isLoading,
  refetch
} = useSleepData(childId, { period: 30 })
```

### useEventsCache
```tsx
const {
  getCachedEvents,
  setCachedEvents,
  invalidateCache
} = useEventsCache()
```

### useSleepInsights
```tsx
const {
  insights,
  isGenerating,
  generateInsights
} = useSleepInsights(childId)
```

### useSleepComparison
```tsx
const {
  comparison,
  isLoading,
  comparePeriods
} = useSleepComparison(childId)
```

## 🌐 Context Providers

### ActiveChildContext
```tsx
interface ActiveChildContextType {
  activeChildId: string | null
  setActiveChildId: (id: string | null) => void
  activeUserId: string | null
  setActiveUserId: (id: string | null) => void
  clearSelection: () => void
}

// Uso:
const { activeChildId, setActiveChildId } = useActiveChild()
```

### PageHeaderContext
```tsx
interface PageHeaderContextType {
  title: string
  setTitle: (title: string) => void
  subtitle?: string
  setSubtitle: (subtitle: string) => void
}

// Uso:
const { setTitle } = usePageHeader()
useEffect(() => {
  setTitle("Dashboard")
}, [])
```

## 📚 Mejores Prácticas

### 1. Composición de Componentes
```tsx
// ✅ Bueno: Componentes pequeños y componibles
<Card>
  <CardHeader>
    <ChildInfo child={child} />
  </CardHeader>
  <CardContent>
    <SleepStats stats={stats} />
  </CardContent>
</Card>

// ❌ Evitar: Componentes monolíticos
<GiantDashboardComponent allData={data} />
```

### 2. Props y Types
```tsx
// ✅ Bueno: Props tipadas explícitamente
interface ButtonProps {
  variant?: "primary" | "secondary"
  size?: "sm" | "md" | "lg"
  onClick?: () => void
  children: React.ReactNode
}

// ❌ Evitar: Props sin tipar
const Button = (props: any) => { }
```

### 3. Estado y Effects
```tsx
// ✅ Bueno: Estado local cuando es posible
const [isOpen, setIsOpen] = useState(false)

// ✅ Bueno: Cleanup en effects
useEffect(() => {
  const timer = setTimeout(() => {}, 1000)
  return () => clearTimeout(timer)
}, [])
```

### 4. Manejo de Errores
```tsx
// ✅ Bueno: Error boundaries y estados de error
if (error) {
  return <ErrorMessage error={error} />
}

if (isLoading) {
  return <Skeleton />
}
```

### 5. Accesibilidad
```tsx
// ✅ Bueno: ARIA labels y roles
<button
  aria-label="Cerrar modal"
  role="button"
  tabIndex={0}
>
```

### 6. Performance
```tsx
// ✅ Bueno: Memoización cuando es necesaria
const MemoizedComponent = memo(ExpensiveComponent)

const handleClick = useCallback(() => {
  // handler
}, [dependency])

const computedValue = useMemo(() => {
  return expensiveComputation(data)
}, [data])
```

---

**Última actualización:** Enero 2024  
**Versión:** 1.0.0