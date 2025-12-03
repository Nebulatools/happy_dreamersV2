// Componente cliente para la pagina de detalle de nino (admin)
// Maneja la interactividad de tabs y actualizaciones

"use client"

import { useState, useCallback } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, Clock, FileText, TrendingUp, Loader2 } from "lucide-react"
import { SurveyResponseViewer } from "@/components/survey/SurveyResponseViewer"
import type { SurveyData } from "@/types/models"

interface AdminChildDetailClientProps {
  childId: string
  childName: string
  surveyData: SurveyData | null
}

export function AdminChildDetailClient({
  childId,
  childName,
  surveyData: initialSurveyData,
}: AdminChildDetailClientProps) {
  const [surveyData, setSurveyData] = useState<SurveyData | null>(initialSurveyData)
  const [activeTab, setActiveTab] = useState("encuesta")
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Callback para refrescar datos despues de editar
  const handleSurveyUpdate = useCallback(async () => {
    setIsRefreshing(true)
    try {
      // Fetch los datos actualizados de la encuesta
      const response = await fetch(`/api/children/${childId}/survey`)
      if (response.ok) {
        const data = await response.json()
        setSurveyData(data.surveyData)
      }
    } catch (error) {
      console.error("Error al refrescar datos de encuesta:", error)
    } finally {
      setIsRefreshing(false)
    }
  }, [childId])

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="grid w-full grid-cols-3 mb-6">
        <TabsTrigger value="resumen" className="gap-2">
          <TrendingUp className="h-4 w-4" />
          <span className="hidden sm:inline">Resumen</span>
        </TabsTrigger>
        <TabsTrigger value="encuesta" className="gap-2">
          <FileText className="h-4 w-4" />
          <span className="hidden sm:inline">Encuesta</span>
        </TabsTrigger>
        <TabsTrigger value="eventos" className="gap-2" disabled>
          <Clock className="h-4 w-4" />
          <span className="hidden sm:inline">Eventos</span>
          <Badge variant="outline" className="ml-1 text-xs">
            Pronto
          </Badge>
        </TabsTrigger>
      </TabsList>

      {/* Tab Resumen */}
      <TabsContent value="resumen">
        <Card>
          <CardHeader>
            <CardTitle>Resumen del Paciente</CardTitle>
            <CardDescription>
              Vista general de la informacion y estado del paciente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Estado de la encuesta */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">Estado de la Encuesta</h4>
                {surveyData?.completed ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <span>Encuesta completada</span>
                    {surveyData.lastUpdated && (
                      <span className="text-muted-foreground text-sm">
                        - Ultima actualizacion:{" "}
                        {new Date(surveyData.lastUpdated).toLocaleDateString("es-MX")}
                      </span>
                    )}
                  </div>
                ) : surveyData ? (
                  <div className="flex items-center gap-2 text-amber-600">
                    <div className="h-2 w-2 rounded-full bg-amber-500" />
                    <span>Encuesta en progreso</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="h-2 w-2 rounded-full bg-gray-400" />
                    <span>Sin encuesta registrada</span>
                  </div>
                )}
              </div>

              {/* Informacion del cuidador principal */}
              {surveyData?.informacionFamiliar?.primaryCaregiver && (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-2">Cuidador Principal</h4>
                  <p className="text-muted-foreground">
                    {surveyData.informacionFamiliar.primaryCaregiver === "mother"
                      ? "Mama"
                      : surveyData.informacionFamiliar.primaryCaregiver === "father"
                        ? "Papa"
                        : "Cuidador"}
                  </p>
                </div>
              )}

              {/* Placeholder para metricas futuras */}
              <div className="p-4 border border-dashed rounded-lg text-center text-muted-foreground">
                <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Estadisticas y metricas de sueno</p>
                <p className="text-sm">Proximamente</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Tab Encuesta */}
      <TabsContent value="encuesta">
        {isRefreshing && (
          <div className="flex items-center justify-center py-4 mb-4 bg-muted/50 rounded-lg">
            <Loader2 className="h-5 w-5 animate-spin mr-2 text-primary" />
            <span className="text-sm text-muted-foreground">Actualizando datos...</span>
          </div>
        )}
        {surveyData ? (
          <SurveyResponseViewer
            surveyData={surveyData}
            childId={childId}
            childName={childName}
            onUpdate={handleSurveyUpdate}
            readOnly={false}
          />
        ) : (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Sin datos de encuesta</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Este nino aun no tiene datos de encuesta registrados.
                El padre/madre debe completar la encuesta inicial desde su cuenta.
              </p>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      {/* Tab Eventos - Placeholder */}
      <TabsContent value="eventos">
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">Eventos de Sueno</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              La visualizacion de eventos de sueno estara disponible proximamente.
            </p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
