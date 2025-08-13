"use client"

import React from "react"
import { Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface SimpleSleepDelaySelectorProps {
  value: number
  onChange: (minutes: number) => void
  bedtimeTimestamp?: Date
  className?: string
}

/**
 * Selector simplificado de tiempo para dormirse
 * Usado en el modo simple para captura rápida
 */
export function SimpleSleepDelaySelector({
  value,
  onChange,
  bedtimeTimestamp,
  className
}: SimpleSleepDelaySelectorProps) {
  // Opciones rápidas de tiempo predefinidas
  const quickOptions = [
    { minutes: 0, label: "Inmediato" },
    { minutes: 5, label: "5 min" },
    { minutes: 10, label: "10 min" },
    { minutes: 15, label: "15 min" },
    { minutes: 30, label: "30 min" },
    { minutes: 45, label: "45 min" },
  ]

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-gray-600" />
        <p className="text-sm font-medium text-gray-700">
          ¿Cuánto tardó en dormirse?
        </p>
      </div>
      
      {/* Grid de opciones rápidas */}
      <div className="grid grid-cols-3 gap-2">
        {quickOptions.map((option) => (
          <Button
            key={option.minutes}
            type="button"
            variant={value === option.minutes ? "default" : "outline"}
            size="sm"
            onClick={() => onChange(option.minutes)}
            className={cn(
              "transition-all",
              value === option.minutes && "bg-blue-600 hover:bg-blue-700"
            )}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {/* Input personalizado para valores específicos */}
      <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
        <span className="text-sm text-gray-600">O especifica:</span>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Math.max(0, Math.min(120, parseInt(e.target.value) || 0)))}
          className="w-16 px-2 py-1 text-center border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          min="0"
          max="120"
        />
        <span className="text-sm text-gray-600">minutos</span>
      </div>

      {/* Mensaje de confirmación con hora calculada */}
      <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded">
        {value === 0 ? (
          <p>💤 Se durmió inmediatamente</p>
        ) : (
          <div className="space-y-1">
            <p>💤 Tardó {value} minutos en dormirse</p>
            {bedtimeTimestamp && (
              <p className="text-xs text-gray-500">
                Se dormirá registrado a las {
                  new Date(bedtimeTimestamp.getTime() + (value * 60 * 1000))
                    .toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
                }
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}