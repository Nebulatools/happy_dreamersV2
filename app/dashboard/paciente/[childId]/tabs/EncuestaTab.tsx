// Tab de encuesta - Visualizar respuestas de encuesta del nino

"use client"

import { useState, useEffect } from "react"
import { Loader2, ClipboardList } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { SurveyResponseViewer } from "@/components/survey/SurveyResponseViewer"
import { createLogger } from "@/lib/logger"

const logger = createLogger("EncuestaTab")

interface EncuestaTabProps {
  childId: string
  childName: string
}

export default function EncuestaTab({ childId, childName }: EncuestaTabProps) {
  const [surveyData, setSurveyData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchSurvey = async () => {
      if (!childId) return
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(`/api/children/${childId}/survey`)
        if (!response.ok) {
          if (response.status === 404) {
            setSurveyData(null)
            return
          }
          throw new Error("Error al cargar encuesta")
        }
        const data = await response.json()
        // La respuesta puede tener surveyData directo o en data.surveyData
        const survey = data.surveyData || data
        setSurveyData(survey)
      } catch (err) {
        logger.error("Error fetching survey:", err)
        setError("No se pudo cargar la encuesta")
      } finally {
        setLoading(false)
      }
    }

    fetchSurvey()
  }, [childId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Cargando encuesta...</span>
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-red-600">
          <p>{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (!surveyData || Object.keys(surveyData).length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No hay encuesta completada</h3>
          <p className="text-muted-foreground">
            Este nino aun no tiene una encuesta completada.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <SurveyResponseViewer
      surveyData={surveyData}
      childId={childId}
      childName={childName}
      readOnly={true}
    />
  )
}
