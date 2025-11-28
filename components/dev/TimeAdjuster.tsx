"use client"

import React, { useState, useEffect } from "react"
import { Clock, ChevronUp, ChevronDown, RotateCcw, Play, Pause } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getTimePartsInTimezone } from "@/lib/datetime"

// Solo mostrar en desarrollo
const isDevelopment = process.env.NODE_ENV === "development"

interface TimeAdjusterProps {
  onTimeChange?: (date: Date) => void
  timezone?: string  // Timezone del usuario para visualizacion correcta
}

/**
 * Componente de desarrollo para simular diferentes horas del día
 * Solo visible en modo desarrollo
 */
export function TimeAdjuster({ onTimeChange, timezone }: TimeAdjusterProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [simulatedTime, setSimulatedTime] = useState<Date | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [speed, setSpeed] = useState(1) // 1x, 10x, 60x, 360x velocidad
  const [isClient, setIsClient] = useState(false)
  
  // No renderizar en producción
  if (!isDevelopment) return null
  
  // Validación defensiva para evitar errores
  if (!onTimeChange || typeof onTimeChange !== "function") {
    console.warn("TimeAdjuster: onTimeChange prop is not a function")
    return null
  }
  
  // Actualizar el tiempo simulado cuando está corriendo
  useEffect(() => {
    if (!isRunning) return
    
    const interval = setInterval(() => {
      setSimulatedTime(prev => {
        const newTime = new Date(prev.getTime() + (1000 * speed))
        onTimeChange?.(newTime)
        
        // Guardar en localStorage para persistencia
        if (typeof window !== "undefined") {
          window.localStorage.setItem("devSimulatedTime", newTime.toISOString())
        }
        
        return newTime
      })
    }, 1000 / Math.min(speed, 60)) // Actualizar más rápido cuando speed es alto
    
    return () => clearInterval(interval)
  }, [isRunning, speed, onTimeChange])
  
  // Inicializar en el cliente
  useEffect(() => {
    setIsClient(true)
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem("devSimulatedTime")
      if (saved) {
        const date = new Date(saved)
        setSimulatedTime(date)
        onTimeChange?.(date)
      } else {
        setSimulatedTime(new Date())
      }
    }
  }, [onTimeChange])
  
  const adjustHours = (hours: number) => {
    if (!simulatedTime) return
    const newTime = new Date(simulatedTime)
    newTime.setHours(newTime.getHours() + hours)
    setSimulatedTime(newTime)
    onTimeChange?.(newTime)
    
    if (typeof window !== "undefined") {
      window.localStorage.setItem("devSimulatedTime", newTime.toISOString())
    }
  }
  
  const adjustMinutes = (minutes: number) => {
    if (!simulatedTime) return
    const newTime = new Date(simulatedTime)
    newTime.setMinutes(newTime.getMinutes() + minutes)
    setSimulatedTime(newTime)
    onTimeChange?.(newTime)
    
    if (typeof window !== "undefined") {
      window.localStorage.setItem("devSimulatedTime", newTime.toISOString())
    }
  }
  
  const setToPreset = (hour: number, minute: number = 0) => {
    if (!simulatedTime) return
    const newTime = new Date(simulatedTime)
    newTime.setHours(hour, minute, 0, 0)
    setSimulatedTime(newTime)
    onTimeChange?.(newTime)
    
    if (typeof window !== "undefined") {
      window.localStorage.setItem("devSimulatedTime", newTime.toISOString())
    }
  }
  
  const resetToNow = () => {
    const now = new Date()
    setSimulatedTime(now)
    onTimeChange?.(now)
    setIsRunning(false)
    
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("devSimulatedTime")
    }
  }
  
  const toggleSpeed = () => {
    const speeds = [1, 10, 60, 360]
    const currentIndex = speeds.indexOf(speed)
    const nextIndex = (currentIndex + 1) % speeds.length
    setSpeed(speeds[nextIndex])
  }
  
  return (
    <div className={cn(
      "fixed bottom-4 right-4 z-50 transition-all duration-300",
      isExpanded ? "w-80" : "w-auto"
    )}>
      <div className="bg-gray-900 text-white rounded-lg shadow-2xl border border-gray-700">
        {/* Header - siempre visible */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-2 flex items-center justify-between hover:bg-gray-800 transition-colors rounded-t-lg"
        >
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-yellow-400" />
            {isClient && simulatedTime ? (
              <>
                <span className="text-sm font-mono">
                  {simulatedTime.toLocaleTimeString("es-ES", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    timeZone: timezone || undefined,
                  })}
                </span>
                <span className="text-xs text-gray-400">
                  {simulatedTime.toLocaleDateString("es-ES", {
                    day: "2-digit",
                    month: "short",
                    timeZone: timezone || undefined,
                  })}
                </span>
              </>
            ) : (
              <span className="text-sm font-mono">--:--:--</span>
            )}
          </div>
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
        
        {/* Controles - solo cuando está expandido */}
        {isExpanded && (
          <div className="p-4 space-y-3 border-t border-gray-700">
            {/* Control de reproducción */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsRunning(!isRunning)}
                className="text-white hover:bg-gray-700"
              >
                {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={toggleSpeed}
                className="text-white hover:bg-gray-700 font-mono text-xs"
              >
                {speed}x
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={resetToNow}
                className="text-white hover:bg-gray-700 ml-auto"
                title="Reset to current time"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Ajustes manuales */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <div className="text-xs text-gray-400 text-center">Horas</div>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => adjustHours(-1)}
                    className="text-white hover:bg-gray-700 h-8 w-8 p-0"
                  >
                    -
                  </Button>
                  <div className="flex-1 text-center font-mono">
                    {simulatedTime
                      ? (timezone
                        ? getTimePartsInTimezone(simulatedTime, timezone).hours.toString().padStart(2, "0")
                        : simulatedTime.getHours().toString().padStart(2, "0"))
                      : "--"}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => adjustHours(1)}
                    className="text-white hover:bg-gray-700 h-8 w-8 p-0"
                  >
                    +
                  </Button>
                </div>
              </div>
              
              <div className="space-y-1">
                <div className="text-xs text-gray-400 text-center">Minutos</div>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => adjustMinutes(-15)}
                    className="text-white hover:bg-gray-700 h-8 w-8 p-0"
                  >
                    -
                  </Button>
                  <div className="flex-1 text-center font-mono">
                    {simulatedTime
                      ? (timezone
                        ? getTimePartsInTimezone(simulatedTime, timezone).minutes.toString().padStart(2, "0")
                        : simulatedTime.getMinutes().toString().padStart(2, "0"))
                      : "--"}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => adjustMinutes(15)}
                    className="text-white hover:bg-gray-700 h-8 w-8 p-0"
                  >
                    +
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Presets de tiempo */}
            <div className="space-y-2">
              <div className="text-xs text-gray-400">Presets rápidos:</div>
              <div className="grid grid-cols-3 gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setToPreset(7, 0)}
                  className="text-white hover:bg-gray-700 text-xs"
                >
                  🌅 7:00
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setToPreset(13, 0)}
                  className="text-white hover:bg-gray-700 text-xs"
                >
                  ☀️ 13:00
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setToPreset(15, 30)}
                  className="text-white hover:bg-gray-700 text-xs"
                >
                  😴 15:30
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setToPreset(19, 30)}
                  className="text-white hover:bg-gray-700 text-xs"
                >
                  🌆 19:30
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setToPreset(21, 0)}
                  className="text-white hover:bg-gray-700 text-xs"
                >
                  🌙 21:00
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setToPreset(3, 0)}
                  className="text-white hover:bg-gray-700 text-xs"
                >
                  🌌 3:00
                </Button>
              </div>
            </div>
            
            {/* Estado actual */}
            <div className="pt-2 border-t border-gray-700 text-xs text-gray-400">
              <div>Modo: {getModeForTime(simulatedTime, timezone)}</div>
              <div>Real: {new Date().toLocaleTimeString("es-ES")}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Helper para determinar el modo según la hora
function getModeForTime(date: Date, timezone?: string): string {
  const hour = timezone
    ? getTimePartsInTimezone(date, timezone).hours
    : date.getHours()
  
  if (hour >= 6 && hour < 10) return "🌅 Despertar matutino"
  if (hour >= 10 && hour < 13) return "☀️ Mañana activa"
  if (hour >= 13 && hour < 16) return "😴 Hora de siesta"
  if (hour >= 16 && hour < 19) return "🌤️ Tarde activa"
  if (hour >= 19 && hour < 21) return "🌆 Preparación para dormir"
  if (hour >= 21 || hour < 6) return "🌙 Noche de sueño"
  
  return "🕐 Transición"
}