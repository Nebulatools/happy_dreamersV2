"use client"

import React, { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { EventData } from './types'

interface EventRegistrationProps {
  childId: string
  childName: string
  onEventRegistered?: () => void
}

/**
 * Componente principal simple para registro de eventos
 * VERSION 1.0 - MVP Básico
 */
export function EventRegistration({ 
  childId, 
  childName,
  onEventRegistered 
}: EventRegistrationProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  // Por ahora, un botón simple que registra un evento de prueba
  const handleRegisterTestEvent = async () => {
    setIsLoading(true)
    
    try {
      const eventData: Partial<EventData> = {
        childId,
        eventType: 'note',
        startTime: new Date().toISOString(),
        emotionalState: 'neutral',
        notes: 'Evento de prueba - Sistema en reconstrucción'
      }

      const response = await fetch('/api/children/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData)
      })

      if (!response.ok) {
        throw new Error('Error al registrar evento')
      }

      toast({
        title: "✅ Evento registrado",
        description: "El evento de prueba se guardó correctamente"
      })

      onEventRegistered?.()
      
    } catch (error) {
      console.error('Error:', error)
      toast({
        title: "Error",
        description: "No se pudo registrar el evento",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-4 border rounded-lg bg-white">
      <h3 className="text-lg font-semibold mb-4">
        Registro de Eventos - {childName}
      </h3>
      
      <div className="space-y-4">
        {/* Botón básico de prueba */}
        <Button
          onClick={handleRegisterTestEvent}
          disabled={isLoading}
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          {isLoading ? 'Registrando...' : 'Registrar Evento de Prueba'}
        </Button>
        
        <p className="text-sm text-gray-500 text-center">
          Sistema de eventos en reconstrucción - v1.0 MVP
        </p>
      </div>
    </div>
  )
}