"use client"

import React, { useState, useEffect } from "react"
import { Moon, Sun, Clock, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { format, differenceInMinutes, differenceInHours } from "date-fns"
import { es } from "date-fns/locale"
import { useToast } from "@/hooks/use-toast"
import { SimpleSleepDelaySelector } from "./SimpleSleepDelaySelector"
import { GuidedNotesField } from "../shared/GuidedNotesField"
import { toLocalISOString } from "@/lib/date-utils"

// Estados del ciclo unificado según Dr. Mariana
export type UnifiedSleepState = 'awake' | 'sleeping'

export interface SleepCycleState {
  status: UnifiedSleepState
  sleepStartTime: Date | null
  lastWakeTime: Date | null
  childId: string
  currentEventId: string | null // ID del evento actual de sueño/siesta
  currentEventType: 'sleep' | 'nap' | null // Tipo del evento actual
  currentNightWakingId: string | null // ID del despertar nocturno actual
  isInNightWaking: boolean // Si estamos en medio de un despertar nocturno
  normalWakeTime: string // Hora normal de despertar del plan (ej: "07:00")
}

interface UnifiedSleepCycleProps {
  childId: string
  childName: string
  onEventRegistered?: () => void
}

/**
 * Componente principal del ciclo unificado Dormir/Despertar
 * UN SOLO BOTÓN que alterna estados para simplicidad máxima
 */
export function UnifiedSleepCycle({
  childId,
  childName,
  onEventRegistered
}: UnifiedSleepCycleProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [showSleepDelay, setShowSleepDelay] = useState(false)
  const [sleepDelay, setSleepDelay] = useState(0)
  const [emotionalState, setEmotionalState] = useState<'calm' | 'restless' | 'upset'>('calm')
  const [notes, setNotes] = useState("")
  const [bedtimeTimestamp, setBedtimeTimestamp] = useState<Date | null>(null)
  const [activePlan, setActivePlan] = useState<any>(null)
  
  // Estado del ciclo
  const [cycleState, setCycleState] = useState<SleepCycleState>(() => {
    // Cargar estado desde localStorage si existe
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`sleepCycle_${childId}`)
      if (saved) {
        const parsed = JSON.parse(saved)
        return {
          ...parsed,
          sleepStartTime: parsed.sleepStartTime ? new Date(parsed.sleepStartTime) : null,
          lastWakeTime: parsed.lastWakeTime ? new Date(parsed.lastWakeTime) : null,
          currentNightWakingId: parsed.currentNightWakingId || null,
          isInNightWaking: parsed.isInNightWaking || false,
          normalWakeTime: parsed.normalWakeTime || "07:00"
        }
      }
    }
    return {
      status: 'awake',
      sleepStartTime: null,
      lastWakeTime: null,
      childId,
      currentEventId: null,
      currentEventType: null,
      currentNightWakingId: null,
      isInNightWaking: false,
      normalWakeTime: "07:00" // Default si no hay plan
    }
  })

  // Obtener plan activo del niño
  useEffect(() => {
    const fetchActivePlan = async () => {
      try {
        // Obtener el userId del padre
        const sessionRes = await fetch('/api/auth/session')
        const sessionData = await sessionRes.json()
        
        if (!sessionData?.user?.id) {
          console.log('No se pudo obtener el usuario de la sesión')
          return
        }
        
        // Obtener los planes del niño
        const response = await fetch(`/api/consultas/plans?childId=${childId}&userId=${sessionData.user.id}`)
        
        if (!response.ok) {
          console.log('Error al obtener planes:', response.status)
          return
        }
        
        const data = await response.json()
        
        if (data.success && data.plans && data.plans.length > 0) {
          // Buscar el plan activo (el de mayor planNumber con status 'active')
          const plan = data.plans
            .filter((p: any) => p.status === 'active')
            .sort((a: any, b: any) => b.planNumber - a.planNumber)[0]
          
          if (plan) {
            setActivePlan(plan)
            // Actualizar normalWakeTime del plan
            if (plan.schedule?.wakeTime) {
              setCycleState(prev => ({
                ...prev,
                normalWakeTime: plan.schedule.wakeTime
              }))
            }
          }
        }
      } catch (error) {
        console.error('Error al obtener plan activo:', error)
      }
    }
    
    fetchActivePlan()
  }, [childId])

  // Guardar estado en localStorage cuando cambie
  useEffect(() => {
    localStorage.setItem(`sleepCycle_${childId}`, JSON.stringify(cycleState))
  }, [cycleState, childId])

  // Determinar el tipo de sueño basado en la hora
  const getSleepType = (hour: number): 'nocturnal' | 'nap' => {
    // Sueño nocturno: 19:00 - 10:00
    // Siesta: 10:00 - 19:00
    return (hour >= 19 || hour < 10) ? 'nocturnal' : 'nap'
  }

  // Calcular ventana de sueño (tiempo despierto desde último sueño)
  const calculateWakeWindow = (): string => {
    if (!cycleState.lastWakeTime) return "Primera ventana del día"
    
    const now = new Date()
    const minutesAwake = differenceInMinutes(now, cycleState.lastWakeTime)
    const hoursAwake = Math.floor(minutesAwake / 60)
    const remainingMinutes = minutesAwake % 60
    
    if (hoursAwake > 0) {
      return `${hoursAwake}h ${remainingMinutes}min despierto`
    }
    return `${minutesAwake} minutos despierto`
  }

  // Manejar el ciclo dormir/despertar
  const handleSleepCycle = async () => {
    setIsLoading(true)
    const now = new Date()

    try {
      if (cycleState.status === 'awake') {
        // REGISTRAR "SE DURMIÓ"
        if (!showSleepDelay) {
          // Primer paso: guardar hora de acostarse y mostrar captura de delay
          setBedtimeTimestamp(now) // Guardamos CUANDO se acostó
          setShowSleepDelay(true)
          setIsLoading(false)
          return
        }

        // Calcular la hora real en que se durmió
        // Si se acostó hace 10 minutos y tardó 5 min en dormirse:
        // Hora de acostarse = bedtimeTimestamp
        // Hora de dormirse = bedtimeTimestamp + sleepDelay minutos
        const actualBedtime = bedtimeTimestamp || now
        const actualSleepTime = new Date(actualBedtime.getTime() + (sleepDelay * 60 * 1000))
        
        // Determinar el tipo de evento correcto basado en la hora
        const sleepType = getSleepType(actualBedtime.getHours())
        const eventTypeToUse = sleepType === 'nocturnal' ? 'sleep' : 'nap'
        
        // Registrar evento de dormir con las horas correctas y el tipo apropiado
        const eventData = {
          childId,
          eventType: eventTypeToUse, // Usar 'sleep' para nocturno o 'nap' para siesta
          startTime: toLocalISOString(actualSleepTime), // Hora real en que se durmió (zona horaria local)
          bedtime: toLocalISOString(actualBedtime), // Hora en que se acostó (zona horaria local)
          sleepDelay,
          emotionalState,
          notes: notes || `${childName} se acostó a las ${format(actualBedtime, 'HH:mm', { locale: es })} y se durmió a las ${format(actualSleepTime, 'HH:mm', { locale: es })}. ${sleepType === 'nocturnal' ? 'Sueño nocturno' : 'Siesta'}`,
          // Ventana de sueño para análisis profesional
          wakeWindow: cycleState.lastWakeTime ? differenceInMinutes(actualBedtime, cycleState.lastWakeTime) : null
        }

        const response = await fetch('/api/children/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(eventData)
        })

        if (!response.ok) throw new Error('Error al registrar sueño')

        // Obtener el ID del evento creado
        const responseData = await response.json()
        const createdEventId = responseData.event?._id

        // Actualizar estado guardando el ID del evento y su tipo
        setCycleState(prev => ({
          ...prev,
          status: 'sleeping',
          sleepStartTime: actualSleepTime, // Guardar la hora real en que se durmió
          currentEventId: createdEventId,
          currentEventType: eventTypeToUse as 'sleep' | 'nap'
        }))

        toast({
          title: "✅ Sueño registrado",
          description: `${childName} se acostó a las ${format(actualBedtime, 'HH:mm', { locale: es })} y se durmió a las ${format(actualSleepTime, 'HH:mm', { locale: es })}`
        })

        // Reset campos
        setShowSleepDelay(false)
        setSleepDelay(0)
        setEmotionalState('calm')
        setNotes("")
        setBedtimeTimestamp(null)
        onEventRegistered?.()

      } else {
        // REGISTRAR "SE DESPERTÓ"
        if (!cycleState.sleepStartTime) {
          throw new Error('No hay registro de inicio de sueño')
        }

        const sleepDuration = differenceInMinutes(now, cycleState.sleepStartTime)
        const wasNap = cycleState.currentEventType === 'nap'
        
        // Si fue una siesta, actualizar el evento existente con endTime
        if (wasNap && cycleState.currentEventId) {
          const updateData = {
            id: cycleState.currentEventId,
            childId,
            eventType: 'nap',
            startTime: toLocalISOString(cycleState.sleepStartTime),
            endTime: toLocalISOString(now), // Añadir hora de fin (zona horaria local)
            emotionalState: emotionalState || 'calm',
            notes: notes || `${childName} durmió siesta de ${Math.floor(sleepDuration / 60)}h ${sleepDuration % 60}min`,
            sleepDuration,
            createdAt: toLocalISOString(cycleState.sleepStartTime) // Mantener la fecha de creación original
          }

          const response = await fetch('/api/children/events', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
          })

          if (!response.ok) throw new Error('Error al actualizar siesta')

          toast({
            title: "✅ Siesta completada",
            description: `${childName} durmió ${Math.floor(sleepDuration / 60)}h ${sleepDuration % 60}min`
          })

        } else {
          // Para sueño nocturno, determinar si es despertar nocturno o definitivo
          const currentHour = now.getHours()
          const currentMinutes = now.getMinutes()
          const currentTimeString = `${String(currentHour).padStart(2, '0')}:${String(currentMinutes).padStart(2, '0')}`
          
          // Comparar con la hora normal de despertar
          const isNightWaking = currentTimeString < cycleState.normalWakeTime
          
          if (cycleState.isInNightWaking && cycleState.currentNightWakingId) {
            // Estamos volviendo a dormir después de un despertar nocturno
            // Actualizar el evento night_waking con endTime
            const updateData = {
              id: cycleState.currentNightWakingId,
              childId,
              eventType: 'night_waking',
              startTime: toLocalISOString(cycleState.lastWakeTime!),
              endTime: toLocalISOString(now),
              emotionalState: emotionalState || 'calm',
              notes: notes || `${childName} volvió a dormir después de ${differenceInMinutes(now, cycleState.lastWakeTime!)} minutos despierto`,
              createdAt: toLocalISOString(cycleState.lastWakeTime!)
            }
            
            const response = await fetch('/api/children/events', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updateData)
            })
            
            if (!response.ok) throw new Error('Error al actualizar despertar nocturno')
            
            // Actualizar estado: volver a dormir
            setCycleState(prev => ({
              ...prev,
              status: 'sleeping',
              isInNightWaking: false,
              currentNightWakingId: null
            }))
            
            toast({
              title: "🌙 Volvió a dormir",
              description: `${childName} se volvió a dormir después de estar despierto ${differenceInMinutes(now, cycleState.lastWakeTime!)} minutos`
            })
            
          } else if (isNightWaking) {
            // Es un despertar nocturno (antes de la hora normal)
            // Crear nuevo evento night_waking
            const eventData = {
              childId,
              eventType: 'night_waking',
              startTime: toLocalISOString(now),
              relatedSleepStart: toLocalISOString(cycleState.sleepStartTime),
              emotionalState: emotionalState || 'restless',
              notes: notes || `${childName} se despertó a las ${format(now, 'HH:mm', { locale: es })} (despertar nocturno)`
            }
            
            const response = await fetch('/api/children/events', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(eventData)
            })
            
            if (!response.ok) throw new Error('Error al registrar despertar nocturno')
            
            const responseData = await response.json()
            const nightWakingId = responseData.event?._id
            
            // Actualizar estado: despertar nocturno
            setCycleState(prev => ({
              ...prev,
              status: 'awake',
              isInNightWaking: true,
              currentNightWakingId: nightWakingId,
              lastWakeTime: now
            }))
            
            toast({
              title: "🌃 Despertar nocturno",
              description: `${childName} se despertó a las ${format(now, 'HH:mm', { locale: es })}`
            })
            
          } else {
            // Es el despertar definitivo (después de la hora normal)
            // Actualizar el evento sleep con endTime
            const updateData = {
              id: cycleState.currentEventId,
              childId,
              eventType: 'sleep',
              startTime: toLocalISOString(cycleState.sleepStartTime),
              endTime: toLocalISOString(now),
              emotionalState: emotionalState || 'calm',
              notes: notes || `${childName} durmió ${Math.floor(sleepDuration / 60)}h ${sleepDuration % 60}min`,
              sleepDuration,
              createdAt: toLocalISOString(cycleState.sleepStartTime)
            }
            
            const response = await fetch('/api/children/events', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updateData)
            })
            
            if (!response.ok) throw new Error('Error al actualizar sueño nocturno')
            
            // Actualizar estado: despertar definitivo
            setCycleState(prev => ({
              ...prev,
              status: 'awake',
              sleepStartTime: null,
              lastWakeTime: now,
              currentEventId: null,
              currentEventType: null,
              isInNightWaking: false,
              currentNightWakingId: null
            }))
            
            toast({
              title: "☀️ Buenos días",
              description: `${childName} durmió ${Math.floor(sleepDuration / 60)}h ${sleepDuration % 60}min`
            })
          }
          
          // No resetear el estado aquí porque ya se maneja en cada caso
          setNotes("")
          onEventRegistered?.()
          setIsLoading(false)
          return
        }

      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo registrar el evento",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Configuración del botón principal
  const getButtonConfig = () => {
    const now = new Date()
    const hour = now.getHours()
    
    if (cycleState.status === 'awake') {
      // Si estamos en un despertar nocturno
      if (cycleState.isInNightWaking) {
        const wakeMinutes = cycleState.lastWakeTime 
          ? differenceInMinutes(now, cycleState.lastWakeTime)
          : 0
        
        return {
          text: 'VOLVER A DORMIR',
          icon: Moon,
          color: 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700',
          description: `Despierto hace ${wakeMinutes} minutos (despertar nocturno)`
        }
      }
      
      // Determinar texto según la hora del día
      const isNapTime = hour >= 10 && hour < 19
      const buttonText = isNapTime ? 'INICIAR SIESTA' : 'SE DURMIÓ'
      
      return {
        text: buttonText,
        icon: Moon,
        color: isNapTime 
          ? 'bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600'
          : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600',
        description: calculateWakeWindow()
      }
    } else {
      const sleepMinutes = cycleState.sleepStartTime 
        ? differenceInMinutes(now, cycleState.sleepStartTime)
        : 0
      const hours = Math.floor(sleepMinutes / 60)
      const minutes = sleepMinutes % 60
      
      // Si está durmiendo durante la noche, mostrar información adicional
      const isSleepingAtNight = cycleState.currentEventType === 'sleep'
      
      return {
        text: 'SE DESPERTÓ',
        icon: Sun,
        color: isSleepingAtNight
          ? 'bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600'
          : 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600',
        description: `${isSleepingAtNight ? '💤 ' : ''}Durmiendo ${hours}h ${minutes}min`
      }
    }
  }

  const buttonConfig = getButtonConfig()
  const Icon = buttonConfig.icon

  return (
    <div className="space-y-4">
      {/* Botón principal del ciclo */}
      <div className="relative">
        <Button
          onClick={handleSleepCycle}
          disabled={isLoading}
          className={cn(
            "w-full h-24 text-xl font-bold text-white shadow-lg",
            "transform transition-all duration-200 hover:scale-[1.02]",
            buttonConfig.color
          )}
        >
          <Icon className="w-8 h-8 mr-3" />
          {buttonConfig.text}
        </Button>
        
        {/* Descripción del estado */}
        <div className="text-center mt-2">
          <Badge variant="outline" className="text-xs">
            {buttonConfig.description}
          </Badge>
        </div>
      </div>

      {/* Captura de delay al dormir */}
      {showSleepDelay && cycleState.status === 'awake' && bedtimeTimestamp && (
        <div className="space-y-4 p-4 bg-blue-50 rounded-lg animate-in slide-in-from-top">
          {/* Mostrar hora de acostarse */}
          <div className="text-center p-2 bg-white rounded-lg">
            <p className="text-sm text-gray-600">
              {childName} se acostó a las
            </p>
            <p className="text-lg font-bold text-blue-600">
              {format(bedtimeTimestamp, 'HH:mm', { locale: es })}
            </p>
          </div>

          <SimpleSleepDelaySelector
            value={sleepDelay}
            onChange={setSleepDelay}
            bedtimeTimestamp={bedtimeTimestamp}
          />

          {/* Estado emocional */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Estado emocional al dormir
            </label>
            <div className="flex gap-2">
              {[
                { value: 'calm', label: '😌 Tranquilo', color: 'bg-green-100' },
                { value: 'restless', label: '😟 Inquieto', color: 'bg-yellow-100' },
                { value: 'upset', label: '😢 Alterado', color: 'bg-red-100' }
              ].map(state => (
                <Button
                  key={state.value}
                  variant={emotionalState === state.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setEmotionalState(state.value as any)}
                  className={cn(
                    "flex-1",
                    emotionalState === state.value && state.color
                  )}
                >
                  {state.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Notas guiadas */}
          <GuidedNotesField
            value={notes}
            onChange={setNotes}
            placeholder="¿Cómo se durmió? ¿Lo arrullaron, tomó pecho, lo dejaron en la cuna despierto? ¿Hubo alguna dificultad?"
            eventType="sleep"
          />

          {/* Botones de acción */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowSleepDelay(false)
                setSleepDelay(0)
                setEmotionalState('calm')
                setNotes("")
              }}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSleepCycle}
              disabled={isLoading}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              Confirmar Sueño
            </Button>
          </div>
        </div>
      )}

      {/* Despertar nocturno (sub-evento durante el sueño) */}
      {cycleState.status === 'sleeping' && (
        <div className="text-center">
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => {
              // TODO: Implementar despertar nocturno como sub-evento
              toast({
                title: "Función en desarrollo",
                description: "Despertar nocturno como sub-evento próximamente"
              })
            }}
          >
            <AlertCircle className="w-3 h-3 mr-1" />
            Registrar despertar nocturno
          </Button>
        </div>
      )}
    </div>
  )
}