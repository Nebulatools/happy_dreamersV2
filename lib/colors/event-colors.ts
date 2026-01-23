/**
 * Event Colors Registry - Single Source of Truth para colores de eventos
 *
 * Este archivo centraliza TODOS los colores de eventos del sistema.
 * Cambiar un color aqui afecta automaticamente a:
 * - EventBlock (calendario)
 * - SleepSessionBlock (sesiones de sueno)
 * - NarrativeCard (vista narrativa)
 * - Estadisticas y graficos
 *
 * Los valores HSL estan definidos en globals.css como CSS variables.
 * Este archivo provee helpers para obtener las clases de Tailwind.
 *
 * ARQUITECTURA:
 * - EventType (components/events/types.ts) = tipo canonico del evento
 * - EventColorType (este archivo) = clave derivada que combina eventType + feedingType
 *
 * @see globals.css lineas 134-147 para las definiciones CSS
 * @see components/events/types.ts para tipos canonicos
 * @see lib/icons/event-icons.ts para iconos asociados
 */

import type { FeedingType } from "@/components/events/types"

/**
 * Tipos de color para eventos (derivado de EventType + FeedingType)
 */
export type EventColorType =
  | "sleep"
  | "nap"
  | "wake"
  | "night_waking"
  | "feeding"
  | "feeding_breast"
  | "feeding_bottle"
  | "feeding_solids"
  | "medication"
  | "extra_activities"
  | "note"

// Configuracion de color para un tipo de evento
export interface EventColorConfig {
  // Clase CSS para background solido
  bg: string
  // Clase CSS para background con opacidad (10%)
  bgLight: string
  // Clase CSS para border
  border: string
  // Color hex para graficos/estilos inline
  hex: string
  // Color con alpha para overlays
  hexAlpha: string
  // Clase de texto (contraste)
  text: string
}

/**
 * Registry centralizado de colores por tipo de evento
 *
 * Taxonomia de colores:
 * - Sleep: Cyan azulado (#7DBFE2) - calma nocturna
 * - Nap: Naranja (#F5A623) - energia de siesta
 * - Wake: Verde (#34D399) - frescura del despertar
 * - Night waking: Rojo (#DC2626) - alerta/atencion
 * - Feeding breast: Rosa (#EC4899) - conexion maternal
 * - Feeding bottle: Azul cielo (#0EA5E9) - liquidos
 * - Feeding solids: Esmeralda (#10B981) - alimentos
 * - Medication: Purpura (#BF73DF) - cuidado medico
 * - Extra activities: Turquesa (#33CCCC) - actividad
 * - Note: Violeta (#8B5CF6) - notas/bitacora
 */
export const EVENT_COLORS: Record<EventColorType, EventColorConfig> = {
  sleep: {
    bg: "bg-sleep",
    bgLight: "bg-sleep/10",
    border: "border-sleep",
    hex: "#7DBFE2",
    hexAlpha: "rgba(125, 191, 226, 0.5)",
    text: "text-white",
  },
  nap: {
    bg: "bg-nap",
    bgLight: "bg-nap/10",
    border: "border-nap",
    hex: "#F5A623",
    hexAlpha: "rgba(245, 166, 35, 0.5)",
    text: "text-white",
  },
  wake: {
    bg: "bg-wake",
    bgLight: "bg-wake/10",
    border: "border-wake",
    hex: "#34D399",
    hexAlpha: "rgba(52, 211, 153, 0.5)",
    text: "text-gray-900",
  },
  night_waking: {
    bg: "bg-night-wake",
    bgLight: "bg-night-wake/10",
    border: "border-night-wake",
    hex: "#DC2626",
    hexAlpha: "rgba(220, 38, 38, 0.5)",
    text: "text-white",
  },
  feeding: {
    // Default feeding color (azul cielo - igual que bottle)
    bg: "bg-feeding",
    bgLight: "bg-feeding/10",
    border: "border-feeding",
    hex: "#0EA5E9",
    hexAlpha: "rgba(14, 165, 233, 0.5)",
    text: "text-white",
  },
  feeding_breast: {
    bg: "bg-feeding-breast",
    bgLight: "bg-feeding-breast/10",
    border: "border-feeding-breast",
    hex: "#EC4899",
    hexAlpha: "rgba(236, 72, 153, 0.5)",
    text: "text-white",
  },
  feeding_bottle: {
    bg: "bg-feeding-bottle",
    bgLight: "bg-feeding-bottle/10",
    border: "border-feeding-bottle",
    hex: "#0EA5E9",
    hexAlpha: "rgba(14, 165, 233, 0.5)",
    text: "text-white",
  },
  feeding_solids: {
    bg: "bg-feeding-solids",
    bgLight: "bg-feeding-solids/10",
    border: "border-feeding-solids",
    hex: "#10B981",
    hexAlpha: "rgba(16, 185, 129, 0.5)",
    text: "text-white",
  },
  medication: {
    bg: "bg-medication",
    bgLight: "bg-medication/10",
    border: "border-medication",
    hex: "#BF73DF",
    hexAlpha: "rgba(191, 115, 223, 0.5)",
    text: "text-white",
  },
  extra_activities: {
    bg: "bg-extra-activities",
    bgLight: "bg-extra-activities/10",
    border: "border-extra-activity",
    hex: "#33CCCC",
    hexAlpha: "rgba(51, 204, 204, 0.5)",
    text: "text-white",
  },
  note: {
    bg: "bg-note",
    bgLight: "bg-note/10",
    border: "border-note",
    hex: "#8B5CF6",
    hexAlpha: "rgba(139, 92, 246, 0.5)",
    text: "text-white",
  },
}

