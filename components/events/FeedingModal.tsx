"use client"

import React, { useState, useEffect } from "react"
import { Utensils, Baby, Coffee, Apple, Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { TimeAdjuster } from "./TimeAdjuster"

interface FeedingModalProps {
  isOpen: boolean
  onClose: () => void
  childId: string
  childName: string
  onEventRegistered: () => void
}

type FeedingType = 'breast' | 'bottle' | 'solids'
type BabyState = 'awake' | 'asleep' | null

// Función para determinar si es horario nocturno
const isNightTime = (time: Date): boolean => {
  const hour = time.getHours()
  return hour >= 23 || hour < 5
}

export function FeedingModal({
  isOpen,
  onClose,
  childId,
  childName,
  onEventRegistered
}: FeedingModalProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  
  // Estados del formulario
  const [feedingType, setFeedingType] = useState<FeedingType>('breast')
  const [feedingTime, setFeedingTime] = useState(new Date())
  const [babyState, setBabyState] = useState<BabyState>(null)
  const [notes, setNotes] = useState("")
  
  // Determinar si es horario nocturno
  const isNight = isNightTime(feedingTime)
  
  // Reset baby state cuando cambia la hora
  useEffect(() => {
    if (!isNightTime(feedingTime)) {
      setBabyState(null)
    }
  }, [feedingTime])
  
  // Opciones de tipo de alimentación
  const feedingOptions = [
    { 
      value: 'breast', 
      label: 'Pecho', 
      icon: Baby,
      color: 'text-pink-600'
    },
    { 
      value: 'bottle', 
      label: 'Biberón', 
      icon: Coffee,
      color: 'text-blue-600'
    },
    { 
      value: 'solids', 
      label: 'Sólidos', 
      icon: Apple,
      color: 'text-green-600'
    }
  ]
  
  // Texto guía para las notas según el tipo
  const getNotesPlaceholder = () => {
    if (feedingType === 'solids') {
      return "¿Qué comió? ¿Cómo fue la comida? ¿Se quedó satisfecho?"
    }
    return "¿Cantidad? ¿Cómo fue la toma? ¿Se quedó satisfecho?"
  }
  
  // Manejar el registro del evento
  const handleSubmit = async () => {
    // Validar estado del bebé si es horario nocturno y es toma
    if (isNight && feedingType !== 'solids' && !babyState) {
      toast({
        title: "Información requerida",
        description: "Por favor indica si el bebé estaba dormido o despierto durante la toma nocturna",
        variant: "destructive"
      })
      return
    }
    
    setIsLoading(true)
    
    try {
      // Determinar el tipo de evento según el tipo de alimentación
      const eventType = feedingType === 'solids' ? 'extra_activities' : 'feeding'
      
      // Construir el título del evento
      let eventTitle = feedingType === 'breast' ? 'Toma de pecho' : 
                       feedingType === 'bottle' ? 'Toma de biberón' : 
                       'Comida sólida'
      
      // Agregar información del estado del bebé si es toma nocturna
      if (isNight && babyState && feedingType !== 'solids') {
        eventTitle += babyState === 'asleep' ? ' (dormido - dream feed)' : ' (despierto)'
      }
      
      // Preparar datos del evento
      const eventData = {
        childId,
        eventType: eventType,
        description: eventTitle,
        startTime: feedingTime.toISOString(),
        notes: notes || '',
        emotionalState: 'tranquilo', // Por defecto para alimentación
        metadata: {
          feedingType,
          babyState: isNight && feedingType !== 'solids' ? babyState : null,
          isNightFeeding: isNight
        }
      }
      
      // Llamar a la API para registrar el evento
      const response = await fetch('/api/children/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData)
      })
      
      if (!response.ok) {
        throw new Error('Error al registrar la alimentación')
      }
      
      toast({
        title: "✅ Alimentación registrada",
        description: `${eventTitle} a las ${format(feedingTime, 'HH:mm', { locale: es })}`
      })
      
      onEventRegistered()
      onClose()
      
      // Reset form
      setFeedingType('breast')
      setFeedingTime(new Date())
      setBabyState(null)
      setNotes("")
      
    } catch (error) {
      console.error('Error registrando alimentación:', error)
      toast({
        title: "Error",
        description: "No se pudo registrar la alimentación. Por favor intenta de nuevo.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Utensils className="w-5 h-5 text-green-600" />
            Registrar Alimentación
          </DialogTitle>
          <DialogDescription>
            {childName} - {format(feedingTime, "EEEE d 'de' MMMM", { locale: es })}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Tipo de alimentación */}
          <div>
            <Label>Tipo de alimentación</Label>
            <RadioGroup 
              value={feedingType} 
              onValueChange={(value) => setFeedingType(value as FeedingType)}
              className="mt-2"
            >
              {feedingOptions.map(option => {
                const Icon = option.icon
                return (
                  <div key={option.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={option.value} id={option.value} />
                    <Label 
                      htmlFor={option.value} 
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Icon className={cn("w-4 h-4", option.color)} />
                      {option.label}
                    </Label>
                  </div>
                )
              })}
            </RadioGroup>
          </div>
          
          {/* Hora del evento */}
          <div>
            <Label>Hora de la alimentación</Label>
            <TimeAdjuster
              time={feedingTime}
              onChange={setFeedingTime}
              className="mt-2"
            />
          </div>
          
          {/* Estado del bebé durante toma nocturna */}
          {isNight && feedingType !== 'solids' && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <Label className="flex items-center gap-2 mb-2">
                <Moon className="w-4 h-4 text-blue-600" />
                Toma nocturna - ¿Cómo estaba el bebé?
              </Label>
              <RadioGroup 
                value={babyState || ''} 
                onValueChange={(value) => setBabyState(value as BabyState)}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="asleep" id="asleep" />
                  <Label htmlFor="asleep" className="cursor-pointer">
                    😴 Dormido (dream feed)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="awake" id="awake" />
                  <Label htmlFor="awake" className="cursor-pointer">
                    👶 Despierto
                  </Label>
                </div>
              </RadioGroup>
              <p className="text-xs text-gray-600 mt-2">
                Esta información es importante para el análisis del sueño
              </p>
            </div>
          )}
          
          {/* Notas guiadas */}
          <div>
            <Label>Notas (opcional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={getNotesPlaceholder()}
              className="mt-2 min-h-[80px]"
            />
          </div>
        </div>
        
        {/* Botones de acción */}
        <div className="flex gap-3 mt-6">
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
            disabled={isLoading || (isNight && feedingType !== 'solids' && !babyState)}
            className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
          >
            {isLoading ? "Registrando..." : "Registrar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}