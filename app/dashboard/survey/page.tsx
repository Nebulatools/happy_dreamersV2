// Página de Encuesta de Sueño Infantil según diseño de Figma
// Sistema multi-paso con indicador de progreso y navegación

"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { 
  ChevronLeft, 
  ChevronRight, 
  Moon, 
  Sun,
  Save,
  Info
} from "lucide-react"
import { ProgressBar } from "@/components/ui/progress-bar"
import { TimePicker } from "@/components/ui/time-picker"
import { DurationSlider } from "@/components/ui/duration-slider"
import { cn } from "@/lib/utils"

interface SurveyData {
  // Paso 1: Información Básica
  childName: string
  childAge: number
  
  // Paso 2: Patrones de Sueño
  bedtime: string
  sleepHours: string
  nightWakings: string
  wakeTime: string
  naps: string
  
  // Paso 3: Rutinas
  bedtimeRoutine: string[]
  preActivities: string[]
  
  // Paso 4: Ambiente
  roomEnvironment: {
    temperature: boolean
    darkness: boolean
    noise: boolean
    comfort: boolean
  }
  
  // Paso 5: Finalizar
  additionalComments: string
}

const steps = [
  { id: 1, name: "Información Básica", icon: "👶" },
  { id: 2, name: "Patrones de Sueño", icon: "🌙" },
  { id: 3, name: "Rutinas", icon: "🛁" },
  { id: 4, name: "Ambiente", icon: "🏠" },
  { id: 5, name: "Finalizar", icon: "✅" }
]

const bedtimeOptions = [
  { value: "19:00", label: "19:00" },
  { value: "19:30", label: "19:30" },
  { value: "20:00", label: "20:00" },
  { value: "20:30", label: "20:30" },
  { value: "21:00", label: "21:00" },
  { value: "21:30", label: "21:30" },
  { value: "22:00", label: "22:00" },
  { value: "22:30", label: "22:30" }
]

const wakeTimeOptions = [
  { value: "5:30", label: "5:30" },
  { value: "6:00", label: "6:00" },
  { value: "6:30", label: "6:30" },
  { value: "7:00", label: "7:00" },
  { value: "7:30", label: "7:30" },
  { value: "8:00", label: "8:00" },
  { value: "8:30", label: "8:30" }
]

