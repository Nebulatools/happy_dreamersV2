"use client"

import React, { useState } from "react"
import { Baby, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { EventData, FeedingModalData } from "./types"
import { dateToTimestamp } from "@/lib/datetime"
import { cn } from "@/lib/utils"
import { useDevTime } from "@/context/dev-time-context"
import { FeedingModal } from "./FeedingModal"
import { useSleepState } from "@/hooks/use-sleep-state"
import { useUser } from "@/context/UserContext"

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
      icon: Baby,
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
      const durationToSend = feedingData.feedingDuration || (feedingData.feedingType === "breast" ? feedingData.feedingAmount : 15)
      const amountToSend = feedingData.feedingType === "breast" ? undefined : (feedingData.feedingAmount || (feedingData.feedingType === "solids" ? 50 : undefined))
      
      // Crear evento de alimentación con todos los datos del modal
      const eventData: Partial<EventData> = {
        childId,
        eventType: "feeding",
        startTime: dateToTimestamp(now, userData.timezone),
        feedingType: feedingData.feedingType,
        feedingSubtype: feedingData.feedingType,
        // Duración: en pecho son minutos del control principal, en otros casos usamos la duración capturada
        feedingDuration: durationToSend,
        feedingAmount: amountToSend,
        babyState: normalizedBabyState,
        feedingNotes: feedingData.feedingNotes,
        notes: feedingData.feedingNotes,
        emotionalState: "neutral", // Por defecto neutral para alimentación
      }

      const response = await fetch("/api/children/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventData),
      })
      
      if (!response.ok) {
        throw new Error("Error al registrar evento de alimentación")
      }
      
      // Si el bebé está dormido, crear también un evento de night_feeding
      if (isBabySleeping && isLiquid) {
        const nightFeedingData: Partial<EventData> = {
          childId,
          eventType: "night_feeding",
          startTime: dateToTimestamp(now, userData.timezone),
          feedingType: feedingData.feedingType,
          feedingSubtype: feedingData.feedingType,
          feedingDuration: durationToSend,
          feedingAmount: amountToSend,
          babyState: normalizedBabyState,
          notes: `Alimentación nocturna - ${feedingData.feedingType === "breast" ? "Pecho" : feedingData.feedingType === "bottle" ? "Biberón" : "Sólidos"}`,
          emotionalState: "neutral",
        }

        const nightFeedingResponse = await fetch("/api/children/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(nightFeedingData),
        })

        if (!nightFeedingResponse.ok) {
          console.error("Error al registrar evento de alimentación nocturna")
        }
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

      const getAmountText = (type: string, amount: number) => {
        if (type === "breast") {
          return `${amount} minutos`
        } else if (type === "bottle") {
          return `${amount} oz/ml`
        } else {
          return "descripción agregada"
        }
      }

      // Mostrar confirmación personalizada
      toast({
        title: isBabySleeping ? "Alimentación nocturna registrada" : "Alimentación registrada",
        description: `${childName}: ${getTypeText(feedingData.feedingType)} - ${getAmountText(feedingData.feedingType, feedingData.feedingAmount)}${isBabySleeping ? " (durante el sueño)" : ""}`,
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
      />
    </div>
  )
}
