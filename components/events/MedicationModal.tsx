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
import { Pill, X, Plus } from "lucide-react"
import { useDevTime } from "@/context/dev-time-context"
import { useUser } from "@/context/UserContext"
import { format } from "date-fns"
import { buildLocalDate, dateToTimestamp, DEFAULT_TIMEZONE } from "@/lib/datetime"
import { EditOptions } from "./types"

interface MedicationModalData {
  medicationName: string
  medicationDose: string
  medicationTime: string
  medicationNotes: string
}

interface MedicationModalProps {
  open: boolean
  onClose: () => void
  onConfirm: (data: MedicationModalData, editOptions?: EditOptions) => void | Promise<void>
  childName: string
  mode?: "create" | "edit"
  initialData?: {
    medicationName?: string
    medicationDose?: string
    medicationTime?: string
    medicationNotes?: string
    startTime?: string
    endTime?: string
    eventId?: string
  }
}

/**
 * Modal para capturar información de medicamentos
 * Registra nombre, dosis, hora de administración y notas
 */
export function MedicationModal({
  open,
  onClose,
  onConfirm,
  childName,
  mode = "create",
  initialData,
}: MedicationModalProps) {
  const { getCurrentTime } = useDevTime()
  const { userData } = useUser()
  const timezone = userData?.timezone || DEFAULT_TIMEZONE
  const [medicationName, setMedicationName] = useState<string>(initialData?.medicationName || "")
  const [medicationDose, setMedicationDose] = useState<string>(initialData?.medicationDose || "")
  const [medicationTime, setMedicationTime] = useState<string>(() => {
    if (mode === "edit" && initialData?.medicationTime) {
      return initialData.medicationTime
    }
    // Inicializar con la hora actual
    const now = getCurrentTime()
    return format(now, "HH:mm")
  })
  const [medicationNotes, setMedicationNotes] = useState<string>(initialData?.medicationNotes || "")
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

  // Actualizar la hora cada vez que se abre el modal (solo en modo create)
  useEffect(() => {
    if (open && mode === "create") {
      const now = getCurrentTime()
      setMedicationTime(format(now, "HH:mm"))
    }
  }, [open, getCurrentTime, mode])

  // Inicializar con datos cuando se abre en modo edición
  useEffect(() => {
    if (open && mode === "edit" && initialData) {
      setMedicationName(initialData.medicationName || "")
      setMedicationDose(initialData.medicationDose || "")
      setMedicationTime(initialData.medicationTime || "")
      setMedicationNotes(initialData.medicationNotes || "")
      if (initialData.startTime) {
        setEventDate(format(new Date(initialData.startTime), "yyyy-MM-dd"))
      }
      // Inicializar endTime si existe
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
  }, [open, mode, initialData, getCurrentTime])

  // Reset del formulario
  const resetForm = () => {
    if (mode === "edit" && initialData) {
      // En modo edición, restaurar valores iniciales
      setMedicationName(initialData.medicationName || "")
      setMedicationDose(initialData.medicationDose || "")
      setMedicationTime(initialData.medicationTime || "")
      setMedicationNotes(initialData.medicationNotes || "")
      if (initialData.startTime) {
        setEventDate(format(new Date(initialData.startTime), "yyyy-MM-dd"))
      }
      // Restaurar endTime
      if (initialData.endTime) {
        setEndDate(format(new Date(initialData.endTime), "yyyy-MM-dd"))
        setEndTimeValue(format(new Date(initialData.endTime), "HH:mm"))
        setHasEndTime(true)
      } else {
        setHasEndTime(false)
      }
    } else {
      // En modo creación, limpiar todo
      setMedicationName("")
      setMedicationDose("")
      const now = getCurrentTime()
      setMedicationTime(format(now, "HH:mm"))
      setMedicationNotes("")
      setEventDate(format(now, "yyyy-MM-dd"))
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
    if (!medicationName.trim()) {
      return // No hacer nada si no hay nombre de medicamento
    }

    if (!medicationDose.trim()) {
      return // No hacer nada si no hay dosis
    }

    setIsProcessing(true)

    const data: MedicationModalData = {
      medicationName: medicationName.trim(),
      medicationDose: medicationDose.trim(),
      medicationTime,
      medicationNotes: medicationNotes.trim(),
    }

    // Construir editOptions para modo edición
    let editOptions: EditOptions | undefined
    if (mode === "edit") {
      editOptions = {}

      // startTime siempre se envía en modo edit
      if (eventDate && medicationTime) {
        const startDateObj = buildLocalDate(eventDate, medicationTime)
        editOptions.startTime = dateToTimestamp(startDateObj, timezone)
      }

      // endTime solo si está habilitado
      if (hasEndTime && endDate && endTimeValue) {
        const endDateObj = buildLocalDate(endDate, endTimeValue)
        editOptions.endTime = dateToTimestamp(endDateObj, timezone)
      } else if (!hasEndTime) {
        // Si se quitó el endTime, enviar null para eliminarlo
        editOptions.endTime = undefined
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
            <Pill className="w-5 h-5 text-amber-600" />
            {mode === "edit" ? "Editar Medicamento" : "Registrar Medicamento"}
          </DialogTitle>
          <DialogDescription>
            {mode === "edit" 
              ? `Modifica los detalles del medicamento de ${childName}`
              : `Registra el medicamento administrado a ${childName}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Nombre del medicamento */}
          <div className="space-y-2">
            <Label htmlFor="medication-name">
              Nombre del medicamento *
            </Label>
            <Input
              id="medication-name"
              value={medicationName}
              onChange={(e) => setMedicationName(e.target.value)}
              placeholder="Ej: Ibuprofeno, Paracetamol..."
              className="w-full"
              autoFocus
            />
          </div>

          {/* Dosis */}
          <div className="space-y-2">
            <Label htmlFor="medication-dose">
              Dosis *
            </Label>
            <Input
              id="medication-dose"
              value={medicationDose}
              onChange={(e) => setMedicationDose(e.target.value)}
              placeholder="Ej: 5ml, 2 gotas, 1 tableta..."
              className="w-full"
            />
          </div>

          {/* Fecha y hora de administración - Solo visible en modo edición */}
          {mode === "edit" && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="medication-date">
                  Fecha
                </Label>
                <Input
                  id="medication-date"
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="medication-time">
                  Hora
                </Label>
                <Input
                  id="medication-time"
                  type="time"
                  value={medicationTime}
                  onChange={(e) => setMedicationTime(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
          )}

          {/* Hora de fin - Solo visible en modo edición */}
          {mode === "edit" && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Hora de fin</Label>
              {!hasEndTime ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setHasEndTime(true)
                    // Inicializar con hora actual si no hay valor
                    if (!endTimeValue) {
                      const now = getCurrentTime()
                      setEndDate(format(now, "yyyy-MM-dd"))
                      setEndTimeValue(format(now, "HH:mm"))
                    }
                  }}
                  className="w-full border-dashed border-amber-300 text-amber-600 hover:bg-amber-50"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar hora de fin
                </Button>
              ) : (
                <div className="relative">
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      id="end-date"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full"
                    />
                    <Input
                      id="end-time"
                      type="time"
                      value={endTimeValue}
                      onChange={(e) => setEndTimeValue(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setHasEndTime(false)}
                    className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-gray-100 hover:bg-gray-200"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Hora de administración - Solo visible en modo creación */}
          {mode === "create" && (
            <div className="space-y-2">
              <Label htmlFor="medication-time">
                Hora de administración
              </Label>
              <Input
                id="medication-time"
                type="time"
                value={medicationTime}
                onChange={(e) => setMedicationTime(e.target.value)}
                className="w-full"
              />
            </div>
          )}

          {/* Notas adicionales */}
          <div className="space-y-2">
            <Label htmlFor="medication-notes">
              Notas adicionales (opcional)
            </Label>
            <Textarea
              id="medication-notes"
              value={medicationNotes}
              onChange={(e) => setMedicationNotes(e.target.value)}
              placeholder="Ej: Para la fiebre, antes de dormir..."
              className="w-full min-h-[80px]"
            />
          </div>

          {/* Indicación de campos requeridos */}
          <p className="text-xs text-gray-500">
            * Campos requeridos
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
            disabled={isProcessing || !medicationName.trim() || !medicationDose.trim()}
            className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white"
          >
            {isProcessing 
              ? (mode === "edit" ? "Guardando..." : "Registrando...") 
              : (mode === "edit" ? "Guardar Cambios" : "Registrar Medicamento")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}