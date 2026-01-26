/**
 * Hook para manejo de fecha/hora en modales de eventos
 *
 * Encapsula la logica de inicializacion, sincronizacion y construccion
 * de timestamps que se repite en todos los modales de eventos.
 *
 * @example
 * const { eventDate, eventTime, setEventDate, setEventTime, buildTimestamp, resetDateTime } = useModalDatetime({
 *   mode,
 *   initialStartTime: initialData?.startTime,
 *   open,
 * })
 *
 * @see components/events/FeedingModal.tsx
 * @see components/events/MedicationModal.tsx
 * @see components/events/ExtraActivityModal.tsx
 */

import { useState, useEffect, useCallback } from "react"
import { format } from "date-fns"
import { useDevTime } from "@/context/dev-time-context"
import { useUser } from "@/context/UserContext"
import { buildLocalDate, dateToTimestamp, DEFAULT_TIMEZONE } from "@/lib/datetime"
import type { EditOptions } from "@/components/events/types"

interface UseModalDatetimeOptions {
  /** Modo del modal: create o edit */
  mode: "create" | "edit"
  /** Timestamp ISO del evento en modo edicion */
  initialStartTime?: string
  /** Si el modal esta abierto (para sincronizacion) */
  open: boolean
}

interface UseModalDatetimeReturn {
  /** Fecha en formato yyyy-MM-dd */
  eventDate: string
  /** Hora en formato HH:mm */
  eventTime: string
  /** Setter para la fecha */
  setEventDate: (date: string) => void
  /** Setter para la hora */
  setEventTime: (time: string) => void
  /** Construye el timestamp ISO a partir de fecha/hora actuales */
  buildTimestamp: () => string
  /** Construye EditOptions para modo edicion */
  buildEditOptions: () => EditOptions | undefined
  /** Resetea a los valores iniciales o actuales segun el modo */
  resetDateTime: () => void
  /** Timezone del usuario */
  timezone: string
}

/**
 * Hook para manejo unificado de fecha/hora en modales de eventos
 *
 * Maneja automaticamente:
 * - Inicializacion condicional basada en mode (create vs edit)
 * - Re-sincronizacion cuando cambia open/mode/initialStartTime
 * - Conversion a timestamps ISO con timezone correcto
 */
export function useModalDatetime({
  mode,
  initialStartTime,
  open,
}: UseModalDatetimeOptions): UseModalDatetimeReturn {
  const { getCurrentTime } = useDevTime()
  const { userData } = useUser()
  const timezone = userData?.timezone || DEFAULT_TIMEZONE

  // Funcion helper para obtener fecha/hora inicial
  const getInitialDateTime = useCallback(() => {
    if (mode === "edit" && initialStartTime) {
      const date = new Date(initialStartTime)
      return {
        date: format(date, "yyyy-MM-dd"),
        time: format(date, "HH:mm"),
      }
    }
    const now = getCurrentTime()
    return {
      date: format(now, "yyyy-MM-dd"),
      time: format(now, "HH:mm"),
    }
  }, [mode, initialStartTime, getCurrentTime])

  // Estados para fecha y hora
  const [eventDate, setEventDate] = useState<string>(() => getInitialDateTime().date)
  const [eventTime, setEventTime] = useState<string>(() => getInitialDateTime().time)

  // Sincronizar cuando se abre el modal o cambian los datos
  useEffect(() => {
    if (open) {
      const { date, time } = getInitialDateTime()
      setEventDate(date)
      setEventTime(time)
    }
  }, [open, mode, initialStartTime, getInitialDateTime])

  // Construir timestamp ISO a partir de fecha/hora actuales
  const buildTimestamp = useCallback((): string => {
    const dateObj = buildLocalDate(eventDate, eventTime)
    return dateToTimestamp(dateObj, timezone)
  }, [eventDate, eventTime, timezone])

  // Construir EditOptions para modo edicion
  const buildEditOptions = useCallback((): EditOptions | undefined => {
    if (mode !== "edit" || !eventDate || !eventTime) {
      return undefined
    }
    return {
      startTime: buildTimestamp(),
    }
  }, [mode, eventDate, eventTime, buildTimestamp])

  // Resetear a valores iniciales o actuales
  const resetDateTime = useCallback(() => {
    const { date, time } = getInitialDateTime()
    setEventDate(date)
    setEventTime(time)
  }, [getInitialDateTime])

  return {
    eventDate,
    eventTime,
    setEventDate,
    setEventTime,
    buildTimestamp,
    buildEditOptions,
    resetDateTime,
    timezone,
  }
}
