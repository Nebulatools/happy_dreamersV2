"use client"

import React, { useState, useEffect } from "react"
import { Moon, Sun, Clock, Edit2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { format, differenceInMinutes } from "date-fns"
import { es } from "date-fns/locale"
import { useToast } from "@/hooks/use-toast"
import { SleepDelayCapture } from "./SleepDelayCapture"
import { ManualSleepEntry } from "./ManualSleepEntry"

// Tipos de estado del sueño
export type SleepStatus = 'awake' | 'going_to_sleep' | 'sleeping' | 'night_waking'

export interface SleepState {
  status: SleepStatus
  lastEventTime: Date | null
  bedtimeRegistered: Date | null
  childId: string
}

interface SimpleSleepToggleProps {
  childId: string
  childName: string
  onEventRegistered?: () => void
}

// Función para obtener el estado del botón según el estado actual
function getButtonConfig(state: SleepState) {
  const now = new Date()
  const hour = now.getHours()
  
  switch(state.status) {
    case 'awake':
      // Determinar si es hora de siesta o dormir nocturno
      const buttonText = (hour >= 11 && hour < 17) ? 'SIESTA' : 'SE ACOSTÓ'
      return { 
        text: buttonText, 
        icon: Moon, 
        action: 'register_bedtime',
        color: 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600',
        description: 'Registrar hora de acostarse'
      }
    
    case 'going_to_sleep':
      const minutesWaiting = state.bedtimeRegistered 
        ? differenceInMinutes(now, state.bedtimeRegistered)
        : 0
      return { 
        text: 'YA SE DURMIÓ', 
        icon: Moon, 
        action: 'confirm_sleep',
        color: 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600',
        description: `Esperando ${minutesWaiting} minutos`
      }
    
    case 'sleeping':
      // Determinar si debería despertar de siesta o del sueño nocturno
      const wakeText = (hour >= 5 && hour < 19) ? 'SE DESPERTÓ' : 'DESPERTAR NOCTURNO'
      return { 
        text: wakeText, 
        icon: Sun, 
        action: 'register_wake',
        color: 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600',
        description: state.lastEventTime ? `Durmiendo desde ${format(state.lastEventTime, 'HH:mm', { locale: es })}` : 'Durmiendo'
      }
    
    case 'night_waking':
      return { 
        text: 'VOLVIÓ A DORMIR', 
        icon: Moon, 
        action: 'back_to_sleep',
        color: 'bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600',
        description: 'Registrar que volvió a dormir'
      }
    
    default:
      return { 
        text: 'REGISTRAR SUEÑO', 
        icon: Moon, 
        action: 'register_bedtime',
        color: 'bg-gradient-to-r from-blue-500 to-purple-500',
        description: 'Iniciar registro'
      }
  }
}

// Función para cargar estado desde localStorage
function loadState(childId: string): SleepState {
  if (typeof window === 'undefined') {
    return {
      status: 'awake',
      lastEventTime: null,
      bedtimeRegistered: null,
      childId
    }
  }
  
  const saved = localStorage.getItem(`sleep-state-${childId}`)
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      return {
        ...parsed,
        lastEventTime: parsed.lastEventTime ? new Date(parsed.lastEventTime) : null,
        bedtimeRegistered: parsed.bedtimeRegistered ? new Date(parsed.bedtimeRegistered) : null
      }
    } catch {
      // Si hay error, retornar estado por defecto
    }
  }
  
  return {
    status: 'awake',
    lastEventTime: null,
    bedtimeRegistered: null,
    childId
  }
}

// Función para guardar estado en localStorage
function saveState(state: SleepState) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(`sleep-state-${state.childId}`, JSON.stringify(state))
  }
}

