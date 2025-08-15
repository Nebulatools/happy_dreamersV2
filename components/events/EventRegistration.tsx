"use client"

import React, { useState } from 'react'
import { SleepButton } from './SleepButton'
import { FeedingButton } from './FeedingButton'
import { ManualEventModal } from './ManualEventModal'
import { Button } from '@/components/ui/button'
import { Clock } from 'lucide-react'

interface EventRegistrationProps {
  childId: string
  childName: string
  onEventRegistered?: () => void
}

/**
 * Componente principal para registro de eventos
 * VERSION 3.2 - Sistema de eventos expandido con alimentación
 * 
 * CARACTERÍSTICAS v3.2:
 * - Sistema de sueño con modal de sleepDelay (v3.1)
 * - Sistema de alimentación con modal completo (NUEVO v3.2)
 * - Backend calcula automáticamente duration para sueño
 * - Validaciones robustas para eventos de alimentación
 * - Sin emojis en UI
 */
export function EventRegistration({ 
  childId, 
  childName,
  onEventRegistered 
}: EventRegistrationProps) {
  const [showManualModal, setShowManualModal] = useState(false)
  
  return (
    <div className="p-4 border rounded-lg bg-white">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">
          Registro de Eventos - {childName}
        </h3>
        
        {/* Botón para registro manual */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowManualModal(true)}
          className="text-xs"
        >
          <Clock className="w-3 h-3 mr-1" />
          Manual
        </Button>
      </div>
      
      <div className="space-y-4">
        {/* Botón principal de sueño */}
        <SleepButton
          childId={childId}
          childName={childName}
          onEventRegistered={onEventRegistered}
        />
        
        {/* Botón de alimentación */}
        <FeedingButton
          childId={childId}
          childName={childName}
          onEventRegistered={onEventRegistered}
        />
        
        <p className="text-sm text-gray-500 text-center">
          Sistema de eventos v3.2 - Sueño + Alimentación
        </p>
      </div>
      
      {/* Modal de registro manual */}
      <ManualEventModal
        open={showManualModal}
        onClose={() => setShowManualModal(false)}
        childId={childId}
        childName={childName}
        onEventRegistered={onEventRegistered}
      />
    </div>
  )
}