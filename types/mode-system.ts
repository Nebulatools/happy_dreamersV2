// Tipos para el sistema de modo dual - Happy Dreamers v5.0
// Sistema que permite alternar entre registro rápido (simple) y detallado (avanzado)

export type EventMode = 'simple' | 'advanced'

// Configuración de defaults inteligentes por tipo
export interface SmartDefaultConfig {
  sleepDelay: number           // Default: 5 minutos
  feedingType: FeedingType     // Default: 'bottle' 
  feedingAmount: number        // Default: 120ml (ajustable por edad)
  feedingDuration: number      // Default: 15 minutos
  emotionalState: EmotionalState  // Default: 'tranquilo'
}

// Preferencias de usuario para el sistema de modos
export interface UserModePreferences {
  defaultMode: EventMode                    // Modo por defecto al abrir la app
  persistMode: boolean                      // Recordar modo entre sesiones
  autoAdvanceComplexEvents: boolean         // Auto-cambiar a avanzado para eventos complejos
  showModeTips: boolean                     // Mostrar tooltips explicativos
  smartDefaults: SmartDefaultConfig         // Configuración de defaults inteligentes
}

// Contexto principal del sistema de modos
export interface ModeContextType {
  mode: EventMode                           // Modo actual activo
  preferences: UserModePreferences          // Preferencias del usuario
  toggleMode: () => void                    // Alternar entre modos
  setMode: (mode: EventMode) => void        // Establecer modo específico
  isTransitioning: boolean                  // Estado de transición entre modos
}

// Strategy pattern para registro de eventos según modo
export interface EventRegistrationStrategy {
  registerSleepEvent(data: SleepEventInput): Promise<EventData>
  registerFeedingEvent(data: FeedingEventInput): Promise<EventData>
  shouldShowModal(): boolean                // Si debe mostrar modal o registro directo
  getDefaultValues(eventType: EventType): Partial<EventData>
}

// Input simplificado para modo simple - sleep
export interface SleepEventInput {
  childId: string
  eventType: 'sleep' | 'nap' | 'wake'
  startTime?: string
  endTime?: string
  fromSimpleMode?: boolean                  // Flag para backend
}

// Input simplificado para modo simple - feeding  
export interface FeedingEventInput {
  childId: string
  eventType: 'feeding'
  feedingType?: FeedingType
  startTime?: string
  fromSimpleMode?: boolean                  // Flag para backend
}

// Props para componentes que soportan modo dual
export interface DualModeComponentProps {
  mode: EventMode
  childId: string
  childName: string
  onEventRegistered?: () => void
}

// Configuración del ModeToggle
export interface ModeToggleProps {
  size?: 'sm' | 'md' | 'lg'
  showLabels?: boolean
  showTooltips?: boolean
  className?: string
}

// Props para el ModeProvider
export interface ModeProviderProps {
  children: React.ReactNode
  defaultMode?: EventMode
  persistenceKey?: string
}

// Configuración del SmartDefaultsEngine
export interface SmartDefaultsEngineConfig {
  childData: {
    id: string
    birthDate: string
    ageInMonths: number
  }
  eventHistory: EventData[]
  userPreferences: UserModePreferences
  currentTime: Date
}

// Resultado del engine de defaults
export interface SmartDefaultsResult {
  sleepDefaults: Partial<EventData>
  feedingDefaults: Partial<EventData>
  confidence: number                        // 0-1, confianza en los defaults
  basedOn: 'age' | 'history' | 'time' | 'preference'  // Fuente principal
}

// Analytics y métricas para el sistema de modos
export interface ModeAnalyticsEvent {
  type: 'mode_toggle' | 'event_registered' | 'mode_adoption'
  mode: EventMode
  eventType?: EventType
  duration?: number
  userId?: string
  metadata?: Record<string, any>
}

// Performance metrics
export interface ModePerformanceMetrics {
  modeToggleLatency: number                 // ms para cambiar modo
  contextUpdateDuration: number            // ms para actualizar contexto
  eventRegistrationTime: number            // ms desde click hasta guardado
  memoryUsage: number                       // MB adicionales por modo dual
}

// Feature flags para rollout gradual
export interface ModeFeatureFlags {
  DUAL_MODE_ENABLED: boolean
  SIMPLE_MODE_BETA: boolean
  SMART_DEFAULTS_ENABLED: boolean
  MODE_PERSISTENCE_BACKEND: 'localStorage' | 'mongodb' | 'both'
}

// Re-export tipos existentes necesarios
export type { 
  EventData, 
  EventType, 
  FeedingType, 
  EmotionalState,
  Child 
} from '@/components/events/types'