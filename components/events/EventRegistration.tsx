"use client"

import React, { useState } from 'react'
import { SleepButton } from './SleepButton'
import { FeedingButton } from './FeedingButton'
import { MedicationButton } from './MedicationButton'
import { ExtraActivityButton } from './ExtraActivityButton'
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
 * VERSION 4.0 - Sistema de eventos completo
 * 
 * CARACTERÍSTICAS v4.0:
 * - Sistema de sueño con modal de sleepDelay (v3.1)
 * - Sistema de alimentación con modal completo (v3.2)
 * - Sistema de medicamentos con modal (NUEVO v4.0)
 * - Sistema de actividad extra con modal (NUEVO v4.0)
 * - Layout compacto con 3 botones secundarios
 * - Sin emojis en UI
 */
export function EventRegistration({ 
  childId, 
  childName,
  onEventRegistered 
}: EventRegistrationProps) {
  const [showManualModal, setShowManualModal] = useState(false)
  
  return (
    <div className="p-3 md:p-4 border rounded-lg bg-white">
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <h3 className="text-base md:text-lg font-semibold">
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
      
      <div className="space-y-3">
        {/* Botón principal de sueño - mantiene su tamaño grande */}
        <SleepButton
          childId={childId}
          childName={childName}
          onEventRegistered={onEventRegistered}
        />
        
        {/* Fila de botones secundarios - más compactos */}
        <div className="grid grid-cols-3 gap-2 h-14 md:h-16">
          {/* Botón de alimentación */}
          <FeedingButton
            childId={childId}
            childName={childName}
            onEventRegistered={onEventRegistered}
          />
          
          {/* Botón de medicamentos */}
          <MedicationButton
            childId={childId}
            childName={childName}
            onEventRegistered={onEventRegistered}
          />
          
          {/* Botón de actividad extra */}
          <ExtraActivityButton
            childId={childId}
            childName={childName}
            onEventRegistered={onEventRegistered}
          />
        </div>
        
        <p className="text-xs md:text-sm text-gray-500 text-center">
          Sistema de eventos v4.0 - Registro completo
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