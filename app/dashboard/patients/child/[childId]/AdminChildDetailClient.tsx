// Componente cliente para la pagina de detalle de nino (admin)
// Maneja la interactividad de tabs y actualizaciones

"use client"

import { useState, useCallback, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, Clock, FileText, TrendingUp, Loader2, Moon, Sun, Utensils, Pill, Activity } from "lucide-react"
import { SurveyResponseViewer } from "@/components/survey/SurveyResponseViewer"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import type { SurveyData, Event } from "@/types/models"

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
  const [events, setEvents] = useState<Event[]>([])
  const [isLoadingEvents, setIsLoadingEvents] = useState(false)

  // Fetch eventos cuando el tab cambia a "eventos" (solo la primera vez)
  const [eventsFetched, setEventsFetched] = useState(false)

  useEffect(() => {
    const fetchEventsData = async () => {
      setIsLoadingEvents(true)
      try {
        const response = await fetch(`/api/children/events?childId=${childId}`)
        if (response.ok) {
          const data = await response.json()
          // Ordenar eventos de mas reciente a mas antiguo
          const sortedEvents = (data.events || []).sort((a: Event, b: Event) => {
            return new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
          })
          setEvents(sortedEvents)
        }
      } catch (error) {
        console.error("Error al obtener eventos:", error)
      } finally {
        setIsLoadingEvents(false)
      }
    }

    if (activeTab === "eventos" && !eventsFetched) {
      setEventsFetched(true)
      fetchEventsData()
    }
  }, [activeTab, eventsFetched, childId])

  // Helper para obtener icono segun tipo de evento
  const getEventIcon = (eventType: string) => {
    switch (eventType) {
    case "sleep":
      return <Moon className="h-4 w-4 text-indigo-500" />
    case "nap":
      return <Sun className="h-4 w-4 text-amber-500" />
    case "wake":
      return <Sun className="h-4 w-4 text-yellow-500" />
    case "night_waking":
      return <Moon className="h-4 w-4 text-purple-500" />
    case "feeding":
    case "night_feeding":
      return <Utensils className="h-4 w-4 text-green-500" />
    case "medication":
      return <Pill className="h-4 w-4 text-blue-500" />
    case "extra_activities":
      return <Activity className="h-4 w-4 text-orange-500" />
    default:
      return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  // Helper para nombre legible del tipo de evento
  const getEventTypeName = (eventType: string) => {
    const names: Record<string, string> = {
      sleep: "Sueno nocturno",
      nap: "Siesta",
      wake: "Despertar",
      night_waking: "Despertar nocturno",
      feeding: "Alimentacion",
      night_feeding: "Toma nocturna",
      medication: "Medicamento",
      extra_activities: "Actividad extra",
    }
    return names[eventType] || eventType
  }

  // Helper para formatear duracion
  const formatDuration = (minutes: number | undefined | null) => {
    if (!minutes) return null
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours === 0) return `${mins} min`
    if (mins === 0) return `${hours}h`
    return `${hours}h ${mins}min`
  }

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
        <TabsTrigger value="eventos" className="gap-2">
          <Clock className="h-4 w-4" />
          <span className="hidden sm:inline">Eventos</span>
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

      {/* Tab Eventos - Lista de eventos del nino */}
      <TabsContent value="eventos">
        <Card>
          <CardHeader>
            <CardTitle>Eventos Registrados</CardTitle>
            <CardDescription>
              Historial de sueno, alimentacion, medicamentos y actividades
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingEvents ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2 text-primary" />
                <span className="text-muted-foreground">Cargando eventos...</span>
              </div>
            ) : events.length === 0 ? (
              <div className="py-8 text-center">
                <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No hay eventos registrados</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {events.map((event) => (
                  <div
                    key={event._id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="mt-0.5">{getEventIcon(event.eventType)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{getEventTypeName(event.eventType)}</span>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(event.startTime), "dd MMM yyyy, HH:mm", { locale: es })}
                        </span>
                      </div>

                      {/* Duracion para eventos de sueno/siesta */}
                      {(event.eventType === "sleep" || event.eventType === "nap") && event.duration && (
                        <div className="text-sm text-muted-foreground mt-1">
                          Duracion: {formatDuration(event.duration)}
                        </div>
                      )}

                      {/* Tiempo para dormirse (sleepDelay) */}
                      {(event.eventType === "sleep" || event.eventType === "nap") &&
                        typeof event.sleepDelay === "number" && event.sleepDelay > 0 && (
                        <div className="text-sm text-indigo-600 dark:text-indigo-400 mt-1">
                          Tiempo para dormirse: {event.sleepDelay} minutos
                        </div>
                      )}

                      {/* Duracion despertar nocturno */}
                      {event.eventType === "night_waking" && event.duration && (
                        <div className="text-sm text-muted-foreground mt-1">
                          Duracion despierto: {formatDuration(event.duration)}
                        </div>
                      )}

                      {/* Detalles de medicamento */}
                      {event.eventType === "medication" && (
                        <div className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                          {event.medicationName && <span>{event.medicationName}</span>}
                          {event.medicationDose && <span> - {event.medicationDose}</span>}
                        </div>
                      )}

                      {/* Detalles de alimentacion */}
                      {(event.eventType === "feeding" || event.eventType === "night_feeding") && (
                        <div className="text-sm text-green-600 dark:text-green-400 mt-1">
                          {event.feedingType === "breast" && "Pecho"}
                          {event.feedingType === "bottle" && "Biberon"}
                          {event.feedingType === "solids" && "Solidos"}
                          {event.feedingDuration && ` - ${event.feedingDuration} min`}
                          {event.feedingAmount && ` - ${event.feedingAmount} ml/oz`}
                        </div>
                      )}

                      {/* Notas del evento */}
                      {event.notes && (
                        <div className="text-sm text-muted-foreground mt-1 italic">
                          &ldquo;{event.notes}&rdquo;
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
