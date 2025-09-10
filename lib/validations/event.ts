// Validaciones para eventos de sueño
import * as z from "zod"
import { differenceInCalendarDays } from "date-fns"

/**
 * Esquema de validación para el formulario de eventos
 */
export const eventFormSchema = z.object({
  eventType: z.string({
    required_error: "Por favor selecciona un tipo de evento",
  }),
  emotionalState: z.string({
    required_error: "Por favor selecciona un estado emocional",
  }),
  startTime: z.string({
    required_error: "Por favor selecciona la hora de inicio",
  }),
  endTime: z.string().optional(),
  duration: z.number().min(0).max(24).optional(),
  notes: z.string().optional(),
  sleepDelay: z.number().min(0).max(180).optional(),
  nightWakingCount: z.number().min(0).max(10).optional(),
  extraActivities: z.array(z.string()).optional(),
}).refine((data) => {
  // Validación personalizada: si el evento tiene hora de fin, debe ser después de la hora de inicio
  if (data.endTime && data.startTime) {
    const start = new Date(data.startTime)
    const end = new Date(data.endTime)
    return end > start
  }
  return true
}, {
  message: "La hora de fin debe ser posterior a la hora de inicio",
  path: ["endTime"],
}).refine((data) => {
  // Si hay hora de fin, la duración debe coincidir
  if (data.endTime && data.startTime && data.duration !== undefined) {
    const start = new Date(data.startTime)
    const end = new Date(data.endTime)
    const calculatedDuration = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
    return Math.abs(calculatedDuration - data.duration) < 0.1 // Tolerancia de 6 minutos
  }
  return true
}, {
  message: "La duración no coincide con las horas seleccionadas",
  path: ["duration"],
})

/**
 * Tipo inferido del esquema de validación
 */
export type EventFormValues = z.infer<typeof eventFormSchema>

/**
 * Valores por defecto para el formulario de eventos
 */
export const defaultEventFormValues: Partial<EventFormValues> = {
  eventType: "",
  emotionalState: "",
  notes: "",
  sleepDelay: 0,
  nightWakingCount: 0,
  extraActivities: [],
}

/**
 * Validación de rango de fechas para eventos
 */
export const isValidEventDate = (date: Date): boolean => {
  const now = new Date()
  // Rechazar fechas futuras
  if (date > now) return false
  // Usar diferencia en días de calendario (inclusivo en 30 días)
  const diffDays = differenceInCalendarDays(now, date)
  return diffDays >= 0 && diffDays <= 30
}

/**
 * Validación de duración de evento
 */
export const isValidEventDuration = (hours: number, eventType: string): boolean => {
  const maxDurations: Record<string, number> = {
    sleep: 14,      // Sueño nocturno máximo 14 horas
    nap: 4,         // Siesta máximo 4 horas
    wake: 24,       // Despertar puede durar todo el día
    night_waking: 3 // Despertar nocturno máximo 3 horas
  }
  
  const maxDuration = maxDurations[eventType] || 24
  return hours >= 0 && hours <= maxDuration
}
