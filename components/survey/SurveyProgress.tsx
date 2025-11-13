// Componente de progreso de la encuesta
// Muestra el progreso visual y el estado de validación de cada paso

import { Check, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface SurveyProgressProps {
  currentStep: number
  totalSteps: number
  completedSteps: Set<number>
  stepsWithErrors: Set<number>
  onStepClick?: (step: number) => void
}

const steps = [
  { id: 1, name: "Información Familiar", icon: "👨‍👩‍👧‍👦" },
  { id: 2, name: "Dinámica Familiar", icon: "🏠" },
  { id: 3, name: "Historial del Niño", icon: "👶" },
  { id: 4, name: "Desarrollo y Salud", icon: "💪" },
  { id: 5, name: "Actividad Física", icon: "🏃‍♀️" },
  { id: 6, name: "Rutina y Hábitos", icon: "🌙" },
]

export function SurveyProgress({ 
  currentStep, 
  totalSteps, 
  completedSteps,
  stepsWithErrors,
  onStepClick 
}: SurveyProgressProps) {
  const progress = (currentStep / totalSteps) * 100

  return (
    <div className="mb-8 px-1 sm:px-0">
      {/* Barra de progreso */}
      <div className="relative mb-6 mx-auto max-w-3xl">
        <div className="h-1.5 sm:h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-[#628BE6] to-[#67C5FF] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="absolute -top-1 left-0 right-0 flex justify-between">
          {steps.map((step) => {
            const isCompleted = completedSteps.has(step.id)
            const hasError = stepsWithErrors.has(step.id)
            const isCurrent = step.id === currentStep
            const isPast = step.id < currentStep
            
            return (
              <button
                key={step.id}
                onClick={() => onStepClick?.(step.id)}
                className={cn(
                  "w-4 h-4 rounded-full transition-all duration-200",
                  "transform hover:scale-110",
                  {
                    "bg-gradient-to-r from-[#628BE6] to-[#67C5FF]": isCurrent || isPast,
                    "bg-gray-300": !isCurrent && !isPast,
                    "ring-4 ring-white": isCurrent,
                    "cursor-pointer": onStepClick
                  }
                )}
                title={`${step.name} ${hasError ? '(Campos requeridos)' : ''}`}
              >
                {isCompleted && !hasError && (
                  <Check className="w-3 h-3 text-white" />
                )}
                {hasError && (
                  <AlertCircle className="w-3 h-3 text-red-500" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Indicadores de pasos - Grid sin scroll horizontal */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 max-w-5xl mx-auto">
        {steps.map((step) => {
          const isCompleted = completedSteps.has(step.id)
          const hasError = stepsWithErrors.has(step.id)
          const isCurrent = step.id === currentStep

          return (
            <button
              key={step.id}
              onClick={() => onStepClick?.(step.id)}
              className={cn(
                "flex flex-col items-center gap-1 px-2 py-2 rounded-xl text-xs font-medium",
                "transition-all duration-200",
                {
                  "bg-gradient-to-r from-[#628BE6] to-[#67C5FF] text-white shadow-md": isCurrent,
                  "bg-green-100 text-green-700": isCompleted && !hasError && !isCurrent,
                  "bg-red-100 text-red-700": hasError && !isCurrent,
                  "bg-gray-100 text-gray-600": !isCompleted && !hasError && !isCurrent,
                  "hover:shadow-md cursor-pointer": onStepClick
                }
              )}
            >
              <span className="text-2xl">{step.icon}</span>
              <span className="text-center leading-tight line-clamp-2">{step.name}</span>
              {isCompleted && !hasError && (
                <Check className="w-4 h-4 mt-1" />
              )}
              {hasError && (
                <AlertCircle className="w-4 h-4 mt-1" />
              )}
            </button>
          )
        })}
      </div>

      {/* Mensaje de estado */}
      <div className="mt-4 text-center">
        <p className="text-sm text-gray-600">
          Paso {currentStep} de {totalSteps}
        </p>
        {stepsWithErrors.size > 0 && (
          <p className="text-sm text-red-600 mt-1">
            {stepsWithErrors.size} {stepsWithErrors.size === 1 ? 'paso tiene' : 'pasos tienen'} campos obligatorios sin completar
          </p>
        )}
      </div>
    </div>
  )
}
