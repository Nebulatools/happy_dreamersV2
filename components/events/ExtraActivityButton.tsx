"use client"

import React, { useState } from 'react'
import { Activity, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { EventData } from './types'
import { toLocalISOString } from '@/lib/date-utils'
import { cn } from '@/lib/utils'
import { useDevTime } from '@/context/dev-time-context'
import { ExtraActivityModal } from './ExtraActivityModal'

interface ExtraActivityButtonProps {
  childId: string
  childName: string
  onEventRegistered?: () => void
}

interface ExtraActivityModalData {
  activityDescription: string
  activityDuration: number // en minutos
  activityImpact?: 'positive' | 'neutral' | 'negative'
  activityNotes: string
}

/**
 * Botón para registrar eventos de actividad extra
 * VERSION 1.0 - Registro directo con modal
 * 
 * LÓGICA DE EVENTOS:
 * - ACTIVIDAD EXTRA: Modal PRIMERO → Confirmar datos → ENTONCES crear evento
 * - CANCELAR MODAL: NO crea evento (operación cancelada)
 * 
 * FLUJO:
 * 1. Click "ACTIVIDAD" → Modal ExtraActivityModal
 * 2. Confirmar datos → Crear evento con todos los detalles
 * 3. Cerrar modal → NO crear evento
 */
export function ExtraActivityButton({ 
  childId, 
  childName,
  onEventRegistered 
}: ExtraActivityButtonProps) {
  const { toast } = useToast()
  const [isProcessing, setIsProcessing] = useState(false)
  const { getCurrentTime } = useDevTime()
  const [showActivityModal, setShowActivityModal] = useState(false)
  
  // Configuración del botón
  const getButtonConfig = () => {
    return {
      text: 'ACTIVIDAD',
      icon: Activity,
      color: 'from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700'
    }
  }
  
  const config = getButtonConfig()
  const Icon = config.icon
  
  // Manejar confirmación del modal de actividad extra
  const handleActivityConfirm = async (activityData: ExtraActivityModalData) => {
    try {
      setIsProcessing(true)
      
      const now = getCurrentTime()
      
      // Crear evento de actividad extra con todos los datos en campos separados
      const impact = activityData.activityImpact ?? 'neutral'
      const eventData: Partial<EventData> = {
        childId,
        eventType: 'extra_activities',
        startTime: toLocalISOString(now),
        activityDescription: activityData.activityDescription,
        activityDuration: activityData.activityDuration,
        activityImpact: impact,
        activityNotes: activityData.activityNotes || '',
        // El campo notes puede combinar descripción y notas para compatibilidad
        notes: activityData.activityNotes ? 
          `${activityData.activityDescription} - ${activityData.activityNotes}` : 
          activityData.activityDescription,
        description: activityData.activityDescription, // Campo legacy para compatibilidad
        emotionalState: impact === 'positive' ? 'tranquilo' : 
                        impact === 'negative' ? 'inquieto' : 'neutral'
      }
      
      const response = await fetch('/api/children/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData)
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || `Error al registrar actividad extra (${response.status})`
        throw new Error(errorMessage)
      }
      
      // Mostrar confirmación personalizada
      toast({
        title: "Actividad registrada",
        description: `${childName}: ${activityData.activityDescription} (${activityData.activityDuration} min)`
      })
      
      // Cerrar modal y limpiar
      setShowActivityModal(false)
      
      // Notificar al padre para actualizar datos
      onEventRegistered?.()
      
    } catch (error) {
      console.error('Error registrando actividad extra:', error)
      toast({
        title: "Error",
        description: "No se pudo registrar la actividad",
        variant: "destructive"
      })
    } finally {
      setIsProcessing(false)
    }
  }
  
  // Manejar cuando se cierra el modal sin confirmar
  const handleModalClose = () => {
    // NO crear evento - simplemente cancelar la operación
    setShowActivityModal(false)
    setIsProcessing(false)
  }
  
  // Manejar click del botón
  const handleClick = async () => {
    // Mostrar modal directamente
    setShowActivityModal(true)
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
      
      {/* Modal para capturar datos de la actividad extra */}
      <ExtraActivityModal
        open={showActivityModal}
        onClose={handleModalClose}
        onConfirm={handleActivityConfirm}
        childName={childName}
      />
    </div>
  )
}
