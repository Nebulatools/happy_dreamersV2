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
import { Baby, Plus, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FeedingModalData, FeedingType } from './types'

interface FeedingModalProps {
  open: boolean
  onClose: () => void
  onConfirm: (data: FeedingModalData) => void
  childName: string
}

/**
 * Modal para capturar información de alimentación
 * Registra tipo, cantidad, duración, estado del bebé y notas
 */
export function FeedingModal({
  open,
  onClose,
  onConfirm,
  childName
}: FeedingModalProps) {
  const [feedingType, setFeedingType] = useState<FeedingType>('breast')
  const [feedingAmount, setFeedingAmount] = useState<number>(80) // Default 80ml
  const [feedingDuration, setFeedingDuration] = useState<number>(15) // Default 15 min
  const [babyState, setBabyState] = useState<'awake' | 'asleep'>('awake')
  const [feedingNotes, setFeedingNotes] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState(false)

  // Tipos de alimentación disponibles
  const feedingTypes = [
    { 
      value: 'breast' as FeedingType, 
      label: 'Pecho', 
      icon: '🤱',
      description: 'Lactancia materna',
      unit: 'minutos'
    },
    { 
      value: 'bottle' as FeedingType, 
      label: 'Biberón', 
      icon: '🍼',
      description: 'Leche o fórmula',
      unit: 'ml'
    },
    { 
      value: 'solids' as FeedingType, 
      label: 'Sólidos', 
      icon: '🥄',
      description: 'Comida sólida',
      unit: 'gr'
    }
  ]

  // Estados del bebé durante la alimentación
  const babyStates = [
    { value: 'awake' as const, label: 'Despierto', description: 'Alimentación normal' },
    { value: 'asleep' as const, label: 'Dormido', description: 'Toma nocturna' }
  ]

  // Configuración según tipo de alimentación
  const getAmountConfig = () => {
    switch (feedingType) {
      case 'breast':
        return { min: 5, max: 60, step: 5, unit: 'min', label: 'Duración' }
      case 'bottle':
        return { min: 10, max: 300, step: 10, unit: 'ml', label: 'Cantidad' }
      case 'solids':
        return { min: 5, max: 200, step: 5, unit: 'gr', label: 'Cantidad' }
    }
  }

  const amountConfig = getAmountConfig()

  // Ajustar cantidad/duración
  const adjustAmount = (increment: number) => {
    setFeedingAmount(prev => {
      const newValue = prev + increment
      return Math.max(amountConfig.min, Math.min(amountConfig.max, newValue))
    })
  }

  // Ajustar duración
  const adjustDuration = (increment: number) => {
    setFeedingDuration(prev => {
      const newValue = prev + increment
      return Math.max(1, Math.min(60, newValue))
    })
  }

  // Formatear el texto de cantidad
  const formatAmountText = (amount: number): string => {
    if (feedingType === 'breast') {
      return `${amount} minutos`
    }
    return `${amount} ${amountConfig.unit}`
  }

  // Formatear el texto de duración
  const formatDurationText = (minutes: number): string => {
    if (minutes >= 60) return `${Math.floor(minutes/60)}h ${minutes%60}min`
    return `${minutes} min`
  }

  const handleConfirm = async () => {
    setIsProcessing(true)
    
    const data: FeedingModalData = {
      feedingType,
      feedingAmount: feedingType === 'breast' ? feedingAmount : feedingAmount,
      feedingDuration,
      babyState,
      feedingNotes
    }
    
    await onConfirm(data)
    setIsProcessing(false)
    
    // Reset para próxima vez
    setFeedingType('breast')
    setFeedingAmount(80)
    setFeedingDuration(15)
    setBabyState('awake')
    setFeedingNotes('')
  }

  const handleCancel = () => {
    onClose()
    // Reset
    setFeedingType('breast')
    setFeedingAmount(80)
    setFeedingDuration(15)
    setBabyState('awake')
    setFeedingNotes('')
  }

  return (
    <Dialog 
      open={open} 
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          handleCancel()
        }
      }}
    >
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Baby className="w-5 h-5 text-green-500" />
            Registro de Alimentación
          </DialogTitle>
          <DialogDescription>
            Registra la alimentación de {childName}
          </DialogDescription>
        </DialogHeader>

        {/* Sección 1: Tipo de Alimentación */}
        <div className="space-y-3 mt-4">
          <div className="text-sm font-medium text-gray-700">
            Tipo de alimentación
          </div>
          <div className="grid grid-cols-3 gap-2">
            {feedingTypes.map(type => (
              <button
                key={type.value}
                type="button"
                onClick={() => {
                  setFeedingType(type.value)
                  // Ajustar cantidad por defecto según tipo
                  if (type.value === 'breast') setFeedingAmount(15)
                  else if (type.value === 'bottle') setFeedingAmount(80)
                  else setFeedingAmount(50)
                }}
                disabled={isProcessing}
                className={cn(
                  "p-3 rounded-lg border-2 transition-all text-center",
                  feedingType === type.value
                    ? "border-green-500 bg-green-50"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <div className="text-xl mb-1">{type.icon}</div>
                <div className={cn(
                  "font-medium text-sm",
                  feedingType === type.value ? "text-green-700" : "text-gray-700"
                )}>
                  {type.label}
                </div>
                <div className="text-xs text-gray-500">
                  {type.description}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Sección 2: Cantidad/Duración */}
        <div className="space-y-4 border-t pt-4">
          <div className="text-sm font-medium text-gray-700">
            {amountConfig.label}
          </div>
          
          <div className="flex items-center justify-center gap-4 py-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => adjustAmount(-amountConfig.step)}
              disabled={isProcessing || feedingAmount <= amountConfig.min}
              className="h-10 w-10 rounded-full"
            >
              <Minus className="h-4 w-4" />
            </Button>
            
            <div className="bg-green-50 border-2 border-green-200 rounded-xl px-6 py-3 min-w-[160px] text-center">
              <div className="text-2xl font-bold text-green-600">
                {formatAmountText(feedingAmount)}
              </div>
            </div>
            
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => adjustAmount(amountConfig.step)}
              disabled={isProcessing || feedingAmount >= amountConfig.max}
              className="h-10 w-10 rounded-full"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Sección 3: Duración de la Alimentación */}
        {feedingType !== 'breast' && (
          <div className="space-y-4 border-t pt-4">
            <div className="text-sm font-medium text-gray-700">
              Duración de la alimentación
            </div>
            
            <div className="flex items-center justify-center gap-4 py-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => adjustDuration(-5)}
                disabled={isProcessing || feedingDuration <= 1}
                className="h-10 w-10 rounded-full"
              >
                <Minus className="h-4 w-4" />
              </Button>
              
              <div className="bg-green-50 border-2 border-green-200 rounded-xl px-6 py-3 min-w-[140px] text-center">
                <div className="text-xl font-bold text-green-600">
                  {formatDurationText(feedingDuration)}
                </div>
              </div>
              
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => adjustDuration(5)}
                disabled={isProcessing || feedingDuration >= 60}
                className="h-10 w-10 rounded-full"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Sección 4: Estado del Bebé */}
        <div className="space-y-3 border-t pt-4">
          <div className="text-sm font-medium text-gray-700">
            Estado de {childName}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {babyStates.map(state => (
              <button
                key={state.value}
                type="button"
                onClick={() => setBabyState(state.value)}
                disabled={isProcessing}
                className={cn(
                  "p-3 rounded-lg border-2 transition-all text-center",
                  babyState === state.value
                    ? "border-green-500 bg-green-50"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <div className={cn(
                  "font-medium text-sm",
                  babyState === state.value ? "text-green-700" : "text-gray-700"
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

        {/* Sección 5: Notas */}
        <div className="space-y-2 border-t pt-4">
          <div className="text-sm font-medium text-gray-700">
            Notas adicionales (opcional)
          </div>
          <textarea
            value={feedingNotes}
            onChange={(e) => setFeedingNotes(e.target.value)}
            disabled={isProcessing}
            placeholder="¿Cómo fue la alimentación? ¿Se terminó todo? ¿Hubo alguna dificultad? ¿Cambio de posición?"
            className="w-full p-3 border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            rows={3}
            maxLength={500}
          />
          <p className="text-xs text-gray-500">
            Esta información ayuda a entender los patrones de alimentación
          </p>
        </div>

        {/* Botones de acción */}
        <div className="flex gap-2 mt-6">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isProcessing}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isProcessing}
            className="flex-1 bg-green-500 hover:bg-green-600"
          >
            {isProcessing ? 'Guardando...' : 'Confirmar'}
          </Button>
        </div>

        <p className="text-xs text-gray-500 text-center mt-2">
          Esta información ayuda a entender los patrones de alimentación
        </p>
      </DialogContent>
    </Dialog>
  )
}