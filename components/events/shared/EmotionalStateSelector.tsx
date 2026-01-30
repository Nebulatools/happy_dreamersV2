/**
 * EmotionalStateSelector - Componente reutilizable para seleccionar estado emocional
 *
 * Usado en:
 * - SleepDelayModal
 * - NightWakingModal
 * - WakeUpModal
 *
 * Estados disponibles segun registroeventos.md:
 * - tranquilo: Se durmio con calma
 * - inquieto: Algo de dificultad
 * - alterado: Muy dificil dormirse
 */

"use client"

import { cn } from "@/lib/utils"
import type { EmotionalState } from "@/components/events/types"

interface EmotionalStateSelectorProps {
  /** Etiqueta descriptiva */
  label: string
  /** Valor actual */
  value: EmotionalState
  /** Callback cuando cambia el valor */
  onChange: (state: EmotionalState) => void
  /** Si esta deshabilitado */
  disabled?: boolean
  /** Variante visual (default: grid, compact: horizontal) */
  variant?: "grid" | "compact"
  /** Color del tema (default: "blue") */
  themeColor?: "blue" | "red" | "purple" | "green"
  /** Clase CSS adicional */
  className?: string
}

// Configuracion de estados emocionales
const EMOTIONAL_STATES: Array<{
  value: EmotionalState
  label: string
  description: string
}> = [
  {
    value: "tranquilo",
    label: "Tranquilo",
    description: "Se durmio con calma",
  },
  {
    value: "inquieto",
    label: "Inquieto",
    description: "Algo de dificultad",
  },
  {
    value: "irritable",
    label: "Alterado",
    description: "Muy dificil dormirse",
  },
]

/**
 * Obtiene clases de color segun el tema y si esta seleccionado
 */
function getStateClasses(
  isSelected: boolean,
  themeColor: string
): { border: string; bg: string; text: string } {
  if (!isSelected) {
    return {
      border: "border-gray-200 hover:border-gray-300",
      bg: "",
      text: "text-gray-700",
    }
  }

  const themes = {
    blue: {
      border: "border-blue-500",
      bg: "bg-blue-50",
      text: "text-blue-700",
    },
    red: {
      border: "border-red-500",
      bg: "bg-red-50",
      text: "text-red-700",
    },
    purple: {
      border: "border-purple-500",
      bg: "bg-purple-50",
      text: "text-purple-700",
    },
    green: {
      border: "border-green-500",
      bg: "bg-green-50",
      text: "text-green-700",
    },
  }

  return themes[themeColor as keyof typeof themes] || themes.blue
}

export function EmotionalStateSelector({
  label,
  value,
  onChange,
  disabled = false,
  variant = "grid",
  themeColor = "blue",
  className,
}: EmotionalStateSelectorProps) {
  const containerClass =
    variant === "grid" ? "grid grid-cols-3 gap-2" : "flex gap-2 flex-wrap"

  return (
    <div className={cn("space-y-3", className)}>
      {/* Label */}
      <div className="text-sm font-medium text-gray-700">{label}</div>

      {/* Estados */}
      <div className={containerClass}>
        {EMOTIONAL_STATES.map((state) => {
          const isSelected = value === state.value
          const classes = getStateClasses(isSelected, themeColor)

          return (
            <button
              key={state.value}
              type="button"
              onClick={() => onChange(state.value)}
              disabled={disabled}
              className={cn(
                "p-3 rounded-lg border-2 transition-all text-center",
                classes.border,
                classes.bg
              )}
            >
              <div className={cn("font-medium text-sm", classes.text)}>
                {state.label}
              </div>
              {variant === "grid" && (
                <div className="text-xs text-gray-500 mt-1">
                  {state.description}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Re-exportar tipo para conveniencia
export type { EmotionalState }
