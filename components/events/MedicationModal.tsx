"use client"

import React, { useState } from 'react'
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
import { Pill } from 'lucide-react'
import { useDevTime } from '@/context/dev-time-context'
import { format } from 'date-fns'

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
}

/**
 * Modal para capturar información de medicamentos
 * Registra nombre, dosis, hora de administración y notas
 */
export function MedicationModal({
  open,
  onClose,
  onConfirm,
  childName
}: MedicationModalProps) {
  const { getCurrentTime } = useDevTime()
  const [medicationName, setMedicationName] = useState<string>('')
  const [medicationDose, setMedicationDose] = useState<string>('')
  const [medicationTime, setMedicationTime] = useState<string>(() => {
    // Inicializar con la hora actual
    const now = getCurrentTime()
    return format(now, 'HH:mm')
  })
  const [medicationNotes, setMedicationNotes] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState(false)

  // Reset del formulario
  const resetForm = () => {
    setMedicationName('')
    setMedicationDose('')
    const now = getCurrentTime()
    setMedicationTime(format(now, 'HH:mm'))
    setMedicationNotes('')
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
      medicationNotes: medicationNotes.trim()
    }

    await onConfirm(data)
    setIsProcessing(false)
    resetForm()
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pill className="w-5 h-5 text-purple-600" />
            Registrar Medicamento
          </DialogTitle>
          <DialogDescription>
            Registra el medicamento administrado a {childName}
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

          {/* Hora de administración */}
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
            className="flex-1 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white"
          >
            {isProcessing ? 'Registrando...' : 'Registrar Medicamento'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}