// Tipos TypeScript para el sistema de eventos

export type EventType = "sleep" | "wake" | "nap" | "night_waking" | "feeding" | "night_feeding" | "medication" | "extra_activities"

export type EmotionalState = "tranquilo" | "inquieto" | "irritable" | "neutral"

export type FeedingType = "breast" | "bottle" | "solids"

export interface EventData {
  _id?: string
  childId: string
  eventType: EventType
  startTime: string  // ISO 8601
  endTime?: string   // ISO 8601
  emotionalState?: EmotionalState
  notes?: string
  sleepDelay?: number  // minutos para dormirse
  awakeDelay?: number  // minutos que estuvo despierto (para night_waking)
  didNotSleep?: boolean // marcamos intentos donde no se pudo dormir (ej. siesta fallida)
  // Campos específicos para alimentación
  feedingType?: FeedingType
  feedingSubtype?: FeedingType  // Subtipo explícito para analítica (pecho, biberón, sólidos)
  feedingAmount?: number  // cantidad en ml (líquidos) o gr (sólidos)
  feedingDuration?: number  // duración en minutos
  babyState?: "awake" | "asleep"  // para tomas nocturnas
  feedingNotes?: string  // notas específicas de alimentación
  // Flag para alimentación nocturna (reemplaza eventType: "night_feeding")
  isNightFeeding?: boolean
  feedingContext?: "awake" | "during_sleep" | "during_nap"
  // Campos específicos para medicamentos
  medicationName?: string  // nombre del medicamento
  medicationDose?: string  // dosis administrada
  medicationTime?: string  // hora de administración
  medicationNotes?: string  // notas adicionales del medicamento
  // Campos específicos para actividades extra
  activityDescription?: string  // descripción de la actividad
  activityDuration?: number  // duración en minutos
  activityImpact?: "positive" | "neutral" | "negative"  // impacto en el sueño
  activityNotes?: string  // notas adicionales de la actividad
  description?: string  // campo legacy para compatibilidad
  createdAt?: string
  parentId?: string
}

// Interface específica para el modal de alimentación
export interface FeedingModalData {
  feedingType: FeedingType
  feedingAmount: number
  feedingDuration: number
  babyState: "awake" | "asleep"
  feedingNotes: string
}

export interface Child {
  _id: string
  firstName: string
  lastName?: string
  birthDate: string
  parentId: string
}

// Interface para pasar fecha/hora editados desde modales en modo edición
export interface EditOptions {
  startTime?: string   // ISO timestamp editado
  endTime?: string     // ISO timestamp editado (opcional)
}

// Interface para datos de actividad extra
export interface ExtraActivityModalData {
  activityDescription: string
  activityDuration: number
  activityImpact: "positive" | "neutral" | "negative"
  activityNotes: string
}
