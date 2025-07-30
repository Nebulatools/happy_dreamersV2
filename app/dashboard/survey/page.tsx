// Página de Encuesta de Sueño Infantil - Refactorizada
// Utiliza la nueva arquitectura modular para mejor mantenibilidad

"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useActiveChild } from "@/context/active-child-context"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, CheckCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { SurveyWizard } from "@/components/survey/SurveyWizard"
import type { SurveyData } from "@/types/models"
import { createLogger } from "@/lib/logger"

const logger = createLogger("survey-page")

export default function SurveyPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlChildId = searchParams.get("childId")
  const { activeChildId } = useActiveChild()
  const { toast } = useToast()
  
  // Usar childId de URL si está disponible, sino usar el del contexto
  const childId = urlChildId || activeChildId
  const [isLoading, setIsLoading] = useState(true)
  const [existingSurvey, setExistingSurvey] = useState<SurveyData | null>(null)
  const [isViewMode, setIsViewMode] = useState(false)

  useEffect(() => {
    if (!childId) {
      toast({
        title: "Sin niño seleccionado",
        description: "Por favor selecciona un niño para continuar con la encuesta",
        variant: "destructive"
      })
      router.push("/dashboard/children")
      return
    }

    loadSurveyData()
  }, [childId])

  const loadSurveyData = async () => {
    try {
      setIsLoading(true)
      
      // Intentar cargar encuesta existente desde la API
      const response = await fetch(`/api/survey?childId=${childId}`)
      
      if (response.ok) {
        const data = await response.json()
        if (data.survey) {
          setExistingSurvey(data.survey.surveyData)
          setIsViewMode(true)
          logger.info("Encuesta existente cargada", { childId })
          return
        }
      }
      
      // Si no hay encuesta en la API, verificar localStorage
      const savedData = localStorage.getItem(`survey_${childId}`)
      if (savedData) {
        const parsedData = JSON.parse(savedData)
        setExistingSurvey(parsedData)
        toast({
          title: "Progreso recuperado",
          description: "Hemos recuperado tu progreso anterior en la encuesta"
        })
      }
    } catch (error) {
      logger.error("Error cargando encuesta", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditSurvey = () => {
    setIsViewMode(false)
    toast({
      title: "Modo de edición",
      description: "Ahora puedes modificar las respuestas de la encuesta"
    })
  }

  if (!childId) {
    return null // El useEffect redirigirá
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#628BE6] mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando encuesta...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/dashboard")}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver al Dashboard
        </Button>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#2F2F2F]">
              Encuesta de Sueño Infantil
            </h1>
            <p className="text-gray-600 mt-2">
              Completa esta encuesta para recibir recomendaciones personalizadas
            </p>
          </div>
          
          {existingSurvey && isViewMode && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm font-medium">Encuesta completada</span>
            </div>
          )}
        </div>
      </div>

      {/* Modo Vista - Encuesta Completada */}
      {existingSurvey && isViewMode ? (
        <Card className="p-6 md:p-8">
          <div className="text-center max-w-2xl mx-auto">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-4">
              ¡Encuesta Completada!
            </h2>
            <p className="text-gray-600 mb-6">
              Ya has completado la encuesta de sueño para este niño. 
              Las recomendaciones personalizadas están disponibles en el dashboard.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={() => router.push("/dashboard")}
                className="hd-gradient-button text-white"
              >
                Ir al Dashboard
              </Button>
              <Button
                variant="outline"
                onClick={handleEditSurvey}
              >
                Editar Respuestas
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        // Modo Edición - Formulario de Encuesta
        <SurveyWizard
          childId={childId}
          initialData={existingSurvey || undefined}
          isExisting={!!existingSurvey}
        />
      )}
    </div>
  )
}