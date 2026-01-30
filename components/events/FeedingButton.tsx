"use client"

import React, { useState } from "react"
import { UtensilsCrossed, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { EventData, FeedingModalData } from "./types"
import { buildLocalDate, dateToTimestamp } from "@/lib/datetime"
import { cn } from "@/lib/utils"
import { useDevTime } from "@/context/dev-time-context"
import { FeedingModal } from "./FeedingModal"
import { useSleepState } from "@/hooks/use-sleep-state"
import { useUser } from "@/context/UserContext"
import { format } from "date-fns"

interface FeedingButtonProps {
  childId: string
  childName: string
  onEventRegistered?: () => void
}

/**
 * Botón para registrar eventos de alimentación
 * VERSION 1.0 - Registro directo con modal
 * 
 * LÓGICA DE EVENTOS:
 * - ALIMENTACIÓN: Modal PRIMERO → Confirmar datos → ENTONCES crear evento
 * - CANCELAR MODAL: NO crea evento (operación cancelada)
 * 
 * FLUJO:
 * 1. Click "ALIMENTACIÓN" → Modal FeedingModal
 * 2. Confirmar datos → Crear evento con todos los detalles
 * 3. Cerrar modal → NO crear evento
 */
export function FeedingButton({ 
  childId, 
  childName,
  onEventRegistered, 
}: FeedingButtonProps) {
  const { toast } = useToast()
  const [isProcessing, setIsProcessing] = useState(false)
  const { getCurrentTime } = useDevTime()
  const [showFeedingModal, setShowFeedingModal] = useState(false)
  const { userData } = useUser()
  const { sleepState } = useSleepState(childId, userData.timezone)
  
  // Configuración del botón
  const getButtonConfig = () => {
    return {
      text: "ALIMENTACIÓN",
      icon: UtensilsCrossed,
      color: "from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600",
    }
  }
  
  const config = getButtonConfig()
  const Icon = config.icon
  
  // Manejar confirmación del modal de alimentación
  const handleFeedingConfirm = async (feedingData: FeedingModalData) => {
    try {
      setIsProcessing(true)

      const now = getCurrentTime()

      // Detectar si el bebé está dormido actualmente
      const isBabySleeping = sleepState.status === "sleeping" || sleepState.status === "napping"
      const isLiquid = feedingData.feedingType === "breast" || feedingData.feedingType === "bottle"
      const normalizedBabyState = feedingData.feedingType === "solids" ? "awake" : feedingData.babyState

      // Determinar si es alimentación nocturna y el contexto
      const isNightFeeding = isBabySleeping && isLiquid
      const feedingContext = sleepState.status === "sleeping"
        ? "during_sleep"
        : sleepState.status === "napping"
          ? "during_nap"
          : "awake"

      // NUEVO PATRON: startTime = hora ingresada, endTime = ahora (momento de guardar)
      const todayDate = format(now, "yyyy-MM-dd")
      const startTimeDate = buildLocalDate(todayDate, feedingData.feedingTime)
      const endTimeDate = now

      // Crear UN SOLO evento de alimentación con flag isNightFeeding
      const eventData: Partial<EventData> = {
        childId,
        eventType: "feeding",
        startTime: dateToTimestamp(startTimeDate, userData.timezone),
        endTime: dateToTimestamp(endTimeDate, userData.timezone),
        feedingType: feedingData.feedingType,
        feedingSubtype: feedingData.feedingType,
        feedingAmount: feedingData.feedingAmount, // Solo para bottle
        babyState: normalizedBabyState,
        feedingNotes: feedingData.feedingNotes,
        notes: feedingData.feedingNotes,
        emotionalState: "neutral", // Por defecto neutral para alimentación
        // Nuevos campos para alimentación nocturna (reemplaza eventType: "night_feeding")
        isNightFeeding,
        feedingContext,
      }

      const response = await fetch("/api/children/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventData),
      })

      if (!response.ok) {
        throw new Error("Error al registrar evento de alimentación")
      }

      // Preparar mensaje personalizado según tipo
      const getTypeText = (type: string) => {
        switch (type) {
        case "breast": return "pecho"
        case "bottle": return "biberón"
        case "solids": return "sólidos"
        default: return "alimentación"
        }
      }

      const getAmountText = (type: string, amount?: number) => {
        if (type === "bottle" && amount) {
          return ` - ${amount} oz/ml`
        }
        return ""
      }

      // Mostrar confirmación personalizada
      toast({
        title: isNightFeeding ? "Alimentación nocturna registrada" : "Alimentación registrada",
        description: `${childName}: ${getTypeText(feedingData.feedingType)}${getAmountText(feedingData.feedingType, feedingData.feedingAmount)}${isNightFeeding ? " (durante el sueño)" : ""}`,
      })
      
      // Cerrar modal y limpiar
      setShowFeedingModal(false)
      
      // Notificar al padre para actualizar datos
      onEventRegistered?.()
      
    } catch (error) {
      console.error("Error registrando alimentación:", error)
      toast({
        title: "Error",
        description: "No se pudo registrar la alimentación",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }
  
  // Manejar cuando se cierra el modal sin confirmar
  const handleModalClose = () => {
    // NO crear evento - simplemente cancelar la operación
    setShowFeedingModal(false)
    setIsProcessing(false)
  }
  
  // Manejar click del botón
  const handleClick = async () => {
    // Mostrar modal directamente
    setShowFeedingModal(true)
  }
  
  return (
    <div className="w-full h-full">
      <Button
        onClick={handleClick}
        disabled={isProcessing}
        className={cn(
          "w-full h-full min-h-[44px] text-xs md:text-sm font-bold text-white shadow-lg",
          "transform transition-all duration-200 hover:scale-[1.02]",
          "bg-gradient-to-r",
          config.color,
          "flex flex-col items-center justify-center gap-1 p-2"
        )}
      >
        {isProcessing ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Icon className="w-5 h-5" />
        )}
        <span className="text-xs">{config.text}</span>
      </Button>
      
      {/* Modal para capturar datos de alimentación */}
      <FeedingModal
        open={showFeedingModal}
        onClose={handleModalClose}
        onConfirm={handleFeedingConfirm}
        childName={childName}
        initialData={{
          babyState: "awake"  // FeedingButton solo se muestra cuando está despierto
        }}
      />
    </div>
  )
}
