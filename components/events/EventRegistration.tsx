"use client"

import React, { useState } from "react"
import { SleepButton } from "./SleepButton"
import { FeedingButton } from "./FeedingButton"
import { NightFeedingButton } from "./NightFeedingButton"
import { MedicationButton } from "./MedicationButton"
import { ExtraActivityButton } from "./ExtraActivityButton"
import { ManualEventModal } from "./ManualEventModal"
import { Button } from "@/components/ui/button"
import { Clock } from "lucide-react"
import { useSleepState } from "@/hooks/use-sleep-state"
import { useUser } from "@/context/UserContext"
import { cn } from "@/lib/utils"

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
  onEventRegistered,
}: EventRegistrationProps) {
  const [showManualModal, setShowManualModal] = useState(false)
  const { userData } = useUser()
  const { sleepState } = useSleepState(childId, userData?.timezone)

  // Determinar estado actual
  const currentStatus = sleepState.status
  const isAwake = currentStatus === "awake"
  const isSleeping = currentStatus === "sleeping"
  const isNapping = currentStatus === "napping"
  const isNightWaking = currentStatus === "night_waking"

  // Visibilidad de botones segun estado
  const showFeedingButton = isAwake || isNightWaking // Solo cuando despierto o en despertar nocturno
  const showNightFeedingButton = isSleeping // Solo durante sueno nocturno (no siestas)
  const showMedicationButton = isAwake || isSleeping || isNightWaking
  const showActivityButton = isAwake // Solo cuando despierto
  const showManualButton = isAwake // Solo cuando despierto

  // Determinar si hay botones secundarios visibles
  const hasSecondaryButtons = showFeedingButton || showNightFeedingButton || showMedicationButton || showActivityButton

  // Numero de columnas para el grid
  // Cuando duerme: NightFeeding + Medication = 2 columnas
  // Cuando despierto: Feeding + Medication + Activity = 3 columnas
  const visibleSecondaryCount = [
    showFeedingButton,
    showNightFeedingButton,
    showMedicationButton,
    showActivityButton
  ].filter(Boolean).length
  const gridCols = Math.min(visibleSecondaryCount, 3)

  return (
    <div className="p-3 md:p-4 border rounded-lg bg-white">
      <div className="mb-3 md:mb-4">
        <h3 className="text-base md:text-lg font-semibold">
          Registro de Eventos - {childName}
        </h3>
      </div>

      <div className="space-y-3">
        {/* Botón principal de sueño - mantiene su tamaño grande */}
        <SleepButton
          childId={childId}
          childName={childName}
          onEventRegistered={onEventRegistered}
        />

        {/* Fila de botones secundarios - solo si hay botones visibles */}
        {hasSecondaryButtons && (
          <div className={cn(
            "grid gap-2 h-14 md:h-16",
            gridCols === 3 ? "grid-cols-3" : "grid-cols-2"
          )}>
            {/* Boton de alimentacion - cuando despierto */}
            {showFeedingButton && (
              <FeedingButton
                childId={childId}
                childName={childName}
                onEventRegistered={onEventRegistered}
              />
            )}

            {/* Boton de alimentacion nocturna - cuando duerme */}
            {showNightFeedingButton && (
              <NightFeedingButton
                childId={childId}
                childName={childName}
                onEventRegistered={onEventRegistered}
              />
            )}

            {/* Boton de medicamentos */}
            {showMedicationButton && (
              <MedicationButton
                childId={childId}
                childName={childName}
                onEventRegistered={onEventRegistered}
              />
            )}

            {/* Boton de actividad extra - solo cuando despierto */}
            {showActivityButton && (
              <ExtraActivityButton
                childId={childId}
                childName={childName}
                onEventRegistered={onEventRegistered}
              />
            )}
          </div>
        )}

        {/* Boton para registro manual - solo cuando despierto */}
        {showManualButton && (
          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowManualModal(true)}
              className="w-full text-xs bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300"
            >
              <Clock className="w-3 h-3 mr-1" />
              Registrar Evento
            </Button>
          </div>
        )}
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