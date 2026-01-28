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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Activity, Plus, X } from "lucide-react"
import { format } from "date-fns"
import { useDevTime } from "@/context/dev-time-context"
import { useUser } from "@/context/UserContext"
import { buildLocalDate, dateToTimestamp, DEFAULT_TIMEZONE } from "@/lib/datetime"
import { EditOptions } from "./types"

export interface ExtraActivityModalData {
  activityDescription: string
  activityImpact?: "positive" | "neutral" | "negative"
  activityNotes: string
  activityTime: string // Hora de inicio (HH:mm)
}

interface ExtraActivityModalProps {
  open: boolean
  onClose: () => void
  onConfirm: (data: ExtraActivityModalData, editOptions?: EditOptions) => void | Promise<void>
  childName: string
  mode?: "create" | "edit"
  initialData?: {
    activityDescription?: string
    activityDuration?: number
    activityImpact?: "positive" | "neutral" | "negative"
    activityNotes?: string
    startTime?: string
    endTime?: string
    eventId?: string
  }
}

/**
 * Modal para capturar información de actividades extra
 * Registra descripción, duración y notas adicionales
 */
export function ExtraActivityModal({
  open,
  onClose,
  onConfirm,
  childName,
  mode = "create",
  initialData,
}: ExtraActivityModalProps) {
  const { getCurrentTime } = useDevTime()
  const { userData } = useUser()
  const timezone = userData?.timezone || DEFAULT_TIMEZONE
  const [activityDescription, setActivityDescription] = useState<string>(initialData?.activityDescription || "")
  const [activityNotes, setActivityNotes] = useState<string>(initialData?.activityNotes || "")
  // Hora de inicio: cuando empezo la actividad
  const [activityTime, setActivityTime] = useState<string>(() => {
    if (mode === "edit" && initialData?.startTime) {
      return format(new Date(initialData.startTime), "HH:mm")
    }
    return format(getCurrentTime(), "HH:mm")
  })
  const [eventDate, setEventDate] = useState<string>(() => {
    if (mode === "edit" && initialData?.startTime) {
      return format(new Date(initialData.startTime), "yyyy-MM-dd")
    }
    return format(getCurrentTime(), "yyyy-MM-dd")
  })
  // Estados para hora de fin (endTime) - solo en modo edicion
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

  // Inicializar con datos cuando se abre en modo edición
  useEffect(() => {
    if (open && mode === "edit" && initialData) {
      setActivityDescription(initialData.activityDescription || "")
      setActivityNotes(initialData.activityNotes || "")
      if (initialData.startTime) {
        setEventDate(format(new Date(initialData.startTime), "yyyy-MM-dd"))
        setActivityTime(format(new Date(initialData.startTime), "HH:mm"))
      }
      // Inicializar hora de fin si existe
      if (initialData.endTime) {
        setEndDate(format(new Date(initialData.endTime), "yyyy-MM-dd"))
        setEndTimeValue(format(new Date(initialData.endTime), "HH:mm"))
        setHasEndTime(true)
      } else {
        setEndDate(format(getCurrentTime(), "yyyy-MM-dd"))
        setEndTimeValue("")
        setHasEndTime(false)
      }
    }
    // En modo create, actualizar la hora al abrir el modal
    if (open && mode === "create") {
      setActivityTime(format(getCurrentTime(), "HH:mm"))
    }
  }, [open, mode, initialData, getCurrentTime])

  // Reset del formulario
  const resetForm = () => {
    if (mode === "edit" && initialData) {
      // En modo edición, restaurar valores iniciales
      setActivityDescription(initialData.activityDescription || "")
      setActivityNotes(initialData.activityNotes || "")
      if (initialData.startTime) {
        setEventDate(format(new Date(initialData.startTime), "yyyy-MM-dd"))
        setActivityTime(format(new Date(initialData.startTime), "HH:mm"))
      }
      // Restaurar endTime si existe
      if (initialData.endTime) {
        setEndDate(format(new Date(initialData.endTime), "yyyy-MM-dd"))
        setEndTimeValue(format(new Date(initialData.endTime), "HH:mm"))
        setHasEndTime(true)
      } else {
        setEndDate(format(getCurrentTime(), "yyyy-MM-dd"))
        setEndTimeValue("")
        setHasEndTime(false)
      }
    } else {
      // En modo creación, limpiar todo
      setActivityDescription("")
      setActivityNotes("")
      const now = getCurrentTime()
      setEventDate(format(now, "yyyy-MM-dd"))
      setActivityTime(format(now, "HH:mm"))
      setEndDate(format(now, "yyyy-MM-dd"))
      setEndTimeValue("")
      setHasEndTime(false)
    }
  }

  // Manejar cierre del modal
  const handleClose = () => {
    resetForm()
    onClose()
  }

  // Manejar confirmación
  const handleConfirm = async () => {
    // Validación básica
    if (!activityDescription.trim()) {
      return // No hacer nada si no hay descripción
    }

    setIsProcessing(true)

    const data: ExtraActivityModalData = {
      activityDescription: activityDescription.trim(),
      activityImpact: initialData?.activityImpact ?? "neutral",
      activityNotes: activityNotes.trim(),
      activityTime, // Hora de inicio
    }

    // Construir editOptions solo en modo edición
    let editOptions: EditOptions | undefined
    if (mode === "edit" && eventDate && activityTime) {
      const startDateObj = buildLocalDate(eventDate, activityTime)
      editOptions = {
        startTime: dateToTimestamp(startDateObj, timezone),
      }

      // Construir endTime si existe
      if (hasEndTime && endTimeValue) {
        const endDateTime = buildLocalDate(endDate, endTimeValue)
        editOptions.endTime = dateToTimestamp(endDateTime, timezone)
      }
    }

    await onConfirm(data, editOptions)
    setIsProcessing(false)
    resetForm()
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[425px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-600" />
            {mode === "edit" ? "Editar Actividad Extra" : "Registrar Actividad Extra"}
          </DialogTitle>
          <DialogDescription>
            {mode === "edit" 
              ? `Modifica los detalles de la actividad de ${childName}`
              : `Registra actividades que pueden afectar el sueño de ${childName}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Hora de inicio - Visible en ambos modos */}
          {mode === "edit" ? (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="activity-date">
                  Fecha
                </Label>
                <Input
                  id="activity-date"
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="activity-time">
                  Hora de inicio
                </Label>
                <Input
                  id="activity-time"
                  type="time"
                  value={activityTime}
                  onChange={(e) => setActivityTime(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="activity-time">
                Hora de inicio
              </Label>
              <Input
                id="activity-time"
                type="time"
                value={activityTime}
                onChange={(e) => setActivityTime(e.target.value)}
                className="w-full text-lg text-center"
              />
              <p className="text-xs text-gray-500 text-center">Cuando empezo la actividad</p>
            </div>
          )}

          {/* Hora de fin - Solo visible en modo edición */}
          {mode === "edit" && (
            <div className="space-y-3 pb-4 border-b">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-gray-700">
                  Hora de fin
                </div>
                {!hasEndTime && (
                  <button
                    type="button"
                    onClick={() => {
                      setHasEndTime(true)
                      setEndDate(eventDate)
                      setEndTimeValue(format(getCurrentTime(), "HH:mm"))
                    }}
                    className="text-xs text-cyan-600 hover:text-cyan-700 underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Agregar hora de fin
                  </button>
                )}
              </div>
              {hasEndTime ? (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500">Fecha</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500">Hora</label>
                    <div className="flex gap-1">
                      <input
                        type="time"
                        value={endTimeValue}
                        onChange={(e) => setEndTimeValue(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setHasEndTime(false)
                          setEndTimeValue("")
                        }}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                        title="Quitar hora de fin"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-400">
                  Sin hora de fin registrada
                </p>
              )}
            </div>
          )}

          {/* Descripción de la actividad */}
          <div className="space-y-2">
            <Label htmlFor="activity-description">
              Descripcion de la actividad *
            </Label>
            <Input
              id="activity-description"
              value={activityDescription}
              onChange={(e) => setActivityDescription(e.target.value)}
              placeholder="Ej: Fiesta de cumpleaños, visita con tu coach del sueño, paseo..."
              className="w-full"
              autoFocus
            />
          </div>
          {/* Notas adicionales */}
          <div className="space-y-2">
            <Label htmlFor="activity-notes">
              Notas adicionales (opcional)
            </Label>
            <Textarea
              id="activity-notes"
              value={activityNotes}
              onChange={(e) => setActivityNotes(e.target.value)}
              placeholder="Ej: Se mostró muy emocionado, comió muchos dulces..."
              className="w-full min-h-[80px]"
            />
          </div>

          {/* Indicación de campos requeridos */}
          <p className="text-xs text-gray-500">
            * Campo requerido
          </p>
        </div>

        <div className="flex justify-between gap-3">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isProcessing}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isProcessing || !activityDescription.trim()}
            className="flex-1 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white"
          >
            {isProcessing 
              ? (mode === "edit" ? "Guardando..." : "Registrando...") 
              : (mode === "edit" ? "Guardar Cambios" : "Registrar Actividad")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
