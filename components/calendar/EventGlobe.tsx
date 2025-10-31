// 🎯 Componente de globo de evento - Versión completa funcional
"use client"

import React from 'react'
import { Moon, Sun, AlertCircle, Clock } from "lucide-react"
import { cn } from '@/lib/utils'
import type { CalendarViewMode } from '@/types/calendar'

interface Event {
  _id: string;
  childId: string;
  eventType: string;
  emotionalState: string;
  startTime: string;
  endTime?: string;
  notes?: string;
}

// ⚡ FUNCIÓN CLAVE: Extracción de tiempo con conversión de timezone
function extractTimeFromISO(isoString: string) {
  try {
    // Usar Date constructor para convertir correctamente a hora local
    const date = new Date(isoString)
    if (isNaN(date.getTime())) {
      console.error('extractTimeFromISO: fecha inválida', isoString)
      return null
    }
    
    const hours = date.getHours()
    const minutes = date.getMinutes()
    
    return {
      hours,
      minutes,
      formatted: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
    }
  } catch (error) {
    console.error('extractTimeFromISO error:', error, isoString)
    return null
  }
}

interface EventGlobeProps {
  event: Event;
  hourHeight: number;  // Ej: 30px por hora
  onClick?: (event: Event) => void;
  viewMode?: CalendarViewMode;
}

export function EventGlobe({ event, hourHeight = 30, onClick, viewMode = 'full' }: EventGlobeProps) {
  const timeData = extractTimeFromISO(event.startTime)
  const endTimeData = event.endTime ? extractTimeFromISO(event.endTime) : null
  
  if (!timeData) return null
  
  const { hours, minutes } = timeData
  
  // 🎯 POSICIÓN EXACTA: minutos desde medianoche * altura por minuto
  const totalMinutes = hours * 60 + minutes
  const position = totalMinutes * (hourHeight / 60)
  
  // 🎯 ALTURA DINÁMICA: basada en duración
  let duration = 0
  if (endTimeData) {
    const endTotalMinutes = endTimeData.hours * 60 + endTimeData.minutes
    duration = endTotalMinutes - totalMinutes
  }
  const height = duration > 0 ? Math.max(20, duration * (hourHeight / 60)) : 20
  
  // 🎨 COLOR POR TIPO DE EVENTO
  const getColor = () => {
    switch (event.eventType) {
      case 'nap': return 'bg-orange-400 text-white'
      case 'sleep': return 'bg-blue-400 text-white'  
      case 'wake': return 'bg-wake text-white'
      case 'night_waking': return 'bg-night-wake text-white'
      case 'feeding': return 'bg-feeding text-white'
      case 'medication': return 'bg-purple-500 text-white'
      case 'extra_activities': return 'bg-teal-500 text-white'
      default: return 'bg-gray-400 text-white'
    }
  }
  
  // 🎭 ICONO POR TIPO
  const getIcon = () => {
    switch (event.eventType) {
      case 'nap': return <Sun className="w-3 h-3" />
      case 'sleep': return <Moon className="w-3 h-3" />
      case 'wake': return <Sun className="w-3 h-3" />
      case 'night_waking': return <AlertCircle className="w-3 h-3" />
      default: return <Clock className="w-3 h-3" />
    }
  }
  
  // 📝 NOMBRE DEL EVENTO
  const getName = () => {
    const names: Record<string, string> = {
      nap: 'Siesta',
      sleep: 'Dormir',
      wake: 'Despertar',
      night_waking: 'Despertar nocturno',
      feeding: 'Alimentación',
      medication: 'Medicamento',
      extra_activities: 'Actividad Extra'
    }
    return names[event.eventType] || event.eventType
  }
  
  const isCompact = viewMode === 'compact'
  if (isCompact) {
    return (
      <div
        className={cn(
          'absolute left-1 right-1 rounded-md opacity-90',
          getColor()
        )}
        style={{
          top: `${position}px`,
          height: `${Math.max(height, 12)}px`
        }}
        onClick={(e) => {
          e.stopPropagation()
          onClick?.(event)
        }}
      />
    )
  }

  const baseClass = cn(
    'absolute left-2 right-2 rounded-lg shadow-md flex items-center gap-1 cursor-pointer transition-shadow',
    'px-2 py-1 text-xs hover:shadow-lg',
    getColor()
  )

  return (
    <div
      className={baseClass}
      style={{
        top: `${position}px`,
        height: `${height}px`,
        minHeight: '20px'
      }}
      onClick={(e) => {
        e.stopPropagation()
        onClick?.(event)
      }}
    >
      {getIcon()}
      <div className="flex-1 truncate leading-tight">
        <div>{getName()}</div>
        <div className='opacity-90 text-xs'>
          {timeData.formatted}
          {endTimeData && `-${endTimeData.formatted}`}
        </div>
      </div>
    </div>
  )
}
