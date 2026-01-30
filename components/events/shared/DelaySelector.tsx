/**
 * DelaySelector - Componente reutilizable para seleccionar tiempo de delay
 *
 * Usado en:
 * - SleepDelayModal (tiempo para dormirse)
 * - NightWakingModal (tiempo despierto)
 * - NapDelayModal
 *
 * Features:
 * - Botones +/- para ajuste preciso
 * - Opciones rapidas predefinidas
 * - Formato de texto automatico
 * - Soporte para rango configurable
 */

"use client"

import { Button } from "@/components/ui/button"
import { Plus, Minus } from "lucide-react"
import { cn } from "@/lib/utils"

interface DelaySelectorProps {
  /** Etiqueta descriptiva (e.g., "Tiempo para dormirse") */
  label: string
  /** Valor actual en minutos */
  value: number
  /** Callback cuando cambia el valor */
  onChange: (minutes: number) => void
  /** Valor minimo en minutos (default: 0) */
  min?: number
  /** Valor maximo en minutos (default: 120) */
  max?: number
  /** Paso de incremento/decremento (default: 5) */
  step?: number
  /** Opciones rapidas a mostrar (default: [0, 15, 30, 45]) */
  quickOptions?: number[]
  /** Si esta deshabilitado */
  disabled?: boolean
  /** Texto para valor 0 (default: "Inmediato") */
  zeroLabel?: string
  /** Color del tema (default: "blue") */
  themeColor?: "blue" | "red" | "purple" | "green"
  /** Clase CSS adicional */
  className?: string
}

/**
 * Formatea minutos a texto legible
 */
function formatMinutesToText(minutes: number, zeroLabel: string): string {
  if (minutes === 0) return zeroLabel
  if (minutes === 60) return "1 hora"
  if (minutes > 60) {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (mins === 0) return `${hours}h`
    return `${hours}h ${mins}min`
  }
  return `${minutes} minutos`
}

/**
 * Obtiene clases de color segun el tema
 */
function getThemeClasses(color: string) {
  const themes = {
    blue: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      text: "text-blue-600",
      button: "bg-blue-500 text-white",
    },
    red: {
      bg: "bg-red-50",
      border: "border-red-200",
      text: "text-red-600",
      button: "bg-red-500 text-white",
    },
    purple: {
      bg: "bg-purple-50",
      border: "border-purple-200",
      text: "text-purple-600",
      button: "bg-purple-500 text-white",
    },
    green: {
      bg: "bg-green-50",
      border: "border-green-200",
      text: "text-green-600",
      button: "bg-green-500 text-white",
    },
  }
  return themes[color as keyof typeof themes] || themes.blue
}

export function DelaySelector({
  label,
  value,
  onChange,
  min = 0,
  max = 120,
  step = 5,
  quickOptions = [0, 15, 30, 45],
  disabled = false,
  zeroLabel = "Inmediato",
  themeColor = "blue",
  className,
}: DelaySelectorProps) {
  const theme = getThemeClasses(themeColor)

  // Ajustar valor con limites
  const adjustValue = (increment: number) => {
    const newValue = value + increment
    onChange(Math.max(min, Math.min(max, newValue)))
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Label */}
      <div className="text-sm font-medium text-gray-700">{label}</div>

      {/* Control principal con flechas */}
      <div className="flex items-center justify-center gap-4 py-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => adjustValue(-step)}
          disabled={disabled || value <= min}
          className="h-10 w-10 rounded-full"
        >
          <Minus className="h-4 w-4" />
        </Button>

        <div
          className={cn(
            "border-2 rounded-xl px-6 py-3 min-w-[180px] text-center",
            theme.bg,
            theme.border
          )}
        >
          <div className={cn("text-2xl font-bold", theme.text)}>
            {formatMinutesToText(value, zeroLabel)}
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => adjustValue(step)}
          disabled={disabled || value >= max}
          className="h-10 w-10 rounded-full"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Opciones rapidas */}
      {quickOptions.length > 0 && (
        <div className="flex justify-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500 w-full text-center mb-1">
            Opciones rapidas:
          </span>
          {quickOptions.map((minutes) => (
            <button
              key={minutes}
              type="button"
              onClick={() => onChange(minutes)}
              disabled={disabled}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                value === minutes
                  ? theme.button
                  : "bg-gray-100 hover:bg-gray-200 text-gray-700"
              )}
            >
              {minutes === 0 ? zeroLabel : `${minutes}min`}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
