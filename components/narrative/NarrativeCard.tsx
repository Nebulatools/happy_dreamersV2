/**
 * NarrativeCard - Tarjeta visual de evento en formato narrativo
 *
 * Renderiza un evento como una tarjeta legible con:
 * - Icono circular (respeta taxonomia visual)
 * - Texto narrativo en espanol
 * - Metadatos de hora
 * - Chevron para navegacion/edicion
 *
 * @see spec.md lines 36-48 para anatomia de tarjeta
 * @see lib/icons/event-icons.ts para taxonomia de iconos
 * @see lib/narrative/generate-narrative.ts para generacion de texto
 */

"use client"

import { Pencil } from "lucide-react"
import { cn } from "@/lib/utils"
import { getEventIconConfig } from "@/lib/icons/event-icons"
import { generateNarrative, generateTimeMetadata } from "@/lib/narrative/generate-narrative"
import type { NarrativeEvent } from "@/lib/narrative/generate-narrative"
import { DEFAULT_TIMEZONE } from "@/lib/datetime"

// ============================================================================
// INTERFACES
// ============================================================================

export interface NarrativeCardProps {
  /** Datos del evento a mostrar */
  event: NarrativeEvent & { _id?: string }
  /** Nombre del nino para la narrativa */
  childName: string
  /** Timezone del usuario (default: America/Monterrey) */
  timezone?: string
  /** Si la tarjeta esta resaltada (mirroring) */
  isHighlighted?: boolean
  /** Callback al hacer click en la tarjeta (mirroring) */
  onClick?: (eventId: string) => void
  /** Callback al hacer click en chevron o doble click (edicion) */
  onEdit?: (eventId: string) => void
  /** Ref para scroll-into-view */
  cardRef?: React.RefObject<HTMLDivElement>
}

// ============================================================================
// COMPONENTE
// ============================================================================

export function NarrativeCard({
  event,
  childName,
  timezone = DEFAULT_TIMEZONE,
  isHighlighted = false,
  onClick,
  onEdit,
  cardRef,
}: NarrativeCardProps) {
  const eventId = event._id || ""

  // Obtener configuracion de icono desde el registry centralizado
  const iconConfig = getEventIconConfig(event.eventType, event.feedingType)
  const IconComponent = iconConfig.icon

  // Generar texto narrativo y metadatos de hora
  const narrativeText = generateNarrative(childName, event, timezone)
  const timeMetadata = generateTimeMetadata(event, timezone)

  // Handlers de interaccion
  const handleClick = () => {
    if (onClick && eventId) {
      onClick(eventId)
    }
  }

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation() // Evitar trigger de onClick
    if (onEdit && eventId) {
      onEdit(eventId)
    }
  }

  const handleDoubleClick = () => {
    if (onEdit && eventId) {
      onEdit(eventId)
    }
  }

  return (
    <div
      ref={cardRef}
      data-event-id={eventId}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      className={cn(
        // Base styles
        "flex items-center gap-3 p-3 rounded-lg border bg-card",
        "transition-all duration-200",
        // Hover state
        "hover:bg-accent/50 cursor-pointer",
        // Highlight state (para mirroring con calendario)
        isHighlighted && "ring-2 ring-yellow-400 bg-yellow-50/50 animate-highlight-fade"
      )}
    >
      {/* Icono circular - lado izquierdo */}
      <div
        className={cn(
          "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center",
          iconConfig.bgColor
        )}
      >
        <IconComponent
          className="h-5 w-5"
          style={{
            // Notas tienen fondo claro, necesitan icono oscuro
            color: event.eventType === "note" ? iconConfig.color : "white",
            filter: "drop-shadow(0 0 1px rgba(0,0,0,0.3))",
          }}
        />
      </div>

      {/* Contenido central - narrativa y hora */}
      <div className="flex-1 min-w-0">
        {/* Texto narrativo */}
        <p className="text-sm font-medium text-foreground truncate">
          {narrativeText}
        </p>

        {/* Metadatos de hora */}
        {timeMetadata && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {timeMetadata}
          </p>
        )}
      </div>

      {/* Chevron - lado derecho */}
      {onEdit && (
        <button
          onClick={handleEditClick}
          className={cn(
            "flex-shrink-0 p-1.5 rounded-md",
            "hover:bg-accent transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-ring"
          )}
          aria-label="Editar evento"
        >
          <Pencil className="h-4 w-4 text-muted-foreground" />
        </button>
      )}
    </div>
  )
}
