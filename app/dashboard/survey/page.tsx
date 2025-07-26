// Página de Encuesta de Sueño Infantil según diseño de Figma
// Sistema multi-paso con indicador de progreso y navegación

"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { 
  ChevronLeft, 
  ChevronRight, 
  Moon, 
  Sun,
  Save,
  Info,
  Users,
  Home,
  Baby,
  Heart,
  Activity,
  Plus,
  Trash2
} from "lucide-react"
import { ProgressBar } from "@/components/ui/progress-bar"
import { TimePicker } from "@/components/ui/time-picker"
import { DurationSlider } from "@/components/ui/duration-slider"
import { cn } from "@/lib/utils"

import { createLogger } from "@/lib/logger"

const logger = createLogger("page")


// Importar la interfaz completa desde types
import type { SurveyData } from "@/types/models"

const steps = [
  { id: 1, name: "Información Familiar", icon: "👨‍👩‍👧‍👦" },
  { id: 2, name: "Dinámica Familiar", icon: "🏠" },
  { id: 3, name: "Historial del Niño", icon: "👶" },
  { id: 4, name: "Desarrollo y Salud", icon: "💪" },
  { id: 5, name: "Actividad Física", icon: "🏃‍♀️" },
  { id: 6, name: "Rutina y Hábitos", icon: "🌙" },
]

const bedtimeOptions = [
  { value: "19:00", label: "19:00" },
  { value: "19:30", label: "19:30" },
  { value: "20:00", label: "20:00" },
  { value: "20:30", label: "20:30" },
  { value: "21:00", label: "21:00" },
  { value: "21:30", label: "21:30" },
  { value: "22:00", label: "22:00" },
  { value: "22:30", label: "22:30" },
]

const wakeTimeOptions = [
  { value: "5:30", label: "5:30" },
  { value: "6:00", label: "6:00" },
  { value: "6:30", label: "6:30" },
  { value: "7:00", label: "7:00" },
  { value: "7:30", label: "7:30" },
  { value: "8:00", label: "8:00" },
  { value: "8:30", label: "8:30" },
]

