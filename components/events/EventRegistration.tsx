"use client"

import React from 'react'
import { SleepButton } from './SleepButton'
import { FeedingButton } from './FeedingButton'
import { ModeProvider, ModeToggle, ModeHeader } from '@/components/mode'
import { useChildEventData } from '@/hooks/use-child-event-data'
import { Loader2 } from 'lucide-react'

interface EventRegistrationProps {
  childId: string
  childName: string
  onEventRegistered?: () => void
}

/**
 * Componente principal para registro de eventos
 * VERSION 5.0 - Sistema de modo dual (Simple/Avanzado)
 * 
 * CARACTERÍSTICAS v5.0:
 * - Sistema de sueño con modal de sleepDelay (v3.1)
 * - Sistema de alimentación con modal completo (v4.0)
 * - Sistema de modo dual: Simple (1-click) vs Avanzado (modal) - NUEVO v5.0
 * - Toggle de modo con persistencia de preferencias
 * - Smart defaults para modo simple usando SmartDefaultsEngine
 * - Hook integrado para obtener datos del niño y historial de eventos
 * - Sin emojis en UI
 */
export function EventRegistration({ 
  childId, 
  childName,
  onEventRegistered 
}: EventRegistrationProps) {
  // Hook para obtener datos del niño y eventos para SmartDefaultsEngine
  const { childData, eventHistory, isLoading, error, refetch } = useChildEventData(childId)
  
  // Función para refrescar datos después de registrar evento
  const handleEventRegistered = async () => {
    // Primero refrescar datos locales
    await refetch()
    // Luego notificar al componente padre
    onEventRegistered?.()
  }
  
  return (
    <ModeProvider>
      <div className="p-4 border rounded-lg bg-white">
        <h3 className="text-lg font-semibold mb-4">
          Registro de Eventos - {childName}
        </h3>
        
        {/* Header explicativo del modo actual */}
        <ModeHeader />
        
        {/* Toggle para cambiar entre modos */}
        <ModeToggle />
        
        {/* Mensaje de error si hay problemas cargando datos */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
            Error cargando datos del niño: {error}
          </div>
        )}
        
        <div className="space-y-4">
          {/* Botón principal de sueño - adaptado para modo dual */}
          <SleepButton
            childId={childId}
            childName={childName}
            childData={childData || undefined}
            eventHistory={eventHistory}
            onEventRegistered={handleEventRegistered}
          />
          
          {/* Botón de alimentación - adaptado para modo dual */}
          <FeedingButton
            childId={childId}
            childName={childName}
            childData={childData || undefined}
            eventHistory={eventHistory}
            onEventRegistered={handleEventRegistered}
          />
          
          {/* Estado de carga de datos para SmartDefaults */}
          {isLoading && (
            <div className="flex items-center justify-center py-2 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Cargando datos para modo inteligente...
            </div>
          )}
          
          <p className="text-sm text-gray-500 text-center">
            Sistema de eventos v5.0 - Modo Dual (Simple/Avanzado)
            {childData && (
              <span className="block text-xs mt-1">
                SmartDefaults activo • {eventHistory.length} eventos disponibles
              </span>
            )}
          </p>
        </div>
      </div>
    </ModeProvider>
  )
}