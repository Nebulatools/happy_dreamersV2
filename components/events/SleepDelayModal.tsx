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
import { Clock, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SleepDelayModalProps {
  open: boolean
  onClose: () => void
  onConfirm: (delay: number) => void
  childName: string
  eventType: 'sleep' | 'nap'
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
  eventType
}: SleepDelayModalProps) {
  const [selectedDelay, setSelectedDelay] = useState<number | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const delayOptions = [
    { value: 0, label: "Se durmió inmediatamente" },
    { value: 15, label: "15 minutos" },
    { value: 30, label: "30 minutos" },
    { value: 45, label: "45 minutos" },
    { value: 60, label: "1 hora o más" },
  ]

  const handleConfirm = async () => {
    if (selectedDelay === null) return
    
    setIsProcessing(true)
    await onConfirm(selectedDelay)
    setIsProcessing(false)
    setSelectedDelay(null) // Reset para próxima vez
  }

  const handleSkip = () => {
    onConfirm(0) // Si omite, asumimos que se durmió rápido
    setSelectedDelay(null)
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-500" />
            {eventType === 'nap' ? 'Tiempo para dormir la siesta' : 'Tiempo para dormir'}
          </DialogTitle>
          <DialogDescription>
            ¿Cuánto tiempo tardó {childName} en dormirse?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 mt-4">
          {delayOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setSelectedDelay(option.value)}
              disabled={isProcessing}
              className={cn(
                "w-full p-4 rounded-lg border-2 transition-all",
                "hover:border-blue-300 hover:bg-blue-50",
                "flex items-center justify-between group",
                selectedDelay === option.value
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200"
              )}
            >
              <div className="flex items-center gap-3">
                <span className={cn(
                  "font-medium",
                  selectedDelay === option.value ? "text-blue-700" : "text-gray-700"
                )}>
                  {option.label}
                </span>
              </div>
              {selectedDelay === option.value && (
                <ChevronRight className="w-5 h-5 text-blue-500" />
              )}
            </button>
          ))}
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
            disabled={selectedDelay === null || isProcessing}
            className="flex-1 bg-blue-500 hover:bg-blue-600"
          >
            Confirmar
          </Button>
        </div>

        <p className="text-xs text-gray-500 text-center mt-2">
          Esta información ayuda a entender los patrones de sueño
        </p>
      </DialogContent>
    </Dialog>
  )
}