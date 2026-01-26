/**
 * SplitScreenBitacora - Vista dual para bitacora admin
 *
 * Renderiza la bitacora en formato Split Screen:
 * - Desktop (>=1024px): Grid 50% Calendario | 50% Narrativa
 * - Tablet (<1024px): Stack vertical
 *
 * @see spec.md lines 119-145 para layout y mirroring
 */

"use client"

import { useState, useRef, useCallback } from "react"
import { cn } from "@/lib/utils"
import { CalendarDayView } from "@/components/calendar/CalendarDayView"
import {
  NarrativeTimeline,
  scrollToNarrativeEvent,
  type NarrativeTimelineEvent,
} from "@/components/narrative/NarrativeTimeline"
import {
  SplitScreenProvider,
  useSplitScreen,
} from "@/context/SplitScreenContext"
import { EventEditRouter } from "@/components/events/EventEditRouter"
import type { SleepSession } from "@/lib/utils/sleep-sessions"

// ============================================================================
// INTERFACES
// ============================================================================

/** Evento completo con todos los campos necesarios */
export interface BitacoraEvent {
  _id: string
  childId: string
  eventType: string
  emotionalState?: string
  startTime: string
  endTime?: string
  notes?: string
  // Campos para narrativa
  feedingType?: string
  feedingAmount?: number
  feedingDuration?: number
  isNightFeeding?: boolean
  sleepDelay?: number
  awakeDelay?: number
  medicationName?: string
  medicationDose?: string
  activityDescription?: string
  activityDuration?: number
  duration?: number
}

export interface SplitScreenBitacoraProps {
  /** Lista de eventos del dia */
  events: BitacoraEvent[]
  /** Sesiones de sueno procesadas (opcional) */
  sleepSessions?: SleepSession[]
  /** Nombre del nino */
  childName: string
  /** Fecha seleccionada */
  selectedDate: Date
  /** Timezone del usuario */
  timezone?: string
  /** Altura por hora para el calendario */
  hourHeight?: number
  /** Callback cuando se solicita editar un evento (opcional, si no se provee usa modal interno) */
  onEventEdit?: (eventId: string) => void
  /** Callback cuando un evento se actualiza (para refrescar datos) */
  onEventUpdate?: () => void
  /** Callback cuando se navega al dia anterior */
  onDayNavigateBack?: () => void
  /** Callback cuando se navega al dia siguiente */
  onDayNavigateForward?: () => void
  /** Callback cuando se hace click en el calendario para crear evento */
  onCalendarClick?: (clickEvent: React.MouseEvent, dayDate: Date) => void
  /** Estado de carga */
  isLoading?: boolean
  /** Clase CSS adicional */
  className?: string
}

// ============================================================================
// COMPONENTE INTERNO (usa contexto)
// ============================================================================