export default function SurveyPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const childId = searchParams.get("childId")
  const { toast } = useToast()
  const [currentStep, setCurrentStep] = useState(1) // Iniciando en paso 1
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<Partial<SurveyData>>({
    informacionFamiliar: {
      papa: {
        nombre: "",
        ocupacion: "",
        direccion: "",
        email: "",
        trabajaFueraCasa: false,
        tieneAlergias: false
      },
      mama: {
        nombre: "",
        ocupacion: "",
        mismaDireccionPapa: true,
        ciudad: "",
        telefono: "",
        email: "",
        puedeDormirConHijo: true,
        apetito: "",
        pensamientosNegativos: false,
        tieneAlergias: false
      }
    },
    dinamicaFamiliar: {
      cantidadHijos: 1,
      hijosInfo: [],
      otrosEnCasa: "",
      telefonoSeguimiento: "",
      emailObservaciones: "",
      comoConocioServicios: "",
      quienSeLevaantaNoche: ""
    },
    historial: {
      nombre: "",
      fechaNacimiento: "",
      peso: 0,
      embarazoPlaneado: true,
      problemasEmbarazo: false,
      padecimientosEmbarazo: [],
      tipoParto: "Vaginal",
      complicacionesParto: false,
      nacioPlazo: true,
      problemasAlNacer: false,
      pediatraDescartaProblemas: true,
      pediatraConfirmaCapacidadDormir: true,
      tratamientoMedico: false
    },
    desarrolloSalud: {
      caracteristicas: []
    },
    actividadFisica: {
      vePantallas: false,
      practicaActividad: false,
      signosIrritabilidad: false
    },
    rutinaHabitos: {
      diaTypico: "",
      vaGuarderia: false,
      quienPasaTiempo: "",
      rutinaAntesAcostarse: "",
      horaEspecificaDormir: true,
      seQuedaDormirSolo: false,
      oscuridadCuarto: [],
      usaRuidoBlanco: false,
      tipoPiyama: "",
      usaSacoDormir: false,
      seQuedaHastaConciliar: true,
      dondeDuermeNoche: "Cama en su cuarto",
      comparteHabitacion: false,
      intentaSalirCama: false,
      sacaDesCamaNohe: false,
      lloraAlDejarSolo: false,
      golpeaCabeza: false,
      despiertaEnNoche: true,
      miendoOscuridad: false,
      padresMiedoOscuridad: false,
      temperamento: "",
      reaccionDejarSolo: "",
      metodosRelajarse: "",
      haceSiestas: true,
      padresDispuestos: true,
      objetivosPadres: ""
    }
  })

  // Estado para saber si la encuesta ya está completada
  const [isExistingSurvey, setIsExistingSurvey] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Cargar datos guardados si existen (localStorage o API)
  useEffect(() => {
    const loadSurveyData = async () => {
      if (!childId) {
        setIsLoading(false)
        return
      }

      try {
        // Primero intentar cargar desde la API (encuesta completada)
        const response = await fetch(`/api/survey?childId=${childId}`)
        
        if (response.ok) {
          const data = await response.json()
          if (data.surveyData) {
            // Merge datos existentes con estructura inicial para evitar undefined
            setFormData(prevFormData => ({
              ...prevFormData,
              ...data.surveyData,
              informacionFamiliar: {
                ...prevFormData.informacionFamiliar,
                ...data.surveyData.informacionFamiliar,
                papa: {
                  ...prevFormData.informacionFamiliar?.papa,
                  ...data.surveyData.informacionFamiliar?.papa
                },
                mama: {
                  ...prevFormData.informacionFamiliar?.mama,
                  ...data.surveyData.informacionFamiliar?.mama
                }
              },
              dinamicaFamiliar: {
                ...prevFormData.dinamicaFamiliar,
                ...data.surveyData.dinamicaFamiliar
              },
              historial: {
                ...prevFormData.historial,
                ...data.surveyData.historial
              },
              desarrolloSalud: {
                ...prevFormData.desarrolloSalud,
                ...data.surveyData.desarrolloSalud
              },
              actividadFisica: {
                ...prevFormData.actividadFisica,
                ...data.surveyData.actividadFisica
              },
              rutinaHabitos: {
                ...prevFormData.rutinaHabitos,
                ...data.surveyData.rutinaHabitos
              }
            }))
            setIsExistingSurvey(true)
            toast({
              title: "Encuesta encontrada",
              description: "Se ha cargado la encuesta completada de este niño",
              variant: "default",
            })
            setIsLoading(false)
            return
          }
        }

        // Si no hay encuesta en API, cargar desde localStorage (borrador)
        const savedData = localStorage.getItem(`survey_${childId}`)
        const savedStep = localStorage.getItem(`survey_step_${childId}`)
        
        if (savedData) {
          const parsedData = JSON.parse(savedData)
          // Merge con estructura inicial
          setFormData(prevFormData => ({
            ...prevFormData,
            ...parsedData
          }))
          
          if (savedStep) {
            setCurrentStep(parseInt(savedStep))
          }
          
          toast({
            title: "Borrador recuperado",
            description: "Se han cargado tus respuestas en progreso",
          })
        }
      } catch (error) {
        logger.error("Error al cargar datos de encuesta:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadSurveyData()
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

  // Función para habilitar edición de encuesta existente
  const handleEditSurvey = () => {
    setIsExistingSurvey(false)
    toast({
      title: "Modo de edición activado",
      description: "Ahora puedes modificar las respuestas de la encuesta",
    })
  }

  // Función para actualizar encuesta existente
  const handleUpdateSurvey = async () => {
    setIsSubmitting(true)
    try {
      const response = await fetch("/api/survey", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          childId,
          surveyData: {
            ...formData,
            completedAt: new Date() // Actualizar fecha de modificación
          },
        }),
      })
      
      if (!response.ok) {
        throw new Error("Error al actualizar la encuesta")
      }

      // Limpiar datos guardados de localStorage
      localStorage.removeItem(`survey_${childId}`)
      localStorage.removeItem(`survey_step_${childId}`)

      setIsExistingSurvey(true) // Volver a modo de vista
      
      toast({
        title: "Encuesta actualizada",
        description: "Los cambios se han guardado exitosamente.",
      })

    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar la encuesta. Inténtalo de nuevo.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      const response = await fetch("/api/survey", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          childId,
          surveyData: formData,
        }),
      })
      
      if (!response.ok) {
        throw new Error("Error al enviar la encuesta")
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
      case 1: // Información Familiar
        return (
          <div className="space-y-8">
            {/* Información del Papá */}
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-[#2F2F2F] flex items-center gap-2">
                <Users className="w-5 h-5" />
                Sobre Papá
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="papa-nombre">Nombre *</Label>
                  <Input 
                    id="papa-nombre"
                    value={formData.informacionFamiliar?.papa?.nombre || ""}
                    onChange={(e) => setFormData({
                      ...formData,
                      informacionFamiliar: {
                        ...formData.informacionFamiliar!,
                        papa: { ...formData.informacionFamiliar!.papa, nombre: e.target.value }
                      }
                    })}
                    placeholder="Nombre del padre"
                  />
                </div>
                
                <div>
                  <Label htmlFor="papa-edad">Edad</Label>
                  <Input 
                    id="papa-edad"
                    type="number"
                    value={formData.informacionFamiliar?.papa?.edad || ""}
                    onChange={(e) => setFormData({
                      ...formData,
                      informacionFamiliar: {
                        ...formData.informacionFamiliar!,
                        papa: { ...formData.informacionFamiliar!.papa, edad: parseInt(e.target.value) || undefined }
                      }
                    })}
                    placeholder="Edad"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <Label htmlFor="papa-ocupacion">Ocupación *</Label>
                  <Input 
                    id="papa-ocupacion"
                    value={formData.informacionFamiliar?.papa?.ocupacion || ""}
                    onChange={(e) => setFormData({
                      ...formData,
                      informacionFamiliar: {
                        ...formData.informacionFamiliar!,
                        papa: { ...formData.informacionFamiliar!.papa, ocupacion: e.target.value }
                      }
                    })}
                    placeholder="Ocupación del padre"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <Label htmlFor="papa-direccion">Dirección *</Label>
                  <Input 
                    id="papa-direccion"
                    value={formData.informacionFamiliar?.papa?.direccion || ""}
                    onChange={(e) => setFormData({
                      ...formData,
                      informacionFamiliar: {
                        ...formData.informacionFamiliar!,
                        papa: { ...formData.informacionFamiliar!.papa, direccion: e.target.value }
                      }
                    })}
                    placeholder="Dirección completa"
                  />
                </div>
                
                <div>
                  <Label htmlFor="papa-ciudad">Ciudad</Label>
                  <Input 
                    id="papa-ciudad"
                    value={formData.informacionFamiliar?.papa?.ciudad || ""}
                    onChange={(e) => setFormData({
                      ...formData,
                      informacionFamiliar: {
                        ...formData.informacionFamiliar!,
                        papa: { ...formData.informacionFamiliar!.papa, ciudad: e.target.value }
                      }
                    })}
                    placeholder="Ciudad"
                  />
                </div>
                
                <div>
                  <Label htmlFor="papa-telefono">Teléfono</Label>
                  <Input 
                    id="papa-telefono"
                    value={formData.informacionFamiliar?.papa?.telefono || ""}
                    onChange={(e) => setFormData({
                      ...formData,
                      informacionFamiliar: {
                        ...formData.informacionFamiliar!,
                        papa: { ...formData.informacionFamiliar!.papa, telefono: e.target.value }
                      }
                    })}
                    placeholder="Número de teléfono"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <Label htmlFor="papa-email">Email *</Label>
                  <Input 
                    id="papa-email"
                    type="email"
                    value={formData.informacionFamiliar?.papa?.email || ""}
                    onChange={(e) => setFormData({
                      ...formData,
                      informacionFamiliar: {
                        ...formData.informacionFamiliar!,
                        papa: { ...formData.informacionFamiliar!.papa, email: e.target.value }
                      }
                    })}
                    placeholder="Correo electrónico"
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="papa-trabaja-fuera"
                    checked={formData.informacionFamiliar?.papa?.trabajaFueraCasa || false}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      informacionFamiliar: {
                        ...formData.informacionFamiliar!,
                        papa: { ...formData.informacionFamiliar!.papa, trabajaFueraCasa: checked as boolean }
                      }
                    })}
                  />
                  <Label htmlFor="papa-trabaja-fuera">¿Papá trabaja fuera de casa?</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="papa-alergias"
                    checked={formData.informacionFamiliar?.papa?.tieneAlergias || false}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      informacionFamiliar: {
                        ...formData.informacionFamiliar!,
                        papa: { ...formData.informacionFamiliar!.papa, tieneAlergias: checked as boolean }
                      }
                    })}
                  />
                  <Label htmlFor="papa-alergias">¿Tiene o ha tenido alguna alergia?</Label>
                </div>
                
                {formData.informacionFamiliar?.papa?.tieneAlergias && (
                  <div>
                    <Label htmlFor="papa-alergias-desc">Describe las alergias</Label>
                    <Textarea
                      id="papa-alergias-desc"
                      value={formData.informacionFamiliar?.papa?.alergias || ""}
                      onChange={(e) => setFormData({
                        ...formData,
                        informacionFamiliar: {
                          ...formData.informacionFamiliar!,
                          papa: { ...formData.informacionFamiliar!.papa, alergias: e.target.value }
                        }
                      })}
                      placeholder="Describe las alergias del padre"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Información de la Mamá */}
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-[#2F2F2F] flex items-center gap-2">
                <Heart className="w-5 h-5" />
                Sobre Mamá
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="mama-nombre">Nombre *</Label>
                  <Input 
                    id="mama-nombre"
                    value={formData.informacionFamiliar?.mama?.nombre || ""}
                    onChange={(e) => setFormData({
                      ...formData,
                      informacionFamiliar: {
                        ...formData.informacionFamiliar!,
                        mama: { ...formData.informacionFamiliar!.mama, nombre: e.target.value }
                      }
                    })}
                    placeholder="Nombre de la madre"
                  />
                </div>
                
                <div>
                  <Label htmlFor="mama-edad">Edad</Label>
                  <Input 
                    id="mama-edad"
                    type="number"
                    value={formData.informacionFamiliar?.mama?.edad || ""}
                    onChange={(e) => setFormData({
                      ...formData,
                      informacionFamiliar: {
                        ...formData.informacionFamiliar!,
                        mama: { ...formData.informacionFamiliar!.mama, edad: parseInt(e.target.value) || undefined }
                      }
                    })}
                    placeholder="Edad"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <Label htmlFor="mama-ocupacion">Ocupación *</Label>
                  <Input 
                    id="mama-ocupacion"
                    value={formData.informacionFamiliar?.mama?.ocupacion || ""}
                    onChange={(e) => setFormData({
                      ...formData,
                      informacionFamiliar: {
                        ...formData.informacionFamiliar!,
                        mama: { ...formData.informacionFamiliar!.mama, ocupacion: e.target.value }
                      }
                    })}
                    placeholder="Ocupación de la madre"
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="mama-misma-direccion"
                    checked={formData.informacionFamiliar?.mama?.mismaDireccionPapa || false}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      informacionFamiliar: {
                        ...formData.informacionFamiliar!,
                        mama: { ...formData.informacionFamiliar!.mama, mismaDireccionPapa: checked as boolean }
                      }
                    })}
                  />
                  <Label htmlFor="mama-misma-direccion">¿Tiene la misma dirección que papá?</Label>
                </div>
                
                {!formData.informacionFamiliar?.mama?.mismaDireccionPapa && (
                  <div>
                    <Label htmlFor="mama-direccion">Dirección</Label>
                    <Input 
                      id="mama-direccion"
                      value={formData.informacionFamiliar?.mama?.direccion || ""}
                      onChange={(e) => setFormData({
                        ...formData,
                        informacionFamiliar: {
                          ...formData.informacionFamiliar!,
                          mama: { ...formData.informacionFamiliar!.mama, direccion: e.target.value }
                        }
                      })}
                      placeholder="Dirección de la madre"
                    />
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="mama-ciudad">Ciudad *</Label>
                    <Input 
                      id="mama-ciudad"
                      value={formData.informacionFamiliar?.mama?.ciudad || ""}
                      onChange={(e) => setFormData({
                        ...formData,
                        informacionFamiliar: {
                          ...formData.informacionFamiliar!,
                          mama: { ...formData.informacionFamiliar!.mama, ciudad: e.target.value }
                        }
                      })}
                      placeholder="Ciudad"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="mama-telefono">Teléfono *</Label>
                    <Input 
                      id="mama-telefono"
                      value={formData.informacionFamiliar?.mama?.telefono || ""}
                      onChange={(e) => setFormData({
                        ...formData,
                        informacionFamiliar: {
                          ...formData.informacionFamiliar!,
                          mama: { ...formData.informacionFamiliar!.mama, telefono: e.target.value }
                        }
                      })}
                      placeholder="Número de teléfono"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <Label htmlFor="mama-email">Email *</Label>
                    <Input 
                      id="mama-email"
                      type="email"
                      value={formData.informacionFamiliar?.mama?.email || ""}
                      onChange={(e) => setFormData({
                        ...formData,
                        informacionFamiliar: {
                          ...formData.informacionFamiliar!,
                          mama: { ...formData.informacionFamiliar!.mama, email: e.target.value }
                        }
                      })}
                      placeholder="Correo electrónico"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <Label htmlFor="mama-apetito">¿Cómo es tu apetito? *</Label>
                    <Input 
                      id="mama-apetito"
                      value={formData.informacionFamiliar?.mama?.apetito || ""}
                      onChange={(e) => setFormData({
                        ...formData,
                        informacionFamiliar: {
                          ...formData.informacionFamiliar!,
                          mama: { ...formData.informacionFamiliar!.mama, apetito: e.target.value }
                        }
                      })}
                      placeholder="Describe tu apetito"
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="mama-trabaja-fuera"
                      checked={formData.informacionFamiliar?.mama?.trabajaFueraCasa || false}
                      onCheckedChange={(checked) => setFormData({
                        ...formData,
                        informacionFamiliar: {
                          ...formData.informacionFamiliar!,
                          mama: { ...formData.informacionFamiliar!.mama, trabajaFueraCasa: checked as boolean }
                        }
                      })}
                    />
                    <Label htmlFor="mama-trabaja-fuera">¿Mamá trabaja fuera de casa?</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="mama-puede-dormir"
                      checked={formData.informacionFamiliar?.mama?.puedeDormirConHijo || false}
                      onCheckedChange={(checked) => setFormData({
                        ...formData,
                        informacionFamiliar: {
                          ...formData.informacionFamiliar!,
                          mama: { ...formData.informacionFamiliar!.mama, puedeDormirConHijo: checked as boolean }
                        }
                      })}
                    />
                    <Label htmlFor="mama-puede-dormir">¿Puedes dormir en la noche cuando tu hijo(a) duerme?</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="mama-pensamientos-negativos"
                      checked={formData.informacionFamiliar?.mama?.pensamientosNegativos || false}
                      onCheckedChange={(checked) => setFormData({
                        ...formData,
                        informacionFamiliar: {
                          ...formData.informacionFamiliar!,
                          mama: { ...formData.informacionFamiliar!.mama, pensamientosNegativos: checked as boolean }
                        }
                      })}
                    />
                    <Label htmlFor="mama-pensamientos-negativos">¿Tienes pensamientos negativos que te generen miedo?</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="mama-alergias"
                      checked={formData.informacionFamiliar?.mama?.tieneAlergias || false}
                      onCheckedChange={(checked) => setFormData({
                        ...formData,
                        informacionFamiliar: {
                          ...formData.informacionFamiliar!,
                          mama: { ...formData.informacionFamiliar!.mama, tieneAlergias: checked as boolean }
                        }
                      })}
                    />
                    <Label htmlFor="mama-alergias">¿Tienes o has tenido alguna alergia?</Label>
                  </div>
                  
                  {formData.informacionFamiliar?.mama?.tieneAlergias && (
                    <div>
                      <Label htmlFor="mama-alergias-desc">Describe las alergias</Label>
                      <Textarea
                        id="mama-alergias-desc"
                        value={formData.informacionFamiliar?.mama?.alergias || ""}
                        onChange={(e) => setFormData({
                          ...formData,
                          informacionFamiliar: {
                            ...formData.informacionFamiliar!,
                            mama: { ...formData.informacionFamiliar!.mama, alergias: e.target.value }
                          }
                        })}
                        placeholder="Describe las alergias de la madre"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )

      case 2: // Dinámica Familiar
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-[#2F2F2F] flex items-center gap-2">
              <Home className="w-5 h-5" />
              Dinámica Familiar
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cantidad-hijos">¿Cuántos hijos tienen? *</Label>
                <Input 
                  id="cantidad-hijos"
                  type="number"
                  min="1"
                  value={formData.dinamicaFamiliar?.cantidadHijos || 1}
                  onChange={(e) => setFormData({
                    ...formData,
                    dinamicaFamiliar: {
                      ...formData.dinamicaFamiliar!,
                      cantidadHijos: parseInt(e.target.value) || 1
                    }
                  })}
                />
              </div>
              
              <div>
                <Label htmlFor="otros-casa">¿Quiénes más viven en la casa? *</Label>
                <Input 
                  id="otros-casa"
                  value={formData.dinamicaFamiliar?.otrosEnCasa || ""}
                  onChange={(e) => setFormData({
                    ...formData,
                    dinamicaFamiliar: {
                      ...formData.dinamicaFamiliar!,
                      otrosEnCasa: e.target.value
                    }
                  })}
                  placeholder="Ej: Abuelos, tíos, mascotas, etc."
                />
              </div>
              
              <div>
                <Label htmlFor="telefono-seguimiento">Teléfono para seguimiento *</Label>
                <Input 
                  id="telefono-seguimiento"
                  value={formData.dinamicaFamiliar?.telefonoSeguimiento || ""}
                  onChange={(e) => setFormData({
                    ...formData,
                    dinamicaFamiliar: {
                      ...formData.dinamicaFamiliar!,
                      telefonoSeguimiento: e.target.value
                    }
                  })}
                  placeholder="Número principal de contacto"
                />
              </div>
              
              <div>
                <Label htmlFor="email-observaciones">Email para observaciones *</Label>
                <Input 
                  id="email-observaciones"
                  type="email"
                  value={formData.dinamicaFamiliar?.emailObservaciones || ""}
                  onChange={(e) => setFormData({
                    ...formData,
                    dinamicaFamiliar: {
                      ...formData.dinamicaFamiliar!,
                      emailObservaciones: e.target.value
                    }
                  })}
                  placeholder="Email para recibir observaciones"
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="como-conocio">¿Cómo supiste de mis servicios? *</Label>
                <Textarea 
                  id="como-conocio"
                  value={formData.dinamicaFamiliar?.comoConocioServicios || ""}
                  onChange={(e) => setFormData({
                    ...formData,
                    dinamicaFamiliar: {
                      ...formData.dinamicaFamiliar!,
                      comoConocioServicios: e.target.value
                    }
                  })}
                  placeholder="Referencia, redes sociales, búsqueda en internet, etc."
                />
              </div>
              
              <div>
                <Label htmlFor="libros-consultados">¿Qué libros acerca de sueño infantil han consultado?</Label>
                <Textarea 
                  id="libros-consultados"
                  value={formData.dinamicaFamiliar?.librosConsultados || ""}
                  onChange={(e) => setFormData({
                    ...formData,
                    dinamicaFamiliar: {
                      ...formData.dinamicaFamiliar!,
                      librosConsultados: e.target.value
                    }
                  })}
                  placeholder="Títulos de libros o recursos consultados"
                />
              </div>
              
              <div>
                <Label htmlFor="metodos-contra">¿Están en contra de algún método de entrenamiento?</Label>
                <Textarea 
                  id="metodos-contra"
                  value={formData.dinamicaFamiliar?.metodosEnContra || ""}
                  onChange={(e) => setFormData({
                    ...formData,
                    dinamicaFamiliar: {
                      ...formData.dinamicaFamiliar!,
                      metodosEnContra: e.target.value
                    }
                  })}
                  placeholder="Métodos que prefieren evitar"
                />
              </div>
              
              <div>
                <Label htmlFor="asesor-anterior">¿Has contratado a algún otro asesor de sueño o intentado entrenar antes?</Label>
                <Textarea 
                  id="asesor-anterior"
                  value={formData.dinamicaFamiliar?.asesorAnterior || ""}
                  onChange={(e) => setFormData({
                    ...formData,
                    dinamicaFamiliar: {
                      ...formData.dinamicaFamiliar!,
                      asesorAnterior: e.target.value
                    }
                  })}
                  placeholder="Experiencias previas con asesores de sueño"
                />
              </div>
              
              <div>
                <Label htmlFor="quien-levanta-noche">¿Quién o quiénes se levantan a atender a tu hijo(a) cuando se despierta en la noche? *</Label>
                <Input 
                  id="quien-levanta-noche"
                  value={formData.dinamicaFamiliar?.quienSeLevaantaNoche || ""}
                  onChange={(e) => setFormData({
                    ...formData,
                    dinamicaFamiliar: {
                      ...formData.dinamicaFamiliar!,
                      quienSeLevaantaNoche: e.target.value
                    }
                  })}
                  placeholder="Ej: Mamá, Papá, ambos, abuelos"
                />
              </div>
            </div>
          </div>
        )

      case 3: // Historial del Niño
        return (
          <div className="space-y-8">
            <h3 className="text-xl font-semibold text-[#2F2F2F] flex items-center gap-2">
              <Baby className="w-5 h-5" />
              Historial del Niño
            </h3>
            
            {/* Información Básica */}
            <div className="space-y-6">
              <h4 className="text-lg font-medium text-[#2F2F2F]">Información Básica</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="historial-nombre">Nombre *</Label>
                  <Input 
                    id="historial-nombre"
                    value={formData.historial?.nombre || ""}
                    onChange={(e) => setFormData({
                      ...formData,
                      historial: {
                        ...formData.historial!,
                        nombre: e.target.value
                      }
                    })}
                    placeholder="Nombre del niño/a"
                  />
                </div>
                
                <div>
                  <Label htmlFor="historial-fecha">Fecha de Nacimiento *</Label>
                  <Input 
                    id="historial-fecha"
                    type="date"
                    value={formData.historial?.fechaNacimiento || ""}
                    onChange={(e) => setFormData({
                      ...formData,
                      historial: {
                        ...formData.historial!,
                        fechaNacimiento: e.target.value
                      }
                    })}
                  />
                </div>
                
                <div>
                  <Label htmlFor="historial-peso">Peso (kg) *</Label>
                  <Input 
                    id="historial-peso"
                    type="number"
                    step="0.1"
                    value={formData.historial?.peso || ""}
                    onChange={(e) => setFormData({
                      ...formData,
                      historial: {
                        ...formData.historial!,
                        peso: parseFloat(e.target.value) || 0
                      }
                    })}
                    placeholder="Peso actual"
                  />
                </div>
                
                <div>
                  <Label htmlFor="historial-percentil">Percentil de Peso</Label>
                  <Input 
                    id="historial-percentil"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.historial?.percentilPeso || ""}
                    onChange={(e) => setFormData({
                      ...formData,
                      historial: {
                        ...formData.historial!,
                        percentilPeso: parseInt(e.target.value) || undefined
                      }
                    })}
                    placeholder="Percentil"
                  />
                </div>
              </div>
            </div>

            {/* Información Prenatal */}
            <div className="space-y-6">
              <h4 className="text-lg font-medium text-[#2F2F2F]">Información Prenatal</h4>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="embarazo-planeado"
                    checked={formData.historial?.embarazoPlaneado || false}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      historial: {
                        ...formData.historial!,
                        embarazoPlaneado: checked as boolean
                      }
                    })}
                  />
                  <Label htmlFor="embarazo-planeado">¿Fue tu embarazo planeado?</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="problemas-embarazo"
                    checked={formData.historial?.problemasEmbarazo || false}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      historial: {
                        ...formData.historial!,
                        problemasEmbarazo: checked as boolean
                      }
                    })}
                  />
                  <Label htmlFor="problemas-embarazo">¿Tuviste algún problema en tu embarazo?</Label>
                </div>
                
                {formData.historial?.problemasEmbarazo && (
                  <div>
                    <Label htmlFor="problemas-embarazo-desc">Describe los problemas</Label>
                    <Textarea
                      id="problemas-embarazo-desc"
                      value={formData.historial?.problemasEmbarazoDescripcion || ""}
                      onChange={(e) => setFormData({
                        ...formData,
                        historial: {
                          ...formData.historial!,
                          problemasEmbarazoDescripcion: e.target.value
                        }
                      })}
                      placeholder="Describe los problemas durante el embarazo"
                    />
                  </div>
                )}
                
                <div>
                  <Label>Durante tu embarazo padeciste:</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
                    {["Anemia", "Infecciones", "Ninguna"].map((padecimiento) => (
                      <div key={padecimiento} className="flex items-center space-x-2">
                        <Checkbox 
                          checked={formData.historial?.padecimientosEmbarazo?.includes(padecimiento) || false}
                          onCheckedChange={(checked) => {
                            const current = formData.historial?.padecimientosEmbarazo || []
                            const updated = checked 
                              ? [...current, padecimiento]
                              : current.filter(p => p !== padecimiento)
                            setFormData({
                              ...formData,
                              historial: {
                                ...formData.historial!,
                                padecimientosEmbarazo: updated
                              }
                            })
                          }}
                        />
                        <Label className="text-sm">{padecimiento}</Label>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <Label>Tu parto fue:</Label>
                  <RadioGroup
                    value={formData.historial?.tipoParto || "Vaginal"}
                    onValueChange={(value) => setFormData({
                      ...formData,
                      historial: {
                        ...formData.historial!,
                        tipoParto: value as "Vaginal" | "Cesárea" | "Vaginal después de Cesárea"
                      }
                    })}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
                      {["Vaginal", "Cesárea", "Vaginal después de Cesárea"].map((tipo) => (
                        <label
                          key={tipo}
                          className={cn(
                            "flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors",
                            formData.historial?.tipoParto === tipo 
                              ? "border-[#4A90E2] bg-blue-50" 
                              : "border-gray-200 hover:border-gray-300"
                          )}
                        >
                          <RadioGroupItem value={tipo} />
                          <span className="text-sm font-medium">{tipo}</span>
                        </label>
                      ))}
                    </div>
                  </RadioGroup>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="complicaciones-parto"
                      checked={formData.historial?.complicacionesParto || false}
                      onCheckedChange={(checked) => setFormData({
                        ...formData,
                        historial: {
                          ...formData.historial!,
                          complicacionesParto: checked as boolean
                        }
                      })}
                    />
                    <Label htmlFor="complicaciones-parto">¿Tuviste alguna complicación durante el parto?</Label>
                  </div>
                  
                  {formData.historial?.complicacionesParto && (
                    <div>
                      <Label htmlFor="complicaciones-parto-desc">Describe las complicaciones</Label>
                      <Textarea
                        id="complicaciones-parto-desc"
                        value={formData.historial?.complicacionesPartoDescripcion || ""}
                        onChange={(e) => setFormData({
                          ...formData,
                          historial: {
                            ...formData.historial!,
                            complicacionesPartoDescripcion: e.target.value
                          }
                        })}
                        placeholder="Describe las complicaciones durante el parto"
                      />
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="nacio-plazo"
                      checked={formData.historial?.nacioPlazo || false}
                      onCheckedChange={(checked) => setFormData({
                        ...formData,
                        historial: {
                          ...formData.historial!,
                          nacioPlazo: checked as boolean
                        }
                      })}
                    />
                    <Label htmlFor="nacio-plazo">¿Tu bebé nació a término?</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="problemas-nacer"
                      checked={formData.historial?.problemasAlNacer || false}
                      onCheckedChange={(checked) => setFormData({
                        ...formData,
                        historial: {
                          ...formData.historial!,
                          problemasAlNacer: checked as boolean
                        }
                      })}
                    />
                    <Label htmlFor="problemas-nacer">¿Tuvo tu bebé algún problema al nacer?</Label>
                  </div>
                  
                  {formData.historial?.problemasAlNacer && (
                    <div>
                      <Label htmlFor="problemas-nacer-desc">Describe los problemas</Label>
                      <Textarea
                        id="problemas-nacer-desc"
                        value={formData.historial?.problemasAlNacerDescripcion || ""}
                        onChange={(e) => setFormData({
                          ...formData,
                          historial: {
                            ...formData.historial!,
                            problemasAlNacerDescripcion: e.target.value
                          }
                        })}
                        placeholder="Describe los problemas al nacer"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Información Médica */}
            <div className="space-y-6">
              <h4 className="text-lg font-medium text-[#2F2F2F]">Información Médica</h4>
              
              <div>
                <Label htmlFor="pediatra">¿Quién es tu pediatra?</Label>
                <Input 
                  id="pediatra"
                  value={formData.historial?.pediatra || ""}
                  onChange={(e) => setFormData({
                    ...formData,
                    historial: {
                      ...formData.historial!,
                      pediatra: e.target.value
                    }
                  })}
                  placeholder="Nombre del pediatra"
                />
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="pediatra-descarta"
                    checked={formData.historial?.pediatraDescartaProblemas || false}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      historial: {
                        ...formData.historial!,
                        pediatraDescartaProblemas: checked as boolean
                      }
                    })}
                  />
                  <Label htmlFor="pediatra-descarta">¿Ha descartado tu pediatra algún problema médico que contribuya a los problemas de dormir?</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="pediatra-confirma"
                    checked={formData.historial?.pediatraConfirmaCapacidadDormir || false}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      historial: {
                        ...formData.historial!,
                        pediatraConfirmaCapacidadDormir: checked as boolean
                      }
                    })}
                  />
                  <Label htmlFor="pediatra-confirma">¿Confirmaría tu pediatra que tu niño(a) puede dormir toda la noche dada su edad, peso y salud?</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="tratamiento-medico"
                    checked={formData.historial?.tratamientoMedico || false}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      historial: {
                        ...formData.historial!,
                        tratamientoMedico: checked as boolean
                      }
                    })}
                  />
                  <Label htmlFor="tratamiento-medico">¿Está tu hijo(a) bajo algún tratamiento médico o tomando algún medicamento?</Label>
                </div>
                
                {formData.historial?.tratamientoMedico && (
                  <div>
                    <Label htmlFor="tratamiento-desc">Describe el tratamiento/medicamento</Label>
                    <Textarea
                      id="tratamiento-desc"
                      value={formData.historial?.tratamientoMedicoDescripcion || ""}
                      onChange={(e) => setFormData({
                        ...formData,
                        historial: {
                          ...formData.historial!,
                          tratamientoMedicoDescripcion: e.target.value
                        }
                      })}
                      placeholder="Describe el tratamiento médico o medicamentos"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )

      case 4: // Desarrollo y Salud
        return (
          <div className="space-y-8">
            <h3 className="text-xl font-semibold text-[#2F2F2F] flex items-center gap-2">
              <Heart className="w-5 h-5" />
              Desarrollo y Salud
            </h3>
            
            {/* Hitos del Desarrollo */}
            <div className="space-y-6">
              <h4 className="text-lg font-medium text-[#2F2F2F]">Hitos del Desarrollo (en meses)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edad-rodar">¿Cuándo fue capaz de rodar en ambos lados?</Label>
                  <Input 
                    id="edad-rodar"
                    type="number"
                    min="0"
                    max="24"
                    value={formData.desarrolloSalud?.edadRodar || ""}
                    onChange={(e) => setFormData({
                      ...formData,
                      desarrolloSalud: {
                        ...formData.desarrolloSalud!,
                        edadRodar: parseInt(e.target.value) || undefined
                      }
                    })}
                    placeholder="Meses"
                  />
                </div>
                
                <div>
                  <Label htmlFor="edad-sentarse">¿Cuándo fue capaz de sentarse?</Label>
                  <Input 
                    id="edad-sentarse"
                    type="number"
                    min="0"
                    max="24"
                    value={formData.desarrolloSalud?.edadSentarse || ""}
                    onChange={(e) => setFormData({
                      ...formData,
                      desarrolloSalud: {
                        ...formData.desarrolloSalud!,
                        edadSentarse: parseInt(e.target.value) || undefined
                      }
                    })}
                    placeholder="Meses"
                  />
                </div>
                
                <div>
                  <Label htmlFor="edad-gatear">¿Cuándo fue capaz de gatear?</Label>
                  <Input 
                    id="edad-gatear"
                    type="number"
                    min="0"
                    max="24"
                    value={formData.desarrolloSalud?.edadGatear || ""}
                    onChange={(e) => setFormData({
                      ...formData,
                      desarrolloSalud: {
                        ...formData.desarrolloSalud!,
                        edadGatear: parseInt(e.target.value) || undefined
                      }
                    })}
                    placeholder="Meses"
                  />
                </div>
                
                <div>
                  <Label htmlFor="edad-pararse">¿Cuándo fue capaz de pararse?</Label>
                  <Input 
                    id="edad-pararse"
                    type="number"
                    min="0"
                    max="24"
                    value={formData.desarrolloSalud?.edadPararse || ""}
                    onChange={(e) => setFormData({
                      ...formData,
                      desarrolloSalud: {
                        ...formData.desarrolloSalud!,
                        edadPararse: parseInt(e.target.value) || undefined
                      }
                    })}
                    placeholder="Meses"
                  />
                </div>
                
                <div>
                  <Label htmlFor="edad-caminar">¿Cuándo fue capaz de caminar?</Label>
                  <Input 
                    id="edad-caminar"
                    type="number"
                    min="0"
                    max="36"
                    value={formData.desarrolloSalud?.edadCaminar || ""}
                    onChange={(e) => setFormData({
                      ...formData,
                      desarrolloSalud: {
                        ...formData.desarrolloSalud!,
                        edadCaminar: parseInt(e.target.value) || undefined
                      }
                    })}
                    placeholder="Meses"
                  />
                </div>
              </div>
            </div>

            {/* Alimentación */}
            <div className="space-y-6">
              <h4 className="text-lg font-medium text-[#2F2F2F]">Alimentación</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label>Tu hijo utiliza:</Label>
                  <RadioGroup
                    value={formData.desarrolloSalud?.usoVaso || ""}
                    onValueChange={(value) => setFormData({
                      ...formData,
                      desarrolloSalud: {
                        ...formData.desarrolloSalud!,
                        usoVaso: value as "Vaso" | "Biberón"
                      }
                    })}
                  >
                    <div className="space-y-2 mt-2">
                      {["Vaso", "Biberón"].map((opcion) => (
                        <label
                          key={opcion}
                          className={cn(
                            "flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors",
                            formData.desarrolloSalud?.usoVaso === opcion 
                              ? "border-[#4A90E2] bg-blue-50" 
                              : "border-gray-200 hover:border-gray-300"
                          )}
                        >
                          <RadioGroupItem value={opcion} />
                          <span className="text-sm font-medium">{opcion}</span>
                        </label>
                      ))}
                    </div>
                  </RadioGroup>
                </div>
                
                <div>
                  <Label>Tu hijo se alimenta de:</Label>
                  <RadioGroup
                    value={formData.desarrolloSalud?.alimentacion || ""}
                    onValueChange={(value) => setFormData({
                      ...formData,
                      desarrolloSalud: {
                        ...formData.desarrolloSalud!,
                        alimentacion: value as "Fórmula" | "Leche materna exclusiva" | "Leche materna y fórmula" | "Ninguna"
                      }
                    })}
                  >
                    <div className="space-y-2 mt-2">
                      {["Fórmula", "Leche materna exclusiva", "Leche materna y fórmula", "Ninguna"].map((opcion) => (
                        <label
                          key={opcion}
                          className={cn(
                            "flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors",
                            formData.desarrolloSalud?.alimentacion === opcion 
                              ? "border-[#4A90E2] bg-blue-50" 
                              : "border-gray-200 hover:border-gray-300"
                          )}
                        >
                          <RadioGroupItem value={opcion} />
                          <span className="text-sm font-medium">{opcion}</span>
                        </label>
                      ))}
                    </div>
                  </RadioGroup>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="come-solidos"
                  checked={formData.desarrolloSalud?.comeSolidos || false}
                  onCheckedChange={(checked) => setFormData({
                    ...formData,
                    desarrolloSalud: {
                      ...formData.desarrolloSalud!,
                      comeSolidos: checked as boolean
                    }
                  })}
                />
                <Label htmlFor="come-solidos">¿Tu hijo(a) come sólidos?</Label>
              </div>
            </div>

            {/* Características del Niño */}
            <div className="space-y-6">
              <h4 className="text-lg font-medium text-[#2F2F2F]">Características del Niño</h4>
              <Label>Tu hijo(a): (selecciona todas las que apliquen)</Label>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  "Se chupa el dedo",
                  "Usa chupón",
                  "Tiene un objeto de seguridad como un trapito o peluche",
                  "Tiene o ha tenido problemas médicos o del desarrollo",
                  "Moja la cama durante la noche",
                  "Es sonámbulo",
                  "Ronca",
                  "Respira por la boca",
                  "Se cae de la cama con frecuencia",
                  "Es muy inquieto para dormir",
                  "Transpira mucho cuando duerme",
                  "Tiene o ha tenido reflujo y/o cólicos",
                  "Tiene o ha tenido pesadillas"
                ].map((caracteristica) => (
                  <div key={caracteristica} className="flex items-center space-x-2">
                    <Checkbox 
                      checked={formData.desarrolloSalud?.caracteristicas?.includes(caracteristica) || false}
                      onCheckedChange={(checked) => {
                        const current = formData.desarrolloSalud?.caracteristicas || []
                        const updated = checked 
                          ? [...current, caracteristica]
                          : current.filter(c => c !== caracteristica)
                        setFormData({
                          ...formData,
                          desarrolloSalud: {
                            ...formData.desarrolloSalud!,
                            caracteristicas: updated
                          }
                        })
                      }}
                    />
                    <Label className="text-sm">{caracteristica}</Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )

      case 5: // Actividad Física
        return (
          <div className="space-y-8">
            <h3 className="text-xl font-semibold text-[#2F2F2F] flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Actividad Física
            </h3>
            
            <div className="space-y-6">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="ve-pantallas"
                  checked={formData.actividadFisica?.vePantallas || false}
                  onCheckedChange={(checked) => setFormData({
                    ...formData,
                    actividadFisica: {
                      ...formData.actividadFisica!,
                      vePantallas: checked as boolean
                    }
                  })}
                />
                <Label htmlFor="ve-pantallas">¿Tu hijo(a) ve pantallas? (TV, celular, iPad, etc.)</Label>
              </div>
              
              {formData.actividadFisica?.vePantallas && (
                <div>
                  <Label htmlFor="tiempo-pantallas">¿Cuánto tiempo ve pantallas al día?</Label>
                  <Input 
                    id="tiempo-pantallas"
                    value={formData.actividadFisica?.pantallasTiempo || ""}
                    onChange={(e) => setFormData({
                      ...formData,
                      actividadFisica: {
                        ...formData.actividadFisica!,
                        pantallasTiempo: e.target.value
                      }
                    })}
                    placeholder="Ej: 1-2 horas, 30 minutos"
                  />
                </div>
              )}
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="practica-actividad"
                  checked={formData.actividadFisica?.practicaActividad || false}
                  onCheckedChange={(checked) => setFormData({
                    ...formData,
                    actividadFisica: {
                      ...formData.actividadFisica!,
                      practicaActividad: checked as boolean
                    }
                  })}
                />
                <Label htmlFor="practica-actividad">¿Tu hijo(a) practica alguna actividad física, estimulación temprana o deporte?</Label>
              </div>
              
              {formData.actividadFisica?.practicaActividad && (
                <div>
                  <Label htmlFor="actividades">¿Qué actividades practica?</Label>
                  <Textarea 
                    id="actividades"
                    value={formData.actividadFisica?.actividades || ""}
                    onChange={(e) => setFormData({
                      ...formData,
                      actividadFisica: {
                        ...formData.actividadFisica!,
                        actividades: e.target.value
                      }
                    })}
                    placeholder="Describe las actividades físicas o deportes"
                  />
                </div>
              )}
              
              <div>
                <Label htmlFor="actividades-despierto">¿Qué actividades realiza tu hijo(a) cuando está despierto?</Label>
                <Textarea 
                  id="actividades-despierto"
                  value={formData.actividadFisica?.actividadesDespierto || ""}
                  onChange={(e) => setFormData({
                    ...formData,
                    actividadFisica: {
                      ...formData.actividadFisica!,
                      actividadesDespierto: e.target.value
                    }
                  })}
                  placeholder="Describe las actividades diarias del niño"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="signos-irritabilidad"
                  checked={formData.actividadFisica?.signosIrritabilidad || false}
                  onCheckedChange={(checked) => setFormData({
                    ...formData,
                    actividadFisica: {
                      ...formData.actividadFisica!,
                      signosIrritabilidad: checked as boolean
                    }
                  })}
                />
                <Label htmlFor="signos-irritabilidad">¿Has notado signos de irritabilidad o mal humor en tu hijo(a)?</Label>
              </div>
              
              <div>
                <Label>¿Tu hijo(a) ha sufrido de algunas de las siguientes situaciones? (selecciona todas las que apliquen)</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                  {[
                    "Alergias",
                    "Infecciones de oído frecuentes", 
                    "Asma",
                    "Rinitis",
                    "Frecuente nariz tapada",
                    "Dermatitis atópica"
                  ].map((situacion) => (
                    <div key={situacion} className="flex items-center space-x-2">
                      <Checkbox 
                        checked={formData.actividadFisica?.situacionesSufridas?.includes(situacion) || false}
                        onCheckedChange={(checked) => {
                          const current = formData.actividadFisica?.situacionesSufridas || []
                          const updated = checked 
                            ? [...current, situacion]
                            : current.filter(s => s !== situacion)
                          setFormData({
                            ...formData,
                            actividadFisica: {
                              ...formData.actividadFisica!,
                              situacionesSufridas: updated
                            }
                          })
                        }}
                      />
                      <Label className="text-sm">{situacion}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )

      case 6: // Rutina y Hábitos de Sueño
        return (
          <div className="space-y-8">
            <h3 className="text-xl font-semibold text-[#2F2F2F] flex items-center gap-2">
              <Moon className="w-5 h-5" />
              Rutina y Hábitos de Sueño
            </h3>
            
            <div className="space-y-6">
              <div>
                <Label htmlFor="dia-tipico">Explica DETALLADAMENTE un día típico (24 horas) de tu hijo(a) *</Label>
                <Textarea 
                  id="dia-tipico"
                  className="min-h-[120px]"
                  value={formData.rutinaHabitos?.diaTypico || ""}
                  onChange={(e) => setFormData({
                    ...formData,
                    rutinaHabitos: {
                      ...formData.rutinaHabitos!,
                      diaTypico: e.target.value
                    }
                  })}
                  placeholder="Describe desde que se despierta por la mañana hasta la noche..."
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="va-guarderia"
                    checked={formData.rutinaHabitos?.vaGuarderia || false}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      rutinaHabitos: {
                        ...formData.rutinaHabitos!,
                        vaGuarderia: checked as boolean
                      }
                    })}
                  />
                  <Label htmlFor="va-guarderia">¿Va tu hijo al kinder o guardería?</Label>
                </div>
                
                <div>
                  <Label htmlFor="quien-pasa-tiempo">¿Quién pasa la mayoría del tiempo con el niño(a)? *</Label>
                  <Input 
                    id="quien-pasa-tiempo"
                    value={formData.rutinaHabitos?.quienPasaTiempo || ""}
                    onChange={(e) => setFormData({
                      ...formData,
                      rutinaHabitos: {
                        ...formData.rutinaHabitos!,
                        quienPasaTiempo: e.target.value
                      }
                    })}
                    placeholder="Ej: Mamá, papá, abuela, niñera"
                  />
                </div>
                
                <div>
                  <Label htmlFor="quien-cuida-noche">Si papá y mamá salen de casa en la noche, ¿quién cuida a su hij@ mientras regresan?</Label>
                  <Input 
                    id="quien-cuida-noche"
                    value={formData.rutinaHabitos?.quienCuidaNoche || ""}
                    onChange={(e) => setFormData({
                      ...formData,
                      rutinaHabitos: {
                        ...formData.rutinaHabitos!,
                        quienCuidaNoche: e.target.value
                      }
                    })}
                    placeholder="Ej: Abuelos, niñera, se queda solo"
                  />
                </div>
                
                <div>
                  <Label htmlFor="donde-duerme-padres-salen">Cuando papá y mamá salen de noche, ¿dónde duerme su hij@?</Label>
                  <Input 
                    id="donde-duerme-padres-salen"
                    value={formData.rutinaHabitos?.dondeVurmePadresSalen || ""}
                    onChange={(e) => setFormData({
                      ...formData,
                      rutinaHabitos: {
                        ...formData.rutinaHabitos!,
                        dondeVurmePadresSalen: e.target.value
                      }
                    })}
                    placeholder="Ej: En su cama, con los abuelos"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="rutina-antes-acostar">Explica cuál es la rutina que siguen por la noche para ir a dormir *</Label>
                <Textarea 
                  id="rutina-antes-acostar"
                  value={formData.rutinaHabitos?.rutinaAntesAcostarse || ""}
                  onChange={(e) => setFormData({
                    ...formData,
                    rutinaHabitos: {
                      ...formData.rutinaHabitos!,
                      rutinaAntesAcostarse: e.target.value
                    }
                  })}
                  placeholder="Describe paso a paso la rutina nocturna (baño, cena, cuento, etc.)"
                />
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="hora-especifica-dormir"
                    checked={formData.rutinaHabitos?.horaEspecificaDormir || false}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      rutinaHabitos: {
                        ...formData.rutinaHabitos!,
                        horaEspecificaDormir: checked as boolean
                      }
                    })}
                  />
                  <Label htmlFor="hora-especifica-dormir">¿Existe una hora específica para ir a dormir?</Label>
                </div>
                
                {formData.rutinaHabitos?.horaEspecificaDormir && (
                  <div>
                    <Label htmlFor="hora-dormir">¿Cuál es la hora de dormir?</Label>
                    <Input 
                      id="hora-dormir"
                      type="time"
                      value={formData.rutinaHabitos?.horaDormir || ""}
                      onChange={(e) => setFormData({
                        ...formData,
                        rutinaHabitos: {
                          ...formData.rutinaHabitos!,
                          horaDormir: e.target.value
                        }
                      })}
                    />
                  </div>
                )}
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="se-queda-dormido-solo"
                    checked={formData.rutinaHabitos?.seQuedaDormirSolo || false}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      rutinaHabitos: {
                        ...formData.rutinaHabitos!,
                        seQuedaDormirSolo: checked as boolean
                      }
                    })}
                  />
                  <Label htmlFor="se-queda-dormido-solo">¿Tu hijo(a) se queda dormido solo?</Label>
                </div>
              </div>
              
              {/* Ambiente del Cuarto */}
              <div className="space-y-4">
                <Label>¿Qué tan oscuro es el cuarto de tu hijo(a)? Dejas: (selecciona todas las que apliquen)</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {["Lamparita prendida", "Puerta abierta", "Luz del baño prendida"].map((opcion) => (
                    <div key={opcion} className="flex items-center space-x-2">
                      <Checkbox 
                        checked={formData.rutinaHabitos?.oscuridadCuarto?.includes(opcion) || false}
                        onCheckedChange={(checked) => {
                          const current = formData.rutinaHabitos?.oscuridadCuarto || []
                          const updated = checked 
                            ? [...current, opcion]
                            : current.filter(o => o !== opcion)
                          setFormData({
                            ...formData,
                            rutinaHabitos: {
                              ...formData.rutinaHabitos!,
                              oscuridadCuarto: updated
                            }
                          })
                        }}
                      />
                      <Label className="text-sm">{opcion}</Label>
                    </div>
                  ))}
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="usa-ruido-blanco"
                    checked={formData.rutinaHabitos?.usaRuidoBlanco || false}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      rutinaHabitos: {
                        ...formData.rutinaHabitos!,
                        usaRuidoBlanco: checked as boolean
                      }
                    })}
                  />
                  <Label htmlFor="usa-ruido-blanco">¿Usan ruido blanco?</Label>
                </div>
                
                <div>
                  <Label htmlFor="temperatura-cuarto">Aproximadamente, ¿a qué temperatura está el cuarto al dormir?</Label>
                  <Input 
                    id="temperatura-cuarto"
                    value={formData.rutinaHabitos?.temperaturaCuarto || ""}
                    onChange={(e) => setFormData({
                      ...formData,
                      rutinaHabitos: {
                        ...formData.rutinaHabitos!,
                        temperaturaCuarto: e.target.value
                      }
                    })}
                    placeholder="Ej: 20°C, 22°C"
                  />
                </div>
                
                <div>
                  <Label htmlFor="tipo-piyama">Describe detalladamente que tipo de piyama usa tu hij@ *</Label>
                  <Textarea 
                    id="tipo-piyama"
                    value={formData.rutinaHabitos?.tipoPiyama || ""}
                    onChange={(e) => setFormData({
                      ...formData,
                      rutinaHabitos: {
                        ...formData.rutinaHabitos!,
                        tipoPiyama: e.target.value
                      }
                    })}
                    placeholder="Describe el tipo de ropa para dormir"
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="usa-saco-dormir"
                    checked={formData.rutinaHabitos?.usaSacoDormir || false}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      rutinaHabitos: {
                        ...formData.rutinaHabitos!,
                        usaSacoDormir: checked as boolean
                      }
                    })}
                  />
                  <Label htmlFor="usa-saco-dormir">¿Usa saco para dormir?</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="se-queda-hasta-conciliar"
                    checked={formData.rutinaHabitos?.seQuedaHastaConciliar || false}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      rutinaHabitos: {
                        ...formData.rutinaHabitos!,
                        seQuedaHastaConciliar: checked as boolean
                      }
                    })}
                  />
                  <Label htmlFor="se-queda-hasta-conciliar">¿Te quedas con el/ella hasta que concilie el sueño?</Label>
                </div>
              </div>
              
              {/* Dónde duerme */}
              <div>
                <Label>¿Dónde duerme tu hijo por las noches?</Label>
                <RadioGroup
                  value={formData.rutinaHabitos?.dondeDuermeNoche || "Cama en su cuarto"}
                  onValueChange={(value) => setFormData({
                    ...formData,
                    rutinaHabitos: {
                      ...formData.rutinaHabitos!,
                      dondeDuermeNoche: value as typeof formData.rutinaHabitos.dondeDuermeNoche
                    }
                  })}
                >
                  <div className="space-y-2 mt-2">
                    {[
                      "Cama en su cuarto",
                      "Cama en su cuarto con alguno de los padres", 
                      "Cuna/corral en su cuarto",
                      "Cuna/corral en cuarto de papás",
                      "Cama de papás",
                      "Primero en su cuna/corral y luego a cama de papás",
                      "Primero en su cama y luego a cama de papás"
                    ].map((opcion) => (
                      <label
                        key={opcion}
                        className={cn(
                          "flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors",
                          formData.rutinaHabitos?.dondeDuermeNoche === opcion 
                            ? "border-[#4A90E2] bg-blue-50" 
                            : "border-gray-200 hover:border-gray-300"
                        )}
                      >
                        <RadioGroupItem value={opcion} />
                        <span className="text-sm font-medium">{opcion}</span>
                      </label>
                    ))}
                  </div>
                </RadioGroup>
              </div>
              
              {/* Preguntas finales */}
              <div className="space-y-6">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="comparte-habitacion"
                    checked={formData.rutinaHabitos?.comparteHabitacion || false}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      rutinaHabitos: {
                        ...formData.rutinaHabitos!,
                        comparteHabitacion: checked as boolean
                      }
                    })}
                  />
                  <Label htmlFor="comparte-habitacion">¿Tu hijo(a) comparte la habitación con algún miembro de la familia?</Label>
                </div>
                
                {formData.rutinaHabitos?.comparteHabitacion && (
                  <div>
                    <Label htmlFor="con-quien-comparte">¿Con quién comparte la habitación?</Label>
                    <Input 
                      id="con-quien-comparte"
                      value={formData.rutinaHabitos?.conQuienComparte || ""}
                      onChange={(e) => setFormData({
                        ...formData,
                        rutinaHabitos: {
                          ...formData.rutinaHabitos!,
                          conQuienComparte: e.target.value
                        }
                      })}
                      placeholder="Ej: hermano, padres"
                    />
                  </div>
                )}
                
                <div>
                  <Label htmlFor="temperamento">¿Cómo describes el temperamento de tu hijo(a)? *</Label>
                  <Textarea 
                    id="temperamento"
                    value={formData.rutinaHabitos?.temperamento || ""}
                    onChange={(e) => setFormData({
                      ...formData,
                      rutinaHabitos: {
                        ...formData.rutinaHabitos!,
                        temperamento: e.target.value
                      }
                    })}
                    placeholder="Describe el temperamento del niño"
                  />
                </div>
                
                <div>
                  <Label htmlFor="reaccion-dejar-solo">¿Cómo reacciona tu hijo(a) cuando lo dejas solo(a)? *</Label>
                  <Textarea 
                    id="reaccion-dejar-solo"
                    value={formData.rutinaHabitos?.reaccionDejarSolo || ""}
                    onChange={(e) => setFormData({
                      ...formData,
                      rutinaHabitos: {
                        ...formData.rutinaHabitos!,
                        reaccionDejarSolo: e.target.value
                      }
                    })}
                    placeholder="Describe la reacción del niño"
                  />
                </div>
                
                <div>
                  <Label htmlFor="metodos-relajarse">¿Qué hace tu hijo(a) para relajarse o calmarse? *</Label>
                  <Textarea 
                    id="metodos-relajarse"
                    value={formData.rutinaHabitos?.metodosRelajarse || ""}
                    onChange={(e) => setFormData({
                      ...formData,
                      rutinaHabitos: {
                        ...formData.rutinaHabitos!,
                        metodosRelajarse: e.target.value
                      }
                    })}
                    placeholder="Ej: chuparse el dedo, abrazar un peluche"
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="hace-siestas"
                    checked={formData.rutinaHabitos?.haceSiestas || false}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      rutinaHabitos: {
                        ...formData.rutinaHabitos!,
                        haceSiestas: checked as boolean
                      }
                    })}
                  />
                  <Label htmlFor="hace-siestas">¿Tu hijo(a) hace siestas?</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="padres-dispuestos"
                    checked={formData.rutinaHabitos?.padresDispuestos || false}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      rutinaHabitos: {
                        ...formData.rutinaHabitos!,
                        padresDispuestos: checked as boolean
                      }
                    })}
                  />
                  <Label htmlFor="padres-dispuestos">¿Están ambos padres dispuestos a participar en la implementación de buenos hábitos de sueño?</Label>
                </div>
                
                <div>
                  <Label htmlFor="objetivos-padres">¿Cuál es el objetivo que como papás les gustaría ver en los hábitos de sueño de su hijo(a)? *</Label>
                  <Textarea 
                    id="objetivos-padres"
                    value={formData.rutinaHabitos?.objetivosPadres || ""}
                    onChange={(e) => setFormData({
                      ...formData,
                      rutinaHabitos: {
                        ...formData.rutinaHabitos!,
                        objetivosPadres: e.target.value
                      }
                    })}
                    placeholder="Describe los objetivos específicos sobre horarios y hábitos de sueño"
                  />
                </div>
                
                <div>
                  <Label htmlFor="informacion-adicional">¿Existe algún otra información que consideren relevante que sepa?</Label>
                  <Textarea 
                    id="informacion-adicional"
                    value={formData.rutinaHabitos?.informacionAdicional || ""}
                    onChange={(e) => setFormData({
                      ...formData,
                      rutinaHabitos: {
                        ...formData.rutinaHabitos!,
                        informacionAdicional: e.target.value
                      }
                    })}
                    placeholder="Cualquier información adicional que consideres importante"
                  />
                </div>
              </div>
              
              {/* Nota final */}
              <div className="flex gap-3 p-4 bg-[#F0F7FF] rounded-lg">
                <Info className="w-5 h-5 text-[#91C1F8] flex-shrink-0 mt-0.5" />
                <div className="text-sm text-gray-700">
                  <p className="font-medium mb-2">Gracias por tomarse el tiempo de llenar este cuestionario.</p>
                  <p>Esta información me servirá para juntos crear un plan que se ajuste a las necesidades de su hijo(a) y la familia. Les recuerdo que para lograr cambios, su compromiso es esencial durante todo este proceso.</p>
                </div>
              </div>
            </div>
          </div>
        )

      default:
        return (
          <div className="text-center py-10">
            <p className="text-gray-600">Contenido del paso {currentStep} en desarrollo</p>
            <p className="text-sm text-gray-500 mt-2">
              Esta sección se está implementando. Por favor, guarda tu progreso y continúa más tarde.
            </p>
          </div>
        )
    }
  }

  const progress = (currentStep / steps.length) * 100

  // Mostrar loading mientras cargan los datos
  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Cargando encuesta...</span>
        </div>
      </div>
    )
  }

  // Si no hay childId, mostrar error
  if (!childId) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card className="p-6 text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Error</h2>
          <p className="text-gray-600">No se especificó el ID del niño para la encuesta.</p>
          <Button onClick={() => router.push("/dashboard")} className="mt-4">
            Volver al Dashboard
          </Button>
        </Card>
      </div>
    )
  }

  // Vista para encuesta ya completada
  if (isExistingSurvey) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header para encuesta completada */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-[#2F2F2F]">Encuesta de Sueño Completada ✅</h1>
          <p className="text-green-600 font-medium">
            Esta encuesta ya fue completada. Puedes revisar las respuestas o editarlas si es necesario.
          </p>
        </div>

        {/* Resumen de información */}
        <Card className="p-6">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800">Resumen de la Encuesta</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium text-gray-700">Información Familiar</h3>
                <p className="text-sm text-gray-600">
                  Papá: {formData.informacionFamiliar?.papa?.nombre || "No especificado"}
                </p>
                <p className="text-sm text-gray-600">
                  Mamá: {formData.informacionFamiliar?.mama?.nombre || "No especificado"}
                </p>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-700">Información del Niño</h3>
                <p className="text-sm text-gray-600">
                  Nombre: {formData.historial?.nombre || "No especificado"}
                </p>
                <p className="text-sm text-gray-600">
                  Fecha de nacimiento: {formData.historial?.fechaNacimiento || "No especificado"}
                </p>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-700">Rutina de Sueño</h3>
                <p className="text-sm text-gray-600">
                  Hora de dormir: {formData.rutinaHabitos?.horaDormir || "No especificada"}
                </p>
                <p className="text-sm text-gray-600">
                  Dónde duerme: {formData.rutinaHabitos?.dondeDuermeNoche || "No especificado"}
                </p>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-700">Objetivos</h3>
                <p className="text-sm text-gray-600">
                  {formData.rutinaHabitos?.objetivosPadres || "No especificados"}
                </p>
              </div>
            </div>

            {formData.completedAt && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-600">
                  <strong>Completada el:</strong> {new Date(formData.completedAt).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Botones de acción */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={handleEditSurvey}
            variant="outline"
            className="px-6"
          >
            ✏️ Editar Encuesta
          </Button>
          <Button
            onClick={() => router.push("/dashboard")}
            className="px-6"
          >
            🏠 Volver al Dashboard
          </Button>
        </div>
      </div>
    )
  }

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
            <div className="w-12 h-12 bg-[#F0F7FF] rounded-full flex items-center justify-center text-2xl">
              {steps[currentStep - 1]?.icon}
            </div>
            <h2 className="text-2xl font-bold text-[#2F2F2F]">{steps[currentStep - 1]?.name}</h2>
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
          onClick={currentStep === steps.length ? 
            (isExistingSurvey ? handleUpdateSurvey : handleSubmit) : 
            handleNext
          }
          disabled={isSubmitting}
          className="min-w-[150px] hd-gradient-button text-white"
        >
          {currentStep === steps.length ? (
            isSubmitting ? 
              (isExistingSurvey ? "Actualizando..." : "Enviando...") : 
              (isExistingSurvey ? "💾 Guardar Cambios" : "Finalizar")
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