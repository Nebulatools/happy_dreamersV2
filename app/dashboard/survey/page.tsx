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
import { usePageHeaderConfig } from "@/context/page-header-context"

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

  usePageHeaderConfig({
    title: "Encuesta de Sueño",
    showChildSelector: true,
    showSearch: false,
    showNotifications: true
  })

  // Sincronizar el cambio de niño en el selector con la URL
  useEffect(() => {
    if (activeChildId && activeChildId !== urlChildId) {
      router.push(`/dashboard/survey?childId=${activeChildId}`)
    }
  }, [activeChildId, urlChildId, router])

  useEffect(() => {
    if (!childId) {
      setIsLoading(false)
      return
    }

    loadSurveyData()
  }, [childId])

  const loadSurveyData = async () => {
    console.log('🔵🔵🔵 [LOAD] ===== INICIANDO CARGA DE DATOS =====', childId)
    try {
      setIsLoading(true)

      const getLocalDraft = () => {
        if (!childId) return null
        const savedData = localStorage.getItem(`survey_${childId}`)
        if (!savedData) return null
        try {
          return JSON.parse(savedData)
        } catch (error) {
          logger.error("Error parseando borrador local", error)
          return null
        }
      }

      let serverSurvey: SurveyData | null = null
      let serverUpdatedAt = 0

      console.log('[LOAD] 1. Intentando cargar desde API...')
      const response = await fetch(`/api/survey?childId=${childId}`)
      
      if (response.ok) {
        const data = await response.json()
        if (data.survey) {
          serverSurvey = data.survey.surveyData
          const remoteTimestamp =
            data.survey.surveyData?.lastUpdated ||
            data.survey.surveyData?.completedAt ||
            data.survey.updatedAt
          serverUpdatedAt = remoteTimestamp ? new Date(remoteTimestamp).getTime() : 0
        }
      }

      const localDraft = getLocalDraft()
      const localFormData = localDraft?.formData || localDraft?.data || null
      const localTimestamp = localDraft?.lastSaved
        ? new Date(localDraft.lastSaved).getTime()
        : 0

      if (localFormData && (!serverSurvey || localTimestamp > serverUpdatedAt)) {
        setExistingSurvey(localFormData)
        setIsViewMode(false)
        logger.info("Encuesta restaurada desde borrador local", { childId })
        toast({
          title: "Progreso recuperado",
          description: "Hemos cargado tus últimas respuestas guardadas en este dispositivo."
        })
        return
      }

      if (serverSurvey) {
        setExistingSurvey(serverSurvey)
        // Solo mostrar como completada si tiene el flag completed === true
        // Si es guardado parcial (isPartial: true) o no tiene completed, permitir edición
        const isCompleted = serverSurvey.completed === true && !serverSurvey.isPartial
        setIsViewMode(isCompleted)
        logger.info("Encuesta existente cargada", {
          childId,
          isCompleted,
          isPartial: serverSurvey.isPartial
        })
        return
      }

      if (localFormData) {
        setExistingSurvey(localFormData)
        setIsViewMode(false)
        toast({
          title: "Progreso recuperado",
          description: "Hemos recuperado tu progreso anterior en la encuesta"
        })
        return
      }

      console.log('[LOAD] No hay datos guardados en localStorage para este niño')
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
    return (
      <div className="w-full px-4 sm:px-6 py-6 max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 text-center space-y-3">
          <h2 className="text-xl font-semibold mb-2">Selecciona un niño</h2>
          <p className="text-gray-500">
            Por favor, selecciona un niño en la parte superior para completar la encuesta de sueño.
          </p>
        </div>
      </div>
    )
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
    <div className="w-full px-4 sm:px-6 py-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/dashboard")}
          className="w-full sm:w-auto"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver al Dashboard
        </Button>
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2 text-center sm:text-left">
            <h1 className="text-2xl md:text-3xl font-bold text-[#2F2F2F] leading-tight">
              Cuestionario Inicial
            </h1>
            <p className="text-gray-600">
              Completa esta encuesta para recibir recomendaciones personalizadas
            </p>
          </div>
          
          {existingSurvey && isViewMode && (
            <div className="flex items-center justify-center sm:justify-end gap-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm font-medium">Encuesta completada</span>
            </div>
          )}
        </div>
      </div>

      {/* Modo Vista - Encuesta Completada */}
      {existingSurvey && isViewMode ? (
        <Card className="p-6 sm:p-8">
          <div className="text-center max-w-2xl mx-auto">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-4">
              Cuestionario completado
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
