"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface ProgressSummaryCardProps {
  filteredEvents: any[];
}

export function ProgressSummaryCard({ filteredEvents }: ProgressSummaryCardProps) {
  // Calcular progreso del sueño basado en eventos reales
  function calculateSleepProgress(events: any[]): number {
    const sleepEvents = events.filter(e => e.eventType === "sleep" || e.eventType === "nap")
    if (sleepEvents.length === 0) return 50
    
    // Calcular progreso basado en consistencia y duración
    let progressScore = 60 // Base
    
    // Agregar puntos por consistencia (eventos regulares)
    const daysWithSleep = new Set(sleepEvents.map(e => 
      new Date(e.startTime).toDateString()
    )).size
    
    if (daysWithSleep >= 7) progressScore += 20
    else if (daysWithSleep >= 5) progressScore += 15
    else if (daysWithSleep >= 3) progressScore += 10
    
    // Agregar puntos por duración adecuada
    const avgDuration = sleepEvents.reduce((sum, event) => {
      if (event.endTime) {
        const duration = (new Date(event.endTime).getTime() - new Date(event.startTime).getTime()) / (1000 * 60 * 60)
        return sum + duration
      }
      return sum
    }, 0) / sleepEvents.length
    
    if (avgDuration >= 9 && avgDuration <= 12) progressScore += 20
    else if (avgDuration >= 8 && avgDuration <= 13) progressScore += 10
    
    return Math.min(100, progressScore)
  }
  
  // Calcular progreso de actividad física basado en eventos reales
  function calculateActivityProgress(events: any[]): number {
    const activityEvents = events.filter(e => e.eventType === "activity")
    if (activityEvents.length === 0) return 50
    
    // Calcular progreso basado en frecuencia
    let progressScore = 55 // Base
    
    // Agregar puntos por frecuencia de actividades
    const daysWithActivity = new Set(activityEvents.map(e => 
      new Date(e.startTime).toDateString()
    )).size
    
    if (daysWithActivity >= 7) progressScore += 30
    else if (daysWithActivity >= 5) progressScore += 25
    else if (daysWithActivity >= 3) progressScore += 15
    else if (daysWithActivity >= 1) progressScore += 10
    
    // Agregar puntos por variedad de actividades
    const uniqueNotes = new Set(activityEvents.map(e => e.notes?.toLowerCase()).filter(Boolean))
    if (uniqueNotes.size >= 3) progressScore += 15
    else if (uniqueNotes.size >= 2) progressScore += 10
    
    return Math.min(100, progressScore)
  }

  return (
    <Card className="col-span-1 lg:col-span-3">
      <CardHeader>
        <CardTitle>Resumen de Progreso</CardTitle>
        <CardDescription>Vista general del desarrollo en todas las áreas</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">Sueño:</h3>
            <div className="bg-muted h-2 rounded-full mb-1">
              <div
                className="bg-primary h-full rounded-full"
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(
                      0,
                      calculateSleepProgress(filteredEvents)
                    )
                  )}%`,
                }}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {filteredEvents.filter(e => e.eventType === "sleep" || e.eventType === "nap").length > 0
                ? "Buena consistencia en patrones de sueño."
                : "No hay suficientes datos para evaluar."}
            </p>
          </div>
          
          <div>
            <h3 className="font-medium mb-2">Actividad Física:</h3>
            <div className="bg-muted h-2 rounded-full mb-1">
              <div
                className="bg-primary h-full rounded-full"
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(
                      0,
                      calculateActivityProgress(filteredEvents)
                    )
                  )}%`,
                }}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {filteredEvents.filter(e => e.eventType === "activity").length > 5
                ? "Buen nivel de actividad física."
                : filteredEvents.filter(e => e.eventType === "activity").length > 0
                  ? "Nivel moderado de actividad física."
                  : "No hay suficientes datos para evaluar."}
            </p>
          </div>
          
          <div>
            <h3 className="font-medium mb-2">Estado Emocional:</h3>
            <div className="bg-muted h-2 rounded-full mb-1">
              <div
                className="bg-primary h-full rounded-full"
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(
                      0,
                      filteredEvents.length > 0
                        ? (filteredEvents.filter(e => ["happy", "calm", "excited"].includes(e.emotionalState)).length / 
                           filteredEvents.length) * 100
                        : 50
                    )
                  )}%`,
                }}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {filteredEvents.length > 0
                ? filteredEvents.filter(e => ["happy", "calm", "excited"].includes(e.emotionalState)).length > 
                  filteredEvents.filter(e => ["tired", "irritable", "sad", "anxious"].includes(e.emotionalState)).length
                  ? "Predominan los estados emocionales positivos."
                  : "Predominan los estados emocionales negativos."
                : "No hay suficientes datos para evaluar."}
            </p>
          </div>
          
          <div>
            <h3 className="font-medium mb-2">Balance de Actividades:</h3>
            <div className="bg-muted h-2 rounded-full mb-1">
              <div
                className="bg-primary h-full rounded-full"
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(
                      0,
                      filteredEvents.length > 10
                        ? 80
                        : filteredEvents.length > 5
                          ? 65
                          : filteredEvents.length > 0
                            ? 50
                            : 0
                    )
                  )}%`,
                }}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {filteredEvents.length > 10
                ? "Buena diversidad de actividades registradas."
                : filteredEvents.length > 5
                  ? "Variedad moderada de actividades registradas."
                  : filteredEvents.length > 0
                    ? "Pocas actividades registradas."
                    : "No hay suficientes datos para evaluar."}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 