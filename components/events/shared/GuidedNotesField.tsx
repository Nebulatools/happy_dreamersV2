"use client"

import React from "react"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

interface GuidedNotesFieldProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  eventType?: string
  className?: string
  rows?: number
  disabled?: boolean
}

// Placeholders específicos por tipo de evento
const eventPlaceholders: Record<string, string> = {
  sleep: "¿Cómo se durmió? ¿Lo arrullaron, tomó pecho, lo dejaron en la cuna despierto? ¿Hubo alguna dificultad?",
  wake: "¿Cómo fue el despertar? ¿Despertó contento, llorando? ¿Necesitó ayuda para levantarse?",
  night_waking: "¿Por qué se despertó? ¿Lloró mucho? ¿Necesitó consuelo? ¿Qué ayudó a calmarlo?",
  feeding: "¿Qué comió/bebió? ¿Cuánto? ¿Cómo fue el proceso? ¿Se quedó satisfecho?",
  night_feeding: "Detalles de la toma nocturna: ¿Qué comió/bebió? ¿Cuánto? ¿Cómo fue el proceso? ¿Volvió a dormir fácilmente?",
  medication: "¿Qué medicamento? ¿Dosis? ¿Razón? ¿Alguna reacción?",
  extra_activities: "Describe las actividades del día que pueden afectar el sueño...",
  default: "Añade cualquier detalle adicional sobre este evento..."
}

/**
 * Campo de notas con placeholders guiados según el tipo de evento
 * Ayuda a los padres a proporcionar información relevante
 */
export function GuidedNotesField({
  value,
  onChange,
  placeholder,
  eventType = "default",
  className,
  rows = 3,
  disabled = false
}: GuidedNotesFieldProps) {
  // Usar placeholder personalizado o el específico del tipo de evento
  const finalPlaceholder = placeholder || eventPlaceholders[eventType] || eventPlaceholders.default

  return (
    <div className="space-y-1">
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={finalPlaceholder}
        rows={rows}
        disabled={disabled}
        className={cn(
          "bg-gray-50 border-gray-200 resize-none",
          "placeholder:text-gray-400 placeholder:text-sm",
          "focus:bg-white transition-colors",
          className
        )}
      />
      {value && (
        <p className="text-xs text-gray-500">
          {value.length} caracteres
        </p>
      )}
    </div>
  )
}