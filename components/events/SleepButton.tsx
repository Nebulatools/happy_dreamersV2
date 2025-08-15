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
import { SleepDelayModal } from './SleepDelayModal'
import { useEventRegistration, useModeContext } from '@/context/mode-context'
import { getQuickDefaults } from '@/lib/smart-defaults-engine'

interface SleepButtonProps {
  childId: string
  childName: string
  childData?: { id: string; birthDate: string } // Para SmartDefaultsEngine
  eventHistory?: EventData[] // Para SmartDefaultsEngine
  onEventRegistered?: () => void
}

/**
 * Botón inteligente que alterna entre Dormir/Despertar
 * VERSION 5.0 - Sistema de modo dual
 * 
 * LÓGICA DE EVENTOS MODO DUAL:
 * 
 * MODO SIMPLE:
 * - SIESTA/SUEÑO: 1-click directo con defaults inteligentes
 * - DESPERTAR: Directo (actualiza endTime + crea wake si es mañana)
 * - Sin modales, registro inmediato
 * 
 * MODO AVANZADO:
 * - SIESTA/SUEÑO: Modal PRIMERO → Confirmar delay → ENTONCES crear evento
 * - DESPERTAR: Directo (actualiza endTime + crea wake si es mañana)
 * - CANCELAR MODAL: NO crea evento (operación cancelada)
 * 
 * FLUJO MODO SIMPLE:
 * 1. Click "SIESTA"/"SE DURMIÓ" → Crear evento inmediatamente con SmartDefaults
 * 
 * FLUJO MODO AVANZADO:
 * 1. Click "SIESTA"/"SE DURMIÓ" → Modal sleepDelay
 * 2. Confirmar/Omitir → Crear evento con sleepDelay
 * 3. Cerrar modal → NO crear evento
 */
