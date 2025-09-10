"use client"

import React, { useState } from 'react'
import { Baby, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { EventData, FeedingModalData } from './types'
import { toLocalISOString } from '@/lib/date-utils'
import { cn } from '@/lib/utils'
import { useDevTime } from '@/context/dev-time-context'
import { FeedingModal } from './FeedingModal'
import { useSleepState } from '@/hooks/use-sleep-state'

interface FeedingButtonProps {
  childId: string
  childName: string
  onEventRegistered?: () => void
}

/**
 * Botón para registrar eventos de alimentación
 * VERSION 1.0 - Registro directo con modal
 * 
 * LÓGICA DE EVENTOS:
 * - ALIMENTACIÓN: Modal PRIMERO → Confirmar datos → ENTONCES crear evento
 * - CANCELAR MODAL: NO crea evento (operación cancelada)
 * 
 * FLUJO:
 * 1. Click "ALIMENTACIÓN" → Modal FeedingModal
 * 2. Confirmar datos → Crear evento con todos los detalles
 * 3. Cerrar modal → NO crear evento
 */
export function FeedingButton({ 
  childId, 
  childName,
  onEventRegistered 
}: FeedingButtonProps) {
  const { toast } = useToast()
  const [isProcessing, setIsProcessing] = useState(false)
  const { getCurrentTime } = useDevTime()
  const [showFeedingModal, setShowFeedingModal] = useState(false)
  const { sleepState } = useSleepState(childId)
  
  // Configuración del botón
  const getButtonConfig = () => {
    return {
      text: 'ALIMENTACIÓN',
      icon: Baby,
      color: 'from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600'
    }
  }
  
  const config = getButtonConfig()
  const Icon = config.icon
  
  // Manejar confirmación del modal de alimentación
  const handleFeedingConfirm = async (feedingData: FeedingModalData) => {
    try {
      setIsProcessing(true)
      
      const now = getCurrentTime()
      
      // Detectar si el bebé está dormido actualmente
      const isBabySleeping = sleepState.status === 'sleeping' || sleepState.status === 'napping'
      
      // Utilidad: convertir onzas a mililitros
      const ozToMl = (oz: number) => Math.round(oz * 29.5735)

      // Crear evento de alimentación con todos los datos del modal
      const eventData: Partial<EventData> = {
        childId,
        eventType: 'feeding',
        startTime: toLocalISOString(now),
        feedingType: feedingData.feedingType,
        // Para biberón capturamos en onzas; almacenar en ml
        feedingAmount: feedingData.feedingType === 'bottle' ? ozToMl(feedingData.feedingAmount || 0) : feedingData.feedingAmount,
        feedingDuration: feedingData.feedingDuration,
        babyState: feedingData.babyState,
        feedingNotes: feedingData.feedingNotes,
        emotionalState: 'neutral' // Por defecto neutral para alimentación
      }
      
      const response = await fetch('/api/children/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData)
      })
      
      if (!response.ok) {
        throw new Error('Error al registrar evento de alimentación')
      }
      
      // Si el bebé está dormido, crear también un evento de night_feeding
      if (isBabySleeping) {
        const nightFeedingData: Partial<EventData> = {
          childId,
          eventType: 'night_feeding',
          startTime: toLocalISOString(now),
          feedingType: feedingData.feedingType,
          feedingAmount: feedingData.feedingType === 'bottle' ? ozToMl(feedingData.feedingAmount || 0) : feedingData.feedingAmount,
          feedingDuration: feedingData.feedingDuration,
          notes: `Alimentación nocturna - ${feedingData.feedingType === 'breast' ? 'Pecho' : feedingData.feedingType === 'bottle' ? 'Biberón' : 'Sólidos'}`,
          emotionalState: 'neutral'
        }
        
        const nightFeedingResponse = await fetch('/api/children/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(nightFeedingData)
        })
        
        if (!nightFeedingResponse.ok) {
          console.error('Error al registrar evento de alimentación nocturna')
        }
      }
      
      // Preparar mensaje personalizado según tipo
      const getTypeText = (type: string) => {
        switch (type) {
          case 'breast': return 'pecho'
          case 'bottle': return 'biberón'
          case 'solids': return 'sólidos'
          default: return 'alimentación'
        }
      }
      
      const getAmountText = (type: string, amount: number, duration: number) => {
        if (type === 'breast') {
          return `${amount} minutos`
        } else {
          const unit = type === 'bottle' ? 'oz' : 'gr'
          return `${amount} ${unit} en ${duration} min`
        }
      }
      
      // Mostrar confirmación personalizada
      toast({
        title: isBabySleeping ? "Alimentación nocturna registrada" : "Alimentación registrada",
        description: `${childName}: ${getTypeText(feedingData.feedingType)} - ${getAmountText(feedingData.feedingType, feedingData.feedingAmount, feedingData.feedingDuration)}${isBabySleeping ? ' (durante el sueño)' : ''}`
      })
      
      // Cerrar modal y limpiar
      setShowFeedingModal(false)
      
      // Notificar al padre para actualizar datos
      onEventRegistered?.()
      
    } catch (error) {
      console.error('Error registrando alimentación:', error)
      toast({
        title: "Error",
        description: "No se pudo registrar la alimentación",
        variant: "destructive"
      })
    } finally {
      setIsProcessing(false)
    }
  }
  
  // Manejar cuando se cierra el modal sin confirmar
  const handleModalClose = () => {
    // NO crear evento - simplemente cancelar la operación
    setShowFeedingModal(false)
    setIsProcessing(false)
  }
  
  // Manejar click del botón
  const handleClick = async () => {
    // Mostrar modal directamente
    setShowFeedingModal(true)
  }
  
  return (
    <div className="w-full h-full">
      <Button
        onClick={handleClick}
        disabled={isProcessing}
        className={cn(
          "w-full h-full min-h-[44px] text-xs md:text-sm font-bold text-white shadow-lg",
          "transform transition-all duration-200 hover:scale-[1.02]",
          "bg-gradient-to-r",
          config.color,
          "flex flex-col items-center justify-center gap-1 p-2"
        )}
      >
        {isProcessing ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Icon className="w-5 h-5" />
        )}
        <span className="text-xs">{config.text}</span>
      </Button>
      
      {/* Modal para capturar datos de alimentación */}
      <FeedingModal
        open={showFeedingModal}
        onClose={handleModalClose}
        onConfirm={handleFeedingConfirm}
        childName={childName}
      />
    </div>
  )
}
