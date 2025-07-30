"use client"

import { useState } from "react"
import { Clock, Info } from "lucide-react"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface SleepDelayInputProps {
  value: number
  onChange: (value: number) => void
  className?: string
}

export function SleepDelayInput({ value, onChange, className }: SleepDelayInputProps) {
  const [customValue, setCustomValue] = useState(value.toString())

  // Botones de acceso rápido
  const quickOptions = [5, 10, 15, 30, 45, 60]

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setCustomValue(val)
    
    const numVal = parseInt(val)
    if (!isNaN(numVal) && numVal >= 0 && numVal <= 120) {
      onChange(numVal)
    }
  }

  const handleQuickSelect = (minutes: number) => {
    setCustomValue(minutes.toString())
    onChange(minutes)
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header con icono y label */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
          <Clock className="w-4 h-4 text-purple-600" />
        </div>
        <Label className="text-base font-medium text-gray-700">
          ¿Cuánto tiempo tardó en dormirse?
        </Label>
      </div>

      {/* Texto explicativo */}
      <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
        <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-blue-700">
          Registra el tiempo aproximado desde que lo acostaste hasta que se quedó dormido. 
          Esto nos ayuda a entender mejor sus patrones de sueño.
        </p>
      </div>

      {/* Botones de acceso rápido */}
      <div className="grid grid-cols-3 gap-2">
        {quickOptions.map((minutes) => (
          <Button
            key={minutes}
            type="button"
            variant={value === minutes ? "default" : "outline"}
            size="sm"
            onClick={() => handleQuickSelect(minutes)}
            className={cn(
              "text-sm",
              value === minutes && "bg-purple-600 hover:bg-purple-700"
            )}
          >
            {minutes} min
          </Button>
        ))}
      </div>

      {/* Input personalizado */}
      <div className="flex items-center gap-3">
        <Input
          type="number"
          value={customValue}
          onChange={handleCustomChange}
          min="0"
          max="120"
          className="w-24"
          placeholder="0"
        />
        <span className="text-sm text-gray-600">minutos</span>
      </div>

      {/* Indicador visual del tiempo seleccionado */}
      {value > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-purple-700">Tiempo para dormirse:</span>
            <span className="font-bold text-purple-800">
              {value < 60 
                ? `${value} minutos`
                : `${Math.floor(value / 60)}h ${value % 60}m`
              }
            </span>
          </div>
        </div>
      )}
    </div>
  )
}