"use client"

import React, { useState, useEffect } from 'react'
import { Moon, Sun, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { SleepStatus, useSleepState } from '@/hooks/use-sleep-state'
import { EventData } from './types'
import { toLocalISOString } from '@/lib/date-utils'
import { cn } from '@/lib/utils'
import { useDevTime } from '@/context/dev-time-context'
import { useUser } from '@/context/UserContext'
import { getTimePartsInTimeZone } from '@/lib/timezone'
import { SleepDelayModal } from './SleepDelayModal'
import { EventNotesModal } from './EventNotesModal'

interface SleepButtonProps {
  childId: string
  childName: string
  onEventRegistered?: () => void
}

/**
 * Botón inteligente que alterna entre Dormir/Despertar
 * VERSION 4.1 - Captura guiada con modales
 *
 * LÓGICA DE EVENTOS:
 * - SIESTA/SUEÑO: abre modal de delay/estado/notas y guarda pendiente hasta el despertar.
 * - DESPERTAR: abre modal de estado/notas y cierra el evento (PATCH/POST).
 * - DESPERTAR NOCTURNO: abre modal rápido, se cierra automáticamente al volver a dormir.
 */
export function SleepButton({ 
  childId, 
  childName,
  onEventRegistered 
}: SleepButtonProps) {
  const { toast } = useToast()
  const { userData } = useUser()
  const { sleepState, isLoading: stateLoading, refetch } = useSleepState(childId, userData.timezone)
  const [isProcessing, setIsProcessing] = useState(false)
  const { getCurrentTime } = useDevTime()
  const [localDuration, setLocalDuration] = useState<number | null>(null)
  const [lastOpenEventId, setLastOpenEventId] = useState<string | null>(null)
  const [pendingEvent, setPendingEvent] = useState<{
    type: 'sleep' | 'nap' | 'night_waking'
    start: string // ISO string for persistence
    sleepDelay?: number
    emotionalState?: string
    notes?: string
  } | null>(null)
  const [sleepModalConfig, setSleepModalConfig] = useState<{ eventType: 'sleep' | 'nap'; start: Date } | null>(null)
  const [notesModalConfig, setNotesModalConfig] = useState<{ action: 'wake' | 'night_wake'; start: Date } | null>(null)

  const storageKey = `pending_sleep_event_${childId}`
  
  // Calcular duración localmente usando tiempo simulado
  useEffect(() => {
    if (sleepState.lastEventTime && (sleepState.status === 'sleeping' || sleepState.status === 'napping')) {
      const interval = setInterval(() => {
        const now = getCurrentTime()
        const eventTime = new Date(sleepState.lastEventTime!)
        const diffMs = now.getTime() - eventTime.getTime()
        const diffMinutes = Math.floor(diffMs / (1000 * 60))
        
        // Solo actualizar si es positivo
        if (diffMinutes >= 0) {
          setLocalDuration(diffMinutes)
        } else {
          setLocalDuration(0)
        }
      }, 10000) // Actualizar cada 10 segundos
      
      // Calcular inmediatamente
      const now = getCurrentTime()
      const eventTime = new Date(sleepState.lastEventTime)
      const diffMs = now.getTime() - eventTime.getTime()
      const diffMinutes = Math.floor(diffMs / (1000 * 60))
      setLocalDuration(diffMinutes >= 0 ? diffMinutes : 0)
      
      return () => clearInterval(interval)
    } else if (sleepState.status === 'awake' && sleepState.lastEventTime) {
      // Calcular tiempo despierto
      const interval = setInterval(() => {
        const now = getCurrentTime()
        const eventTime = new Date(sleepState.lastEventTime!)
        const diffMs = now.getTime() - eventTime.getTime()
        const diffMinutes = Math.floor(diffMs / (1000 * 60))
        
        if (diffMinutes >= 0) {
          setLocalDuration(diffMinutes)
        } else {
          setLocalDuration(0)
        }
      }, 60000) // Actualizar cada minuto para tiempo despierto
      
      // Calcular inmediatamente
      const now = getCurrentTime()
      const eventTime = new Date(sleepState.lastEventTime)
      const diffMs = now.getTime() - eventTime.getTime()
      const diffMinutes = Math.floor(diffMs / (1000 * 60))
      setLocalDuration(diffMinutes >= 0 ? diffMinutes : 0)
      
      return () => clearInterval(interval)
    } else {
      setLocalDuration(null)
    }
  }, [sleepState.lastEventTime, sleepState.status, getCurrentTime])
  
  const getTimeWindows = () => {
    const baseNow = getCurrentTime()
    const parts = getTimePartsInTimeZone(baseNow, userData.timezone)
    const minutes = parts.hours * 60 + parts.minutes
    return {
      now: parts.date,
      minutes,
      isNight: minutes >= 18 * 60 || minutes < 6 * 60,
      isNapWindow: minutes >= 8 * 60 && minutes < 17 * 60,
      isNightWakingWindow: minutes >= 22 * 60 || minutes < 6 * 60,
      isMorning: minutes >= 6 * 60  // >= 6:00 AM es manana (fin del sueno nocturno)
    }
  }

  const getButtonConfig = () => {
    const { isNight, isNapWindow, isNightWakingWindow, isMorning } = getTimeWindows()
    const isSleeping = effectiveStatus === 'sleeping'
    const isNapping = effectiveStatus === 'napping'
    const isNightWaking = effectiveStatus === 'night_waking'

    if (isNightWaking) {
      return {
        text: 'VOLVER A DORMIR',
        icon: Moon,
        color: 'from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600',
        action: 'sleep'
      }
    }

    if (isSleeping) {
      // Si es sueno nocturno (tipo 'sleep'):
      // - Durante horas nocturnas (18:00-6:00): mostrar DESPERTAR NOCTURNO
      // - Despues de 6 AM (y antes de 18:00): mostrar SE DESPERTO (es manana)
      const isNightSleep = pendingEvent?.type === 'sleep'
      const shouldShowNightWaking = isNightSleep
        ? isNight  // Tipo sleep: DESPERTAR NOCTURNO durante horas nocturnas (18:00-6:00)
        : isNightWakingWindow   // Sin pending: usar logica de ventana horaria (legacy)

      return {
        text: shouldShowNightWaking ? 'DESPERTAR NOCTURNO' : 'SE DESPERTÓ',
        icon: Sun,
        color: shouldShowNightWaking
          ? 'from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600'
          : 'from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600',
        action: shouldShowNightWaking ? 'night_wake' : 'wake'
      }
    }

    if (isNapping) {
      return {
        text: 'SE DESPERTÓ',
        icon: Sun,
        color: 'from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600',
        action: 'wake'
      }
    }

    if (isNight) {
      return {
        text: 'DORMIR',
        icon: Moon,
        color: 'from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600',
        action: 'sleep'
      }
    }

    if (isNapWindow) {
      return {
        text: 'SIESTA',
        icon: Moon,
        color: 'from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600',
        action: 'nap'
      }
    }

    return {
      text: 'DORMIR',
      icon: Moon,
      color: 'from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600',
      action: 'sleep'
    }
  }
  
  const [optimisticStatus, setOptimisticStatus] = useState<SleepStatus | null>(null)

  // Derivar estado efectivo considerando pending (persistido) + backend
  const derivedStatusFromPending = pendingEvent
    ? pendingEvent.type === 'night_waking'
      ? 'night_waking'
      : pendingEvent.type === 'nap'
        ? 'napping'
        : 'sleeping'
    : null

  const effectiveStatus = derivedStatusFromPending ?? optimisticStatus ?? sleepState.status

  // Cargar pending desde localStorage para no perder estado tras refresh
  useEffect(() => {
    const stored = localStorage.getItem(storageKey)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        if (parsed?.type && parsed?.start) {
          setPendingEvent(parsed)
          setOptimisticStatus(parsed.type === 'nap' ? 'napping' : parsed.type === 'night_waking' ? 'night_waking' : 'sleeping')
        }
      } catch (e) {
        console.warn('No se pudo parsear pending event', e)
      }
    }
  }, [storageKey])

  // Persistir pending en localStorage
  useEffect(() => {
    if (pendingEvent) {
      localStorage.setItem(storageKey, JSON.stringify(pendingEvent))
    } else {
      localStorage.removeItem(storageKey)
    }
  }, [pendingEvent, storageKey])

  // Sincronizar id abierto desde backend (solo si no hay pending local)
  useEffect(() => {
    if (pendingEvent) return
    if (sleepState.lastEventId) {
      setLastOpenEventId(sleepState.lastEventId)
    } else if (sleepState.status === 'awake') {
      setLastOpenEventId(null)
    }
  }, [sleepState.lastEventId, sleepState.status, pendingEvent])

  useEffect(() => {
    if (optimisticStatus && sleepState.status === optimisticStatus) {
      setOptimisticStatus(null)
    }
  }, [sleepState.status, optimisticStatus])

  const config = getButtonConfig()

  const isSleepingState = effectiveStatus === 'sleeping' || effectiveStatus === 'napping' || effectiveStatus === 'night_waking'
  const displayText = config.text // Siempre mostrar la acción, no el estado
  const buttonColor = config.color // Usar el color de la acción
  const DisplayIcon = config.icon // Usar el icono de la acción
  
  // Debug logging exhaustivo
  useEffect(() => {
    const now = getCurrentTime()
    console.log('[DEBUG SleepButton]', {
      status: sleepState.status,
      lastEventId: sleepState.lastEventId,
      accion: config.action,
      hora: now.toLocaleTimeString()
    })
  }, [sleepState.status, config.action, getCurrentTime])

  const combineNotes = (...values: (string | undefined)[]) =>
    values.filter((val) => val && val.trim().length > 0).join(" | ")

  const finalizeNightWaking = async (endTime: Date) => {
    if (pendingEvent?.type !== 'night_waking') return
    const startDate = new Date(pendingEvent.start)
    const awakeDelay = Math.max(
      1,
      Math.floor((endTime.getTime() - startDate.getTime()) / (1000 * 60))
    )

    const response = await fetch('/api/children/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        childId,
        eventType: 'night_waking',
        startTime: toLocalISOString(startDate, userData.timezone),
        endTime: toLocalISOString(endTime, userData.timezone),
        emotionalState: pendingEvent.emotionalState || 'tranquilo',
        notes: pendingEvent.notes || '',
        awakeDelay
      })
    })
    const respJson = await response.json().catch(() => null)
    if (!response.ok) {
      throw new Error(respJson?.error || 'Error al registrar despertar nocturno')
    }

    setPendingEvent(null)
  }

  // Manejar click del botón (abre el modal correspondiente)
  const handleClick = () => {
    // Usar getCurrentTime() directamente para obtener el tiempo real (o simulado)
    // NO usar getTimeWindows().now que es un Date "shifted" para display
    const now = getCurrentTime()
    if (config.action === 'sleep' || config.action === 'nap') {
      setSleepModalConfig({ eventType: config.action, start: now })
      return
    }

    if (config.action === 'wake' || config.action === 'night_wake') {
      setNotesModalConfig({ action: config.action, start: now })
    }
  }

  const handleSleepConfirm = async (delay: number, emotionalStateValue: string, notesValue: string) => {
    if (!sleepModalConfig) return
    setIsProcessing(true)
    const startTime = sleepModalConfig.start
    try {
      // Si había un despertar nocturno pendiente, cerrarlo antes de arrancar un nuevo ciclo
      if (pendingEvent?.type === 'night_waking') {
        await finalizeNightWaking(startTime)
      }

      setPendingEvent({
        type: sleepModalConfig.eventType,
        start: toLocalISOString(startTime, userData.timezone),
        sleepDelay: delay,
        emotionalState: emotionalStateValue,
        notes: notesValue
      })

      setOptimisticStatus(sleepModalConfig.eventType === 'nap' ? 'napping' : 'sleeping')
      toast({
        title: sleepModalConfig.eventType === 'nap' ? "Siesta iniciada" : "A dormir",
        description: "Guarda el despertar para registrar la duración y notas."
      })
    } catch (error) {
      console.error('Error:', error)
      setOptimisticStatus(null)
      toast({
        title: "Error",
        description: "No se pudo preparar el registro",
        variant: "destructive"
      })
    } finally {
      setSleepModalConfig(null)
      setIsProcessing(false)
    }
  }

  const handleNotesConfirm = async (emotionalStateValue: string, notesValue: string) => {
    if (!notesModalConfig) return

    // Si es despertar nocturno, solo abrimos el pending (se cerrará al volver a dormir)
    if (notesModalConfig.action === 'night_wake') {
      setIsProcessing(true)
      try {
        setPendingEvent({
          type: 'night_waking',
          start: notesModalConfig.start,
          emotionalState: emotionalStateValue,
          notes: notesValue
        })
        setOptimisticStatus('night_waking')
        toast({
          title: "Despertar nocturno",
          description: "Marca cuando vuelva a dormir para guardar la duración."
        })
      } finally {
        setNotesModalConfig(null)
        setIsProcessing(false)
      }
      return
    }

    // Caso despertar normal
    setIsProcessing(true)
    const endTime = notesModalConfig.start
    const emotion = emotionalStateValue || pendingEvent?.emotionalState || 'tranquilo'
    const mergedNotes = combineNotes(pendingEvent?.notes, notesValue)
    const sleepDelay = pendingEvent?.sleepDelay
    const eventType = pendingEvent?.type ?? (sleepState.status === 'napping' ? 'nap' : 'sleep')
    const startTime = pendingEvent?.start
      ? new Date(pendingEvent.start)
      : (sleepState.lastEventTime ? new Date(sleepState.lastEventTime) : endTime)

    try {
      const response = await fetch('/api/children/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childId,
          eventType,
          startTime: toLocalISOString(startTime, userData.timezone),
          endTime: toLocalISOString(endTime, userData.timezone),
          emotionalState: emotion,
          notes: mergedNotes,
          ...(sleepDelay !== undefined ? { sleepDelay } : {})
        } satisfies Partial<EventData>)
      })
      const respJson = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(respJson?.error || 'Error al registrar evento')
      }
      if (respJson?.event?._id) {
        setLastOpenEventId(respJson.event._id)
      }

      setPendingEvent(null)
      setOptimisticStatus('awake')
      toast({
        title: eventType === 'nap' ? "Fin de siesta" : "Despertar registrado",
        description: mergedNotes
          ? "Guardamos tus notas y estado emocional."
          : `${childName} se despertó`
      })

      await refetch()
      onEventRegistered?.()
    } catch (error) {
      console.error('Error:', error)
      setOptimisticStatus(null)
      toast({
        title: "Error",
        description: "No se pudo registrar el evento",
        variant: "destructive"
      })
    } finally {
      setNotesModalConfig(null)
      setIsProcessing(false)
    }
  }
  
  // Formatear duración según el estado
  const formatDuration = (minutes: number | null, isAsleep: boolean) => {
    if (!minutes && minutes !== 0) return null
    
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    
    if (isAsleep) {
      // Está durmiendo
      if (hours > 0) {
        return `${hours}h ${mins}m durmiendo`
      }
      return `${mins} minutos durmiendo`
    } else {
      // Está despierto
      if (hours > 0) {
        return `Despierto hace ${hours}h ${mins}m`
      }
      return `Despierto hace ${mins} minutos`
    }
  }
  
  // Determinar si mostrar duración
  const isAsleep = sleepState.status === 'sleeping' || sleepState.status === 'napping'
  const showDuration = localDuration !== null && (isAsleep || sleepState.status === 'awake')
  
  return (
    <div className="w-full">
      <Button
        onClick={handleClick}
        disabled={isProcessing || stateLoading}
        className={cn(
          "w-full h-20 md:h-24 text-lg md:text-xl font-bold shadow-lg min-h-[44px]",
          "transform transition-all duration-200 hover:scale-[1.02]",
          "bg-gradient-to-r text-white",
          buttonColor
        )}
      >
        {isProcessing || stateLoading ? (
          <Loader2 className="w-6 h-6 mr-2 animate-spin" />
        ) : (
          <DisplayIcon className="w-6 h-6 mr-2" />
        )}
        {displayText}
      </Button>
      
      {/* Mostrar duración si está durmiendo o despierto */}
      {showDuration && (
        <p className="text-sm text-gray-500 text-center mt-2">
          {formatDuration(localDuration, isAsleep)}
        </p>
      )}

      <SleepDelayModal
        open={!!sleepModalConfig}
        onClose={() => setSleepModalConfig(null)}
        onConfirm={handleSleepConfirm}
        childName={childName}
        eventType={sleepModalConfig?.eventType || 'sleep'}
      />

      <EventNotesModal
        open={!!notesModalConfig}
        onClose={() => setNotesModalConfig(null)}
        onConfirm={handleNotesConfirm}
        title={
          notesModalConfig?.action === 'night_wake'
            ? 'Despertar nocturno'
            : 'Registrar despertar'
        }
        description={
          notesModalConfig?.action === 'night_wake'
            ? 'Añade el estado emocional y notas breves del despertar nocturno.'
            : 'Captura cómo se despertó y cualquier detalle importante.'
        }
        defaultEmotion={pendingEvent?.emotionalState}
        defaultNotes={pendingEvent?.notes}
        confirmLabel={
          notesModalConfig?.action === 'night_wake'
            ? 'Guardar despertar'
            : 'Guardar'
        }
      />
    </div>
  )
}
