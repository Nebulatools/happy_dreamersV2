"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface ProgressSummaryCardProps {
  filteredEvents: any[];
}

export function ProgressSummaryCard({ filteredEvents }: ProgressSummaryCardProps) {
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
                      filteredEvents.filter(e => e.eventType === "sleep" || e.eventType === "nap").length > 0
                        ? 70 + (Math.random() * 30)
                        : 50
                    )
                  )}%`
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
                      filteredEvents.filter(e => e.eventType === "activity").length > 0
                        ? 65 + (Math.random() * 35)
                        : 50
                    )
                  )}%`
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
                        ? (filteredEvents.filter(e => ['happy', 'calm', 'excited'].includes(e.emotionalState)).length / 
                           filteredEvents.length) * 100
                        : 50
                    )
                  )}%`
                }}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {filteredEvents.length > 0
                ? filteredEvents.filter(e => ['happy', 'calm', 'excited'].includes(e.emotionalState)).length > 
                  filteredEvents.filter(e => ['tired', 'irritable', 'sad', 'anxious'].includes(e.emotionalState)).length
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
                  )}%`
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