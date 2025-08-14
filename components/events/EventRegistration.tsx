"use client"

import React from 'react'
import { SleepButton } from './SleepButton'

interface EventRegistrationProps {
  childId: string
  childName: string
  onEventRegistered?: () => void
}

/**
 * Componente principal para registro de eventos
 * VERSION 2.1 - Lógica de wake corregida
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
        
        <p className="text-sm text-gray-500 text-center">
          Sistema de eventos v2.1 - Lógica corregida
        </p>
      </div>
    </div>
  )
}