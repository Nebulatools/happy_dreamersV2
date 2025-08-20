"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useToast } from '@/hooks/use-toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { format } from 'date-fns'
import { Clock } from 'lucide-react'
import { eventTypes } from '@/lib/event-types'

interface ManualEventModalProps {
  open: boolean
  onClose: () => void
  childId: string
  childName: string
  onEventRegistered?: () => void
}

/**
 * Modal simple para registro manual de eventos con fecha/hora específica
 * Basado en registroeventos.md - solo los eventos principales
 */
export function ManualEventModal({ 
  open, 
  onClose, 
  childId, 
  childName, 
  onEventRegistered 
}: ManualEventModalProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Estado del formulario - simplificado
  const [eventType, setEventType] = useState<string>('sleep')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [time, setTime] = useState(format(new Date(), 'HH:mm'))
  const [sleepDelay, setSleepDelay] = useState('0')
  const [emotionalState, setEmotionalState] = useState<'tranquilo' | 'inquieto' | 'alterado'>('tranquilo')
  const [notes, setNotes] = useState('')
  
  // Campos de alimentación
  const [feedingType, setFeedingType] = useState<'breast' | 'bottle' | 'solids'>('bottle')
  const [babyState, setBabyState] = useState<'awake' | 'asleep'>('awake')
  
  const handleSubmit = async () => {
    setIsSubmitting(true)
    
    try {
      // Construir fecha/hora completa
      const dateTime = new Date(`${date}T${time}`)
      
      // Determinar el tipo de evento real basado en la hora (para sleep/nap)
      let finalEventType = eventType
      if (eventType === 'sleep') {
        const hour = dateTime.getHours()
        // Si es entre 10am y 7pm, es siesta
        if (hour >= 10 && hour < 19) {
          finalEventType = 'nap' as any
        }
      }
      
      // Construir datos del evento
      const eventData: any = {
        childId,
        eventType: finalEventType,
        startTime: dateTime.toISOString(),
        notes: notes || undefined
      }
      
      // Agregar campos según tipo
      if (eventType === 'sleep' || eventType === 'nap') {
        eventData.sleepDelay = parseInt(sleepDelay)
        eventData.emotionalState = emotionalState
      }
      
      if (eventType === 'feeding') {
        eventData.feedingType = feedingType
        eventData.babyState = babyState
        // Valores por defecto para no romper validaciones
        eventData.feedingAmount = feedingType === 'bottle' ? 120 : feedingType === 'solids' ? 50 : 20
        eventData.feedingDuration = 15
      }
      
      // Enviar al backend
      const response = await fetch('/api/children/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData)
      })
      
      if (!response.ok) {
        throw new Error('Error al registrar evento')
      }
      
      toast({
        title: "Evento registrado",
        description: `Evento manual registrado para ${childName}`
      })
      
      // Limpiar y cerrar
      resetForm()
      onClose()
      onEventRegistered?.()
      
    } catch (error) {
      console.error('Error:', error)
      toast({
        title: "Error",
        description: "No se pudo registrar el evento",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const resetForm = () => {
    setEventType('sleep')
    setDate(format(new Date(), 'yyyy-MM-dd'))
    setTime(format(new Date(), 'HH:mm'))
    setSleepDelay('0')
    setEmotionalState('tranquilo')
    setNotes('')
    setFeedingType('bottle')
    setBabyState('awake')
  }
  
  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Registro Manual de Evento
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Tipo de evento */}
          <div>
            <Label>Tipo de evento</Label>
            <Select value={eventType} onValueChange={(val: any) => setEventType(val)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {eventTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Fecha y hora */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Fecha</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                max={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>
            <div>
              <Label>Hora</Label>
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>
          
          {/* Campos específicos de sueño */}
          {(eventType === 'sleep' || eventType === 'nap') && (
            <>
              <div>
                <Label>¿Cuánto tardó en dormirse?</Label>
                <Select value={sleepDelay} onValueChange={setSleepDelay}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Inmediatamente</SelectItem>
                    <SelectItem value="5">5 minutos</SelectItem>
                    <SelectItem value="10">10 minutos</SelectItem>
                    <SelectItem value="15">15 minutos</SelectItem>
                    <SelectItem value="20">20 minutos</SelectItem>
                    <SelectItem value="30">30 minutos</SelectItem>
                    <SelectItem value="45">45 minutos</SelectItem>
                    <SelectItem value="60">Más de 1 hora</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Estado emocional</Label>
                <RadioGroup value={emotionalState} onValueChange={(val: any) => setEmotionalState(val)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="tranquilo" id="m-tranquilo" />
                    <Label htmlFor="m-tranquilo">Tranquilo</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="inquieto" id="m-inquieto" />
                    <Label htmlFor="m-inquieto">Inquieto</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="alterado" id="m-alterado" />
                    <Label htmlFor="m-alterado">Alterado</Label>
                  </div>
                </RadioGroup>
              </div>
            </>
          )}
          
          {/* Campos específicos de alimentación */}
          {eventType === 'feeding' && (
            <>
              <div>
                <Label>Tipo de alimentación</Label>
                <RadioGroup value={feedingType} onValueChange={(val: any) => setFeedingType(val)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="breast" id="m-breast" />
                    <Label htmlFor="m-breast">Pecho</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="bottle" id="m-bottle" />
                    <Label htmlFor="m-bottle">Biberón</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="solids" id="m-solids" />
                    <Label htmlFor="m-solids">Sólidos</Label>
                  </div>
                </RadioGroup>
              </div>
              
              <div>
                <Label>Estado del bebé</Label>
                <RadioGroup value={babyState} onValueChange={(val: any) => setBabyState(val)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="awake" id="m-awake" />
                    <Label htmlFor="m-awake">Despierto</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="asleep" id="m-asleep" />
                    <Label htmlFor="m-asleep">Dormido (toma nocturna)</Label>
                  </div>
                </RadioGroup>
              </div>
            </>
          )}
          
          {/* Notas */}
          <div>
            <Label>Notas (opcional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                (eventType === 'sleep' || eventType === 'nap')
                  ? "¿Cómo se durmió? ¿Lo arrullaron, tomó pecho, lo dejaron en la cuna despierto?"
                  : eventType === 'feeding'
                  ? "Detalles sobre la alimentación..."
                  : eventType === 'medication'
                  ? "Nombre del medicamento y dosis..."
                  : eventType === 'extra_activities'
                  ? "Descripción de la actividad..."
                  : "Agregar observaciones..."
              }
              rows={2}
              maxLength={200}
            />
          </div>
          
          {/* Botones */}
          <div className="flex gap-2">
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Guardando...' : 'Guardar'}
            </Button>
            <Button 
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}