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
import { useEventRegistration, useModeContext } from '@/context/mode-context'
import { getQuickDefaults } from '@/lib/smart-defaults-engine'

interface FeedingButtonProps {
  childId: string
  childName: string
  childData?: { id: string; birthDate: string } // Para SmartDefaultsEngine
  eventHistory?: EventData[] // Para SmartDefaultsEngine
  onEventRegistered?: () => void
}

/**
 * Botón para registrar eventos de alimentación
 * VERSION 5.0 - Sistema de modo dual
 * 
 * LÓGICA DE EVENTOS MODO DUAL:
 * 
 * MODO SIMPLE:
 * - ALIMENTACIÓN: 1-click directo con defaults inteligentes
 * - Sin modal, registro inmediato con SmartDefaults
 * 
 * MODO AVANZADO:
 * - ALIMENTACIÓN: Modal PRIMERO → Confirmar datos → ENTONCES crear evento
 * - CANCELAR MODAL: NO crea evento (operación cancelada)
 * 
 * FLUJO MODO SIMPLE:
 * 1. Click "ALIMENTACIÓN" → Crear evento inmediatamente con SmartDefaults
 * 
 * FLUJO MODO AVANZADO:
 * 1. Click "ALIMENTACIÓN" → Modal FeedingModal
 * 2. Confirmar datos → Crear evento con todos los detalles
 * 3. Cerrar modal → NO crear evento
 */
export function FeedingButton({ 
  childId, 
  childName,
  childData,
  eventHistory = [],
  onEventRegistered 
}: FeedingButtonProps) {
  const { toast } = useToast()
  const [isProcessing, setIsProcessing] = useState(false)
  const { getCurrentTime } = useDevTime()
  const [showFeedingModal, setShowFeedingModal] = useState(false)
  
  // Hook para detectar modo dual
  const { shouldShowModal, getDefaults, isSimpleMode } = useEventRegistration()
  
  // Obtener preferencias del contexto principal
  const { preferences } = useModeContext()
  
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
      
      // Crear evento de alimentación con todos los datos del modal
      const eventData: Partial<EventData> = {
        childId,
        eventType: 'feeding',
        startTime: toLocalISOString(now),
        feedingType: feedingData.feedingType,
        feedingAmount: feedingData.feedingAmount,
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
          const unit = type === 'bottle' ? 'ml' : 'gr'
          return `${amount} ${unit} en ${duration} min`
        }
      }
      
      // Mostrar confirmación personalizada
      toast({
        title: "Alimentación registrada",
        description: `${childName}: ${getTypeText(feedingData.feedingType)} - ${getAmountText(feedingData.feedingType, feedingData.feedingAmount, feedingData.feedingDuration)}`
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
    if (isSimpleMode) {
      // MODO SIMPLE - Registro directo con SmartDefaults
      setIsProcessing(true)
      
      try {
        const now = getCurrentTime()
        let defaultValues = {}
        
        // Usar SmartDefaultsEngine si tenemos datos del niño
        if (childData) {
          try {
            defaultValues = getQuickDefaults(
              'feeding',
              childData,
              eventHistory,
              preferences
            )
          } catch (error) {
            console.warn('Error getting smart defaults, using static defaults:', error)
            defaultValues = getDefaults('feeding')
          }
        } else {
          // Fallback a defaults estáticos del contexto
          defaultValues = getDefaults('feeding')
        }
        
        // Crear evento inmediatamente con defaults
        const eventData: Partial<EventData> = {
          childId,
          eventType: 'feeding',
          startTime: toLocalISOString(now),
          ...defaultValues
        }
        
        const response = await fetch('/api/children/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(eventData)
        })
        
        if (!response.ok) {
          throw new Error('Error al registrar evento de alimentación')
        }
        
        // Mostrar confirmación simple
        const typeText = defaultValues.feedingType === 'breast' ? 'pecho' : 
                        defaultValues.feedingType === 'bottle' ? 'biberón' : 
                        defaultValues.feedingType === 'solids' ? 'sólidos' : 'alimentación'
        
        toast({
          title: "Alimentación registrada",
          description: `${childName}: ${typeText} - registro rápido completado`
        })
        
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
      
    } else {
      // MODO AVANZADO - Mostrar modal como antes
      setShowFeedingModal(true)
    }
  }
  
  return (
    <div className="w-full">
      <Button
        onClick={handleClick}
        disabled={isProcessing}
        className={cn(
          "w-full h-24 text-xl font-bold text-white shadow-lg",
          "transform transition-all duration-200 hover:scale-[1.02]",
          "bg-gradient-to-r",
          config.color
        )}
      >
        {isProcessing ? (
          <Loader2 className="w-6 h-6 mr-2 animate-spin" />
        ) : (
          <Icon className="w-6 h-6 mr-2" />
        )}
        {config.text}
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