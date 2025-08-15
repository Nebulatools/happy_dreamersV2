// Exportaciones del sistema de modo dual v5.0

export { ModeToggle, ModeToggleCompact, ModeHeader } from './ModeToggle'
export { ModeProvider, useModeContext, useEventRegistration, useModeAnalytics } from '@/context/mode-context'
export type { 
  EventMode, 
  ModeContextType, 
  UserModePreferences, 
  ModeToggleProps,
  DualModeComponentProps,
  SmartDefaultsEngineConfig
} from '@/types/mode-system'