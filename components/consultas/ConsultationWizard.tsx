// Componente Wizard para el flujo de consultas
// Maneja la navegación entre pasos: Usuario → Niño → Transcript → Plan → Análisis → Historial

"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { 
  Users, 
  Baby, 
  FileText, 
  Calendar, 
  Stethoscope, 
  History,
  Check,
  ChevronRight
} from "lucide-react"

interface WizardStep {
  id: number
  label: string
  icon: React.ElementType
  value: string
}

const WIZARD_STEPS: WizardStep[] = [
  { id: 1, label: "Usuario", icon: Users, value: "user" },
  { id: 2, label: "Niño", icon: Baby, value: "child" },
  { id: 3, label: "Transcript", icon: FileText, value: "transcript" },
  { id: 4, label: "Plan", icon: Calendar, value: "plan" },
  { id: 5, label: "Análisis", icon: Stethoscope, value: "analysis" },
  { id: 6, label: "Historial", icon: History, value: "history" },
]

interface ConsultationWizardProps {
  currentStep: number
  completedSteps: Set<number>
  onStepClick: (step: number) => void
  hasUser: boolean
  hasChild: boolean
  userName?: string
  childName?: string
}

export function ConsultationWizard({
  currentStep,
  completedSteps,
  onStepClick,
  hasUser,
  hasChild,
  userName,
  childName,
}: ConsultationWizardProps) {
  // Determinar qué pasos están disponibles
  const isStepAvailable = (stepId: number): boolean => {
    if (stepId === 1) return true // Usuario siempre disponible
    if (stepId === 2) return hasUser // Niño disponible si hay usuario
    if (stepId > 2) return hasUser && hasChild // Resto disponible si hay usuario y niño
    return false
  }

  const isStepCompleted = (stepId: number): boolean => {
    return completedSteps.has(stepId)
  }

  const getStepStatus = (stepId: number): "completed" | "current" | "available" | "disabled" => {
    if (stepId === currentStep) return "current"
    if (isStepCompleted(stepId)) return "completed"
    if (isStepAvailable(stepId)) return "available"
    return "disabled"
  }

  return (
    <div className="w-full bg-white border-b">
      <div className="container mx-auto px-4 py-6">
        {/* Breadcrumb de selección actual */}
        {(userName || childName) && (
          <div className="mb-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              {userName && (
                <>
                  <span className="font-medium text-foreground">{userName}</span>
                  {childName && <ChevronRight className="h-4 w-4" />}
                </>
              )}
              {childName && (
                <span className="font-medium text-foreground">{childName}</span>
              )}
            </div>
          </div>
        )}

        {/* Wizard Steps */}
        <div className="flex items-center justify-between">
          {WIZARD_STEPS.map((step, index) => {
            const status = getStepStatus(step.id)
            const Icon = step.icon
            const isLast = index === WIZARD_STEPS.length - 1

            return (
              <div key={step.id} className="flex items-center flex-1">
                {/* Step */}
                <button
                  onClick={() => status !== "disabled" && onStepClick(step.id)}
                  disabled={status === "disabled"}
                  className={cn(
                    "relative flex flex-col items-center gap-2 p-2 rounded-lg transition-all",
                    status === "disabled" && "cursor-not-allowed opacity-50",
                    status === "available" && "cursor-pointer hover:bg-gray-50",
                    status === "current" && "cursor-pointer",
                    status === "completed" && "cursor-pointer hover:bg-gray-50"
                  )}
                >
                  {/* Step Circle */}
                  <div
                    className={cn(
                      "relative flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all",
                      status === "disabled" && "border-gray-300 bg-gray-100",
                      status === "available" && "border-primary/40 bg-white hover:border-primary/60",
                      status === "current" && "border-primary bg-primary text-white shadow-lg scale-110",
                      status === "completed" && "border-green-500 bg-green-500 text-white"
                    )}
                  >
                    {status === "completed" ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </div>

                  {/* Step Label */}
                  <span
                    className={cn(
                      "text-sm font-medium transition-colors",
                      status === "disabled" && "text-gray-400",
                      status === "available" && "text-gray-700 hover:text-primary",
                      status === "current" && "text-primary font-bold",
                      status === "completed" && "text-green-600"
                    )}
                  >
                    {step.label}
                  </span>

                  {/* Step Number Badge */}
                  <div
                    className={cn(
                      "absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold",
                      status === "disabled" && "bg-gray-300 text-gray-500",
                      status === "available" && "bg-primary/20 text-primary",
                      status === "current" && "bg-primary text-white",
                      status === "completed" && "bg-green-500 text-white"
                    )}
                  >
                    {step.id}
                  </div>
                </button>

                {/* Connector Line */}
                {!isLast && (
                  <div className="flex-1 px-2">
                    <div
                      className={cn(
                        "h-0.5 w-full transition-colors",
                        // Línea verde si ambos pasos están completados
                        completedSteps.has(step.id) && completedSteps.has(step.id + 1)
                          ? "bg-green-500"
                          // Línea azul si el paso actual está disponible y el siguiente también
                          : (isStepAvailable(step.id) && isStepAvailable(step.id + 1))
                          ? "bg-primary/40"
                          // Línea gris si no están disponibles
                          : "bg-gray-300"
                      )}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Helper Text */}
        <div className="mt-4 text-center text-sm text-muted-foreground">
          {currentStep === 1 && !hasUser && "Selecciona un usuario para comenzar"}
          {currentStep === 2 && hasUser && !hasChild && "Selecciona el niño para continuar"}
          {currentStep > 2 && hasUser && hasChild && "Navega entre las opciones disponibles"}
        </div>
      </div>
    </div>
  )
}