export default function SimpleSleepToggle({ 
  childId, 
  childName,
  onEventRegistered 
}: SimpleSleepToggleProps) {
  const { toast } = useToast()
  const [state, setState] = useState<SleepState>(() => loadState(childId))
  const [showDelayCapture, setShowDelayCapture] = useState(false)
  const [showManualEntry, setShowManualEntry] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  const buttonConfig = getButtonConfig(state)
  const ButtonIcon = buttonConfig.icon
  
  // Guardar estado cuando cambie
  useEffect(() => {
    saveState(state)
  }, [state])
  
  // Manejar click del botón principal
  const handleMainButtonClick = async () => {
    const now = new Date()
    
    switch(buttonConfig.action) {
      case 'register_bedtime':
        // Registrar hora de acostarse
        setState(prev => ({
          ...prev,
          status: 'going_to_sleep',
          bedtimeRegistered: now
        }))
        setShowDelayCapture(true)
        break
      
      case 'confirm_sleep':
        // Confirmar que se durmió
        await registerSleepEvent(now)
        break
      
      case 'register_wake':
        // Registrar despertar
        await registerWakeEvent(now)
        break
      
      case 'back_to_sleep':
        // Volvió a dormir después de despertar nocturno
        await registerBackToSleep(now)
        break
    }
  }
  
  // Registrar evento de sueño
  const registerSleepEvent = async (sleepTime: Date, customDelay?: number) => {
    setIsLoading(true)
    
    try {
      // Calcular sleep delay
      const delay = customDelay !== undefined 
        ? customDelay 
        : state.bedtimeRegistered 
          ? differenceInMinutes(sleepTime, state.bedtimeRegistered)
          : 0
      
      // Determinar tipo de sueño basado en la hora
      const hour = sleepTime.getHours()
      const eventType = (hour >= 19 || hour < 5) ? 'sleep' : 'nap'
      
      // Crear evento
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
      
      // Actualizar estado
      setState(prev => ({
        ...prev,
        status: 'sleeping',
        lastEventTime: sleepTime,
        bedtimeRegistered: null
      }))
      
      toast({
        title: "✅ Sueño registrado",
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
    }
  }
  
  // Registrar evento de despertar
  const registerWakeEvent = async (wakeTime: Date) => {
    setIsLoading(true)
    
    try {
      const hour = wakeTime.getHours()
      let eventType = 'wake'
      
      // Determinar tipo de despertar
      if (hour >= 23 || hour < 5) {
        eventType = 'night_waking'
      }
      
      // Si hay un evento de sueño previo, actualizar su endTime
      if (state.lastEventTime) {
        // Aquí deberíamos actualizar el evento anterior con endTime
        // Por ahora creamos un nuevo evento de despertar
      }
      
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
      
      // Actualizar estado según tipo de despertar
      const newStatus = eventType === 'night_waking' ? 'night_waking' : 'awake'
      
      setState(prev => ({
        ...prev,
        status: newStatus,
        lastEventTime: wakeTime
      }))
      
      toast({
        title: "☀️ Despertar registrado",
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
      // Calcular cuánto tardó en volver a dormir
      const delay = state.lastEventTime 
        ? differenceInMinutes(sleepTime, state.lastEventTime)
        : 0
      
      const eventData = {
        childId,
        eventType: 'sleep',
        startTime: sleepTime.toISOString(),
        emotionalState: 'tranquilo',
        nightWakingDelay: delay,
        notes: `Volvió a dormir después de ${delay} minutos`
      }
      
      const response = await fetch('/api/children/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData)
      })
      
      if (!response.ok) throw new Error('Error al registrar evento')
      
      setState(prev => ({
        ...prev,
        status: 'sleeping',
        lastEventTime: sleepTime
      }))
      
      toast({
        title: "🌙 Volvió a dormir",
        description: `${childName} tardó ${delay} minutos en volver a dormir`,
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
  const sleepDuration = state.status === 'sleeping' && state.lastEventTime
    ? differenceInMinutes(new Date(), state.lastEventTime)
    : 0
  
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins} minutos`
  }
  
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 space-y-4">
      {/* Header con nombre del niño */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold text-gray-800">
          Registro de Sueño - {childName}
        </h3>
        {state.status === 'sleeping' && (
          <Badge variant="default" className="bg-blue-100 text-blue-700">
            Durmiendo {formatDuration(sleepDuration)}
          </Badge>
        )}
      </div>
      
      {/* Botón principal grande */}
      <Button
        onClick={handleMainButtonClick}
        disabled={isLoading}
        className={cn(
          "w-full h-24 text-white text-xl font-bold shadow-lg transform transition-all duration-200",
          "hover:scale-[1.02] active:scale-[0.98]",
          buttonConfig.color
        )}
      >
        <ButtonIcon className="w-8 h-8 mr-3" />
        {isLoading ? "Registrando..." : buttonConfig.text}
      </Button>
      
      {/* Descripción del estado */}
      <p className="text-sm text-gray-600 text-center">
        {buttonConfig.description}
      </p>
      
      {/* Botón secundario para registro manual */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowManualEntry(true)}
        className="w-full text-gray-600 hover:text-gray-800"
      >
        <Edit2 className="w-4 h-4 mr-2" />
        Registrar evento pasado
      </Button>
      
      {/* Modal de captura de delay */}
      {showDelayCapture && state.bedtimeRegistered && (
        <SleepDelayCapture
          isOpen={showDelayCapture}
          onClose={() => setShowDelayCapture(false)}
          bedtime={state.bedtimeRegistered}
          childName={childName}
          onConfirm={(sleepTime, delay) => registerSleepEvent(sleepTime, delay)}
        />
      )}
      
      {/* Modal de registro manual */}
      {showManualEntry && (
        <ManualSleepEntry
          isOpen={showManualEntry}
          onClose={() => setShowManualEntry(false)}
          childId={childId}
          childName={childName}
          onEventRegistered={() => {
            onEventRegistered?.()
            setShowManualEntry(false)
          }}
        />
      )}
    </div>
  )
}