"use client"

import React, { useState } from "react"
import { Moon, Loader2, Milk } from "lucide-react"
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

interface NightFeedingButtonProps {
  childId: string
  childName: string
  onEventRegistered?: () => void
}

/**
 * Boton para registrar alimentacion nocturna
 * VERSION 1.0 - Visible SOLO cuando el nino duerme
 *
 * LOGICA:
 * - Visible solo cuando sleepState.status === "sleeping" || "napping"
 * - Abre FeedingModal con babyState="asleep" preseleccionado
 * - Registra evento con isNightFeeding=true
 * - NO cambia el estado de sueno del nino
 */
export function NightFeedingButton({
  childId,
  childName,
  onEventRegistered,
}: NightFeedingButtonProps) {
  const { toast } = useToast()
  const [isProcessing, setIsProcessing] = useState(false)
  const { getCurrentTime } = useDevTime()
  const [showFeedingModal, setShowFeedingModal] = useState(false)
  const { userData } = useUser()
  const { sleepState } = useSleepState(childId, userData?.timezone)

  // Manejar confirmacion del modal de alimentacion
  const handleFeedingConfirm = async (feedingData: FeedingModalData) => {
    try {
      setIsProcessing(true)

      const now = getCurrentTime()

      // Determinar contexto segun estado actual
      const feedingContext = sleepState.status === "sleeping"
        ? "during_sleep"
        : sleepState.status === "napping"
          ? "during_nap"
          : "awake"

      // Construir startTime y endTime
      const todayDate = format(now, "yyyy-MM-dd")
      const startTimeDate = buildLocalDate(todayDate, feedingData.feedingTime)
      const endTimeDate = now

      // Crear evento de alimentacion nocturna
      // isNightFeeding=true indica que es alimentacion durante el sueno
      const eventData: Partial<EventData> = {
        childId,
        eventType: "feeding",
        startTime: dateToTimestamp(startTimeDate, userData?.timezone),
        endTime: dateToTimestamp(endTimeDate, userData?.timezone),
        feedingType: feedingData.feedingType,
        feedingSubtype: feedingData.feedingType,
        feedingAmount: feedingData.feedingAmount,
        babyState: "asleep", // Siempre asleep para alimentacion nocturna
        feedingNotes: feedingData.feedingNotes,
        notes: feedingData.feedingNotes,
        emotionalState: "neutral",
        // Flags de alimentacion nocturna
        isNightFeeding: true,
        feedingContext,
      }

      const response = await fetch("/api/children/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventData),
      })

      if (!response.ok) {
        throw new Error("Error al registrar alimentacion nocturna")
      }

      // Mensaje de confirmacion
      const getTypeText = (type: string) => {
        switch (type) {
        case "breast": return "pecho"
        case "bottle": return "biberon"
        case "solids": return "solidos"
        default: return "alimentacion"
        }
      }

      const getAmountText = (type: string, amount?: number) => {
        if (type === "bottle" && amount) {
          return ` - ${amount} oz/ml`
        }
        return ""
      }

      toast({
        title: "Alimentacion nocturna registrada",
        description: `${childName}: ${getTypeText(feedingData.feedingType)}${getAmountText(feedingData.feedingType, feedingData.feedingAmount)} (durante el sueno)`,
      })

      // Cerrar modal
      setShowFeedingModal(false)

      // Notificar al padre para actualizar datos
      // NOTA: NO cambiamos el estado de sueno del nino
      onEventRegistered?.()

    } catch (error) {
      console.error("Error registrando alimentacion nocturna:", error)
      toast({
        title: "Error",
        description: "No se pudo registrar la alimentacion nocturna",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // Manejar cierre del modal sin confirmar
  const handleModalClose = () => {
    setShowFeedingModal(false)
    setIsProcessing(false)
  }

  // Manejar click del boton
  const handleClick = async () => {
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
          "from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600",
          "flex flex-col items-center justify-center gap-1 p-2"
        )}
      >
        {isProcessing ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <div className="relative">
            <Milk className="w-5 h-5" />
            <Moon className="w-3 h-3 absolute -top-1 -right-2" />
          </div>
        )}
        <span className="text-xs">ALIMENTACION</span>
        <span className="text-[10px] opacity-80">NOCTURNA</span>
      </Button>

      {/* Modal de alimentacion con babyState="asleep" preseleccionado */}
      <FeedingModal
        open={showFeedingModal}
        onClose={handleModalClose}
        onConfirm={handleFeedingConfirm}
        childName={childName}
        initialData={{
          babyState: "asleep", // Preseleccionar dormido
        }}
      />
    </div>
  )
}