export default function SurveyPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const childId = searchParams.get('childId')
  const { toast } = useToast()
  const [currentStep, setCurrentStep] = useState(2) // Iniciando en paso 2 como en Figma
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<Partial<SurveyData>>({
    bedtime: "20:00", // Valor por defecto como en Figma
    sleepHours: "9-10 horas",
    nightWakings: "1-2 veces",
    wakeTime: "6:30",
    naps: "Regularmente (3-5 veces por semana)"
  })

  // Cargar datos guardados si existen
  useEffect(() => {
    const savedData = localStorage.getItem(`survey_${childId}`)
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData)
        setFormData(parsedData)
        toast({
          title: "Datos recuperados",
          description: "Se han cargado tus respuestas anteriores",
        })
      } catch (error) {
        console.error("Error al cargar datos guardados:", error)
      }
    }
  }, [childId, toast])

  const handleNext = () => {
    // Guardar datos antes de avanzar
    localStorage.setItem(`survey_${childId}`, JSON.stringify(formData))
    
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSaveAndContinueLater = () => {
    localStorage.setItem(`survey_${childId}`, JSON.stringify(formData))
    localStorage.setItem(`survey_step_${childId}`, currentStep.toString())
    
    toast({
      title: "Progreso guardado",
      description: "Puedes continuar más tarde desde donde lo dejaste",
    })
    
    router.push("/dashboard")
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/survey', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          childId,
          surveyData: formData
        }),
      })
      
      if (!response.ok) {
        throw new Error('Error al enviar la encuesta')
      }

      // Limpiar datos guardados
      localStorage.removeItem(`survey_${childId}`)
      localStorage.removeItem(`survey_step_${childId}`)

      toast({
        title: "Encuesta completada",
        description: "Gracias por completar la encuesta. Ahora podemos ofrecerte recomendaciones personalizadas.",
      })

      router.push("/dashboard")
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo guardar la encuesta. Inténtalo de nuevo.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 2: // Patrones de Sueño
        return (
          <div className="space-y-8">
            {/* Pregunta 1: Hora de acostarse */}
            <div>
              <TimePicker
                label="¿A qué hora suele acostarse tu hijo/a habitualmente?"
                description="Selecciona la hora más frecuente en la que tu hijo/a se va a la cama"
                value={formData.bedtime}
                onChange={(value) => setFormData({ ...formData, bedtime: value })}
                options={bedtimeOptions}
              />
            </div>

            {/* Pregunta 2: Horas de sueño */}
            <div className="space-y-3">
              <h3 className="text-xl font-semibold text-[#2F2F2F]">
                ¿Cuántas horas duerme en promedio durante la noche?
              </h3>
              <p className="text-sm text-[#666666]">
                Incluye solo el tiempo total de sueño nocturno
              </p>
              <RadioGroup
                value={formData.sleepHours}
                onValueChange={(value) => setFormData({ ...formData, sleepHours: value })}
              >
                <div className="space-y-2">
                  {["Menos de 7 horas", "7-8 horas", "9-10 horas", "11-12 horas", "Más de 12 horas"].map((option) => (
                    <label
                      key={option}
                      className={cn(
                        "flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors",
                        formData.sleepHours === option 
                          ? "border-[#4A90E2] bg-blue-50" 
                          : "border-gray-200 hover:border-gray-300"
                      )}
                    >
                      <RadioGroupItem value={option} />
                      <span className="text-sm font-medium">{option}</span>
                    </label>
                  ))}
                </div>
              </RadioGroup>
            </div>

            {/* Pregunta 3: Despertares nocturnos */}
            <div className="space-y-3">
              <h3 className="text-xl font-semibold text-[#2F2F2F]">
                ¿Con qué frecuencia se despierta durante la noche?
              </h3>
              <p className="text-sm text-[#666666]">Frecuencia de despertares</p>
              <div className="space-y-2">
                <DurationSlider
                  value={[formData.nightWakings === "Nunca" ? 0 : 
                         formData.nightWakings === "1-2 veces" ? 1.5 :
                         formData.nightWakings === "3-4 veces" ? 3.5 : 5]}
                  onValueChange={(value) => {
                    const val = value[0]
                    const mapping = val === 0 ? "Nunca" :
                                  val <= 2 ? "1-2 veces" :
                                  val <= 4 ? "3-4 veces" : "5+ veces"
                    setFormData({ ...formData, nightWakings: mapping })
                  }}
                  max={6}
                  min={0}
                  step={0.5}
                  showLabels={false}
                />
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Nunca</span>
                  <span>1-2 veces</span>
                  <span>3-4 veces</span>
                  <span>5+ veces</span>
                </div>
              </div>
            </div>

            {/* Pregunta 4: Hora de despertar */}
            <div>
              <TimePicker
                label="¿A qué hora se despierta normalmente?"
                description="Hora habitual de despertar por la mañana"
                value={formData.wakeTime}
                onChange={(value) => setFormData({ ...formData, wakeTime: value })}
                options={wakeTimeOptions}
              />
            </div>

            {/* Pregunta 5: Siestas */}
            <div className="space-y-3">
              <h3 className="text-xl font-semibold text-[#2F2F2F]">
                ¿Tu hijo/a toma siestas durante el día?
              </h3>
              <RadioGroup
                value={formData.naps}
                onValueChange={(value) => setFormData({ ...formData, naps: value })}
              >
                <div className="space-y-2">
                  {[
                    "No, nunca hace siestas",
                    "Ocasionalmente (1-2 veces por semana)",
                    "Regularmente (3-5 veces por semana)",
                    "Diariamente (todos los días)"
                  ].map((option) => (
                    <label
                      key={option}
                      className={cn(
                        "flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors",
                        formData.naps === option 
                          ? "border-[#4A90E2] bg-blue-50" 
                          : "border-gray-200 hover:border-gray-300"
                      )}
                    >
                      <RadioGroupItem value={option} />
                      <span className="text-sm font-medium">{option}</span>
                    </label>
                  ))}
                </div>
              </RadioGroup>
            </div>

            {/* Nota informativa */}
            <div className="flex gap-3 p-4 bg-[#F0F7FF] rounded-lg">
              <Info className="w-5 h-5 text-[#91C1F8] flex-shrink-0 mt-0.5" />
              <p className="text-sm text-gray-700">
                Recuerda que cada niño es único y los patrones de sueño pueden variar. 
                Esta información nos ayudará a crear un plan personalizado para mejorar 
                el descanso de tu pequeño.
              </p>
            </div>
          </div>
        )
      
      default:
        return (
          <div className="text-center py-10">
            <p className="text-gray-600">Contenido del paso {currentStep} en desarrollo</p>
          </div>
        )
    }
  }

  const progress = (currentStep / steps.length) * 100

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-[#2F2F2F]">Encuesta de Sueño Infantil</h1>
        <p className="text-gray-600">
          Ayúdanos a entender mejor los patrones de sueño de tu hijo/a para poder 
          ofrecerte recomendaciones personalizadas.
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-600">
            {currentStep} de {steps.length} pasos
          </span>
          <span className="text-sm text-gray-500">{Math.round(progress)}% completado</span>
        </div>
        <ProgressBar value={currentStep} max={steps.length} gradient />
      </div>

      {/* Step Navigation */}
      <div className="flex justify-center">
        <div className="flex items-center gap-2">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <button
                onClick={() => setCurrentStep(step.id)}
                disabled={step.id > currentStep + 1}
                className={cn(
                  "step-circle",
                  currentStep === step.id && "step-circle-active",
                  currentStep > step.id && "step-circle-completed",
                  currentStep < step.id && "step-circle-pending"
                )}
              >
                {currentStep > step.id ? "✓" : step.id}
              </button>
              {index < steps.length - 1 && (
                <div className={cn(
                  "w-12 h-0.5",
                  currentStep > step.id ? "bg-blue-500" : "bg-gray-200"
                )} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Labels */}
      <div className="flex justify-center">
        <div className="flex gap-8 text-xs">
          {steps.map((step) => (
            <span
              key={step.id}
              className={cn(
                "text-center",
                currentStep === step.id ? "text-blue-600 font-medium" : "text-gray-500"
              )}
            >
              {step.name}
            </span>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <Card className="p-8">
        <div className="space-y-6">
          {/* Section Header */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#F0F7FF] rounded-full flex items-center justify-center">
              <Moon className="w-6 h-6 text-[#4A90E2]" />
            </div>
            <h2 className="text-2xl font-bold text-[#2F2F2F]">Patrones de Sueño</h2>
          </div>

          {/* Step Content */}
          {renderStepContent()}
        </div>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 1}
          className="min-w-[150px]"
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

        <Button
          onClick={currentStep === steps.length ? handleSubmit : handleNext}
          disabled={isSubmitting}
          className="min-w-[150px] hd-gradient-button text-white"
        >
          {currentStep === steps.length ? (
            isSubmitting ? "Enviando..." : "Finalizar"
          ) : (
            <>
              Siguiente
              <ChevronRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}