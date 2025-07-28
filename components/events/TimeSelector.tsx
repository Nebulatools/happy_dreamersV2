"use client"

import { useState, useEffect } from "react"
import { ChevronUp, ChevronDown, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

interface TimeSelectorProps {
  value?: string
  onChange: (value: string) => void
  label?: string
  disabled?: boolean
  color?: "blue" | "green"
}

export function TimeSelector({ value, onChange, label, disabled = false, color = "blue" }: TimeSelectorProps) {
  // Convertir el valor string a fecha con validación
  const createSafeDate = (val?: string) => {
    if (!val) return new Date()
    const parsedDate = new Date(val)
    return isNaN(parsedDate.getTime()) ? new Date() : parsedDate
  }
  
  const dateValue = createSafeDate(value)
  
  // Estado para horas y minutos - inicializar solo una vez
  const [hours24, setHours24] = useState(() => dateValue.getHours())
  const [minutes, setMinutes] = useState(() => {
    const roundedMinutes = Math.round(dateValue.getMinutes() / 10) * 10
    return roundedMinutes >= 60 ? 50 : roundedMinutes
  })
  const [date, setDate] = useState(() => dateValue.toISOString().split("T")[0])
  
  // SINCRONIZAR CON VALOR EXTERNO - cuando el valor cambia desde fuera
  useEffect(() => {
    if (value) {
      const newDate = createSafeDate(value)
      const newDateStr = newDate.toISOString().split("T")[0]
      const newHours = newDate.getHours()
      const newMinutes = Math.round(newDate.getMinutes() / 10) * 10
      
      setDate(newDateStr)
      setHours24(newHours)
      setMinutes(newMinutes >= 60 ? 50 : newMinutes)
      setIsPM(newHours >= 12)
    }
  }, [value])
  
  
  const [isPM, setIsPM] = useState(() => dateValue.getHours() >= 12)
  
  // Convertir horas 24 a formato 12
  const hours12 = hours24 === 0 ? 12 : hours24 > 12 ? hours24 - 12 : hours24

  // Actualizar el valor cuando cambian las partes
  useEffect(() => {
    const h = String(hours24).padStart(2, "0")
    const m = String(minutes).padStart(2, "0")
    onChange(`${date}T${h}:${m}`)
  }, [hours24, minutes, date, onChange])

  // Funciones para ajustar el tiempo
  const adjustHours = (increment: number) => {
    let newHours12 = hours12 + increment
    const newIsPM = isPM
    
    if (newHours12 > 12) {
      newHours12 = 1
    } else if (newHours12 < 1) {
      newHours12 = 12
    }
    
    // Convertir a formato 24 horas
    let newHours24 = newHours12
    if (newIsPM && newHours12 !== 12) {
      newHours24 = newHours12 + 12
    } else if (!newIsPM && newHours12 === 12) {
      newHours24 = 0
    }
    
    setHours24(newHours24)
  }
  
  const toggleAMPM = () => {
    const newIsPM = !isPM
    setIsPM(newIsPM)
    
    let newHours24 = hours24
    if (newIsPM && hours24 < 12) {
      newHours24 = hours24 + 12
    } else if (!newIsPM && hours24 >= 12) {
      newHours24 = hours24 - 12
    }
    
    setHours24(newHours24)
  }

  const adjustMinutes = (increment: number) => {
    let newMinutes = minutes + increment
    let hourAdjust = 0
    
    if (newMinutes >= 60) {
      hourAdjust = 1
      newMinutes = 0
    } else if (newMinutes < 0) {
      hourAdjust = -1
      newMinutes = 50
    }
    
    // ASEGURAR QUE MINUTOS SEA VÁLIDO (0-50)
    newMinutes = Math.max(0, Math.min(50, newMinutes))
    
    setMinutes(newMinutes)
    if (hourAdjust !== 0) {
      adjustHours(hourAdjust)
    }
  }

  const formatTime = (h: number, m: number, pm: boolean) => {
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
    return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${pm ? "PM" : "AM"}`
  }

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-')
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
    return `${parseInt(day)} ${months[parseInt(month) - 1]} ${year}`
  }

  const colorClasses = {
    blue: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      text: "text-blue-700",
      button: "bg-blue-600 hover:bg-blue-700",
      icon: "text-blue-600",
    },
    green: {
      bg: "bg-green-50", 
      border: "border-green-200",
      text: "text-green-700",
      button: "bg-green-600 hover:bg-green-700",
      icon: "text-green-600",
    },
  }
  
  const currentColor = colorClasses[color]
  
  return (
    <div className={cn(
      "rounded-xl p-3 space-y-2",
      currentColor.bg,
      disabled && "opacity-50"
    )}>
      {label && (
        <div className={cn("flex items-center gap-2 text-sm font-medium", currentColor.text)}>
          <Clock className={cn("w-4 h-4", currentColor.icon)} />
          {label}
        </div>
      )}
      
      <div className="space-y-3">
        {/* Selector de fecha */}
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          max={new Date().toISOString().split("T")[0]}
          disabled={disabled}
          className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        
        {/* Selector de tiempo */}
        <div className="flex items-center justify-center gap-1">
          {/* Horas */}
          <div className="flex flex-col items-center">
            <button
              type="button"
              onClick={() => adjustHours(1)}
              disabled={disabled}
              className="p-0.5 hover:bg-gray-200 rounded transition-colors"
            >
              <ChevronUp className="w-5 h-5 text-gray-600" />
            </button>
            <div className={cn(
              "bg-white border-2 rounded-lg px-3 py-1.5 min-w-[50px] text-center font-bold text-xl",
              currentColor.border
            )}>
              {String(hours12).padStart(2, "0")}
            </div>
            <button
              type="button"
              onClick={() => adjustHours(-1)}
              disabled={disabled}
              className="p-0.5 hover:bg-gray-200 rounded transition-colors"
            >
              <ChevronDown className="w-5 h-5 text-gray-600" />
            </button>
          </div>
          
          <span className="text-2xl font-bold text-gray-600 mb-6">:</span>
          
          {/* Minutos */}
          <div className="flex flex-col items-center">
            <button
              type="button"
              onClick={() => adjustMinutes(10)}
              disabled={disabled}
              className="p-0.5 hover:bg-gray-200 rounded transition-colors"
            >
              <ChevronUp className="w-5 h-5 text-gray-600" />
            </button>
            <div className={cn(
              "bg-white border-2 rounded-lg px-3 py-1.5 min-w-[50px] text-center font-bold text-xl",
              currentColor.border
            )}>
              {String(minutes).padStart(2, "0")}
            </div>
            <button
              type="button"
              onClick={() => adjustMinutes(-10)}
              disabled={disabled}
              className="p-0.5 hover:bg-gray-200 rounded transition-colors"
            >
              <ChevronDown className="w-5 h-5 text-gray-600" />
            </button>
          </div>
          
          {/* AM/PM Selector */}
          <button
            type="button"
            onClick={toggleAMPM}
            disabled={disabled}
            className={cn(
              "ml-2 px-4 py-2 rounded-lg text-white font-bold text-sm transition-colors",
              currentColor.button
            )}
          >
            {isPM ? "PM" : "AM"}
          </button>
        </div>
      </div>
      
      {/* Visualización amigable */}
      <div className={cn("text-xs text-center", currentColor.text)}>
        {formatDate(date)} a las {formatTime(hours24, minutes, isPM)}
      </div>
    </div>
  )
}