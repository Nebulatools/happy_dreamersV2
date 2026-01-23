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
import { Pill } from "lucide-react"
import { useDevTime } from "@/context/dev-time-context"
import { format } from "date-fns"

interface MedicationModalData {
  medicationName: string
  medicationDose: string
  medicationTime: string
  medicationNotes: string
}

interface MedicationModalProps {
  open: boolean
  onClose: () => void
  onConfirm: (data: MedicationModalData) => void
  childName: string
  mode?: "create" | "edit"
  initialData?: {
    medicationName?: string
    medicationDose?: string
    medicationTime?: string
    medicationNotes?: string
    startTime?: string
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
    }
  }, [open, mode, initialData])

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
    } else {
      // En modo creación, limpiar todo
      setMedicationName("")
      setMedicationDose("")
      const now = getCurrentTime()
      setMedicationTime(format(now, "HH:mm"))
      setMedicationNotes("")
      setEventDate(format(now, "yyyy-MM-dd"))
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

    await onConfirm(data)
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