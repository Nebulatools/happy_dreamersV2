"use client"

import React, { useState } from "react"
import { Clock, Calendar, Pill, Activity } from "lucide-react"
import { Button } from "@/components/ui/button"
import { UnifiedSleepCycle } from "./UnifiedSleepCycle"
import { PrimaryFeedingButton } from "./PrimaryFeedingButton"
import { EventRegistrationModal } from "../EventRegistrationModal"
import { cn } from "@/lib/utils"

interface SimplePrimaryModeProps {
  childId: string
  childName: string
  onEventRegistered?: () => void
  className?: string
}

/**
 * Interfaz principal del modo simple
 * Presenta los eventos primarios de forma clara y accesible
 */
export function SimplePrimaryMode({
  childId,
  childName,
  onEventRegistered,
  className
}: SimplePrimaryModeProps) {
  const [showManualModal, setShowManualModal] = useState(false)
  const [showMedicationModal, setShowMedicationModal] = useState(false)

  return (
    <div className={cn("space-y-4", className)}>
      {/* EVENTOS PRIMARIOS */}
      <div className="space-y-3">
        {/* Ciclo de Sueño - Botón principal */}
        <UnifiedSleepCycle
          childId={childId}
          childName={childName}
          onEventRegistered={onEventRegistered}
        />

        {/* Alimentación - Evento primario */}
        <PrimaryFeedingButton
          childId={childId}
          childName={childName}
          onEventRegistered={onEventRegistered}
        />
      </div>

      {/* EVENTOS SECUNDARIOS - Acceso discreto */}
      <div className="pt-4 border-t border-gray-200">
        <div className="flex flex-wrap gap-2 justify-center">
          {/* Medicamentos */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Por ahora usar el modal manual con tipo preseleccionado
              setShowManualModal(true)
            }}
            className="text-xs"
          >
            <Pill className="w-3 h-3 mr-1" />
            Medicamentos
          </Button>

          {/* Actividades Extra */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Por ahora usar el modal manual con tipo preseleccionado
              setShowManualModal(true)
            }}
            className="text-xs"
          >
            <Activity className="w-3 h-3 mr-1" />
            Actividades Extra
          </Button>

          {/* Registro de evento pasado */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowManualModal(true)}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            <Clock className="w-3 h-3 mr-1" />
            Evento pasado
          </Button>
        </div>
      </div>

      {/* Modal manual para eventos secundarios y pasados */}
      <EventRegistrationModal
        isOpen={showManualModal}
        onClose={() => setShowManualModal(false)}
        childId={childId}
        onEventCreated={() => {
          setShowManualModal(false)
          onEventRegistered?.()
        }}
      />
    </div>
  )
}