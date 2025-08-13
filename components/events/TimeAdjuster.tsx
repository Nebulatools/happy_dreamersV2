"use client"

import React, { useState, useEffect } from "react"
import { ChevronUp, ChevronDown, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

interface TimeAdjusterProps {
  value: Date
  onChange: (date: Date) => void
  className?: string
  showQuickButtons?: boolean
}

export function TimeAdjuster({ 
  value, 
  onChange, 
  className,
  showQuickButtons = true 
}: TimeAdjusterProps) {
  // Valor por defecto si value es undefined o inválido
  const safeValue = value instanceof Date && !isNaN(value.getTime()) ? value : new Date()
  
  const [hours, setHours] = useState(safeValue.getHours())
  const [minutes, setMinutes] = useState(safeValue.getMinutes())
  const [isAM, setIsAM] = useState(safeValue.getHours() < 12)
  
  // Actualizar cuando cambie el valor externo
  useEffect(() => {
    const safeValue = value instanceof Date && !isNaN(value.getTime()) ? value : new Date()
    setHours(safeValue.getHours())
    setMinutes(safeValue.getMinutes())
    setIsAM(safeValue.getHours() < 12)
  }, [value])
  
  // Actualizar la fecha cuando cambien los valores
  useEffect(() => {
    const baseDate = value instanceof Date && !isNaN(value.getTime()) ? value : new Date()
    const newDate = new Date(baseDate)
    newDate.setHours(hours)
    newDate.setMinutes(minutes)
    onChange(newDate)
  }, [hours, minutes])
  
  // Convertir a formato 12 horas para mostrar
  const display12Hour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
  
  // Incrementar/decrementar horas
  const adjustHours = (increment: boolean) => {
    if (increment) {
      setHours((h) => (h + 1) % 24)
    } else {
      setHours((h) => (h - 1 + 24) % 24)
    }
  }
  
  // Incrementar/decrementar minutos (de 5 en 5)
  const adjustMinutes = (increment: boolean) => {
    if (increment) {
      const newMinutes = minutes + 5
      if (newMinutes >= 60) {
        setMinutes(newMinutes - 60)
        adjustHours(true)
      } else {
        setMinutes(newMinutes)
      }
    } else {
      const newMinutes = minutes - 5
      if (newMinutes < 0) {
        setMinutes(newMinutes + 60)
        adjustHours(false)
      } else {
        setMinutes(newMinutes)
      }
    }
  }
  
  // Cambiar AM/PM
  const toggleAMPM = () => {
    if (isAM) {
      // Cambiar a PM
      if (hours < 12) {
        setHours(hours + 12)
      }
    } else {
      // Cambiar a AM
      if (hours >= 12) {
        setHours(hours - 12)
      }
    }
    setIsAM(!isAM)
  }
  
  // Opciones rápidas de hora
  const quickTimes = [
    { label: 'Mañana', hour: 7, minute: 0 },
    { label: 'Mediodía', hour: 12, minute: 0 },
    { label: 'Tarde', hour: 15, minute: 0 },
    { label: 'Noche', hour: 20, minute: 0 },
  ]
  
  const setQuickTime = (hour: number, minute: number) => {
    setHours(hour)
    setMinutes(minute)
    setIsAM(hour < 12)
  }
  
  return (
    <div className={cn("space-y-3", className)}>
      {/* Selector de tiempo principal */}
      <div className="flex items-center justify-center gap-2 bg-gray-50 rounded-lg p-4">
        <Clock className="w-5 h-5 text-gray-600" />
        
        {/* Horas */}
        <div className="flex flex-col items-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => adjustHours(true)}
            className="h-6 w-6 p-0"
          >
            <ChevronUp className="w-4 h-4" />
          </Button>
          
          <div className="w-12 h-12 flex items-center justify-center bg-white rounded-lg border-2 border-gray-200 font-bold text-xl">
            {display12Hour.toString().padStart(2, '0')}
          </div>
          
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => adjustHours(false)}
            className="h-6 w-6 p-0"
          >
            <ChevronDown className="w-4 h-4" />
          </Button>
        </div>
        
        <span className="text-2xl font-bold text-gray-600">:</span>
        
        {/* Minutos */}
        <div className="flex flex-col items-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => adjustMinutes(true)}
            className="h-6 w-6 p-0"
          >
            <ChevronUp className="w-4 h-4" />
          </Button>
          
          <div className="w-12 h-12 flex items-center justify-center bg-white rounded-lg border-2 border-gray-200 font-bold text-xl">
            {minutes.toString().padStart(2, '0')}
          </div>
          
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => adjustMinutes(false)}
            className="h-6 w-6 p-0"
          >
            <ChevronDown className="w-4 h-4" />
          </Button>
        </div>
        
        {/* AM/PM */}
        <Button
          type="button"
          variant={isAM ? "default" : "outline"}
          size="sm"
          onClick={toggleAMPM}
          className="ml-2"
        >
          {isAM ? 'AM' : 'PM'}
        </Button>
      </div>
      
      {/* Botones de tiempo rápido */}
      {showQuickButtons && (
        <div className="grid grid-cols-4 gap-2">
          {quickTimes.map((time) => (
            <Button
              key={time.label}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setQuickTime(time.hour, time.minute)}
              className={cn(
                "text-xs",
                hours === time.hour && minutes === time.minute && "bg-blue-50 border-blue-300"
              )}
            >
              {time.label}
            </Button>
          ))}
        </div>
      )}
      
      {/* Hora actual formateada */}
      <div className="text-center">
        <p className="text-sm text-gray-600">
          Hora seleccionada: <span className="font-medium">{format(value, 'HH:mm')}</span>
        </p>
      </div>
    </div>
  )
}