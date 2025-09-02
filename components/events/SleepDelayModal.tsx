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
import { Clock, ChevronLeft, ChevronRight, Plus, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { format } from 'date-fns'
import { useDevTime } from '@/context/dev-time-context'

interface SleepDelayModalProps {
  open: boolean
  onClose: () => void
  onConfirm: (delay: number, emotionalState: string, notes: string) => void
  childName: string
  eventType: 'sleep' | 'nap'
  mode?: 'create' | 'edit'
  initialData?: {
    sleepDelay?: number
    emotionalState?: string
    notes?: string
    startTime?: string
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
  mode = 'create',
  initialData
}: SleepDelayModalProps) {
  const { getCurrentTime } = useDevTime()
  const [selectedDelay, setSelectedDelay] = useState<number>(initialData?.sleepDelay || 15) // Default 15 min
  const [emotionalState, setEmotionalState] = useState<string>(initialData?.emotionalState || 'tranquilo') // Default tranquilo
  const [notes, setNotes] = useState<string>(initialData?.notes || '') // Notas opcionales
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
      setSelectedDelay(initialData.sleepDelay || 15)
      setEmotionalState(initialData.emotionalState || 'tranquilo')
      setNotes(initialData.notes || '')
      if (initialData.startTime) {
        setEventDate(format(new Date(initialData.startTime), 'yyyy-MM-dd'))
        setEventTime(format(new Date(initialData.startTime), 'HH:mm'))
      }
    }
  }, [open, mode, initialData])

  // Opciones rápidas predefinidas para fácil selección
  const quickOptions = [0, 15, 30, 45]
  
  // Incrementar/decrementar en pasos de 5 minutos
  const adjustDelay = (increment: number) => {
    setSelectedDelay(prev => {
      const newValue = prev + increment
      // Limitar entre 0 y 120 minutos (2 horas)
      return Math.max(0, Math.min(120, newValue))
    })
  }
  
  // Formatear el texto del tiempo
  const formatDelayText = (minutes: number): string => {
    if (minutes === 0) return "Se durmió inmediatamente"
    if (minutes === 60) return "1 hora"
    if (minutes > 60) return `${Math.floor(minutes/60)}h ${minutes%60}min`
    return `${minutes} minutos`
  }

  // Estados emocionales disponibles según registroeventos.md
  const emotionalStates = [
    { value: 'tranquilo', label: 'Tranquilo', description: 'Se durmió con calma' },
    { value: 'inquieto', label: 'Inquieto', description: 'Algo de dificultad' },
    { value: 'alterado', label: 'Alterado', description: 'Muy difícil dormirse' }
  ]

  const handleConfirm = async () => {
    setIsProcessing(true)
    await onConfirm(selectedDelay, emotionalState, notes)
    setIsProcessing(false)
    // Reset para próxima vez
    setSelectedDelay(15)
    setEmotionalState('tranquilo')
    setNotes('')
  }

  const handleSkip = () => {
    // Si omite, simplemente cerramos el modal sin confirmar
    onClose()
    // Reset para próxima vez
    setSelectedDelay(15)
    setEmotionalState('tranquilo')
    setNotes('')
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
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-500" />
            {mode === 'edit' 
              ? (eventType === 'nap' ? 'Editar Siesta' : 'Editar Sueño')
              : (eventType === 'nap' ? 'Tiempo para dormir la siesta' : 'Tiempo para dormir')}
          </DialogTitle>
          <DialogDescription>
            {mode === 'edit'
              ? `Modifica los detalles del sueño de ${childName}`
              : `¿Cuánto tiempo tardó ${childName} en dormirse?`}
          </DialogDescription>
        </DialogHeader>

        {/* Fecha y hora - Solo visible en modo edición */}
        {mode === 'edit' && (
          <div className="grid grid-cols-2 gap-2 pb-4 border-b">
            <div className="space-y-2">
              <Label htmlFor="sleep-date">
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
              <Label htmlFor="sleep-time">
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
        )}

        {/* Sección 1: Selector de Tiempo con Flechas */}
        <div className="space-y-4 mt-4">
          <div className="text-sm font-medium text-gray-700">
            ¿Cuánto tiempo tardó en dormirse?
          </div>
          
          {/* Control principal con flechas */}
          <div className="flex items-center justify-center gap-4 py-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => adjustDelay(-5)}
              disabled={isProcessing || selectedDelay <= 0}
              className="h-10 w-10 rounded-full"
            >
              <Minus className="h-4 w-4" />
            </Button>
            
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl px-6 py-3 min-w-[180px] text-center">
              <div className="text-2xl font-bold text-blue-600">
                {formatDelayText(selectedDelay)}
              </div>
            </div>
            
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => adjustDelay(5)}
              disabled={isProcessing || selectedDelay >= 120}
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
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                )}
              >
                {minutes === 0 ? "Inmediato" : `${minutes}min`}
              </button>
            ))}
          </div>
        </div>

        {/* Sección 2: Estado Emocional */}
        <div className="space-y-3 border-t pt-4">
          <div className="text-sm font-medium text-gray-700">
            ¿Cómo estaba {childName} al dormirse?
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
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <div className={cn(
                  "font-medium text-sm",
                  emotionalState === state.value ? "text-blue-700" : "text-gray-700"
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
          {mode === 'create' && (
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
            className={mode === 'edit' ? '' : 'hidden'}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedDelay === null || isProcessing}
            className="flex-1 bg-blue-500 hover:bg-blue-600"
          >
            {isProcessing 
              ? (mode === 'edit' ? 'Guardando...' : 'Registrando...') 
              : (mode === 'edit' ? 'Guardar Cambios' : 'Confirmar')}
          </Button>
        </div>

        <p className="text-xs text-gray-500 text-center mt-2">
          Esta información ayuda a entender los patrones de sueño
        </p>
      </DialogContent>
    </Dialog>
  )
}