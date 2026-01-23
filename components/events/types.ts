/**
 * Tipos TypeScript para el sistema de eventos - SINGLE SOURCE OF TRUTH
 *
 * Este archivo define los tipos canonicos para eventos en Happy Dreamers.
 * Todos los componentes y APIs deben importar tipos de aqui.
 *
 * @see lib/icons/event-icons.ts para iconos (usa EventIconType derivado)
 * @see lib/colors/event-colors.ts para colores (usa EventColorType derivado)
 * @see types/models.ts para interfaces de MongoDB (importa desde aqui)
 */

/**
 * Tipos de evento del sistema
 *
 * IMPORTANTE sobre night_feeding:
 * - "night_feeding" es LEGACY y no debe usarse en nuevo codigo
 * - Para alimentacion nocturna, usar "feeding" con isNightFeeding: true
 * - El sistema maneja ambos para compatibilidad con datos historicos
 */
export type EventType =
  | "sleep"           // Sueno nocturno
  | "wake"            // Despertar matutino
  | "nap"             // Siesta
  | "night_waking"    // Despertar nocturno
  | "feeding"         // Alimentacion (con feedingType para especificar breast/bottle/solids)
  | "night_feeding"   // LEGACY: usar feeding + isNightFeeding: true
  | "medication"      // Medicamento
  | "extra_activities" // Actividad extra
  | "note"            // Nota de bitacora

/**
 * Estado emocional del nino durante el evento
 */
export type EmotionalState = "tranquilo" | "inquieto" | "irritable" | "neutral"

/**
 * Tipo de alimentacion
 */
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
  // Campos específicos para notas de bitácora
  noteText?: string  // contenido de la nota de bitácora
  description?: string  // campo legacy para compatibilidad
  createdAt?: string
  parentId?: string
}

// Interface específica para el modal de alimentación
export interface FeedingModalData {
  feedingType: FeedingType
  feedingAmount?: number // Solo para bottle (oz/ml)
  babyState: "awake" | "asleep"
  feedingNotes: string
  feedingTime: string // Hora de inicio (HH:mm)
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

// Interface para datos de nota de bitácora
export interface NoteModalData {
  noteText: string
}
