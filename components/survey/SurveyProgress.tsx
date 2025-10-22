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
    <div className="mb-8">
      {/* Barra de progreso */}
      <div className="relative mb-6">
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
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

      {/* Indicadores de pasos - scroll horizontal en pantallas pequeñas */}
      <div className="-mx-4 px-4 overflow-x-auto no-scrollbar">
        <ol className="flex min-w-max items-center gap-3">
          {steps.map((step) => {
            const isCompleted = completedSteps.has(step.id)
            const hasError = stepsWithErrors.has(step.id)
            const isCurrent = step.id === currentStep

            return (
              <li key={step.id} className="shrink-0">
                <button
                  onClick={() => onStepClick?.(step.id)}
                  className={cn(
                    "flex items-center gap-2 h-8 px-3 rounded-full text-sm",
                    "transition-all duration-200",
                    {
                      "bg-gradient-to-r from-[#628BE6] to-[#67C5FF] text-white": isCurrent,
                      "bg-green-100 text-green-700": isCompleted && !hasError && !isCurrent,
                      "bg-red-100 text-red-700": hasError && !isCurrent,
                      "bg-gray-100 text-gray-600": !isCompleted && !hasError && !isCurrent,
                      "hover:shadow-md cursor-pointer": onStepClick
                    }
                  )}
                  title={step.name}
                >
                  <span className="text-base leading-none">{step.icon}</span>
                  <span className="hidden md:inline whitespace-nowrap">{step.name}</span>
                  <span className="md:hidden">{step.id}</span>
                  {isCompleted && !hasError && (
                    <Check className="w-4 h-4" />
                  )}
                  {hasError && (
                    <AlertCircle className="w-4 h-4" />
                  )}
                </button>
              </li>
            )
          })}
        </ol>
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
