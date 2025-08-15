"use client"

import React from 'react'
import { SleepButton } from './SleepButton'
import { FeedingButton } from './FeedingButton'

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
  return (
    <div className="p-4 border rounded-lg bg-white">
      <h3 className="text-lg font-semibold mb-4">
        Registro de Eventos - {childName}
      </h3>
      
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
    </div>
  )
}