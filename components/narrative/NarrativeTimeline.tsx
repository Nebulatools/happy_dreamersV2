/**
 * NarrativeTimeline - Lista vertical de eventos en formato narrativo
 *
 * Renderiza una lista de NarrativeCards con:
 * - Ordenamiento cronologico inverso (mas reciente primero)
 * - Sistema collapsible con "Ver todo/Colapsar"
 * - Empty state cuando no hay eventos
 * - Skeleton loaders durante carga
 *
 * @see spec.md lines 64-77 para comportamiento Home (Padres)
 * @see spec.md lines 73-77 para ordenamiento y edge cases
 */

"use client"

import { useState, useRef, useMemo, createRef } from "react"
import { ChevronDown, ChevronUp, CalendarX } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { NarrativeCard } from "./NarrativeCard"
import type { NarrativeEvent } from "@/lib/narrative/generate-narrative"
import { DEFAULT_TIMEZONE } from "@/lib/datetime"

// ============================================================================
// INTERFACES
// ============================================================================

/** Evento con _id para tracking */
export type NarrativeTimelineEvent = NarrativeEvent & { _id: string }

export interface NarrativeTimelineProps {
  /** Lista de eventos a mostrar */
  events: NarrativeTimelineEvent[]
  /** Nombre del nino para narrativas */
  childName: string
  /** Timezone del usuario */
  timezone?: string
  /** ID del evento resaltado (para mirroring) */
  highlightedEventId?: string | null
  /** Si la lista es collapsible */
  collapsible?: boolean
  /** Limite inicial de eventos a mostrar (solo si collapsible=true) */
  initialLimit?: number
  /** Estado de carga */
  isLoading?: boolean
  /** Callback al hacer click en una tarjeta (para mirroring) */
  onEventClick?: (eventId: string) => void
  /** Callback al solicitar edicion de evento */
  onEventEdit?: (eventId: string) => void
  /** Mensaje personalizado para empty state */
  emptyMessage?: string
}

// ============================================================================
// SKELETON LOADER
// ============================================================================

function NarrativeCardSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
      {/* Icono circular skeleton */}
      <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />

      {/* Contenido skeleton */}
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/4" />
      </div>

      {/* Chevron skeleton */}
      <Skeleton className="w-8 h-8 rounded-md flex-shrink-0" />
    </div>
  )
}

// ============================================================================
// EMPTY STATE
// ============================================================================

interface EmptyStateProps {
  message: string
}

function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <CalendarX className="h-8 w-8 text-muted-foreground" />
      </div>
      <p className="text-muted-foreground text-sm">{message}</p>
    </div>
  )
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function NarrativeTimeline({
  events,
  childName,
  timezone = DEFAULT_TIMEZONE,
  highlightedEventId = null,
  collapsible = false,
  initialLimit = 5,
  isLoading = false,
  onEventClick,
  onEventEdit,
  emptyMessage = "No hay eventos registrados hoy",
}: NarrativeTimelineProps) {
  // Estado para expandir/colapsar
  const [isExpanded, setIsExpanded] = useState(false)

  // Refs para scroll-into-view (una por evento)
  const cardRefs = useRef<Map<string, React.RefObject<HTMLDivElement>>>(new Map())

  // Ordenar eventos cronologicamente inverso (mas reciente primero)
  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      const timeA = new Date(a.startTime).getTime()
      const timeB = new Date(b.startTime).getTime()
      return timeB - timeA // Inverso: mayor timestamp primero
    })
  }, [events])

  // Eventos a mostrar segun estado colapsado/expandido
  const visibleEvents = useMemo(() => {
    if (!collapsible || isExpanded) {
      return sortedEvents
    }
    return sortedEvents.slice(0, initialLimit)
  }, [sortedEvents, collapsible, isExpanded, initialLimit])

  // Determinar si hay mas eventos ocultos
  const hasMoreEvents = collapsible && sortedEvents.length > initialLimit

  // Obtener o crear ref para un evento
  const getCardRef = (eventId: string): React.RefObject<HTMLDivElement> => {
    if (!cardRefs.current.has(eventId)) {
      cardRefs.current.set(eventId, createRef<HTMLDivElement>())
    }
    return cardRefs.current.get(eventId)!
  }

  // Scroll al evento resaltado cuando cambia
  useMemo(() => {
    if (highlightedEventId) {
      const ref = cardRefs.current.get(highlightedEventId)
      if (ref?.current) {
        ref.current.scrollIntoView({ behavior: "smooth", block: "center" })
      }
    }
  }, [highlightedEventId])

  // Toggle expandir/colapsar
  const toggleExpanded = () => {
    setIsExpanded((prev) => !prev)
  }

  // ---- RENDER: Loading state ----
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: initialLimit }).map((_, index) => (
          <NarrativeCardSkeleton key={`skeleton-${index}`} />
        ))}
      </div>
    )
  }

  // ---- RENDER: Empty state ----
  if (sortedEvents.length === 0) {
    return <EmptyState message={emptyMessage} />
  }

  // ---- RENDER: Lista de eventos ----
  return (
    <div className="space-y-2">
      {/* Lista de tarjetas */}
      {visibleEvents.map((event) => (
        <NarrativeCard
          key={event._id}
          event={event}
          childName={childName}
          timezone={timezone}
          isHighlighted={event._id === highlightedEventId}
          onClick={onEventClick}
          onEdit={onEventEdit}
          cardRef={getCardRef(event._id)}
        />
      ))}

      {/* Boton Ver todo / Colapsar */}
      {hasMoreEvents && (
        <div className="pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleExpanded}
            className={cn(
              "w-full justify-center gap-2",
              "text-muted-foreground hover:text-foreground"
            )}
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Colapsar
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                Ver todo ({sortedEvents.length - initialLimit} mas)
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}

/**
 * Funcion auxiliar para obtener ref de un evento desde fuera del componente.
 * Util para mirroring con calendario.
 */
export function scrollToNarrativeEvent(
  eventId: string,
  containerRef?: React.RefObject<HTMLElement>
): void {
  // Buscar el elemento por data-attribute
  const selector = `[data-event-id="${eventId}"]`
  const element = containerRef?.current?.querySelector(selector) ||
    document.querySelector(selector)

  if (element) {
    element.scrollIntoView({ behavior: "smooth", block: "center" })
  }
}
