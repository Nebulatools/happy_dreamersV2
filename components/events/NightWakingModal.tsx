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
import { Moon } from "lucide-react"
import { cn } from "@/lib/utils"
import { buildLocalDate, dateToTimestamp } from "@/lib/datetime"
import { useDevTime } from "@/context/dev-time-context"
import { EventData, EditOptions, EmotionalState } from "./types"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { format } from "date-fns"
import { useUser } from "@/context/UserContext"
import { DelaySelector, EmotionalStateSelector } from "@/components/events/shared"

interface NightWakingModalProps {
  open: boolean
  onClose: () => void
  onConfirm: (awakeDelay: number, emotionalState: string, notes: string, editOptions?: EditOptions) => void | Promise<void>
  childName: string
  childId: string
  mode?: "create" | "edit"
  initialData?: {
    awakeDelay?: number
    emotionalState?: string
    notes?: string
    startTime?: string
    eventId?: string
  }
}

/**
 * Modal para capturar cuánto tiempo estuvo despierto el niño durante un despertar nocturno
 * Aparece inmediatamente cuando se detecta un despertar nocturno para registro completo
 */
export function NightWakingModal({
  open,
  onClose,
  onConfirm,
  childName,
  childId,
  mode = "create",
  initialData,
}: NightWakingModalProps) {
  const { getCurrentTime } = useDevTime()
  const { userData } = useUser()
  const [selectedDelay, setSelectedDelay] = useState<number>(initialData?.awakeDelay || 15) // Default 15 min
  const [emotionalState, setEmotionalState] = useState<EmotionalState>((initialData?.emotionalState as EmotionalState) || "tranquilo")
  const [notes, setNotes] = useState<string>(initialData?.notes || "")
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
  const [isProcessing, setIsProcessing] = useState(false)

  // Inicializar con datos cuando se abre en modo edición
  useEffect(() => {
    if (open && mode === "edit" && initialData) {
      setSelectedDelay(initialData.awakeDelay || 15)
      setEmotionalState((initialData.emotionalState as EmotionalState) || "tranquilo")
      setNotes(initialData.notes || "")
      if (initialData.startTime) {
        setEventDate(format(new Date(initialData.startTime), "yyyy-MM-dd"))
        setEventTime(format(new Date(initialData.startTime), "HH:mm"))
      }
    }
  }, [open, mode, initialData])

  // NOTA: quickOptions, adjustDelay, formatDelayText y emotionalStates
  // ahora vienen de los componentes compartidos DelaySelector y EmotionalStateSelector

  const handleConfirm = async () => {
    setIsProcessing(true)

    try {
      // En modo edicion, solo llamar al callback (el PUT lo maneja EventEditRouter)
      if (mode === "edit") {
        // Construir editOptions con fecha/hora editados
        // Opción B: endTime = startTime + awakeDelay (duración automática)
        let editOptions: EditOptions | undefined
        if (eventDate && eventTime) {
          const startDateObj = buildLocalDate(eventDate, eventTime)
          // Calcular endTime sumando awakeDelay minutos al startTime
          const endDateObj = new Date(startDateObj.getTime() + (selectedDelay * 60 * 1000))
          editOptions = {
            startTime: dateToTimestamp(startDateObj, userData?.timezone),
            endTime: dateToTimestamp(endDateObj, userData?.timezone)
          }
        }

        await onConfirm(selectedDelay, emotionalState, notes, editOptions)
        setIsProcessing(false)
        // Reset para proxima vez
        setSelectedDelay(15)
        setEmotionalState("tranquilo" as EmotionalState)
        setNotes("")
        return
      }

      // Modo create: Calcular startTime y endTime basado en awakeDelay
      const now = getCurrentTime()
      const startTime = new Date(now.getTime() - (selectedDelay * 60 * 1000)) // Restar awakeDelay minutos
      const endTime = now

      // Crear evento night_waking completo
      const eventData: Partial<EventData> = {
        childId,
        eventType: "night_waking",
        startTime: dateToTimestamp(startTime, userData.timezone),
        endTime: dateToTimestamp(endTime, userData.timezone),
        awakeDelay: selectedDelay,
        emotionalState,
        notes,
        duration: 0, // Sera calculado por el backend (endTime - startTime - awakeDelay)
      }

      const response = await fetch("/api/children/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventData),
      })

      if (!response.ok) {
        throw new Error("Error al registrar despertar nocturno")
      }

      // Llamar al callback original para actualizar la UI
      await onConfirm(selectedDelay, emotionalState, notes)

    } catch (error) {
      console.error("Error creando despertar nocturno:", error)
      // Si hay error, aun asi llamar al callback para que maneje el error
      await onConfirm(selectedDelay, emotionalState, notes)
    }

    setIsProcessing(false)
    // Reset para proxima vez
    setSelectedDelay(15)
    setEmotionalState("tranquilo" as EmotionalState)
    setNotes("")
  }

  const handleSkip = async () => {
    setIsProcessing(true)
    
    try {
      // Si omite, usamos valores por defecto (5 minutos, tranquilo, sin notas)
      const defaultDelay = 5
      const now = getCurrentTime()
      const startTime = new Date(now.getTime() - (defaultDelay * 60 * 1000))
      const endTime = now
      
      // Crear evento night_waking con valores por defecto
      const eventData: Partial<EventData> = {
        childId,
        eventType: "night_waking",
        startTime: dateToTimestamp(startTime, userData.timezone),
        endTime: dateToTimestamp(endTime, userData.timezone),
        awakeDelay: defaultDelay,
        emotionalState: "tranquilo",
        notes: "",
        duration: 0,
      }
      
      const response = await fetch("/api/children/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventData),
      })
      
      if (!response.ok) {
        throw new Error("Error al registrar despertar nocturno")
      }
      
      // Llamar al callback
      await onConfirm(defaultDelay, "tranquilo", "")
      
    } catch (error) {
      console.error("Error creando despertar nocturno:", error)
      // Si hay error, aún así llamar al callback
      await onConfirm(5, "tranquilo", "")
    }
    
    setIsProcessing(false)
    // Reset
    setSelectedDelay(15)
    setEmotionalState("tranquilo" as EmotionalState)
    setNotes("")
  }

  return (
    <Dialog 
      open={open} 
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          onClose()
        }
      }}
    >
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Moon className="w-5 h-5 text-indigo-500" />
            {mode === "edit" ? "Editar Despertar Nocturno" : "Despertar Nocturno"}
          </DialogTitle>
          <DialogDescription>
            {mode === "edit"
              ? `Modifica los detalles del despertar nocturno de ${childName}`
              : `¿Cuánto tiempo estuvo despierto ${childName}?`}
          </DialogDescription>
        </DialogHeader>

        {/* Fecha y hora - Solo visible en modo edición */}
        {mode === "edit" && (
          <div className="grid grid-cols-2 gap-2 pb-4 border-b">
            <div className="space-y-2">
              <Label htmlFor="waking-date">
                Fecha
              </Label>
              <Input
                id="waking-date"
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="waking-time">
                Hora
              </Label>
              <Input
                id="waking-time"
                type="time"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
        )}

        {/* Sección 1: Selector de Tiempo - Usa componente compartido */}
        <DelaySelector
          label="Tiempo que estuvo despierto"
          value={selectedDelay}
          onChange={setSelectedDelay}
          min={1}
          max={180}
          quickOptions={[5, 15, 30, 45]}
          disabled={isProcessing}
          zeroLabel="Muy poco tiempo"
          themeColor="red"
          className="mt-4"
        />

        {/* Sección 2: Estado Emocional - Usa componente compartido */}
        <EmotionalStateSelector
          label={`¿Cómo estaba ${childName} durante el despertar?`}
          value={emotionalState}
          onChange={setEmotionalState}
          disabled={isProcessing}
          themeColor="red"
          className="border-t pt-4"
        />

        {/* Sección 3: Notas sobre el despertar */}
        <div className="space-y-2 border-t pt-4">
          <div className="text-sm font-medium text-gray-700">
            ¿Qué ocurrió durante el despertar? (opcional)
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isProcessing}
            placeholder="¿Necesitó alimentación, cambio de pañal, consuelo? ¿Hubo algún ruido o molestia? ¿Cómo lo calmaste?"
            className="w-full p-3 border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            rows={3}
          />
          <p className="text-xs text-gray-500">
            Esta información ayuda a identificar patrones de despertar
          </p>
        </div>

        <div className="flex gap-2 mt-6">
          <Button
            variant="outline"
            onClick={handleSkip}
            disabled={isProcessing}
            className="flex-1"
          >
            Omitir
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isProcessing}
            className="flex-1 bg-indigo-500 hover:bg-indigo-600"
          >
            {isProcessing 
              ? (mode === "edit" ? "Guardando..." : "Registrando...") 
              : (mode === "edit" ? "Guardar Cambios" : "Confirmar")}
          </Button>
        </div>

        <p className="text-xs text-gray-500 text-center mt-2">
          Los despertares nocturnos son normales en bebés y niños pequeños
        </p>
      </DialogContent>
    </Dialog>
  )
}
