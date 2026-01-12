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
import { Activity } from "lucide-react"
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
    } else {
      // En modo creación, limpiar todo
      setActivityDescription("")
      setActivityNotes("")
      const now = getCurrentTime()
      setEventDate(format(now, "yyyy-MM-dd"))
      setActivityTime(format(now, "HH:mm"))
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
    // En modo edit: startTime = fecha/hora editada, endTime = ahora (momento de guardar)
    let editOptions: EditOptions | undefined
    if (mode === "edit" && eventDate && activityTime) {
      const startDateObj = buildLocalDate(eventDate, activityTime)
      const endDateObj = getCurrentTime()
      editOptions = {
        startTime: dateToTimestamp(startDateObj, timezone),
        endTime: dateToTimestamp(endDateObj, timezone)
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