// Color por defecto para tipos desconocidos
const DEFAULT_COLOR: EventColorConfig = {
  bg: "bg-gray-400",
  bgLight: "bg-gray-400/10",
  border: "border-gray-400",
  hex: "#9CA3AF",
  hexAlpha: "rgba(156, 163, 175, 0.5)",
  text: "text-white",
}

/**
 * Determina el tipo de color basado en eventType y feedingType
 *
 * @param eventType - Tipo de evento (sleep, nap, feeding, etc.)
 * @param feedingType - Subtipo de alimentacion (breast, bottle, solids)
 * @returns EventColorType para lookup en EVENT_COLORS
 *
 * @example
 * getEventColorType("feeding", "breast") // "feeding_breast"
 * getEventColorType("sleep") // "sleep"
 * getEventColorType("bedtime") // "sleep" (alias)
 */
export function getEventColorType(
  eventType: string,
  feedingType?: FeedingType | string
): EventColorType {
  // Aliases para tipos de sueno
  if (eventType === "bedtime") {
    return "sleep"
  }

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
    // Sin feedingType especificado, usar breast por defecto
    return "feeding_breast"
  }

  // Mapeo directo para otros tipos
  if (eventType in EVENT_COLORS) {
    return eventType as EventColorType
  }

  // Fallback: intentar como esta
  return eventType as EventColorType
}

/**
 * Obtiene la configuracion completa de color para un evento
 *
 * @param eventType - Tipo de evento
 * @param feedingType - Subtipo de alimentacion (opcional)
 * @returns EventColorConfig con bg, border, hex, text
 *
 * @example
 * const config = getEventColorConfig("feeding", "bottle")
 * // { bg: "bg-feeding-bottle", border: "border-feeding-bottle", ... }
 */
export function getEventColorConfig(
  eventType: string,
  feedingType?: FeedingType | string
): EventColorConfig {
  const colorType = getEventColorType(eventType, feedingType)
  return EVENT_COLORS[colorType] || DEFAULT_COLOR
}

/**
 * Genera las clases CSS completas para un bloque de evento
 *
 * Combina: bg + border + text + font-semibold
 *
 * @param eventType - Tipo de evento
 * @param feedingType - Subtipo de alimentacion (opcional)
 * @returns String con clases CSS completas
 *
 * @example
 * getEventBlockClasses("sleep")
 * // "bg-sleep border-sleep text-white font-semibold"
 *
 * getEventBlockClasses("feeding", "solids")
 * // "bg-feeding-solids border-feeding-solids text-white font-semibold"
 */
export function getEventBlockClasses(
  eventType: string,
  feedingType?: FeedingType | string
): string {
  const config = getEventColorConfig(eventType, feedingType)
  return `${config.bg} ${config.border} ${config.text} font-semibold`
}

/**
 * Obtiene solo la clase de background para un evento
 *
 * @param eventType - Tipo de evento
 * @param feedingType - Subtipo de alimentacion (opcional)
 * @returns Clase CSS de background
 */
export function getEventBgClass(
  eventType: string,
  feedingType?: FeedingType | string
): string {
  const config = getEventColorConfig(eventType, feedingType)
  return config.bg
}

/**
 * Obtiene el color hex para graficos o estilos inline
 *
 * @param eventType - Tipo de evento
 * @param feedingType - Subtipo de alimentacion (opcional)
 * @returns Color en formato hexadecimal
 */
export function getEventHexColor(
  eventType: string,
  feedingType?: FeedingType | string
): string {
  const config = getEventColorConfig(eventType, feedingType)
  return config.hex
}

/**
 * Obtiene el color con alpha para overlays
 *
 * @param eventType - Tipo de evento
 * @param feedingType - Subtipo de alimentacion (opcional)
 * @returns Color en formato rgba
 */
export function getEventHexAlpha(
  eventType: string,
  feedingType?: FeedingType | string
): string {
  const config = getEventColorConfig(eventType, feedingType)
  return config.hexAlpha
}
