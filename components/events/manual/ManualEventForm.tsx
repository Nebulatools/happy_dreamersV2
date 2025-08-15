"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useToast } from '@/hooks/use-toast'
import { EventType, EventData, EmotionalState, FeedingType } from '../types'
import { Calendar, Clock, Save, X } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface ManualEventFormProps {
  childId: string
  childName: string
  onEventRegistered?: () => void
  onCancel?: () => void
}

/**
 * Formulario manual para registro retroactivo de eventos
 * Permite registrar cualquier tipo de evento con fecha/hora específica
 */
export function ManualEventForm({ childId, childName, onEventRegistered, onCancel }: ManualEventFormProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Estado del formulario
  const [eventType, setEventType] = useState<EventType>('sleep')
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [startTime, setStartTime] = useState(format(new Date(), 'HH:mm'))
  const [endDate, setEndDate] = useState('')
  const [endTime, setEndTime] = useState('')
  const [sleepDelay, setSleepDelay] = useState('')
  const [emotionalState, setEmotionalState] = useState<EmotionalState>('tranquilo')
  const [notes, setNotes] = useState('')
  
  // Campos específicos de alimentación
  const [feedingType, setFeedingType] = useState<FeedingType>('bottle')
  const [feedingAmount, setFeedingAmount] = useState('')
  const [feedingDuration, setFeedingDuration] = useState('')
  const [babyState, setBabyState] = useState<'awake' | 'asleep'>('awake')
  
  // Determinar campos visibles según tipo de evento
  const showSleepFields = ['sleep', 'nap'].includes(eventType)
  const showFeedingFields = eventType === 'feeding'
  const showEndTime = ['sleep', 'nap'].includes(eventType)
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      // Construir fecha/hora completa
      const startDateTime = new Date(`${startDate}T${startTime}`)
      const endDateTime = endDate && endTime ? new Date(`${endDate}T${endTime}`) : null
      
      // Validar que la fecha fin sea posterior a la fecha inicio
      if (endDateTime && endDateTime <= startDateTime) {
        throw new Error('La hora de fin debe ser posterior a la hora de inicio')
      }
      
      // Construir datos del evento
      const eventData: Partial<EventData> = {
        childId,
        eventType,
        startTime: startDateTime.toISOString(),
        notes: notes || undefined
      }
      
      // Agregar campos según tipo de evento
      if (showEndTime && endDateTime) {
        eventData.endTime = endDateTime.toISOString()
      }
      
      if (showSleepFields) {
        eventData.sleepDelay = sleepDelay ? parseInt(sleepDelay) : 0
        eventData.emotionalState = emotionalState
      }
      
      if (showFeedingFields) {
        eventData.feedingType = feedingType
        eventData.feedingAmount = feedingAmount ? parseInt(feedingAmount) : undefined
        eventData.feedingDuration = feedingDuration ? parseInt(feedingDuration) : undefined
        eventData.babyState = babyState
      }
      
      // Enviar al backend
      const response = await fetch('/api/children/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData)
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Error al registrar evento')
      }
      
      toast({
        title: "Evento registrado",
        description: `Evento de ${getEventTypeLabel(eventType)} registrado manualmente`
      })
      
      // Limpiar formulario
      resetForm()
      
      // Notificar al padre
      onEventRegistered?.()
      
    } catch (error) {
      console.error('Error:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo registrar el evento",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const resetForm = () => {
    setEventType('sleep')
    setStartDate(format(new Date(), 'yyyy-MM-dd'))
    setStartTime(format(new Date(), 'HH:mm'))
    setEndDate('')
    setEndTime('')
    setSleepDelay('')
    setEmotionalState('tranquilo')
    setNotes('')
    setFeedingType('bottle')
    setFeedingAmount('')
    setFeedingDuration('')
    setBabyState('awake')
  }
  
  const getEventTypeLabel = (type: EventType) => {
    const labels: Record<EventType, string> = {
      sleep: 'Sueño nocturno',
      nap: 'Siesta',
      wake: 'Despertar',
      feeding: 'Alimentación',
      diaper: 'Cambio de pañal',
      medicine: 'Medicamento',
      activity: 'Actividad'
    }
    return labels[type] || type
  }
  
  return (
    <div className="p-4 border rounded-lg bg-white">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Registro Manual de Eventos</h3>
        {onCancel && (
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Tipo de evento */}
        <div>
          <Label>Tipo de evento</Label>
          <Select value={eventType} onValueChange={(val) => setEventType(val as EventType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sleep">Sueño nocturno</SelectItem>
              <SelectItem value="nap">Siesta</SelectItem>
              <SelectItem value="wake">Despertar</SelectItem>
              <SelectItem value="feeding">Alimentación</SelectItem>
              <SelectItem value="diaper">Cambio de pañal</SelectItem>
              <SelectItem value="medicine">Medicamento</SelectItem>
              <SelectItem value="activity">Actividad</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Fecha y hora de inicio */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="startDate">
              <Calendar className="w-4 h-4 inline mr-1" />
              Fecha inicio
            </Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="startTime">
              <Clock className="w-4 h-4 inline mr-1" />
              Hora inicio
            </Label>
            <Input
              id="startTime"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
          </div>
        </div>
        
        {/* Fecha y hora de fin (opcional para sueño/siesta) */}
        {showEndTime && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="endDate">
                <Calendar className="w-4 h-4 inline mr-1" />
                Fecha fin (opcional)
              </Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="endTime">
                <Clock className="w-4 h-4 inline mr-1" />
                Hora fin (opcional)
              </Label>
              <Input
                id="endTime"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>
        )}
        
        {/* Campos específicos de sueño */}
        {showSleepFields && (
          <>
            <div>
              <Label htmlFor="sleepDelay">Minutos para dormirse</Label>
              <Input
                id="sleepDelay"
                type="number"
                min="0"
                max="120"
                value={sleepDelay}
                onChange={(e) => setSleepDelay(e.target.value)}
                placeholder="0-120 minutos"
              />
            </div>
            
            <div>
              <Label>Estado emocional</Label>
              <RadioGroup value={emotionalState} onValueChange={(val) => setEmotionalState(val as EmotionalState)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="tranquilo" id="tranquilo" />
                  <Label htmlFor="tranquilo">Tranquilo</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="inquieto" id="inquieto" />
                  <Label htmlFor="inquieto">Inquieto</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="alterado" id="alterado" />
                  <Label htmlFor="alterado">Alterado</Label>
                </div>
              </RadioGroup>
            </div>
          </>
        )}
        
        {/* Campos específicos de alimentación */}
        {showFeedingFields && (
          <>
            <div>
              <Label>Tipo de alimentación</Label>
              <RadioGroup value={feedingType} onValueChange={(val) => setFeedingType(val as FeedingType)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="breast" id="breast" />
                  <Label htmlFor="breast">Pecho</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="bottle" id="bottle" />
                  <Label htmlFor="bottle">Biberón</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="solids" id="solids" />
                  <Label htmlFor="solids">Sólidos</Label>
                </div>
              </RadioGroup>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="feedingAmount">
                  Cantidad {feedingType === 'bottle' ? '(ml)' : feedingType === 'solids' ? '(gr)' : '(min)'}
                </Label>
                <Input
                  id="feedingAmount"
                  type="number"
                  min="1"
                  max="500"
                  value={feedingAmount}
                  onChange={(e) => setFeedingAmount(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="feedingDuration">Duración (min)</Label>
                <Input
                  id="feedingDuration"
                  type="number"
                  min="1"
                  max="60"
                  value={feedingDuration}
                  onChange={(e) => setFeedingDuration(e.target.value)}
                />
              </div>
            </div>
            
            <div>
              <Label>Estado del bebé</Label>
              <RadioGroup value={babyState} onValueChange={(val) => setBabyState(val as 'awake' | 'asleep')}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="awake" id="awake" />
                  <Label htmlFor="awake">Despierto</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="asleep" id="asleep" />
                  <Label htmlFor="asleep">Dormido</Label>
                </div>
              </RadioGroup>
            </div>
          </>
        )}
        
        {/* Notas (siempre visible) */}
        <div>
          <Label htmlFor="notes">Notas (opcional)</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Agregar observaciones..."
            rows={3}
            maxLength={500}
          />
          <p className="text-xs text-gray-500 mt-1">{notes.length}/500 caracteres</p>
        </div>
        
        {/* Botones de acción */}
        <div className="flex gap-2">
          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="flex-1"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSubmitting ? 'Guardando...' : 'Guardar evento'}
          </Button>
          
          <Button 
            type="button"
            variant="outline"
            onClick={resetForm}
            disabled={isSubmitting}
          >
            Limpiar
          </Button>
        </div>
      </form>
    </div>
  )
}