export function SleepButton({ 
  childId, 
  childName,
  childData,
  eventHistory = [],
  onEventRegistered 
}: SleepButtonProps) {
  const { toast } = useToast()
  const { sleepState, isLoading: stateLoading, refetch } = useSleepState(childId)
  const [isProcessing, setIsProcessing] = useState(false)
  const { getCurrentTime } = useDevTime()
  const [localDuration, setLocalDuration] = useState<number | null>(null)
  const [showDelayModal, setShowDelayModal] = useState(false)
  const [pendingEventData, setPendingEventData] = useState<{
    eventType: 'sleep' | 'nap',
    startTime: string
  } | null>(null)
  
  // Hook para detectar modo dual
  const { shouldShowModal, getDefaults, isSimpleMode } = useEventRegistration()
  
  // Obtener preferencias del contexto principal
  const { preferences } = useModeContext()
  
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
  
  // Determinar si es hora de siesta o sueño nocturno
  const isNightTime = () => {
    const hour = getCurrentTime().getHours()
    return hour >= 19 || hour < 10  // 7pm a 10am = sueño nocturno
  }
  
  // Determinar texto y color del botón
  const getButtonConfig = () => {
    const isAsleep = sleepState.status === 'sleeping' || sleepState.status === 'napping'
    
    if (isAsleep) {
      return {
        text: 'SE DESPERTÓ',
        icon: Sun,
        color: 'from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600',
        action: 'wake'
      }
    } else {
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
  
  // Manejar confirmación del delay de sueño con estado emocional y notas
  const handleDelayConfirm = async (delay: number, emotionalState: string, notes: string) => {
    if (!pendingEventData) return
    
    try {
      // AHORA SÍ crear el evento con todos los datos del modal
      const eventData: Partial<EventData> = {
        childId,
        eventType: pendingEventData.eventType,
        startTime: pendingEventData.startTime,
        emotionalState: emotionalState || 'tranquilo',
        notes: notes || '', // No poner texto por defecto, dejar vacío si usuario no escribe
        sleepDelay: delay // Incluir el delay desde el principio
      }
      
      const response = await fetch('/api/children/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData)
      })
      
      if (!response.ok) {
        throw new Error('Error al registrar evento')
      }
      
      // Mostrar confirmación
      const delayText = delay === 0 ? "inmediatamente" :
                       delay === 60 ? "más de 1 hora" :
                       `${delay} minutos`
      
      toast({
        title: pendingEventData.eventType === 'nap' ? "Siesta registrada" : "A dormir",
        description: `${childName} tardó ${delayText} en dormirse`
      })
      
      // Limpiar y cerrar modal
      setShowDelayModal(false)
      setPendingEventData(null)
      
      // Actualizar datos
      await refetch()
      onEventRegistered?.()
      
    } catch (error) {
      console.error('Error registrando evento:', error)
      toast({
        title: "Error",
        description: "No se pudo registrar el evento",
        variant: "destructive"
      })
    }
  }
  
  // Manejar cuando se cierra el modal sin confirmar
  const handleModalClose = () => {
    // NO mostrar toast ni crear evento - simplemente cancelar la operación
    
    // Limpiar estado
    setShowDelayModal(false)
    setPendingEventData(null)
    
    // Sin toast - el usuario simplemente cambió de opinión
  }
  
  // Manejar click del botón
  const handleClick = async () => {
    setIsProcessing(true)
    
    try {
      const now = getCurrentTime()
      const currentHour = now.getHours()
      
      if (config.action === 'wake') {
        // DESPERTAR - Lógica corregida
        
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
        
        // Solo crear evento "wake" si es despertar de la mañana (no de siesta)
        if (sleepState.status === 'sleeping' && currentHour >= 6 && currentHour < 12) {
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
        
      } else {
        // DORMIR - Lógica según modo
        const eventType = config.action as 'sleep' | 'nap'
        
        if (isSimpleMode) {
          // MODO SIMPLE - Registro directo con SmartDefaults
          let defaultValues = {}
          
          // Usar SmartDefaultsEngine si tenemos datos del niño
          if (childData) {
            try {
              defaultValues = getQuickDefaults(
                eventType,
                childData,
                eventHistory,
                preferences
              )
            } catch (error) {
              console.warn('Error getting smart defaults, using static defaults:', error)
              defaultValues = getDefaults(eventType)
            }
          } else {
            // Fallback a defaults estáticos del contexto
            defaultValues = getDefaults(eventType)
          }
          
          // Crear evento inmediatamente con defaults
          const eventData: Partial<EventData> = {
            childId,
            eventType,
            startTime: toLocalISOString(now),
            ...defaultValues
          }
          
          const response = await fetch('/api/children/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(eventData)
          })
          
          if (!response.ok) {
            throw new Error('Error al registrar evento')
          }
          
          // Mostrar confirmación simple
          toast({
            title: eventType === 'nap' ? "Siesta registrada" : "A dormir",
            description: `${childName} - registro rápido completado`
          })
          
        } else {
          // MODO AVANZADO - Mostrar modal como antes
          
          // Guardar datos temporales para cuando se confirme el modal
          setPendingEventData({
            eventType,
            startTime: toLocalISOString(now)
          })
          
          // Mostrar modal de delay PRIMERO
          setShowDelayModal(true)
          
          // NO crear evento aquí - esperamos a que el usuario confirme en el modal
          // NO actualizar estado ni mostrar toast
          
          setIsProcessing(false) // Importante: liberar el botón
          return
        }
      }
      
      // Actualizar estado (solo para wake)
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
          "w-full h-24 text-xl font-bold text-white shadow-lg",
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
      
      {/* Modal para capturar delay de sueño */}
      <SleepDelayModal
        open={showDelayModal}
        onClose={handleModalClose}
        onConfirm={handleDelayConfirm}
        childName={childName}
        eventType={pendingEventData?.eventType || 'sleep'}
      />
    </div>
  )
}