"use client"

import React from 'react'
import { Settings, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import { SimplePrimaryMode } from './primary/SimplePrimaryMode'
import { EventRegistrationModal } from './EventRegistrationModal'
import { useEventRegistrationMode } from '@/contexts/EventRegistrationModeContext'
import { cn } from '@/lib/utils'

interface EventRegistrationDualModeProps {
  childId: string
  childName: string
  onEventRegistered?: () => void
  className?: string
}

/**
 * Componente principal que maneja los dos modos de registro:
 * - Modo Simple: Interfaz simplificada con ciclo unificado
 * - Modo Manual: Acceso completo a todos los tipos de eventos
 */
export function EventRegistrationDualMode({
  childId,
  childName,
  onEventRegistered,
  className
}: EventRegistrationDualModeProps) {
  const { mode, toggleMode, isSimpleMode, isManualMode } = useEventRegistrationMode()
  const [showManualModal, setShowManualModal] = React.useState(false)

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header con indicador de modo y switch */}
      <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2">
          <Badge variant={isSimpleMode ? "default" : "outline"} className="text-xs">
            {isSimpleMode ? (
              <>
                <Sparkles className="w-3 h-3 mr-1" />
                Modo Simple
              </>
            ) : (
              <>
                <Settings className="w-3 h-3 mr-1" />
                Modo Avanzado
              </>
            )}
          </Badge>
          {isSimpleMode && (
            <span className="text-xs text-gray-500">
              Registro rápido recomendado
            </span>
          )}
        </div>

        {/* Botón para cambiar de modo */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMode}
                className="text-xs"
              >
                <Settings className="w-3 h-3 mr-1" />
                Cambiar modo
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Alternar entre modo simple y avanzado</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Contenido según el modo activo */}
      {isSimpleMode ? (
        /* Modo Simple: Interfaz simplificada con eventos primarios */
        <SimplePrimaryMode
          childId={childId}
          childName={childName}
          onEventRegistered={onEventRegistered}
        />
      ) : (
        <div className="space-y-4">
          {/* Modo Manual: Acceso completo */}
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium text-gray-800 mb-2">
              Modo de Registro Avanzado
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Acceso completo a todos los tipos de eventos y opciones
            </p>
            <Button
              onClick={() => setShowManualModal(true)}
              className="w-full max-w-xs"
            >
              <Settings className="w-4 h-4 mr-2" />
              Abrir Registro Manual
            </Button>
          </div>

          {/* Botón para volver al modo simple */}
          <div className="text-center">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleMode}
              className="text-xs"
            >
              <Sparkles className="w-3 h-3 mr-1" />
              Volver al modo simple
            </Button>
          </div>
        </div>
      )}

      {/* Modal de registro manual (disponible en modo avanzado) */}
      {isManualMode && (
        <EventRegistrationModal
          isOpen={showManualModal}
          onClose={() => setShowManualModal(false)}
          childId={childId}
          onEventCreated={() => {
            setShowManualModal(false)
            onEventRegistered?.()
          }}
        />
      )}
    </div>
  )
}