function SplitScreenBitacoraInner({
  events,
  childName,
  selectedDate,
  timezone,
  hourHeight = 30,
  onEventEdit,
  onEventUpdate,
  onDayNavigateBack,
  onDayNavigateForward,
  onCalendarClick,
  isLoading = false,
  className,
}: SplitScreenBitacoraProps) {
  const { highlightedEventId, selectionSource, selectEvent } = useSplitScreen()

  // Estado para modal de edicion
  const [editingEvent, setEditingEvent] = useState<BitacoraEvent | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  // Refs para scroll-into-view
  const calendarContainerRef = useRef<HTMLDivElement>(null)
  const narrativeContainerRef = useRef<HTMLDivElement>(null)

  // Mapear eventos para NarrativeTimeline
  const narrativeEvents: NarrativeTimelineEvent[] = events.map((event) => ({
    _id: event._id,
    eventType: event.eventType as NarrativeTimelineEvent["eventType"],
    startTime: event.startTime,
    endTime: event.endTime,
    feedingType: event.feedingType as NarrativeTimelineEvent["feedingType"],
    feedingAmount: event.feedingAmount,
    feedingDuration: event.feedingDuration,
    isNightFeeding: event.isNightFeeding,
    sleepDelay: event.sleepDelay,
    awakeDelay: event.awakeDelay,
    medicationName: event.medicationName,
    medicationDose: event.medicationDose,
    activityDescription: event.activityDescription,
    activityDuration: event.activityDuration,
    duration: event.duration,
    notes: event.notes,
  }))

  // Handler: Click en evento del calendario -> scroll narrativa
  const handleCalendarEventClick = useCallback(
    (event: { _id: string }) => {
      selectEvent(event._id, "calendar")
      // Scroll la narrativa al evento
      scrollToNarrativeEvent(event._id, narrativeContainerRef)
    },
    [selectEvent]
  )

  // Handler: Click en tarjeta narrativa -> scroll calendario
  const handleNarrativeEventClick = useCallback(
    (eventId: string) => {
      selectEvent(eventId, "narrative")
      // Scroll el calendario al evento (buscar por data-attribute)
      const selector = `[data-calendar-event-id="${eventId}"]`
      const element =
        calendarContainerRef.current?.querySelector(selector) ||
        document.querySelector(selector)
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" })
      }
    },
    [selectEvent]
  )

  // Handler: Doble click o chevron para editar
  const handleEventEdit = useCallback(
    (eventId: string) => {
      // Si hay callback externo, usarlo
      if (onEventEdit) {
        onEventEdit(eventId)
        return
      }
      // Si no, usar modal interno
      const event = events.find((e) => e._id === eventId)
      if (event) {
        setEditingEvent(event)
        setIsEditModalOpen(true)
      }
    },
    [onEventEdit, events]
  )

  // Handler: Doble click en calendario para editar
  const handleCalendarEventDoubleClick = useCallback(
    (event: { _id: string }) => {
      handleEventEdit(event._id)
    },
    [handleEventEdit]
  )

  // Handler: Cerrar modal de edicion
  const handleCloseEditModal = useCallback(() => {
    setIsEditModalOpen(false)
    setEditingEvent(null)
  }, [])

  // Handler: Evento actualizado
  const handleEventUpdated = useCallback(() => {
    handleCloseEditModal()
    onEventUpdate?.()
  }, [handleCloseEditModal, onEventUpdate])

  return (
    <div
      className={cn(
        // Layout responsive: stack en mobile/tablet, grid en desktop
        "flex flex-col lg:grid lg:grid-cols-2 lg:gap-4",
        "w-full h-full",
        className
      )}
    >
      {/* Panel Calendario (izquierda en desktop, arriba en mobile) */}
      <div
        ref={calendarContainerRef}
        className={cn(
          "relative overflow-auto",
          // En mobile/tablet, limitar altura
          "h-[400px] lg:h-full",
          "border rounded-lg bg-white"
        )}
      >
        <CalendarDayView
          date={selectedDate}
          events={events}
          hourHeight={hourHeight}
          onEventClick={handleCalendarEventClick}
          onEventDoubleClick={handleCalendarEventDoubleClick}
          onCalendarClick={onCalendarClick}
          onDayNavigateBack={onDayNavigateBack}
          onDayNavigateForward={onDayNavigateForward}
        />
      </div>

      {/* Panel Narrativa (derecha en desktop, abajo en mobile) */}
      <div
        ref={narrativeContainerRef}
        className={cn(
          "relative overflow-auto",
          // En mobile/tablet, usar altura flexible
          "flex-1 lg:h-full",
          "border rounded-lg bg-white p-4",
          // Margen superior en stack vertical
          "mt-4 lg:mt-0"
        )}
      >
        <NarrativeTimeline
          events={narrativeEvents}
          childName={childName}
          timezone={timezone}
          highlightedEventId={
            selectionSource === "calendar" ? highlightedEventId : null
          }
          collapsible={false} // En split screen siempre muestra todo
          isLoading={isLoading}
          onEventClick={handleNarrativeEventClick}
          onEventEdit={handleEventEdit}
          emptyMessage="No hay eventos registrados para este dia"
        />
      </div>

      {/* Modal de edicion de evento */}
      <EventEditRouter
        event={editingEvent}
        open={isEditModalOpen}
        onClose={handleCloseEditModal}
        onUpdate={handleEventUpdated}
        childName={childName}
      />
    </div>
  )
}

// ============================================================================
// COMPONENTE PRINCIPAL (provee contexto)
// ============================================================================

export function SplitScreenBitacora(props: SplitScreenBitacoraProps) {
  return (
    <SplitScreenProvider>
      <SplitScreenBitacoraInner {...props} />
    </SplitScreenProvider>
  )
}
