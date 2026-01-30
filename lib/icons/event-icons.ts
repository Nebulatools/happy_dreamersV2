/**
 * Event Icons Registry - Centralized icon configuration for events
 *
 * Este archivo centraliza la configuracion de iconos para todos los tipos
 * de eventos en el sistema. Reemplaza el switch-case distribuido en multiples
 * componentes por un lookup O(1) tipado.
 *
 * ARQUITECTURA:
 * - EventType (components/events/types.ts) = tipo canonico del evento
 * - EventIconType (este archivo) = clave derivada que combina eventType + feedingType
 *
 * La funcion getEventIconType() transforma:
 *   ("feeding", "breast") → "feeding_breast"
 *   ("sleep", undefined) → "sleep"
 *
 * @see components/events/types.ts para tipos canonicos de eventos
 * @see lib/colors/event-colors.ts para sistema de colores
 */

import { LucideIcon, Moon, Sun, Baby, UtensilsCrossed, Pill, Activity, Clock, Heart, Milk, CloudMoon, StickyNote } from "lucide-react"
import type { EventType, FeedingType } from "@/components/events/types"

/**
 * Tipo para las claves del registry de iconos
 *
 * Este tipo es DERIVADO de EventType + FeedingType, no es un reemplazo.
 * La funcion getEventIconType() hace la conversion.
 */
export type EventIconType =
  | "sleep"
  | "nap"
  | "wake"
  | "night_waking"
  | "feeding_breast"
  | "feeding_bottle"
  | "feeding_solids"
  | "medication"
  | "extra_activities"
  | "note"
  | "default"

// Configuracion de un icono de evento
export interface EventIconConfig {
  icon: LucideIcon
  color: string        // Color del icono (hex o tailwind)
  bgColor: string      // Color de fondo del badge/globe
  label: string        // Nombre legible en espanol
}

/**
 * Registry centralizado de iconos por tipo de evento
 *
 * Taxonomia visual:
 * - Sueno nocturno: Moon (indigo) - representa la noche
 * - Siesta: CloudMoon (violet) - diferente a sleep para distinguir
 * - Despertar: Sun (yellow) - representa el dia
 * - Despertar nocturno: Baby (purple) - bebe activo de noche
 * - Alimentacion pecho: Heart (pink) - conexion madre-hijo
 * - Alimentacion biberon: Milk (sky) - liquidos
 * - Alimentacion solidos: UtensilsCrossed (emerald) - comida
 * - Medicamento: Pill (amber) - medicina
 * - Actividades: Activity (orange) - movimiento
 */
export const EVENT_ICONS: Record<EventIconType, EventIconConfig> = {
  sleep: {
    icon: Moon,
    color: "#6366f1",      // indigo-500
    bgColor: "bg-sleep",
    label: "Dormir",
  },
  nap: {
    icon: CloudMoon,
    color: "#a78bfa",      // violet-400 (lavanda)
    bgColor: "bg-nap",
    label: "Siesta",
  },
  wake: {
    icon: Sun,
    color: "#eab308",      // yellow-500
    bgColor: "bg-wake",
    label: "Despertar",
  },
  night_waking: {
    icon: Baby,
    color: "#a855f7",      // purple-500
    bgColor: "bg-night-wake",
    label: "Despertar nocturno",
  },
  feeding_breast: {
    icon: Heart,
    color: "#ec4899",      // pink-500
    bgColor: "bg-feeding-breast",
    label: "Pecho",
  },
  feeding_bottle: {
    icon: Milk,
    color: "#0ea5e9",      // sky-500
    bgColor: "bg-feeding-bottle",
    label: "Biberon",
  },
  feeding_solids: {
    icon: UtensilsCrossed,
    color: "#10b981",      // emerald-500
    bgColor: "bg-feeding-solids",
    label: "Solidos",
  },
  medication: {
    icon: Pill,
    color: "#f59e0b",      // amber-500 (dorado)
    bgColor: "bg-medication",
    label: "Medicamento",
  },
  extra_activities: {
    icon: Activity,
    color: "#f97316",      // orange-500
    bgColor: "bg-extra-activities",
    label: "Actividad Extra",
  },
  note: {
    icon: StickyNote,
    color: "#374151",      // gray-700 (oscuro para contraste)
    bgColor: "bg-violet-100",
    label: "Nota",
  },
  default: {
    icon: Clock,
    color: "#6b7280",      // gray-500
    bgColor: "bg-muted",
    label: "Evento",
  },
}

/**
 * Determina el tipo de icono basado en eventType y feedingType
 *
 * @param eventType - Tipo de evento (sleep, nap, feeding, etc.)
 * @param feedingType - Subtipo de alimentacion (breast, bottle, solids)
 * @returns EventIconType para lookup en EVENT_ICONS
 *
 * @example
 * getEventIconType("feeding", "breast") // "feeding_breast"
 * getEventIconType("sleep") // "sleep"
 * getEventIconType("unknown") // "default"
 */
export function getEventIconType(
  eventType: string,
  feedingType?: "breast" | "bottle" | "solids" | string
): EventIconType {
  // Casos especiales de alimentacion
  if (eventType === "feeding" || eventType === "night_feeding") {
    if (feedingType === "breast") {
      return "feeding_breast"
    }
    if (feedingType === "bottle") {
      return "feeding_bottle"
    }
    if (feedingType === "solids") {
      return "feeding_solids"
    }
    // Si no hay feedingType, usar breast por defecto (mas comun)
    return "feeding_breast"
  }

  // Mapeo directo para otros tipos
  if (eventType in EVENT_ICONS) {
    return eventType as EventIconType
  }

  return "default"
}

/**
 * Obtiene la configuracion completa del icono para un evento
 *
 * @param eventType - Tipo de evento
 * @param feedingType - Subtipo de alimentacion (opcional)
 * @returns EventIconConfig con icon, color, bgColor y label
 *
 * @example
 * const config = getEventIconConfig("feeding", "bottle")
 * // { icon: Milk, color: "#0ea5e9", bgColor: "bg-sky-400", label: "Biberon" }
 */
export function getEventIconConfig(
  eventType: string,
  feedingType?: "breast" | "bottle" | "solids" | string
): EventIconConfig {
  const iconType = getEventIconType(eventType, feedingType)
  return EVENT_ICONS[iconType]
}
