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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Activity, Plus, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ExtraActivityModalData {
  activityDescription: string
  activityDuration: number // en minutos
  activityImpact: 'positive' | 'neutral' | 'negative'
  activityNotes: string
}

interface ExtraActivityModalProps {
  open: boolean
  onClose: () => void
  onConfirm: (data: ExtraActivityModalData) => void
  childName: string
}

/**
 * Modal para capturar información de actividades extra
 * Registra descripción, duración, impacto en el sueño y notas
 */
export function ExtraActivityModal({
  open,
  onClose,
  onConfirm,
  childName
}: ExtraActivityModalProps) {
  const [activityDescription, setActivityDescription] = useState<string>('')
  const [activityDuration, setActivityDuration] = useState<number>(30) // Default 30 minutos
  const [activityImpact, setActivityImpact] = useState<'positive' | 'neutral' | 'negative'>('neutral')
  const [activityNotes, setActivityNotes] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState(false)

  // Reset del formulario
  const resetForm = () => {
    setActivityDescription('')
    setActivityDuration(30)
    setActivityImpact('neutral')
    setActivityNotes('')
  }

  // Manejar cierre del modal
  const handleClose = () => {
    resetForm()
    onClose()
  }

  // Ajustar duración
  const adjustDuration = (increment: number) => {
    setActivityDuration(prev => {
      const newValue = prev + increment
      return Math.max(5, Math.min(180, newValue)) // Entre 5 y 180 minutos
    })
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
      activityDuration,
      activityImpact,
      activityNotes: activityNotes.trim()
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
            <Activity className="w-5 h-5 text-cyan-600" />
            Registrar Actividad Extra
          </DialogTitle>
          <DialogDescription>
            Registra actividades que pueden afectar el sueño de {childName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Descripción de la actividad */}
          <div className="space-y-2">
            <Label htmlFor="activity-description">
              Descripción de la actividad *
            </Label>
            <Input
              id="activity-description"
              value={activityDescription}
              onChange={(e) => setActivityDescription(e.target.value)}
              placeholder="Ej: Fiesta de cumpleaños, visita al doctor, paseo..."
              className="w-full"
              autoFocus
            />
          </div>

          {/* Duración de la actividad */}
          <div className="space-y-2">
            <Label>
              Duración de la actividad
            </Label>
            <div className="flex items-center justify-center gap-4">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => adjustDuration(-15)}
                className="h-10 w-10"
              >
                <Minus className="h-4 w-4" />
              </Button>
              
              <div className="text-center">
                <div className="text-2xl font-bold">{activityDuration}</div>
                <div className="text-sm text-gray-500">minutos</div>
              </div>
              
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => adjustDuration(15)}
                className="h-10 w-10"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Impacto en el sueño */}
          <div className="space-y-2">
            <Label>
              Impacto esperado en el sueño
            </Label>
            <RadioGroup value={activityImpact} onValueChange={(value) => setActivityImpact(value as any)}>
              <div className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-50">
                <RadioGroupItem value="positive" id="positive" />
                <Label htmlFor="positive" className="flex-1 cursor-pointer">
                  <span className="font-medium text-green-600">Positivo</span>
                  <span className="text-sm text-gray-500 block">Puede ayudar a dormir mejor</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-50">
                <RadioGroupItem value="neutral" id="neutral" />
                <Label htmlFor="neutral" className="flex-1 cursor-pointer">
                  <span className="font-medium text-gray-600">Neutral</span>
                  <span className="text-sm text-gray-500 block">Sin impacto esperado</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-50">
                <RadioGroupItem value="negative" id="negative" />
                <Label htmlFor="negative" className="flex-1 cursor-pointer">
                  <span className="font-medium text-red-600">Negativo</span>
                  <span className="text-sm text-gray-500 block">Puede dificultar el sueño</span>
                </Label>
              </div>
            </RadioGroup>
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
            {isProcessing ? 'Registrando...' : 'Registrar Actividad'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}