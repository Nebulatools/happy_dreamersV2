"use client"

import React, { useState } from "react"
import { Moon, Sun, Clock, Edit2, Plus, Utensils, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { format, differenceInMinutes } from "date-fns"
import { es } from "date-fns/locale"
import { useToast } from "@/hooks/use-toast"
import { SleepDelayCapture } from "./SleepDelayCapture"
import { ManualSleepEntry } from "./ManualSleepEntry"
import { QuickEventSelector } from "./QuickEventSelector"
import { FeedingModal } from "./FeedingModal"
import { useChildPlan } from "@/hooks/use-child-plan"
import { useSleepState } from "@/hooks/use-sleep-state"

interface SimpleSleepToggleV2Props {
  childId: string
  childName: string
  onEventRegistered?: () => void
  hideOtherEventsButton?: boolean
}

export function SimpleSleepToggleV2({ 
  childId, 
  childName,
  onEventRegistered,
  hideOtherEventsButton = false
}: SimpleSleepToggleV2Props) {
  const { toast } = useToast()
  const { plan, isNightTime } = useChildPlan(childId)
  const { sleepState, buttonConfig, isLoading: stateLoading, refetch } = useSleepState(childId)
  
  const [showDelayCapture, setShowDelayCapture] = useState(false)
  const [showManualEntry, setShowManualEntry] = useState(false)
  const [showQuickSelector, setShowQuickSelector] = useState(false)
  const [showFeedingModal, setShowFeedingModal] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [bedtimeRegistered, setBedtimeRegistered] = useState<Date | null>(null)
  
  // Iconos dinámicos basados en el estado
  const getButtonIcon = () => {
    switch(buttonConfig.icon) {
      case 'Moon': return Moon
      case 'Sun': return Sun
      case 'AlertCircle': return AlertCircle
      default: return Moon
    }
  }
  
  const ButtonIcon = getButtonIcon()
  
  // Colores dinámicos basados en el estado
  const getButtonColor = () => {
    switch(buttonConfig.color) {
      case 'blue-purple': return 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600'
      case 'yellow-orange': return 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600'
      case 'red-orange': return 'bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600'
      case 'indigo-purple': return 'bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600'
      default: return 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600'
    }
  }
  
  // Manejar click del botón principal
  const handleMainButtonClick = async () => {
    const now = new Date()
    
    switch(buttonConfig.action) {
      case 'start_sleep':
      case 'start_nap':
        // Registrar hora de acostarse y mostrar captura de delay
        setBedtimeRegistered(now)
        setShowDelayCapture(true)
        break
        
      case 'wake_from_nap':
      case 'night_wake':
        // Registrar despertar y actualizar evento anterior
        await registerWakeEvent(now)
        break
        
      case 'back_to_sleep':
        // Volver a dormir después de despertar nocturno
        await registerBackToSleep(now)
        break
    }
  }
  
  // Registrar evento de sueño con delay
  const registerSleepEvent = async (sleepTime: Date, customDelay?: number) => {
    setIsLoading(true)
    
    try {
      const delay = customDelay !== undefined 
        ? customDelay 
        : bedtimeRegistered 
          ? differenceInMinutes(sleepTime, bedtimeRegistered)
          : 0
      
      // Determinar tipo basado en el contexto del plan
      const eventType = buttonConfig.action === 'start_nap' ? 'nap' : 'sleep'
      
      const eventData = {
        childId,
        eventType,
        startTime: sleepTime.toISOString(),
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
      
      // Refrescar el estado desde la BD
      await refetch()
      
      toast({
        title: eventType === 'nap' ? "😴 Siesta registrada" : "🌙 Sueño registrado",
        description: delay > 0 
          ? `${childName} tardó ${delay} minutos en dormirse`
          : `${childName} se durmió inmediatamente`,
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
      setShowDelayCapture(false)
      setBedtimeRegistered(null)
    }
  }
  
  // Registrar despertar y actualizar evento anterior
  const registerWakeEvent = async (wakeTime: Date) => {
    setIsLoading(true)
    
    try {
      // Primero actualizar el evento anterior con endTime
      if (sleepState.lastEventId) {
        await fetch('/api/children/events', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventId: sleepState.lastEventId,
            childId,
            endTime: wakeTime.toISOString(),
            duration: sleepState.duration
          })
        })
      }
      
      // Luego crear evento de despertar
      const eventType = buttonConfig.action === 'wake_from_nap' ? 'wake' : 'night_waking'
      
      const eventData = {
        childId,
        eventType,
        startTime: wakeTime.toISOString(),
        emotionalState: eventType === 'night_waking' ? 'inquieto' : 'tranquilo'
      }
      
      const response = await fetch('/api/children/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData)
      })
      
      if (!response.ok) throw new Error('Error al registrar despertar')
      
      // Refrescar el estado desde la BD
      await refetch()
      
      toast({
        title: eventType === 'wake' ? "☀️ Despertar registrado" : "🌙 Despertar nocturno",
        description: eventType === 'night_waking' 
          ? `${childName} se despertó durante la noche`
          : `${childName} se despertó`,
      })
      
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
  
  // Registrar que volvió a dormir
  const registerBackToSleep = async (sleepTime: Date) => {
    setIsLoading(true)
    
    try {
      // Actualizar el evento de night_waking anterior con endTime
      if (sleepState.lastEventId) {
        await fetch('/api/children/events', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventId: sleepState.lastEventId,
            childId,
            endTime: sleepTime.toISOString(),
            duration: sleepState.duration
          })
        })
      }
      
      // Crear nuevo evento de sueño
      const eventData = {
        childId,
        eventType: 'sleep',
        startTime: sleepTime.toISOString(),
        emotionalState: 'tranquilo',
        notes: `Volvió a dormir después de despertar nocturno`
      }
      
      const response = await fetch('/api/children/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData)
      })
      
      if (!response.ok) throw new Error('Error al registrar evento')
      
      // Refrescar el estado desde la BD
      await refetch()
      
      toast({
        title: "🌙 Volvió a dormir",
        description: `${childName} volvió a dormir`,
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
  
  // Formatear duración
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins} minutos`
  }
  
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 rounded-3xl shadow-2xl border border-blue-100/50 p-8 space-y-6">
      {/* Decoración de fondo */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-200/20 to-purple-200/20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-purple-200/20 to-pink-200/20 rounded-full blur-3xl" />
      
      {/* Header con nombre del niño y estado */}
      <div className="relative flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg">
            <Moon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              Registro de Sueño Inteligente
            </h3>
            <p className="text-sm text-gray-600">{childName}</p>
          </div>
        </div>
        
        {/* Badge de estado actual */}
        {sleepState.duration && sleepState.duration > 0 && (
          <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0 px-4 py-2 text-sm font-semibold shadow-lg">
            <Clock className="w-4 h-4 mr-2" />
            {buttonConfig.description}
          </Badge>
        )}
        
        {/* Indicador de plan */}
        {plan && !plan.isDefault && (
          <Badge variant="outline" className="ml-2">
            Plan personalizado activo
          </Badge>
        )}
      </div>
      
      {/* Botón principal inteligente */}
      <div className="relative">
        <Button
          onClick={handleMainButtonClick}
          disabled={isLoading || stateLoading}
          className={cn(
            "relative w-full h-32 text-white text-2xl font-bold shadow-2xl",
            "transform transition-all duration-300 rounded-2xl",
            "hover:scale-[1.03] hover:shadow-3xl active:scale-[0.98]",
            "flex items-center justify-center gap-4",
            getButtonColor()
          )}
        >
          <div className="absolute inset-0 bg-white/10 rounded-2xl" />
          <ButtonIcon className="w-12 h-12 drop-shadow-lg" />
          <div className="flex flex-col items-start">
            <span className="text-2xl font-bold">
              {isLoading ? "Registrando..." : buttonConfig.text}
            </span>
            <span className="text-sm opacity-90 font-normal">
              {buttonConfig.description}
            </span>
          </div>
        </Button>
        
        {/* Efecto de brillo animado */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-shimmer pointer-events-none" />
      </div>
      
      {/* Información del plan activo */}
      {plan && (
        <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Hora de dormir:</span>
            <span className="font-semibold">{plan.schedule.bedtime}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Hora de despertar:</span>
            <span className="font-semibold">{plan.schedule.wakeTime}</span>
          </div>
          {isNightTime() && (
            <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200">
              Horario nocturno activo
            </Badge>
          )}
        </div>
      )}
      
      {/* Eventos principales */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          onClick={() => setShowFeedingModal(true)}
          className="h-24 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg hover:shadow-xl transform transition-all duration-200 hover:scale-[1.02] rounded-xl"
        >
          <div className="flex items-center gap-3">
            <Utensils className="w-8 h-8" />
            <div className="text-left">
              <div className="font-bold text-lg">ALIMENTACIÓN</div>
              <div className="text-xs opacity-90">Toma o comida</div>
            </div>
          </div>
        </Button>
        
        {!hideOtherEventsButton && (
          <Button
            variant="outline"
            onClick={() => setShowQuickSelector(true)}
            className="h-24 bg-white/80 backdrop-blur-sm border-2 border-gray-200 hover:bg-white hover:border-gray-300 transition-all duration-200"
          >
            <div className="flex items-center gap-3">
              <Plus className="w-6 h-6" />
              <div className="text-left">
                <div className="font-semibold">Otros Eventos</div>
                <div className="text-xs text-gray-600">Medicamentos, actividades</div>
              </div>
            </div>
          </Button>
        )}
      </div>
      
      {/* Botón de Registro Manual */}
      <div className="relative">
        <Button
          variant="outline"
          size="lg"
          onClick={() => setShowManualEntry(true)}
          className="w-full bg-white/80 backdrop-blur-sm border-2 border-gray-200 hover:bg-white hover:border-gray-300 transition-all duration-200"
        >
          <Edit2 className="w-5 h-5 mr-2" />
          Registro Manual
        </Button>
      </div>
      
      {/* Modales */}
      {showDelayCapture && bedtimeRegistered && (
        <SleepDelayCapture
          isOpen={showDelayCapture}
          onClose={() => {
            setShowDelayCapture(false)
            setBedtimeRegistered(null)
          }}
          bedtime={bedtimeRegistered}
          childName={childName}
          onConfirm={(sleepTime, delay) => registerSleepEvent(sleepTime, delay)}
        />
      )}
      
      {showManualEntry && (
        <ManualSleepEntry
          isOpen={showManualEntry}
          onClose={() => setShowManualEntry(false)}
          childId={childId}
          childName={childName}
          onEventRegistered={() => {
            onEventRegistered?.()
            refetch()
            setShowManualEntry(false)
          }}
        />
      )}
      
      {showQuickSelector && (
        <QuickEventSelector
          isOpen={showQuickSelector}
          onClose={() => setShowQuickSelector(false)}
          childId={childId}
          children={[{
            _id: childId,
            firstName: childName,
            lastName: ""
          }]}
          onEventCreated={() => {
            onEventRegistered?.()
            refetch()
            setShowQuickSelector(false)
          }}
        />
      )}
      
      {showFeedingModal && (
        <FeedingModal
          isOpen={showFeedingModal}
          onClose={() => setShowFeedingModal(false)}
          childId={childId}
          childName={childName}
          onEventRegistered={() => {
            onEventRegistered?.()
            refetch()
            setShowFeedingModal(false)
          }}
        />
      )}
    </div>
  )
}

export default SimpleSleepToggleV2