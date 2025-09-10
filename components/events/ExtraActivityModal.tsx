"use client"

import React, { useState, useEffect } from 'react'
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
import { format } from 'date-fns'
import { useDevTime } from '@/context/dev-time-context'
import { useSession } from 'next-auth/react'

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
  mode?: 'create' | 'edit'
  initialData?: {
    activityDescription?: string
    activityDuration?: number
    activityImpact?: 'positive' | 'neutral' | 'negative'
    activityNotes?: string
    startTime?: string
    eventId?: string
  }
}

/**
 * Modal para capturar información de actividades extra
 * Registra descripción, duración, impacto en el sueño y notas
 */
export function ExtraActivityModal({
  open,
  onClose,
  onConfirm,
  childName,
  mode = 'create',
  initialData
}: ExtraActivityModalProps) {
  const { getCurrentTime } = useDevTime()
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'admin'
  const [activityDescription, setActivityDescription] = useState<string>(initialData?.activityDescription || '')
  const [activityDuration, setActivityDuration] = useState<number>(initialData?.activityDuration || 30) // Default 30 minutos
  const [activityImpact, setActivityImpact] = useState<'positive' | 'neutral' | 'negative'>(initialData?.activityImpact || 'neutral')
  const [activityNotes, setActivityNotes] = useState<string>(initialData?.activityNotes || '')
  const [eventDate, setEventDate] = useState<string>(() => {
    if (mode === 'edit' && initialData?.startTime) {
      return format(new Date(initialData.startTime), 'yyyy-MM-dd')
    }
    return format(getCurrentTime(), 'yyyy-MM-dd')
  })
  const [eventTime, setEventTime] = useState<string>(() => {
    if (mode === 'edit' && initialData?.startTime) {
      return format(new Date(initialData.startTime), 'HH:mm')
    }
    return format(getCurrentTime(), 'HH:mm')
  })
  const [isProcessing, setIsProcessing] = useState(false)

  // Inicializar con datos cuando se abre en modo edición
  useEffect(() => {
    if (open && mode === 'edit' && initialData) {
      setActivityDescription(initialData.activityDescription || '')
      setActivityDuration(initialData.activityDuration || 30)
      setActivityImpact(initialData.activityImpact || 'neutral')
      setActivityNotes(initialData.activityNotes || '')
      if (initialData.startTime) {
        setEventDate(format(new Date(initialData.startTime), 'yyyy-MM-dd'))
        setEventTime(format(new Date(initialData.startTime), 'HH:mm'))
      }
    }
  }, [open, mode, initialData])

  // Reset del formulario
  const resetForm = () => {
    if (mode === 'edit' && initialData) {
      // En modo edición, restaurar valores iniciales
      setActivityDescription(initialData.activityDescription || '')
      setActivityDuration(initialData.activityDuration || 30)
      setActivityImpact(initialData.activityImpact || 'neutral')
      setActivityNotes(initialData.activityNotes || '')
      if (initialData.startTime) {
        setEventDate(format(new Date(initialData.startTime), 'yyyy-MM-dd'))
        setEventTime(format(new Date(initialData.startTime), 'HH:mm'))
      }
    } else {
      // En modo creación, limpiar todo
      setActivityDescription('')
      setActivityDuration(30)
      setActivityImpact('neutral')
      setActivityNotes('')
      const now = getCurrentTime()
      setEventDate(format(now, 'yyyy-MM-dd'))
      setEventTime(format(now, 'HH:mm'))
    }
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
      activityImpact: isAdmin ? activityImpact : (mode === 'edit' && initialData?.activityImpact ? initialData.activityImpact : 'neutral'),
      activityNotes: activityNotes.trim()
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
            <Activity className="w-5 h-5 text-cyan-600" />
            {mode === 'edit' ? 'Editar Actividad Extra' : 'Registrar Actividad Extra'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'edit' 
              ? `Modifica los detalles de la actividad de ${childName}`
              : `Registra actividades que pueden afectar el sueño de ${childName}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Fecha y hora - Solo visible en modo edición */}
          {mode === 'edit' && (
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
                  Hora
                </Label>
                <Input
                  id="activity-time"
                  type="time"
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
          )}

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

          {/* Impacto en el sueño (solo visible para admin) */}
          {isAdmin && (
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
          )}

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
              ? (mode === 'edit' ? 'Guardando...' : 'Registrando...') 
              : (mode === 'edit' ? 'Guardar Cambios' : 'Registrar Actividad')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
