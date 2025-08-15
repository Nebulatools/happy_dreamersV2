"use client"

import React from 'react'
import { EventRegistrationModeProvider, useEventRegistrationMode } from '@/context/event-registration-mode-context'
import { EventRegistration } from './EventRegistration'
import { ManualEventForm } from './manual/ManualEventForm'
import { Button } from '@/components/ui/button'
import { Zap, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EventRegistrationDualModeProps {
  childId: string
  childName: string
  onEventRegistered?: () => void
}

/**
 * Contenedor interno que usa el contexto
 */
function EventRegistrationContent({ childId, childName, onEventRegistered }: EventRegistrationDualModeProps) {
  const { mode, toggleMode } = useEventRegistrationMode()
  
  return (
    <div className="space-y-4">
      {/* Switch de modo */}
      <div className="flex items-center justify-center">
        <div className="bg-gray-100 rounded-lg p-1 flex gap-1">
          <Button
            variant={mode === 'simple' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => mode === 'manual' && toggleMode()}
            className={cn(
              "flex items-center gap-2",
              mode === 'simple' && "bg-blue-500 text-white hover:bg-blue-600"
            )}
          >
            <Zap className="w-4 h-4" />
            Modo Simple
          </Button>
          
          <Button
            variant={mode === 'manual' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => mode === 'simple' && toggleMode()}
            className={cn(
              "flex items-center gap-2",
              mode === 'manual' && "bg-gray-700 text-white hover:bg-gray-800"
            )}
          >
            <Settings className="w-4 h-4" />
            Modo Manual
          </Button>
        </div>
      </div>
      
      {/* Indicador del modo actual */}
      <div className={cn(
        "text-center text-sm px-3 py-2 rounded-lg",
        mode === 'simple' 
          ? "bg-blue-50 text-blue-800"
          : "bg-gray-50 text-gray-800"
      )}>
        {mode === 'simple' ? (
          <>
            <strong>Modo Simple</strong> - Registro rápido con botones grandes
          </>
        ) : (
          <>
            <strong>Modo Manual</strong> - Registro retroactivo con fecha/hora específica
          </>
        )}
      </div>
      
      {/* Contenido según modo */}
      {mode === 'simple' ? (
        <EventRegistration
          childId={childId}
          childName={childName}
          onEventRegistered={onEventRegistered}
        />
      ) : (
        <ManualEventForm
          childId={childId}
          childName={childName}
          onEventRegistered={onEventRegistered}
        />
      )}
    </div>
  )
}

/**
 * Componente principal del sistema dual de registro de eventos
 * Orquesta entre Modo Simple (botones grandes) y Modo Manual (formulario completo)
 * Siguiendo EVENT_REGISTRATION_SYSTEM.md
 */
export function EventRegistrationDualMode({ childId, childName, onEventRegistered }: EventRegistrationDualModeProps) {
  return (
    <EventRegistrationModeProvider>
      <EventRegistrationContent
        childId={childId}
        childName={childName}
        onEventRegistered={onEventRegistered}
      />
    </EventRegistrationModeProvider>
  )
}