"use client"

import React, { useState, useEffect } from 'react'
import { Moon, Sun, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { useSleepState } from '@/hooks/use-sleep-state'
import { EventData } from './types'
import { toLocalISOString } from '@/lib/date-utils'
import { cn } from '@/lib/utils'
import { useDevTime } from '@/context/dev-time-context'
import { useUser } from '@/context/UserContext'
import { getTimePartsInTimeZone } from '@/lib/timezone'

interface SleepButtonProps {
  childId: string
  childName: string
  onEventRegistered?: () => void
}

/**
 * Botón inteligente que alterna entre Dormir/Despertar
 * VERSION 4.0 - Registro directo sin modal (Punto 33)
 *
 * LÓGICA DE EVENTOS:
 * - SIESTA/SUEÑO: Crear evento DIRECTO sin modal
 * - DESPERTAR: Actualiza endTime + crea wake si es mañana
 * - DESPERTAR NOCTURNO: Muestra modal para capturar información
 *
 * FLUJO SIMPLIFICADO:
 * 1. Click "SIESTA"/"SE DURMIÓ" → Crear evento inmediatamente
 * 2. Click "DESPERTAR" → Finalizar evento actual
 * 3. Despertar nocturno → Modal para capturar detalles
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
  const [pendingEvent, setPendingEvent] = useState<{ type: 'sleep' | 'nap' | 'night_waking'; start: Date } | null>(null)
  
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
      isNightWakingWindow: minutes >= 22 * 60 || minutes < 6 * 60
    }
  }

  const getButtonConfig = () => {
    const { isNight, isNapWindow, isNightWakingWindow } = getTimeWindows()
    const isSleeping = effectiveStatus === 'sleeping'
    const isNapping = effectiveStatus === 'napping'
    const isNightWaking = effectiveStatus === 'night_waking'

    if (isNightWaking) {
      return {
        text: 'DESPERTAR NOCTURNO',
        icon: Sun,
        color: 'from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600',
        action: 'night_wake'
      }
    }

    if (isSleeping) {
      return {
        text: isNightWakingWindow ? 'DESPERTAR NOCTURNO' : 'SE DESPERTÓ',
        icon: Sun,
        color: isNightWakingWindow
          ? 'from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600'
          : 'from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600',
        action: isNightWakingWindow ? 'night_wake' : 'wake'
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

  const effectiveStatus = optimisticStatus ?? sleepState.status

  // Sincronizar id abierto desde backend
  useEffect(() => {
    if (sleepState.lastEventId) {
      setLastOpenEventId(sleepState.lastEventId)
    } else if (sleepState.status === 'awake') {
      setLastOpenEventId(null)
    }
  }, [sleepState.lastEventId, sleepState.status])

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

  // Manejar click del botón
  const handleClick = async () => {
    setIsProcessing(true)
    
    try {
      const { now } = getTimeWindows()

      const applyOptimistic = () => {
        switch (config.action) {
          case 'sleep':
            setOptimisticStatus('sleeping')
            break
          case 'nap':
            setOptimisticStatus('napping')
            break
          case 'wake':
            setOptimisticStatus('awake')
            break
          case 'night_wake':
            setOptimisticStatus('night_waking')
            break
        }
      }

      if (config.action === 'sleep' || config.action === 'nap') {
        applyOptimistic()
        // Si veníamos de un despertar nocturno pendiente, primero registrarlo
        if (pendingEvent?.type === 'night_waking') {
          const response = await fetch('/api/children/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              childId,
              eventType: 'night_waking',
              startTime: toLocalISOString(pendingEvent.start, userData.timezone),
              endTime: toLocalISOString(now, userData.timezone),
              emotionalState: 'tranquilo',
              notes: ''
            })
          })
          const respJson = await response.json().catch(() => null)
          if (!response.ok) {
            throw new Error(respJson?.error || 'Error al registrar despertar nocturno')
          }
          setPendingEvent(null)
        }

        // No guardar aún: abrimos un pending para registrar duración en el despertar (nuevo ciclo)
        setPendingEvent({ type: config.action, start: now })
        toast({
          title: config.action === 'nap' ? "Siesta iniciada" : "A dormir",
          description: "El evento se guardará cuando marques el despertar"
        })
      } else if (config.action === 'wake') {
        applyOptimistic()

        const targetId = sleepState.lastEventId || lastOpenEventId

        if (targetId) {
          await fetch('/api/children/events', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              eventId: targetId,
              childId,
              endTime: toLocalISOString(now, userData.timezone)
            })
          })
          setLastOpenEventId(null)
          setPendingEvent(null)
        } else if (pendingEvent) {
          const response = await fetch('/api/children/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              childId,
              eventType: pendingEvent.type,
              startTime: toLocalISOString(pendingEvent.start, userData.timezone),
              endTime: toLocalISOString(now, userData.timezone),
              emotionalState: 'tranquilo',
              notes: ''
            })
          })
          const respJson = await response.json().catch(() => null)
          if (!response.ok) {
            throw new Error(respJson?.error || 'Error al registrar evento')
          }
          setPendingEvent(null)
        }

        toast({
          title: pendingEvent?.type === 'nap' || sleepState.status === 'napping' ? "Fin de siesta" : "Despertar registrado",
          description: pendingEvent?.type === 'nap' || sleepState.status === 'napping'
            ? `${childName} terminó su siesta`
            : `${childName} se despertó`
        })
      } else if (config.action === 'night_wake') {
        applyOptimistic()

        setPendingEvent({ type: 'night_waking', start: now })
        toast({
          title: "Despertar nocturno",
          description: "Marca cuando vuelva a dormir para guardar la duración."
        })
      }

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
    </div>
  )
}
