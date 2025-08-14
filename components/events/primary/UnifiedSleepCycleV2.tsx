"use client"

import React, { useState } from "react"
import { Moon, Sun, Clock, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { format, differenceInMinutes } from "date-fns"
import { es } from "date-fns/locale"
import { useToast } from "@/hooks/use-toast"
import { SleepDelayCapture } from "../SleepDelayCapture"
import { toLocalISOString } from "@/lib/date-utils"
import { useChildPlan } from "@/hooks/use-child-plan"
import { useSleepState } from "@/hooks/use-sleep-state"

interface UnifiedSleepCycleV2Props {
  childId: string
  childName: string
  onEventRegistered?: () => void
}

/**
 * Versión 2 del ciclo unificado - Sincronizado con BD
 * Usa los nuevos hooks para estado en tiempo real
 */
export function UnifiedSleepCycleV2({
  childId,
  childName,
  onEventRegistered
}: UnifiedSleepCycleV2Props) {
  const { toast } = useToast()
  const { plan, isNightTime } = useChildPlan(childId)
  const { sleepState, buttonConfig, isLoading: stateLoading, refetch } = useSleepState(childId)
  
  const [isLoading, setIsLoading] = useState(false)
  const [showSleepDelay, setShowSleepDelay] = useState(false)
  const [bedtimeTimestamp, setBedtimeTimestamp] = useState<Date | null>(null)
  
  // Determinar el ícono del botón
  const getButtonIcon = () => {
    switch(sleepState.status) {
      case 'sleeping':
      case 'napping':
        return Sun
      case 'night_waking':
        return AlertCircle
      default:
        return Moon
    }
  }
  
  const ButtonIcon = getButtonIcon()
  
  // Determinar el texto del botón
  const getButtonText = () => {
    switch(sleepState.status) {
      case 'sleeping':
        // Si está durmiendo de noche, mostrar el texto apropiado
        return isNightTime() ? "DESPERTAR NOCTURNO" : "SE DESPERTÓ"
      case 'napping':
        // Si está en siesta, siempre es "SE DESPERTÓ"
        return "SE DESPERTÓ"
      case 'night_waking':
        // Si está en despertar nocturno, puede volver a dormir
        return "VOLVIÓ A DORMIR"
      default:
        // Si está despierto, determinar si es hora de siesta o dormir
        return isNightTime() ? "SE DURMIÓ" : "SIESTA"
    }
  }
  
  // Manejar el click del botón principal
  const handleMainButtonClick = async () => {
    const now = new Date()
    
    if (sleepState.status === 'awake') {
      // Iniciar proceso de dormir/siesta
      setBedtimeTimestamp(now)
      setShowSleepDelay(true)
    } else if (sleepState.status === 'sleeping' || sleepState.status === 'napping') {
      // Registrar despertar
      await handleWakeUp()
    } else if (sleepState.status === 'night_waking') {
      // Volver a dormir
      await handleBackToSleep()
    }
  }
  
  // Manejar confirmación de sueño con delay
  const handleSleepConfirm = async (sleepTime: Date, delay: number) => {
    setIsLoading(true)
    
    try {
      const eventType = isNightTime() ? 'sleep' : 'nap'
      
      console.log('[DEBUG] handleSleepConfirm:', {
        eventType,
        isNightTime: isNightTime(),
        sleepTime: toLocalISOString(sleepTime),
        delay
      })
      
      // Crear evento de sueño
      const eventData = {
        childId,
        eventType,
        startTime: toLocalISOString(sleepTime),
        emotionalState: 'tranquilo',
        sleepDelay: delay,
        notes: delay > 0 ? `Tardó ${delay} minutos en dormirse` : undefined
      }
      
      const response = await fetch('/api/children/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData)
      })
      
      if (!response.ok) throw new Error('Error al registrar evento')
      
      // Refrescar estado
      await refetch()
      
      toast({
        title: eventType === 'nap' ? "😴 Siesta iniciada" : "🌙 Se durmió",
        description: `${childName} ${delay > 0 ? `tardó ${delay} minutos en dormirse` : 'se durmió rápidamente'}`
      })
      
      onEventRegistered?.()
      
    } catch (error) {
      console.error('Error registrando sueño:', error)
      toast({
        title: "Error",
        description: "No se pudo registrar el evento",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
      setShowSleepDelay(false)
      setBedtimeTimestamp(null)
    }
  }
  
  // Manejar despertar
  const handleWakeUp = async () => {
    setIsLoading(true)
    
    try {
      const wakeTime = new Date()
      
      console.log('[DEBUG] handleWakeUp iniciado:', {
        sleepState,
        isNightTime: isNightTime(),
        wakeTime: toLocalISOString(wakeTime)
      })
      
      // Primero actualizar el evento anterior con endTime si existe
      if (sleepState.lastEventId) {
        console.log('[DEBUG] Actualizando evento anterior con endTime:', sleepState.lastEventId)
        
        await fetch('/api/children/events', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventId: sleepState.lastEventId,
            childId,
            endTime: toLocalISOString(wakeTime),
            duration: sleepState.duration
          })
        })
      }
      
      // Determinar el tipo de despertar basado en el estado actual y la hora
      const isNight = isNightTime()
      
      // Solo crear UN evento de despertar según el contexto
      if (sleepState.status === 'napping') {
        // Si está en siesta, es despertar de siesta
        console.log('[DEBUG] Registrando despertar de siesta')
        
        const eventData = {
          childId,
          eventType: 'wake',
          startTime: toLocalISOString(wakeTime),
          emotionalState: 'tranquilo',
          notes: 'Despertar de siesta'
        }
        
        await fetch('/api/children/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(eventData)
        })
        
        toast({
          title: "☀️ Despertó de la siesta",
          description: `${childName} terminó su siesta`
        })
        
      } else if (isNight && sleepState.status === 'sleeping') {
        // Es de noche y estaba durmiendo = despertar nocturno
        console.log('[DEBUG] Registrando despertar nocturno')
        
        const eventData = {
          childId,
          eventType: 'night_waking',
          startTime: toLocalISOString(wakeTime),
          emotionalState: 'inquieto'
        }
        
        await fetch('/api/children/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(eventData)
        })
        
        toast({
          title: "🌙 Despertar nocturno",
          description: `${childName} se despertó durante la noche`
        })
        
      } else if (!isNight && sleepState.status === 'sleeping') {
        // Es de día y estaba durmiendo = despertar de la mañana
        console.log('[DEBUG] Registrando despertar de la mañana')
        
        const eventData = {
          childId,
          eventType: 'wake',
          startTime: toLocalISOString(wakeTime),
          emotionalState: 'tranquilo',
          notes: 'Despertar de la mañana'
        }
        
        await fetch('/api/children/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(eventData)
        })
        
        toast({
          title: "☀️ Buenos días",
          description: `${childName} se despertó`
        })
      }
      
      // Refrescar estado
      await refetch()
      onEventRegistered?.()
      
    } catch (error) {
      console.error('Error registrando despertar:', error)
      toast({
        title: "Error",
        description: "No se pudo registrar el despertar",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  // Manejar volver a dormir después de despertar nocturno
  const handleBackToSleep = async () => {
    setIsLoading(true)
    
    try {
      const sleepTime = new Date()
      
      // Actualizar el evento de night_waking con endTime
      if (sleepState.lastEventId) {
        await fetch('/api/children/events', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventId: sleepState.lastEventId,
            childId,
            endTime: toLocalISOString(sleepTime),
            duration: sleepState.duration
          })
        })
      }
      
      // Crear nuevo evento de sueño
      const eventData = {
        childId,
        eventType: 'sleep',
        startTime: toLocalISOString(sleepTime),
        emotionalState: 'tranquilo',
        notes: 'Volvió a dormir después de despertar nocturno'
      }
      
      await fetch('/api/children/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData)
      })
      
      // Refrescar estado
      await refetch()
      
      toast({
        title: "🌙 Volvió a dormir",
        description: `${childName} volvió a dormir`
      })
      
      onEventRegistered?.()
      
    } catch (error) {
      console.error('Error:', error)
      toast({
        title: "Error",
        description: "No se pudo registrar el evento",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  // Calcular duración si está durmiendo
  const sleepDuration = sleepState.duration || 0
  
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins} minutos`
  }
  
  // Color del botón según estado
  const getButtonColor = () => {
    if (sleepState.status === 'sleeping' || sleepState.status === 'napping') {
      return "from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
    }
    if (sleepState.status === 'night_waking') {
      return "from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
    }
    return "from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
  }
  
  return (
    <>
      <div className="relative">
        {/* Botón Principal del Ciclo */}
        <Button
          onClick={handleMainButtonClick}
          disabled={isLoading || stateLoading}
          className={cn(
            "relative w-full h-24 text-white text-xl font-bold shadow-lg",
            "transform transition-all duration-300 rounded-xl",
            "hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]",
            "flex items-center justify-between px-6",
            "bg-gradient-to-r",
            getButtonColor()
          )}
        >
          {/* Icono y texto */}
          <div className="flex items-center gap-4">
            <ButtonIcon className="w-10 h-10" />
            <div className="text-left">
              <div className="text-2xl">
                {isLoading ? "Registrando..." : getButtonText()}
              </div>
              {sleepDuration > 0 && (sleepState.status === 'sleeping' || sleepState.status === 'napping') && (
                <div className="text-sm opacity-90">
                  Durmiendo {formatDuration(sleepDuration)}
                </div>
              )}
            </div>
          </div>
          
          {/* Badge de estado */}
          {sleepState.status === 'sleeping' && (
            <Badge className="bg-white/20 text-white border-white/30">
              <Clock className="w-3 h-3 mr-1" />
              {isNightTime() ? 'Noche' : 'Día'}
            </Badge>
          )}
          
          {sleepState.status === 'napping' && (
            <Badge className="bg-white/20 text-white border-white/30">
              <Clock className="w-3 h-3 mr-1" />
              Siesta
            </Badge>
          )}
        </Button>
        
        {/* Información del plan */}
        {plan && !plan.isDefault && (
          <div className="mt-2 text-xs text-gray-500 text-center">
            Hora de dormir: {plan.schedule.bedtime} | 
            Hora de despertar: {plan.schedule.wakeTime}
          </div>
        )}
      </div>
      
      {/* Modal de captura de delay */}
      {showSleepDelay && bedtimeTimestamp && (
        <SleepDelayCapture
          isOpen={showSleepDelay}
          onClose={() => {
            setShowSleepDelay(false)
            setBedtimeTimestamp(null)
          }}
          bedtime={bedtimeTimestamp}
          childName={childName}
          onConfirm={handleSleepConfirm}
        />
      )}
    </>
  )
}

export default UnifiedSleepCycleV2