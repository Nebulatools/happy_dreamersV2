"use client"

import React, { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { format } from "date-fns"
import { useDevTime } from "@/context/dev-time-context"
import { useUser } from "@/context/UserContext"
import { buildLocalDate, dateToTimestamp, DEFAULT_TIMEZONE } from "@/lib/datetime"
import { DelaySelector, EmotionalStateSelector } from "@/components/events/shared"
import type { EmotionalState } from "@/components/events/types"

interface SleepDelayModalProps {
  open: boolean
  onClose: () => void
  onConfirm: (delay: number, emotionalState: string, notes: string, options?: {
    didNotSleep?: boolean
    startTime?: string
    endTime?: string | null
  }) => void
  childName: string
  eventType: "sleep" | "nap"
  mode?: "create" | "edit"
  initialData?: {
    sleepDelay?: number
    emotionalState?: string
    notes?: string
    startTime?: string
    endTime?: string
    eventId?: string
  }
}

/**
 * Modal para capturar cuánto tardó el niño en dormirse
 * Aparece después de registrar que se durmió
 */
export function SleepDelayModal({
  open,
  onClose,
  onConfirm,
  childName,
  eventType,
  mode = "create",
  initialData,
}: SleepDelayModalProps) {
  const { getCurrentTime } = useDevTime()
  const { userData } = useUser()
  const timezone = userData?.timezone || DEFAULT_TIMEZONE
  const [selectedDelay, setSelectedDelay] = useState<number>(initialData?.sleepDelay || 15) // Default 15 min
  const [emotionalState, setEmotionalState] = useState<EmotionalState>((initialData?.emotionalState as EmotionalState) || "tranquilo") // Default tranquilo
  const [notes, setNotes] = useState<string>(initialData?.notes || "") // Notas opcionales
  const [eventDate, setEventDate] = useState<string>(() => {
    if (mode === "edit" && initialData?.startTime) {
      return format(new Date(initialData.startTime), "yyyy-MM-dd")
    }
    return format(getCurrentTime(), "yyyy-MM-dd")
  })
  const [eventTime, setEventTime] = useState<string>(() => {
    if (mode === "edit" && initialData?.startTime) {
      return format(new Date(initialData.startTime), "HH:mm")
    }
    return format(getCurrentTime(), "HH:mm")
  })
  // Estados para hora de despertar (endTime) - solo en modo edicion
  const [endDate, setEndDate] = useState<string>(() => {
    if (mode === "edit" && initialData?.endTime) {
      return format(new Date(initialData.endTime), "yyyy-MM-dd")
    }
    return format(getCurrentTime(), "yyyy-MM-dd")
  })
  const [endTimeValue, setEndTimeValue] = useState<string>(() => {
    if (mode === "edit" && initialData?.endTime) {
      return format(new Date(initialData.endTime), "HH:mm")
    }
    return ""
  })
  const [hasEndTime, setHasEndTime] = useState<boolean>(() => {
    return mode === "edit" && !!initialData?.endTime
  })
  const [isProcessing, setIsProcessing] = useState(false)
  const [didNotSleep, setDidNotSleep] = useState(false)

  // Inicializar con datos cuando se abre en modo edición
  useEffect(() => {
    if (open && mode === "edit" && initialData) {
      setSelectedDelay(initialData.sleepDelay || 15)
      setEmotionalState((initialData.emotionalState as EmotionalState) || "tranquilo")
      setNotes(initialData.notes || "")
      if (initialData.startTime) {
        setEventDate(format(new Date(initialData.startTime), "yyyy-MM-dd"))
        setEventTime(format(new Date(initialData.startTime), "HH:mm"))
      }
      // Inicializar hora de despertar si existe
      if (initialData.endTime) {
        setEndDate(format(new Date(initialData.endTime), "yyyy-MM-dd"))
        setEndTimeValue(format(new Date(initialData.endTime), "HH:mm"))
        setHasEndTime(true)
      } else {
        setEndDate(format(getCurrentTime(), "yyyy-MM-dd"))
        setEndTimeValue("")
        setHasEndTime(false)
      }
      setDidNotSleep(false)
    }
  }, [open, mode, initialData, getCurrentTime])

  // NOTA: quickOptions, adjustDelay, formatDelayText y emotionalStates
  // ahora vienen de los componentes compartidos DelaySelector y EmotionalStateSelector

  const handleConfirm = async () => {
    setIsProcessing(true)

    // Construir opciones con tiempos editados
    const options: {
      didNotSleep?: boolean
      startTime?: string
      endTime?: string | null
    } = { didNotSleep }

    // En modo edicion, incluir startTime y endTime editados
    if (mode === "edit") {
      // Construir startTime desde fecha/hora editadas (usando buildLocalDate para evitar bug UTC)
      const startDateTime = buildLocalDate(eventDate, eventTime)
      options.startTime = dateToTimestamp(startDateTime, timezone)

      // Construir endTime si existe
      if (hasEndTime && endTimeValue) {
        const endDateTime = buildLocalDate(endDate, endTimeValue)
        options.endTime = dateToTimestamp(endDateTime, timezone)
      } else {
        options.endTime = null
      }
    }

    await onConfirm(selectedDelay, emotionalState, notes, options)
    setIsProcessing(false)
    // Reset para próxima vez
    setSelectedDelay(15)
    setEmotionalState("tranquilo" as EmotionalState)
    setNotes("")
    setDidNotSleep(false)
    setHasEndTime(false)
    setEndTimeValue("")
  }

  const handleSkip = () => {
    // Si omite, simplemente cerramos el modal sin confirmar
    onClose()
    // Reset para próxima vez
    setSelectedDelay(15)
    setEmotionalState("tranquilo" as EmotionalState)
    setNotes("")
    setDidNotSleep(false)
  }

  return (
    <Dialog 
      open={open} 
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          onClose() // Solo llama onClose cuando se cierra, no cuando se abre
        }
      }}
    >
      <DialogContent
        className={cn(
          "max-w-md max-h-[80vh] overflow-y-auto",
          eventType === "nap" && didNotSleep
            ? "border-2 border-rose-300 shadow-[0_0_0_3px_rgba(248,113,113,0.45)]"
            : ""
        )}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-500" />
            {mode === "edit" 
              ? (eventType === "nap" ? "Editar Siesta" : "Editar Sueño")
              : (eventType === "nap" ? "Tiempo para dormir la siesta" : "Tiempo para dormir")}
          </DialogTitle>
          <DialogDescription>
            {mode === "edit"
              ? `Modifica los detalles del sueño de ${childName}`
              : eventType === "nap" && didNotSleep
                ? `¿Cuánto tiempo intentaron dormir a ${childName}?`
                : `¿Cuánto tiempo tardó ${childName} en dormirse?`}
          </DialogDescription>
        </DialogHeader>

        {/* Fecha y hora de inicio (cuando se durmio) - Solo visible en modo edición */}
        {mode === "edit" && (
          <div className="space-y-3 pb-4 border-b">
            <div className="text-sm font-medium text-gray-700">
              Hora de acostarse
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="sleep-date" className="text-xs text-gray-500">
                  Fecha
                </Label>
                <Input
                  id="sleep-date"
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sleep-time" className="text-xs text-gray-500">
                  Hora
                </Label>
                <Input
                  id="sleep-time"
                  type="time"
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        )}

        {/* Fecha y hora de despertar - Solo visible en modo edición si hay endTime */}
        {mode === "edit" && (
          <div className="space-y-3 pb-4 border-b">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-gray-700">
                Hora de despertar
              </div>
              {!hasEndTime && (
                <button
                  type="button"
                  onClick={() => {
                    setHasEndTime(true)
                    setEndDate(eventDate)
                    setEndTimeValue(format(getCurrentTime(), "HH:mm"))
                  }}
                  className="text-xs text-blue-600 hover:text-blue-700 underline"
                >
                  + Agregar hora de despertar
                </button>
              )}
            </div>
            {hasEndTime ? (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="wake-date" className="text-xs text-gray-500">
                    Fecha
                  </Label>
                  <Input
                    id="wake-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wake-time" className="text-xs text-gray-500">
                    Hora
                  </Label>
                  <div className="flex gap-1">
                    <Input
                      id="wake-time"
                      type="time"
                      value={endTimeValue}
                      onChange={(e) => setEndTimeValue(e.target.value)}
                      className="w-full"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setHasEndTime(false)
                        setEndTimeValue("")
                      }}
                      className="px-2 text-gray-400 hover:text-red-500"
                      title="Quitar hora de despertar"
                    >
                      x
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-gray-500 italic">
                El sueno aun no tiene hora de despertar registrada
              </div>
            )}
          </div>
        )}

        {/* Sección 1: Selector de Tiempo - Usa componente compartido */}
        <DelaySelector
          label={
            eventType === "nap" && didNotSleep
              ? "¿Cuánto tiempo intentaron dormirlo?"
              : "¿Cuánto tiempo tardó en dormirse?"
          }
          value={selectedDelay}
          onChange={setSelectedDelay}
          min={0}
          max={120}
          disabled={isProcessing}
          zeroLabel="Se durmió inmediatamente"
          themeColor="blue"
          className="mt-4"
        />

        {/* Opción especial para siestas donde no se logró dormir */}
        {eventType === "nap" && mode === "create" && (
          <div className="mt-3 pt-3 border-t flex justify-center">
            <button
              type="button"
              onClick={() => {
                setDidNotSleep((prev) => !prev)
              }}
              disabled={isProcessing}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                didNotSleep
                  ? "bg-rose-100 border-rose-400 text-rose-700"
                  : "bg-white border-gray-200 text-gray-700 hover:bg-rose-50 hover:border-rose-300"
              )}
            >
              No se pudo dormir
            </button>
          </div>
        )}

        {/* Sección 2: Estado Emocional - Usa componente compartido */}
        <EmotionalStateSelector
          label={
            eventType === "nap" && didNotSleep
              ? `¿Cómo estaba ${childName} al intentar tomar la siesta?`
              : `¿Cómo estaba ${childName} al dormirse?`
          }
          value={emotionalState}
          onChange={setEmotionalState}
          disabled={isProcessing}
          themeColor="blue"
          className="border-t pt-4"
        />

        {/* Sección 3: Notas (Campo Guiado según Dra. Mariana) */}
        <div className="space-y-2 border-t pt-4">
          <div className="text-sm font-medium text-gray-700">
            Notas adicionales (opcional)
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isProcessing}
            placeholder="Añade detalles sobre cómo se durmió. ¿Lo arrullaron, tomó pecho, lo dejaron en la cuna despierto? ¿Hubo alguna dificultad?"
            className="w-full p-3 border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
          />
          <p className="text-xs text-gray-500">
            Esta información ayuda a entender mejor los patrones de sueño
          </p>
        </div>

        <div className="flex gap-2 mt-6">
          {mode === "create" && (
            <Button
              variant="outline"
              onClick={handleSkip}
              disabled={isProcessing}
              className="flex-1"
            >
              Omitir
            </Button>
          )}
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isProcessing}
            className={mode === "edit" ? "" : "hidden"}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedDelay === null || isProcessing}
            className="flex-1 bg-blue-500 hover:bg-blue-600"
          >
            {isProcessing 
              ? (mode === "edit" ? "Guardando..." : "Registrando...") 
              : (mode === "edit" ? "Guardar Cambios" : "Confirmar")}
          </Button>
        </div>

        <p className="text-xs text-gray-500 text-center mt-2">
          Esta información ayuda a entender los patrones de sueño
        </p>
      </DialogContent>
    </Dialog>
  )
}
