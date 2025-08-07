"use client"

import React, { useState } from "react"
import { Moon, Sun, Clock, Calendar, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { format, subDays, isToday, isYesterday } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { TimeAdjuster } from "./TimeAdjuster"

interface ManualSleepEntryProps {
  isOpen: boolean
  onClose: () => void
  childId: string
  childName: string
  onEventRegistered: () => void
}

type EventOption = 'bedtime' | 'sleep' | 'wake' | 'night_waking'
type DateOption = 'today' | 'yesterday' | 'custom'

export function ManualSleepEntry({
  isOpen,
  onClose,
  childId,
  childName,
  onEventRegistered
}: ManualSleepEntryProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  
  // Estados del formulario
  const [eventType, setEventType] = useState<EventOption>('sleep')
  const [dateOption, setDateOption] = useState<DateOption>('today')
  const [customDate, setCustomDate] = useState(new Date())
  const [eventTime, setEventTime] = useState(new Date())
  const [sleepDelay, setSleepDelay] = useState<number | null>(null)
  const [showSleepDelay, setShowSleepDelay] = useState(false)
  
  // Opciones de eventos
  const eventOptions = [
    { 
      value: 'bedtime', 
      label: 'Se acostó', 
      icon: Clock, 
      description: 'Hora de ir a la cama',
      color: 'text-purple-600'
    },
    { 
      value: 'sleep', 
      label: 'Se durmió', 
      icon: Moon, 
      description: 'Momento en que se quedó dormido',
      color: 'text-blue-600'
    },
    { 
      value: 'wake', 
      label: 'Se despertó', 
      icon: Sun, 
      description: 'Despertar (mañana o siesta)',
      color: 'text-yellow-600'
    },
    { 
      value: 'night_waking', 
      label: 'Despertar nocturno', 
      icon: AlertCircle, 
      description: 'Despertar durante la noche',
      color: 'text-red-600'
    }
  ]
  
  // Opciones rápidas de sleep delay
  const delayOptions = [0, 5, 10, 15, 30, 45, 60]
  
  // Obtener la fecha seleccionada
  const getSelectedDate = () => {
    switch(dateOption) {
      case 'today':
        return new Date()
      case 'yesterday':
        return subDays(new Date(), 1)
      case 'custom':
        return customDate
      default:
        return new Date()
    }
  }
  
  // Formatear fecha para mostrar
  const formatDateLabel = (date: Date) => {
    if (isToday(date)) return 'Hoy'
    if (isYesterday(date)) return 'Ayer'
    return format(date, 'dd MMM', { locale: es })
  }
  
  // Manejar el registro del evento
  const handleSubmit = async () => {
    setIsLoading(true)
    
    try {
      const selectedDate = getSelectedDate()
      const eventDateTime = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
        eventTime.getHours(),
        eventTime.getMinutes()
      )
      
      // Determinar el tipo de evento real basado en la hora y contexto
      let finalEventType = eventType
      const hour = eventDateTime.getHours()
      
      // Auto-clasificar si es sueño o siesta
      if (eventType === 'sleep') {
        if (hour >= 11 && hour < 17) {
          finalEventType = 'nap'
        }
      }
      
      // Preparar datos del evento
      const eventData: any = {
        childId,
        eventType: finalEventType,
        startTime: eventDateTime.toISOString(),
        emotionalState: 'tranquilo',
        notes: `Registro manual - ${formatDateLabel(selectedDate)} a las ${format(eventTime, 'HH:mm')}`
      }
      
      // Agregar sleep delay si aplica
      if (showSleepDelay && sleepDelay !== null) {
        if (eventType === 'sleep' || eventType === 'bedtime') {
          eventData.sleepDelay = sleepDelay
        } else if (eventType === 'night_waking') {
          eventData.nightWakingDelay = sleepDelay
        }
      }
      
      // Si registró "se durmió" con delay, crear también evento de "se acostó"
      if (eventType === 'sleep' && sleepDelay && sleepDelay > 0) {
        const bedtimeDate = new Date(eventDateTime.getTime() - sleepDelay * 60000)
        
        // Crear evento de bedtime
        await fetch('/api/children/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            childId,
            eventType: 'bedtime',
            startTime: bedtimeDate.toISOString(),
            emotionalState: 'tranquilo',
            notes: `Se acostó ${sleepDelay} minutos antes de dormirse`
          })
        })
      }
      
      // Crear evento principal
      const response = await fetch('/api/children/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData)
      })
      
      if (!response.ok) throw new Error('Error al registrar evento')
      
      toast({
        title: "✅ Evento registrado",
        description: `${eventOptions.find(e => e.value === eventType)?.label} de ${childName} registrado correctamente`,
      })
      
      onEventRegistered()
      onClose()
      
    } catch (error) {
      console.error('Error registrando evento:', error)
      toast({
        title: "Error",
        description: "No se pudo registrar el evento",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registro Manual de Sueño</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Nombre del niño */}
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-sm text-blue-700">
              Registrando evento para <span className="font-bold">{childName}</span>
            </p>
          </div>
          
          {/* Selección de tipo de evento */}
          <div className="space-y-2">
            <Label>¿Qué pasó?</Label>
            <RadioGroup value={eventType} onValueChange={(v) => setEventType(v as EventOption)}>
              <div className="grid grid-cols-2 gap-2">
                {eventOptions.map((option) => {
                  const Icon = option.icon
                  return (
                    <div key={option.value}>
                      <RadioGroupItem
                        value={option.value}
                        id={option.value}
                        className="sr-only"
                      />
                      <Label
                        htmlFor={option.value}
                        className={cn(
                          "flex flex-col items-center gap-1 rounded-lg border-2 p-3 cursor-pointer transition-all",
                          eventType === option.value
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300"
                        )}
                      >
                        <Icon className={cn("w-6 h-6", option.color)} />
                        <span className="text-sm font-medium">{option.label}</span>
                        <span className="text-xs text-gray-500 text-center">
                          {option.description}
                        </span>
                      </Label>
                    </div>
                  )
                })}
              </div>
            </RadioGroup>
          </div>
          
          {/* Selección de fecha */}
          <div className="space-y-2">
            <Label>¿Cuándo?</Label>
            <RadioGroup value={dateOption} onValueChange={(v) => setDateOption(v as DateOption)}>
              <div className="flex gap-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="today" id="today" />
                  <Label htmlFor="today">Hoy</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yesterday" id="yesterday" />
                  <Label htmlFor="yesterday">Ayer</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="custom" id="custom" />
                  <Label htmlFor="custom">Otra fecha</Label>
                </div>
              </div>
            </RadioGroup>
            
            {dateOption === 'custom' && (
              <input
                type="date"
                value={format(customDate, 'yyyy-MM-dd')}
                onChange={(e) => setCustomDate(new Date(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg"
                max={format(new Date(), 'yyyy-MM-dd')}
              />
            )}
          </div>
          
          {/* Selección de hora */}
          <div className="space-y-2">
            <Label>Hora del evento</Label>
            <TimeAdjuster
              value={eventTime}
              onChange={setEventTime}
            />
          </div>
          
          {/* Sleep delay opcional */}
          {(eventType === 'sleep' || eventType === 'night_waking') && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="show-delay"
                  checked={showSleepDelay}
                  onChange={(e) => setShowSleepDelay(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="show-delay" className="text-sm">
                  {eventType === 'sleep' 
                    ? 'Registrar tiempo que tardó en dormirse'
                    : 'Registrar tiempo que tardó en volver a dormir'
                  }
                </Label>
              </div>
              
              {showSleepDelay && (
                <div className="space-y-2 ml-6">
                  <div className="grid grid-cols-4 gap-1">
                    {delayOptions.map((minutes) => (
                      <Button
                        key={minutes}
                        type="button"
                        variant={sleepDelay === minutes ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSleepDelay(minutes)}
                        className="text-xs"
                      >
                        {minutes === 0 ? 'Inmediato' : `${minutes}m`}
                      </Button>
                    ))}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={sleepDelay || ''}
                      onChange={(e) => setSleepDelay(parseInt(e.target.value) || 0)}
                      placeholder="0"
                      className="w-20 px-2 py-1 border rounded text-sm"
                      min="0"
                      max="120"
                    />
                    <span className="text-sm text-gray-600">minutos</span>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Resumen del evento */}
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-700 font-medium mb-1">Resumen:</p>
            <p className="text-sm text-gray-600">
              {childName} {eventOptions.find(e => e.value === eventType)?.label.toLowerCase()}{' '}
              {formatDateLabel(getSelectedDate())} a las {format(eventTime, 'HH:mm')}
              {showSleepDelay && sleepDelay !== null && sleepDelay > 0 && (
                <span>
                  {eventType === 'sleep' 
                    ? ` (tardó ${sleepDelay} minutos en dormirse)`
                    : ` (tardó ${sleepDelay} minutos en volver a dormir)`
                  }
                </span>
              )}
            </p>
          </div>
        </div>
        
        {/* Botones de acción */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? 'Guardando...' : 'Guardar Evento'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}