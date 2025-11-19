// Componente principal orquestador de la encuesta
// Maneja la navegación, validación y persistencia

"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Save, AlertCircle, CheckCircle2 } from "lucide-react"
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
import { useSurveyPersistence } from "./hooks/useSurveyPersistence"
import type { SurveyData } from "@/types/models"
import type { StepValidation } from "./types/survey.types"
import { validateStep } from "./validation/validators"
import { stepValidations } from "./validation/schemas"

// Componentes de pasos
const stepComponents = {
  1: FamilyInfoStep,
  2: FamilyDynamicsStep,
  3: ChildHistoryStep,
  4: HealthDevStep,
  5: PhysicalActivityStep,
  6: RoutineHabitsStep
}

const stepKeyMap: Record<number, keyof SurveyData> = {
  1: "informacionFamiliar",
  2: "dinamicaFamiliar",
  3: "historial",
  4: "desarrollo",
  5: "actividadFisica",
  6: "rutinaHabitos",
}

interface SurveyWizardProps {
  childId: string
  initialData?: Partial<SurveyData>
  isExisting?: boolean
}

export function SurveyWizard({ childId, initialData, isExisting = false }: SurveyWizardProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const { toast } = useToast()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSaveIndicator, setShowSaveIndicator] = useState(false)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [childData, setChildData] = useState<any>(null)
  const restoredLocalRef = useRef(false)

  const resolvedAccountType = useMemo(() => {
    return userProfile?.accountType || session?.user?.accountType || ""
  }, [userProfile, session])

  const userPrefillContact = useMemo(() => ({
    name: userProfile?.name || session?.user?.name || "",
    email: userProfile?.email || session?.user?.email || "",
    phone: userProfile?.phone || session?.user?.phone || ""
  }), [userProfile, session])
  
  const {
    formData,
    errors,
    touchedSteps,
    updateStepData,
    validateStepData,
    markStepAsTouched,
    isStepValid,
    isFormComplete,
    getStepData,
    setFormData,
    setInitialData
  } = useSurveyForm(initialData)

  const primaryCaregiver = formData?.informacionFamiliar?.primaryCaregiver
  
  const {
    showValidationErrors,
    focusErrorField,
    shouldShowError
  } = useSurveyValidation()
  
  const {
    saveToLocalStorage,
    loadFromLocalStorage,
    clearLocalStorage,
    saveToServer,
    lastSaveTime
  } = useSurveyPersistence({
    childId,
    formData,
    currentStep,
    enabled: true
  })

  // Función para verificar si TODAS las preguntas del paso están respondidas
  const isStepFullyAnswered = (stepData: any, validation: StepValidation): boolean => {
    if (!hasFilledValue(stepData)) {
      return false
    }

    const requiredEntries = Object.entries(validation?.fields || {}).filter(
      ([, rules]) => rules?.required
    )

    const getValueAtPath = (obj: any, path: string) => {
      return path.split('.').reduce((acc, key) => (acc ? acc[key] : undefined), obj)
    }

    return requiredEntries.every(([fieldPath]) => {
      const value = getValueAtPath(stepData, fieldPath)
      return hasFilledValue(value)
    })
  }

  // Calcular qué pasos están completos y cuáles tienen errores
  const completedSteps = useMemo(() => {
    const completed = new Set<number>()
    for (let step = 1; step <= 6; step++) {
      const stepKey = stepKeyMap[step]
      const validation = stepValidations[step]
      if (!stepKey || !validation) continue

      const stepData = formData[stepKey] || {}

      // Validar errores en campos obligatorios
      const stepErrors = validateStep(stepData, validation)
      const hasErrors = Object.keys(stepErrors).length > 0

      // Verificar si TODAS las preguntas están respondidas
      const fullyAnswered = isStepFullyAnswered(stepData, validation)

      // Solo marcar como completado si NO hay errores Y todas las preguntas están respondidas
      if (!hasErrors && fullyAnswered) {
        completed.add(step)
      }
    }
    return completed
  }, [formData])

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

  // Cargar perfil del usuario y datos del niño
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await fetch('/api/user/profile')
        if (response.ok) {
          const data = await response.json()
          setUserProfile(data.data)
        }
      } catch (error) {
        console.error('Error al cargar perfil del usuario:', error)
      }
    }
    
    const fetchChildData = async () => {
      try {
        const response = await fetch(`/api/children/${childId}`)
        if (response.ok) {
          const data = await response.json()
          setChildData(data)
        }
      } catch (error) {
        console.error('Error al cargar datos del niño:', error)
      }
    }
    
    if (session?.user) {
      fetchUserProfile()
    }
    
    if (childId) {
      fetchChildData()
    }
  }, [session, childId])

  useEffect(() => {
    restoredLocalRef.current = false
  }, [childId])

  useEffect(() => {
    if (restoredLocalRef.current || !childId) return
    const savedData = loadFromLocalStorage()
    if (savedData?.formData) {
      setFormData(prev => ({
        ...prev,
        ...savedData.formData
      }))
      if (savedData.currentStep) {
        setCurrentStep(savedData.currentStep)
      }
      toast({
        title: "Progreso local restaurado",
        description: "Recuperamos tus últimas respuestas guardadas en este dispositivo."
      })
    }
    restoredLocalRef.current = true
  }, [childId, loadFromLocalStorage, setFormData, toast])

  // Pre-llenar datos con información del usuario y del niño
  useEffect(() => {
    if ((userProfile || childData) && !initialData && !isExisting) {
      const defaultName = userPrefillContact.name
      const defaultEmail = userPrefillContact.email
      const defaultPhone = userPrefillContact.phone
      const accountType = resolvedAccountType

      const shouldPrefillFather = accountType === "father" || accountType === "caregiver"
      const shouldPrefillMother = accountType === "mother" || accountType === "caregiver"

      const fatherDefaults = {
        nombre: shouldPrefillFather ? defaultName : "",
        ocupacion: "",
        direccion: "",
        telefono: shouldPrefillFather ? defaultPhone : "",
        email: shouldPrefillFather ? defaultEmail : "",
        trabajaFueraCasa: false,
        tieneAlergias: false
      }

      const motherDefaults = {
        nombre: shouldPrefillMother ? defaultName : "",
        ocupacion: "",
        mismaDireccionPapa: true,
        direccion: "",
        telefono: shouldPrefillMother ? defaultPhone : "",
        email: shouldPrefillMother ? defaultEmail : "",
        trabajaFueraCasa: false,
        tieneAlergias: false
      }

      // Pre-llenar información familiar con datos del usuario
      const prefilledData: Partial<SurveyData> = {
        informacionFamiliar: {
          papa: fatherDefaults,
          mama: motherDefaults,
          primaryCaregiver: accountType || ""
        },
        dinamicaFamiliar: {
          telefonoSeguimiento: defaultPhone,
          emailObservaciones: defaultEmail
        },
        historial: {
          // Pre-llenar información del niño si está disponible
          nombreHijo: childData ? [childData.firstName, childData.lastName].filter(Boolean).join(" ") : "",
          fechaNacimiento: childData?.birthDate ? String(childData.birthDate).split('T')[0] : "",
          genero: childData?.gender || ""
        },
        desarrollo: {},
        actividadFisica: {},
        rutinaHabitos: {}
      }
      
      // Actualizar los datos iniciales con la información pre-llenada
      setInitialData(prefilledData)
      
      // También verificar si hay datos guardados en localStorage
      const savedData = loadFromLocalStorage()
      if (savedData) {
        // Mezclar datos guardados con datos pre-llenados
        const mergedData = {
          ...prefilledData,
          ...savedData.formData,
          informacionFamiliar: {
            ...prefilledData.informacionFamiliar,
            ...savedData.formData.informacionFamiliar,
            papa: {
              ...prefilledData.informacionFamiliar?.papa,
              ...savedData.formData.informacionFamiliar?.papa
            },
            mama: {
              ...prefilledData.informacionFamiliar?.mama,
              ...savedData.formData.informacionFamiliar?.mama
            },
            primaryCaregiver: savedData.formData.informacionFamiliar?.primaryCaregiver ?? prefilledData.informacionFamiliar?.primaryCaregiver
          }
        }
        if (savedData.formData.actividadFisica?.situacionesHijo && !savedData.formData.desarrollo?.situacionesHijo) {
          mergedData.desarrollo = {
            ...mergedData.desarrollo,
            situacionesHijo: savedData.formData.actividadFisica.situacionesHijo
          }
        }
        setFormData(mergedData)
        setCurrentStep(savedData.currentStep || 1)
        toast({
          title: "Progreso recuperado",
          description: "Hemos recuperado tu progreso anterior en la encuesta"
        })
      } else {
        setFormData(prefilledData)
      }
    } else if (!initialData && !isExisting && !userProfile) {
      // Si no hay perfil de usuario aún, solo cargar datos guardados
      const savedData = loadFromLocalStorage()
      if (savedData) {
        setFormData(savedData.formData)
        setCurrentStep(savedData.currentStep || 1)
        toast({
          title: "Progreso recuperado",
          description: "Hemos recuperado tu progreso anterior en la encuesta"
        })
      }
    }
  }, [userProfile, childData, initialData, isExisting, session, userPrefillContact, resolvedAccountType])

  useEffect(() => {
    const trimmedName = (userPrefillContact.name || "").trim()
    const trimmedEmail = (userPrefillContact.email || "").trim()
    const trimmedPhone = (userPrefillContact.phone || "").trim()

    if (!trimmedName && !trimmedEmail && !trimmedPhone) return

    const parentsToPrefill: Array<'papa' | 'mama'> = []

    if (resolvedAccountType === "father") {
      parentsToPrefill.push("papa")
    } else if (resolvedAccountType === "mother") {
      parentsToPrefill.push("mama")
    } else if (resolvedAccountType === "caregiver") {
      if (primaryCaregiver === "mother") {
        parentsToPrefill.push("mama")
      } else if (primaryCaregiver === "father") {
        parentsToPrefill.push("papa")
      }
    }

    if (!parentsToPrefill.length) {
      if (primaryCaregiver === "mother") {
        parentsToPrefill.push("mama")
      } else if (primaryCaregiver === "father") {
        parentsToPrefill.push("papa")
      }
    }

    if (!parentsToPrefill.length) return

    setFormData(prev => {
      const info = prev.informacionFamiliar || {}
      const nextPapa = { ...(info.papa || {}) }
      const nextMama = { ...(info.mama || {}) }
      let changed = false

      parentsToPrefill.forEach(parent => {
        const parentData = parent === "papa" ? nextPapa : nextMama
        let parentChanged = false

        if (trimmedName && !(parentData.nombre && parentData.nombre.trim().length > 0)) {
          parentData.nombre = trimmedName
          parentChanged = true
        }

        if (trimmedEmail && !(parentData.email && parentData.email.trim().length > 0)) {
          parentData.email = trimmedEmail
          parentChanged = true
        }

        if (trimmedPhone && !(parentData.telefono && parentData.telefono.trim().length > 0)) {
          parentData.telefono = trimmedPhone
          parentChanged = true
        }

        if (parentChanged) {
          if (parent === "papa") {
            Object.assign(nextPapa, parentData)
          } else {
            Object.assign(nextMama, parentData)
          }
          changed = true
        }
      })

      if (!changed) return prev

      return {
        ...prev,
        informacionFamiliar: {
          ...info,
          papa: nextPapa,
          mama: nextMama
        }
      }
    })
  }, [
    userPrefillContact.name,
    userPrefillContact.email,
    userPrefillContact.phone,
    resolvedAccountType,
    primaryCaregiver,
    setFormData
  ])

  // Mostrar indicador de guardado
  useEffect(() => {
    setShowSaveIndicator(true)
    const timer = setTimeout(() => setShowSaveIndicator(false), 2000)
    return () => clearTimeout(timer)
  }, [lastSaveTime])

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
    
    // Primero guardar en localStorage como respaldo
    saveToLocalStorage()
    
    try {
      const result = await saveToServer(false) // false = guardado final
      
      if (result.success) {
        toast({
          title: isExisting ? "Cambios guardados" : "Encuesta completada",
          description: isExisting 
            ? "Los cambios se han guardado exitosamente"
            : "Gracias por completar la encuesta. Los datos se han guardado correctamente.",
          duration: 5000
        })
        
        router.push("/dashboard")
      } else {
        // Si falla el servidor, los datos ya están en localStorage
        toast({
          title: "Error de conexión",
          description: "No se pudo conectar con el servidor. Tu progreso se ha guardado localmente y se intentará enviar más tarde.",
          variant: "destructive",
          duration: 7000
        })
      }
    } catch (error) {
      // En caso de error, los datos están seguros en localStorage
      toast({
        title: "Error al guardar",
        description: "Hubo un problema al guardar la encuesta. Tu progreso se ha guardado localmente.",
        variant: "destructive",
        duration: 7000
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Guardar y continuar después
  const handleSaveAndContinueLater = async () => {
    // Guardar en localStorage
    saveToLocalStorage()
    
    // Intentar guardar parcialmente en el servidor
    const result = await saveToServer(true, { force: true }) // true = guardado parcial, forzado por el usuario
    
    if (result.success) {
      toast({
        title: "Progreso guardado",
        description: "Tu progreso se ha guardado en el servidor. Puedes continuar cuando quieras.",
        duration: 4000
      })
    } else {
      toast({
        title: "Progreso guardado localmente",
        description: "Tu progreso se ha guardado en tu dispositivo. Se sincronizará cuando vuelvas.",
        duration: 4000
      })
    }
    
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
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-4 lg:px-0">
      <SurveyProgress
        currentStep={currentStep}
        totalSteps={6}
        completedSteps={completedSteps}
        stepsWithErrors={stepsWithErrors}
        onStepClick={handleStepChange}
      />
      
      <Card className="p-4 sm:p-6 md:p-8 relative">
        {/* Indicador de guardado automático */}
        {showSaveIndicator && (
          <div className="absolute top-4 right-4 flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-1.5 rounded-full animate-fade-in">
            <CheckCircle2 className="w-4 h-4" />
            <span>Guardado automático</span>
          </div>
        )}
        
        <StepComponent
          data={getStepData(currentStep)}
          onChange={(data) => updateStepData(currentStep, data)}
          errors={touchedSteps.has(currentStep) ? errors[currentStep] || {} : {}}
          context={{ childData, isExisting, accountType: resolvedAccountType, userPrefill: userPrefillContact }}
        />
        
        <div className="mt-8 pt-6 border-t flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3">
            <Button
              variant="outline"
              onClick={() => handleStepChange(currentStep - 1)}
              disabled={currentStep === 1}
              className="w-full sm:w-auto"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Anterior
            </Button>
            
            <button
              onClick={handleSaveAndContinueLater}
              className="text-[#4A90E2] text-sm font-medium flex items-center gap-2 hover:underline justify-center mt-3 sm:mt-0"
            >
              <Save className="w-4 h-4" />
              Guardar y continuar más tarde
            </button>
          </div>
          
          {currentStep === 6 ? (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="hd-gradient-button text-white w-full sm:w-auto justify-center"
            >
              {isSubmitting ? "Enviando..." : "Finalizar Cuestionario"}
            </Button>
          ) : (
            <Button
              onClick={() => handleStepChange(currentStep + 1)}
              className="hd-gradient-button text-white w-full sm:w-auto justify-center"
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

function hasFilledValue(value: any): boolean {
  if (value === null || value === undefined) return false
  if (typeof value === "boolean") return true
  if (typeof value === "number") return !Number.isNaN(value)
  if (typeof value === "string") return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === "object") {
    return Object.values(value).some(hasFilledValue)
  }
  return false
}
