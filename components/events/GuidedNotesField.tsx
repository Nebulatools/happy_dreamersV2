"use client"

import React from "react"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface GuidedNotesFieldProps {
  eventType: string
  value: string
  onChange: (value: string) => void
  label?: string
  className?: string
  required?: boolean
}

// Placeholders guiados según el tipo de evento
const GUIDED_PLACEHOLDERS: Record<string, string> = {
  // Eventos de sueño
  sleep: "¿Cómo se durmió? ¿Lo arrullaron, tomó pecho, lo dejaron en la cuna despierto? ¿Hubo alguna dificultad?",
  bedtime: "¿Cómo fue la rutina antes de dormir? ¿Estaba cansado o activo? ¿Necesitó ayuda para relajarse?",
  wake: "¿Cómo se despertó? ¿Solo o lo despertaron? ¿De buen humor o llorando?",
  
  // Despertares nocturnos
  night_waking: "¿Qué pasó durante el despertar? ¿Lloró mucho? ¿Necesitó consuelo? ¿Qué ayudó a calmarlo?",
  night_feeding: "¿Por qué se despertó? ¿Tenía hambre o necesitaba consuelo? ¿Volvió a dormir fácilmente?",
  
  // Alimentación
  feeding: "¿Cantidad? ¿Cómo fue la toma? ¿Se quedó satisfecho? ¿Hubo dificultades?",
  breast: "¿Cuánto tiempo tomó? ¿De uno o ambos pechos? ¿Se quedó satisfecho?",
  bottle: "¿Cantidad en ml/oz? ¿Terminó todo? ¿A qué temperatura prefirió la leche?",
  solids: "¿Qué comió? ¿Le gustó? ¿Cantidad aproximada? ¿Alguna reacción o rechazo?",
  
  // Medicamentos
  medication: "¿Qué medicamento? ¿Dosis? ¿Razón? ¿Hora exacta? ¿Alguna reacción?",
  
  // Actividades extras
  extra_activities: "Describe el evento que puede afectar el sueño (visita, salida, cambio de rutina, etc.)",
  bath: "¿Cómo fue el baño? ¿Le gustó? ¿Le ayudó a relajarse?",
  play: "¿Qué tipo de juego? ¿Se cansó? ¿Estuvo muy activo?",
  outing: "¿A dónde fueron? ¿Cómo estuvo el bebé? ¿Afectó su rutina?",
  
  // Salud
  illness: "¿Qué síntomas presenta? ¿Fiebre? ¿Desde cuándo? ¿Ha visto al médico?",
  vaccination: "¿Qué vacuna recibió? ¿Alguna reacción? ¿Fiebre o malestar?",
  teething: "¿Qué dientes están saliendo? ¿Mucho dolor? ¿Qué ayuda a calmarlo?",
  
  // Estado emocional
  mood: "¿Cómo estuvo de ánimo hoy? ¿Algún cambio notable? ¿Qué pudo causarlo?",
  tantrum: "¿Qué provocó el berrinche? ¿Cuánto duró? ¿Cómo se calmó?",
  
  // Default
  default: "Añade detalles importantes sobre este evento..."
}

// Función para obtener el placeholder apropiado
const getPlaceholder = (eventType: string): string => {
  // Buscar coincidencia exacta
  if (GUIDED_PLACEHOLDERS[eventType]) {
    return GUIDED_PLACEHOLDERS[eventType]
  }
  
  // Buscar coincidencias parciales
  const lowerType = eventType.toLowerCase()
  for (const [key, placeholder] of Object.entries(GUIDED_PLACEHOLDERS)) {
    if (lowerType.includes(key) || key.includes(lowerType)) {
      return placeholder
    }
  }
  
  // Placeholder por defecto
  return GUIDED_PLACEHOLDERS.default
}

export function GuidedNotesField({
  eventType,
  value,
  onChange,
  label = "Notas",
  className,
  required = false
}: GuidedNotesFieldProps) {
  const placeholder = getPlaceholder(eventType)
  
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor="guided-notes">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
        {!required && <span className="text-gray-500 ml-1">(opcional)</span>}
      </Label>
      
      <Textarea
        id="guided-notes"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-h-[100px] resize-y"
        required={required}
      />
      
      {/* Texto de ayuda contextual */}
      <p className="text-xs text-gray-500">
        {eventType === 'sleep' || eventType === 'bedtime' ? 
          "💡 Estos detalles ayudan a identificar patrones y mejorar el sueño" :
          eventType === 'night_waking' ?
          "💡 Esta información es crucial para entender las causas del despertar" :
          eventType.includes('feeding') || eventType === 'breast' || eventType === 'bottle' ?
          "💡 Los detalles de alimentación ayudan a correlacionar con el sueño" :
          eventType === 'medication' ?
          "💡 Es importante registrar medicamentos para el análisis médico" :
          "💡 Cualquier detalle puede ser útil para el análisis"
        }
      </p>
    </div>
  )
}

// Export de los placeholders para uso en otros componentes
export { GUIDED_PLACEHOLDERS, getPlaceholder }