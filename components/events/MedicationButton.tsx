"use client"

import React, { useState } from "react"
import { Pill, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { EventData } from "./types"
import { dateToTimestamp } from "@/lib/datetime"
import { cn } from "@/lib/utils"
import { useDevTime } from "@/context/dev-time-context"
import { MedicationModal } from "./MedicationModal"
import { format } from "date-fns"
import { useUser } from "@/context/UserContext"

interface MedicationButtonProps {
  childId: string
  childName: string
  onEventRegistered?: () => void
}

interface MedicationModalData {
  medicationName: string
  medicationDose: string
  medicationTime: string
  medicationNotes: string
}

/**
 * Botón para registrar eventos de medicamentos
 * VERSION 1.0 - Registro directo con modal
 * 
 * LÓGICA DE EVENTOS:
 * - MEDICAMENTO: Modal PRIMERO → Confirmar datos → ENTONCES crear evento
 * - CANCELAR MODAL: NO crea evento (operación cancelada)
 * 
 * FLUJO:
 * 1. Click "MEDICAMENTO" → Modal MedicationModal
 * 2. Confirmar datos → Crear evento con todos los detalles
 * 3. Cerrar modal → NO crear evento
 */
export function MedicationButton({ 
  childId, 
  childName,
  onEventRegistered, 
}: MedicationButtonProps) {
  const { toast } = useToast()
  const [isProcessing, setIsProcessing] = useState(false)
  const { getCurrentTime } = useDevTime()
  const { userData } = useUser()
  const [showMedicationModal, setShowMedicationModal] = useState(false)
  
  // Configuración del botón
  const getButtonConfig = () => {
    return {
      text: "MEDICAMENTO",
      icon: Pill,
      color: "from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700",
    }
  }
  
  const config = getButtonConfig()
  const Icon = config.icon
  
  // Manejar confirmación del modal de medicamento
  const handleMedicationConfirm = async (medicationData: MedicationModalData) => {
    try {
      setIsProcessing(true)
      
      const now = getCurrentTime()
      
      // Crear evento de medicamento con todos los datos en campos separados
      const eventData: Partial<EventData> = {
        childId,
        eventType: "medication",
        startTime: dateToTimestamp(now, userData.timezone),
        medicationName: medicationData.medicationName,
        medicationDose: medicationData.medicationDose,
        medicationTime: medicationData.medicationTime || format(now, "HH:mm"), // Usar hora actual si no se especifica
        medicationNotes: medicationData.medicationNotes,
        notes: medicationData.medicationNotes, // Mantener en notes para compatibilidad
        emotionalState: "neutral", // Por defecto neutral para medicamento
      }
      
      const response = await fetch("/api/children/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventData),
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || `Error al registrar medicamento (${response.status})`
        throw new Error(errorMessage)
      }
      
      // Mostrar confirmación personalizada
      toast({
        title: "Medicamento registrado",
        description: `${childName}: ${medicationData.medicationName} - ${medicationData.medicationDose}`,
      })
      
      // Cerrar modal y limpiar
      setShowMedicationModal(false)
      
      // Notificar al padre para actualizar datos
      onEventRegistered?.()
      
    } catch (error) {
      console.error("Error registrando medicamento:", error)
      toast({
        title: "Error",
        description: "No se pudo registrar el medicamento",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }
  
  // Manejar cuando se cierra el modal sin confirmar
  const handleModalClose = () => {
    // NO crear evento - simplemente cancelar la operación
    setShowMedicationModal(false)
    setIsProcessing(false)
  }
  
  // Manejar click del botón
  const handleClick = async () => {
    // Mostrar modal directamente
    setShowMedicationModal(true)
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
      
      {/* Modal para capturar datos del medicamento */}
      <MedicationModal
        open={showMedicationModal}
        onClose={handleModalClose}
        onConfirm={handleMedicationConfirm}
        childName={childName}
      />
    </div>
  )
}
