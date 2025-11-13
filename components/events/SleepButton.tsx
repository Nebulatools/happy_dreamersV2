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
import { NightWakingModal } from './NightWakingModal'
import { useChildPlan } from '@/hooks/use-child-plan'
import { ManualEventModal } from './ManualEventModal'

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
  const { sleepState, isLoading: stateLoading, refetch } = useSleepState(childId)
  const [isProcessing, setIsProcessing] = useState(false)
  const { getCurrentTime } = useDevTime()
  const [localDuration, setLocalDuration] = useState<number | null>(null)
  const [showNightWakingModal, setShowNightWakingModal] = useState(false)
  const [showManualNap, setShowManualNap] = useState(false)
  
  // Obtener el plan del niño para determinar horarios
  const { schedule, isNightTime: isNightTimeByPlan } = useChildPlan(childId)
  
  // Asegurar que schedule tenga valores por defecto
  const safeSchedule = {
    bedtime: schedule?.bedtime || "20:00",
    wakeTime: schedule?.wakeTime || "07:00",
    naps: schedule?.naps || []
  }
  
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
  
  // Determinar si es hora de siesta o sueño nocturno basado en el plan del niño
  const isNightTime = () => {
    return isNightTimeByPlan(getCurrentTime())
  }
  
  // Determinar si un despertar es nocturno (antes de wakeTime) o definitivo (después de wakeTime)
  const isNightWaking = () => {
    // Solo verificar si el estado actual es 'sleeping' (sueño nocturno)
    if (sleepState.status !== 'sleeping') {
      console.log('[isNightWaking] Estado no es sleeping:', sleepState.status)
      return false
    }
    
    const now = getCurrentTime()
    const currentHour = now.getHours()
    const currentMinutes = now.getMinutes()
    const [wakeHour, wakeMin] = safeSchedule.wakeTime.split(':').map(Number)
    
    // Convertir todo a minutos desde medianoche para comparación más fácil
    const currentTimeInMinutes = currentHour * 60 + currentMinutes
    const wakeTimeInMinutes = wakeHour * 60 + wakeMin
    
    // Si wakeTime es en la mañana (ej: 7:00) y current es madrugada (ej: 2:00)
    // Esto es despertar nocturno
    if (wakeTimeInMinutes >= 0 && wakeTimeInMinutes <= 720) { // wakeTime es entre 00:00 y 12:00 (mañana)
      if (currentTimeInMinutes >= 0 && currentTimeInMinutes < wakeTimeInMinutes) {
        // Es madrugada/mañana temprano ANTES del wakeTime = despertar nocturno
        console.log('[isNightWaking] DETECTADO: Despertar nocturno (madrugada antes de wakeTime)')
        return true
      }
    }
    
    // Si estamos en la noche (después de las 18:00) y wakeTime es en la mañana
    // También es despertar nocturno
    if (currentHour >= 18 && wakeTimeInMinutes <= 720) {
      console.log('[isNightWaking] DETECTADO: Despertar nocturno (noche después de 18:00)')
      return true
    }
    
    console.log('[isNightWaking] NO es despertar nocturno', {
      currentHour,
      currentTimeInMinutes,
      wakeTimeInMinutes
    })
    return false
  }
  
  // Determinar texto y color del botón
  const getButtonConfig = () => {
    // Si está durmiendo (siesta o sueño nocturno)
    const isAsleep = sleepState.status === 'sleeping' || sleepState.status === 'napping'
    
    if (isAsleep) {
      // Durante sueño nocturno, determinar si es despertar nocturno o definitivo
      if (sleepState.status === 'sleeping' && isNightWaking()) {
        return {
          text: 'DESPERTAR NOCTURNO',
          icon: Sun,
          color: 'from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600',
          action: 'night_wake'
        }
      }
      // Despertar normal (de siesta o despertar definitivo de la mañana)
      return {
        text: 'SE DESPERTÓ',
        icon: Sun,
        color: 'from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600',
        action: 'wake'
      }
    } else {
      // Está despierto, determinar si es hora de dormir o siesta
      const night = isNightTime()
      return {
        text: night ? 'SE DURMIÓ' : 'SIESTA',
        icon: Moon,
        color: 'from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600',
        action: night ? 'sleep' : 'nap'
      }
    }
  }
  
  const config = getButtonConfig()
  const Icon = config.icon
  
  // Debug logging exhaustivo
  useEffect(() => {
    const now = getCurrentTime()
    const currentHour = now.getHours()
    const currentMinutes = now.getMinutes()
    const [wakeHour, wakeMin] = safeSchedule.wakeTime.split(':').map(Number)
    const currentTimeInMinutes = currentHour * 60 + currentMinutes
    const wakeTimeInMinutes = wakeHour * 60 + wakeMin
    
    console.log('[DEBUG SleepButton COMPLETO]', {
      '1_ESTADO': {
        status: sleepState.status,
        lastEventId: sleepState.lastEventId,
        lastEventType: sleepState.lastEventType
      },
      '2_SCHEDULE': {
        bedtime: safeSchedule.bedtime,
        wakeTime: safeSchedule.wakeTime,
        wakeHour,
        wakeMin
      },
      '3_TIEMPO_ACTUAL': {
        hora: now.toLocaleTimeString(),
        currentHour,
        currentMinutes,
        currentTimeInMinutes
      },
      '4_COMPARACION': {
        wakeTimeInMinutes,
        esMenorQueWakeTime: currentTimeInMinutes < wakeTimeInMinutes,
        esNoche: currentHour >= 18,
        esMadrugada: currentHour >= 0 && currentHour < 6
      },
      '5_DETECCION': {
        esNocheByPlan: isNightTime(),
        esDespertarNocturno: sleepState.status === 'sleeping' ? isNightWaking() : 'Estado no es sleeping',
        accionResultante: config.action,
        textoBoton: config.text
      },
      '6_RAZON': {
        statusEsSleeping: sleepState.status === 'sleeping',
        isNightWakingReturn: sleepState.status === 'sleeping' ? isNightWaking() : false,
        razon: sleepState.status !== 'sleeping' ? 
          'Estado no es sleeping, es: ' + sleepState.status :
          !isNightWaking() ? 
            'isNightWaking devuelve false' : 
            'Debería ser night_wake'
      }
    })
  }, [sleepState.status, config.action, safeSchedule.wakeTime])

  // Manejar confirmación del tiempo despierto durante despertar nocturno
  const handleNightWakingConfirm = async (awakeDelay: number, emotionalState: string, notes: string) => {
    try {
      // El modal ya se encargó de crear el evento, solo mostrar confirmación
      const delayText = awakeDelay < 5 ? "muy poco tiempo" :
                       awakeDelay === 60 ? "1 hora" :
                       awakeDelay > 60 ? `${Math.floor(awakeDelay/60)}h ${awakeDelay%60}min` :
                       `${awakeDelay} minutos`
      
      toast({
        title: "Despertar nocturno registrado",
        description: `${childName} estuvo despierto ${delayText}`
      })
      
      // Limpiar y cerrar modal
      setShowNightWakingModal(false)
      
      // Actualizar datos
      await refetch()
      onEventRegistered?.()
      
    } catch (error) {
      console.error('Error en confirmación de despertar nocturno:', error)
      toast({
        title: "Error",
        description: "Hubo un problema al procesar el despertar nocturno",
        variant: "destructive"
      })
    }
  }
  
  // Manejar cuando se cierra el modal de night waking sin confirmar
  const handleNightWakingModalClose = () => {
    setShowNightWakingModal(false)
  }
  
  // Manejar click del botón
  const handleClick = async () => {
    setIsProcessing(true)
    
    try {
      const now = getCurrentTime()
      const currentHour = now.getHours()
      
      // Para Siesta, abrir el modal manual con hora inicio/fin
      if (config.action === 'nap' && sleepState.status !== 'napping') {
        setShowManualNap(true)
        setIsProcessing(false)
        return
      }

      if (config.action === 'wake') {
        // DESPERTAR NORMAL (de siesta o despertar definitivo de la mañana)
        console.log('[DEBUG] Despertar normal detectado', {
          estado: sleepState.status,
          hora: now.toLocaleTimeString()
        })
        
        // Si hay un evento anterior abierto, actualizarlo con endTime
        if (sleepState.lastEventId) {
          await fetch('/api/children/events', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              eventId: sleepState.lastEventId,
              childId,
              endTime: toLocalISOString(now)
            })
          })
        }
        
        // Determinar si es despertar definitivo de la mañana (después de wakeTime del plan)
        const [wakeHour, wakeMin] = safeSchedule.wakeTime.split(':').map(Number)
        const currentMinutes = now.getMinutes()
        
        // Solo es despertar definitivo si:
        // 1. Estaba durmiendo (no en siesta)
        // 2. La hora actual es después del wakeTime del plan
        const currentTimeInMinutes = currentHour * 60 + currentMinutes
        const wakeTimeInMinutes = wakeHour * 60 + wakeMin
        
        const isDefinitiveWake = sleepState.status === 'sleeping' && 
                                 wakeTimeInMinutes <= 720 && // wakeTime es en la mañana
                                 currentTimeInMinutes >= wakeTimeInMinutes && // Ya pasó la hora de despertar
                                 currentHour < 12 // Y es antes del mediodía
        
        if (isDefinitiveWake) {
          // Es despertar definitivo de la mañana
          const wakeData: Partial<EventData> = {
            childId,
            eventType: 'wake',
            startTime: toLocalISOString(now),
            emotionalState: 'tranquilo',
            notes: 'Despertar de la mañana'
          }
          
          const response = await fetch('/api/children/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(wakeData)
          })
          
          if (!response.ok) {
            throw new Error('Error al registrar despertar')
          }
        }
        // Si es siesta, NO crear evento wake, solo actualizar endTime (ya hecho arriba)
        
      } else if (config.action === 'night_wake') {
        // DESPERTAR NOCTURNO - Mostrar modal inmediatamente para capturar toda la información
        console.log('[DEBUG] Iniciando registro de despertar nocturno con modal inmediato', {
          hora: now.toLocaleTimeString(),
          wakeTime: safeSchedule.wakeTime,
          estado: sleepState.status,
          lastEventId: sleepState.lastEventId
        })
        
        // En lugar de crear evento parcial, mostrar modal inmediatamente
        // El modal se encargará de crear el evento completo con toda la información
        setShowNightWakingModal(true)
        setIsProcessing(false) // Liberar el botón mientras el modal está abierto
        return // Salir aquí, el modal se encargará del resto
        
      } else {
        // DORMIR - Crear evento DIRECTO sin modal (Punto 33)

        const eventData: Partial<EventData> = {
          childId,
          eventType: config.action as 'sleep' | 'nap',
          startTime: toLocalISOString(now),
          emotionalState: 'tranquilo',
          notes: '',
          sleepDelay: 0 // Sin delay, se durmió inmediatamente
        }

        const response = await fetch('/api/children/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(eventData)
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Error al registrar evento')
        }

        // Mostrar toast de confirmación
        toast({
          title: config.action === 'nap' ? "Siesta registrada" : "A dormir",
          description: `${childName} se durmió`
        })
      }
      
      // Actualizar estado para todos los casos
      await refetch()
      
      // Mostrar confirmación solo para wake
      let toastTitle = ""
      let toastMessage = ""
      
      if (config.action === 'wake') {
        if (sleepState.status === 'napping') {
          toastTitle = "Fin de siesta"
          toastMessage = `${childName} terminó su siesta`
        } else {
          toastTitle = "Buenos días"
          toastMessage = `${childName} se despertó`
        }
        
        toast({
          title: toastTitle,
          description: toastMessage
        })
      }
      
      onEventRegistered?.()
      
    } catch (error) {
      console.error('Error:', error)
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
          "w-full h-20 md:h-24 text-lg md:text-xl font-bold text-white shadow-lg min-h-[44px]",
          "transform transition-all duration-200 hover:scale-[1.02]",
          "bg-gradient-to-r",
          config.color
        )}
      >
        {isProcessing || stateLoading ? (
          <Loader2 className="w-6 h-6 mr-2 animate-spin" />
        ) : (
          <Icon className="w-6 h-6 mr-2" />
        )}
        {config.text}
      </Button>
      
      {/* Mostrar duración si está durmiendo o despierto */}
      {showDuration && (
        <p className="text-sm text-gray-500 text-center mt-2">
          {formatDuration(localDuration, isAsleep)}
        </p>
      )}

      {/* Modal para capturar tiempo despierto durante despertar nocturno */}
      <NightWakingModal
        open={showNightWakingModal}
        onClose={handleNightWakingModalClose}
        onConfirm={handleNightWakingConfirm}
        childName={childName}
        childId={childId}
      />

      {/* Modal manual específico para siesta con inicio/fin */}
      <ManualEventModal
        open={showManualNap}
        onClose={() => { setShowManualNap(false); refetch(); onEventRegistered?.() }}
        childId={childId}
        childName={childName}
        onEventRegistered={() => { refetch(); onEventRegistered?.() }}
        defaultEventType="nap"
        lockEventType
      />
    </div>
  )
}
