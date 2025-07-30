// Componente principal orquestador de la encuesta
// Maneja la navegación, validación y persistencia

"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Save, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { SurveyProgress } from "./SurveyProgress"
import { FamilyInfoStep } from "./steps/FamilyInfoStep"
import { FamilyDynamicsStep } from "./steps/FamilyDynamicsStep"
import { ChildHistoryStep } from "./steps/ChildHistoryStep"
import { HealthDevStep } from "./steps/HealthDevStep"
import { PhysicalActivityStep } from "./steps/PhysicalActivityStep"
import { RoutineHabitsStep } from "./steps/RoutineHabitsStep"
import { useSurveyForm } from "./hooks/useSurveyForm"
import { useSurveyValidation } from "./hooks/useSurveyValidation"
import type { SurveyData } from "@/types/models"

// Componentes de pasos
const stepComponents = {
  1: FamilyInfoStep,
  2: FamilyDynamicsStep,
  3: ChildHistoryStep,
  4: HealthDevStep,
  5: PhysicalActivityStep,
  6: RoutineHabitsStep
}

interface SurveyWizardProps {
  childId: string
  initialData?: Partial<SurveyData>
  isExisting?: boolean
}

export function SurveyWizard({ childId, initialData, isExisting = false }: SurveyWizardProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const {
    formData,
    errors,
    touchedSteps,
    updateStepData,
    validateStepData,
    markStepAsTouched,
    isStepValid,
    isFormComplete,
    getStepData
  } = useSurveyForm(initialData)
  
  const {
    showValidationErrors,
    focusErrorField,
    shouldShowError
  } = useSurveyValidation()

  // Calcular qué pasos están completos y cuáles tienen errores
  const completedSteps = useMemo(() => {
    const completed = new Set<number>()
    for (let step = 1; step <= 6; step++) {
      if (touchedSteps.has(step) && isStepValid(step)) {
        completed.add(step)
      }
    }
    return completed
  }, [touchedSteps, isStepValid])

  const stepsWithErrors = useMemo(() => {
    const withErrors = new Set<number>()
    for (let step = 1; step <= 6; step++) {
      if (touchedSteps.has(step) && !isStepValid(step)) {
        withErrors.add(step)
      }
    }
    return withErrors
  }, [touchedSteps, isStepValid])

  // Manejar navegación entre pasos
  const handleStepChange = (newStep: number) => {
    if (newStep < 1 || newStep > 6) return
    
    // Validar paso actual antes de cambiar
    markStepAsTouched(currentStep)
    const currentStepErrors = validateStepData(currentStep)
    
    if (newStep > currentStep && Object.keys(currentStepErrors).length > 0) {
      showValidationErrors()
      focusErrorField(currentStepErrors)
      toast({
        title: "Campos obligatorios",
        description: "Por favor completa todos los campos obligatorios antes de continuar",
        variant: "destructive"
      })
      return
    }
    
    setCurrentStep(newStep)
  }

  // Manejar envío del formulario
  const handleSubmit = async () => {
    if (!isFormComplete()) {
      // Encontrar el primer paso con errores
      for (let step = 1; step <= 6; step++) {
        const stepErrors = validateStepData(step)
        if (Object.keys(stepErrors).length > 0) {
          setCurrentStep(step)
          showValidationErrors()
          focusErrorField(stepErrors)
          break
        }
      }
      
      toast({
        title: "Encuesta incompleta",
        description: "Por favor completa todos los campos obligatorios marcados con *",
        variant: "destructive"
      })
      return
    }
    
    setIsSubmitting(true)
    try {
      const response = await fetch("/api/survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId, surveyData: formData })
      })
      
      if (!response.ok) throw new Error("Error al guardar")
      
      toast({
        title: isExisting ? "Cambios guardados" : "Encuesta completada",
        description: isExisting 
          ? "Los cambios se han guardado exitosamente"
          : "Gracias por completar la encuesta"
      })
      
      router.push("/dashboard")
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo guardar la encuesta",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Guardar y continuar después
  const handleSaveAndContinueLater = () => {
    localStorage.setItem(`survey_${childId}`, JSON.stringify(formData))
    localStorage.setItem(`survey_step_${childId}`, currentStep.toString())
    
    toast({
      title: "Progreso guardado",
      description: "Puedes continuar con la encuesta cuando quieras"
    })
    
    router.push("/dashboard")
  }

  // Obtener componente del paso actual
  const StepComponent = stepComponents[currentStep as keyof typeof stepComponents]
  
  if (!StepComponent) {
    // Placeholder temporal para pasos no implementados
    return (
      <Card className="p-8">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Paso en desarrollo</h3>
          <p className="text-gray-600">Este paso se está implementando...</p>
          <div className="mt-6 space-x-4">
            <Button onClick={() => handleStepChange(currentStep - 1)}>
              Anterior
            </Button>
            <Button onClick={() => handleStepChange(currentStep + 1)}>
              Siguiente
            </Button>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <SurveyProgress
        currentStep={currentStep}
        totalSteps={6}
        completedSteps={completedSteps}
        stepsWithErrors={stepsWithErrors}
        onStepClick={handleStepChange}
      />
      
      <Card className="p-6 md:p-8">
        <StepComponent
          data={getStepData(currentStep)}
          onChange={(data) => updateStepData(currentStep, data)}
          errors={shouldShowError('', true) ? errors[currentStep] || {} : {}}
        />
        
        <div className="flex justify-between items-center mt-8 pt-6 border-t">
          <Button
            variant="outline"
            onClick={() => handleStepChange(currentStep - 1)}
            disabled={currentStep === 1}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Anterior
          </Button>
          
          <button
            onClick={handleSaveAndContinueLater}
            className="text-[#4A90E2] text-sm font-medium flex items-center gap-2 hover:underline"
          >
            <Save className="w-4 h-4" />
            Guardar y continuar más tarde
          </button>
          
          {currentStep === 6 ? (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="hd-gradient-button text-white"
            >
              {isSubmitting ? "Enviando..." : "Finalizar Encuesta"}
            </Button>
          ) : (
            <Button
              onClick={() => handleStepChange(currentStep + 1)}
              className="hd-gradient-button text-white"
            >
              Siguiente
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </Card>
    </div>
  )
}