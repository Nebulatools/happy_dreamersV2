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
import { Moon, Plus, Minus } from "lucide-react"
import { cn } from "@/lib/utils"
import { dateToTimestamp } from "@/lib/datetime"
import { useDevTime } from "@/context/dev-time-context"
import { EventData } from "./types"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { format } from "date-fns"
import { useUser } from "@/context/UserContext"

interface NightWakingModalProps {
  open: boolean
  onClose: () => void
  onConfirm: (awakeDelay: number, emotionalState: string, notes: string) => void
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
  const [emotionalState, setEmotionalState] = useState<string>(initialData?.emotionalState || "tranquilo")
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
      setEmotionalState(initialData.emotionalState || "tranquilo")
      setNotes(initialData.notes || "")
      if (initialData.startTime) {
        setEventDate(format(new Date(initialData.startTime), "yyyy-MM-dd"))
        setEventTime(format(new Date(initialData.startTime), "HH:mm"))
      }
    }
  }, [open, mode, initialData])

  // Opciones rápidas predefinidas para despertares nocturnos
  const quickOptions = [5, 15, 30, 45]
  
  // Incrementar/decrementar en pasos de 5 minutos
  const adjustDelay = (increment: number) => {
    setSelectedDelay(prev => {
      const newValue = prev + increment
      // Limitar entre 1 y 180 minutos (3 horas)
      return Math.max(1, Math.min(180, newValue))
    })
  }
  
  // Formatear el texto del tiempo
  const formatDelayText = (minutes: number): string => {
    if (minutes < 5) return "Muy poco tiempo"
    if (minutes === 60) return "1 hora"
    if (minutes > 60) return `${Math.floor(minutes/60)}h ${minutes%60}min`
    return `${minutes} minutos`
  }

  // Estados emocionales disponibles para despertares nocturnos
  const emotionalStates = [
    { value: "tranquilo", label: "Tranquilo", description: "Se calmó fácilmente" },
    { value: "inquieto", label: "Inquieto", description: "Costó calmarlo" },
    { value: "alterado", label: "Alterado", description: "Muy difícil de calmar" },
  ]

  const handleConfirm = async () => {
    setIsProcessing(true)
    
    try {
      // Calcular startTime y endTime basado en awakeDelay
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
        duration: 0, // Será calculado por el backend (endTime - startTime - awakeDelay)
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
      // Si hay error, aún así llamar al callback para que maneje el error
      await onConfirm(selectedDelay, emotionalState, notes)
    }
    
    setIsProcessing(false)
    // Reset para próxima vez
    setSelectedDelay(15)
    setEmotionalState("tranquilo")
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
    setEmotionalState("tranquilo")
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

        {/* Sección 1: Selector de Tiempo con Flechas */}
        <div className="space-y-4 mt-4">
          <div className="text-sm font-medium text-gray-700">
            Tiempo que estuvo despierto
          </div>
          
          {/* Control principal con flechas */}
          <div className="flex items-center justify-center gap-4 py-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => adjustDelay(-5)}
              disabled={isProcessing || selectedDelay <= 1}
              className="h-10 w-10 rounded-full"
            >
              <Minus className="h-4 w-4" />
            </Button>
            
            <div className="bg-indigo-50 border-2 border-indigo-200 rounded-xl px-6 py-3 min-w-[180px] text-center">
              <div className="text-2xl font-bold text-indigo-600">
                {formatDelayText(selectedDelay)}
              </div>
              <div className="text-xs text-indigo-500 mt-1">
                estuvo despierto
              </div>
            </div>
            
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => adjustDelay(5)}
              disabled={isProcessing || selectedDelay >= 180}
              className="h-10 w-10 rounded-full"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Opciones rápidas */}
          <div className="flex justify-center gap-2">
            <span className="text-xs text-gray-500">Opciones rápidas:</span>
            {quickOptions.map(minutes => (
              <button
                key={minutes}
                type="button"
                onClick={() => setSelectedDelay(minutes)}
                disabled={isProcessing}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                  selectedDelay === minutes
                    ? "bg-indigo-500 text-white"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                )}
              >
                {minutes}min
              </button>
            ))}
          </div>
        </div>

        {/* Sección 2: Estado Emocional */}
        <div className="space-y-3 border-t pt-4">
          <div className="text-sm font-medium text-gray-700">
            ¿Cómo estaba {childName} durante el despertar?
          </div>
          <div className="grid grid-cols-3 gap-2">
            {emotionalStates.map(state => (
              <button
                key={state.value}
                type="button"
                onClick={() => setEmotionalState(state.value)}
                disabled={isProcessing}
                className={cn(
                  "p-3 rounded-lg border-2 transition-all text-center",
                  emotionalState === state.value
                    ? "border-indigo-500 bg-indigo-50"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <div className={cn(
                  "font-medium text-sm",
                  emotionalState === state.value ? "text-indigo-700" : "text-gray-700"
                )}>
                  {state.label}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {state.description}
                </div>
              </button>
            ))}
          </div>
        </div>

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
