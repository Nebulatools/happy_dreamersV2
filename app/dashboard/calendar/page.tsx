// Página de calendario
// Muestra los eventos registrados en un calendario

"use client"

import { useState } from "react"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { PlusCircle, ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"

// Datos de ejemplo para los eventos
const mockEvents = [
  {
    id: "1",
    childId: "1",
    childName: "Ana García",
    eventType: "sleep",
    eventTypeLabel: "Dormir",
    emotionalState: "calm",
    emotionalStateLabel: "Tranquilo",
    startTime: "2025-04-30T20:30:00",
    endTime: "2025-05-01T06:30:00",
    notes: "Se durmió rápidamente después de leer un cuento",
  },
  {
    id: "2",
    childId: "1",
    childName: "Ana García",
    eventType: "nap",
    eventTypeLabel: "Siesta",
    emotionalState: "tired",
    emotionalStateLabel: "Cansado",
    startTime: "2025-04-30T14:00:00",
    endTime: "2025-04-30T15:30:00",
    notes: "Siesta después del almuerzo",
  },
  {
    id: "3",
    childId: "1",
    childName: "Ana García",
    eventType: "activity",
    eventTypeLabel: "Actividad física",
    emotionalState: "happy",
    emotionalStateLabel: "Feliz",
    startTime: "2025-04-30T11:00:00",
    endTime: "2025-04-30T11:45:00",
    notes: "Juego en el parque",
  },
]

export default function CalendarPage() {
  const [date, setDate] = useState<Date>(new Date())
  const [view, setView] = useState<"day" | "week" | "month">("day")

  // Filtrar eventos para la fecha seleccionada
  const selectedDateStr = date.toISOString().split("T")[0]
  const eventsForSelectedDate = mockEvents.filter((event) => event.startTime.startsWith(selectedDateStr))

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendario</h1>
          <p className="text-muted-foreground">Visualiza y gestiona los eventos registrados</p>
        </div>
        <Link href="/dashboard/event">
          <Button className="gap-2">
            <PlusCircle className="h-4 w-4" />
            Registrar evento
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-[300px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Calendario</CardTitle>
            <CardDescription>Selecciona una fecha para ver los eventos</CardDescription>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={date}
              onSelect={(newDate) => newDate && setDate(newDate)}
              className="rounded-md border"
            />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center">
              <div className="flex-1">
                <CardTitle>
                  {date.toLocaleDateString("es-ES", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </CardTitle>
                <CardDescription>{eventsForSelectedDate.length} eventos registrados</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    const newDate = new Date(date)
                    newDate.setDate(newDate.getDate() - 1)
                    setDate(newDate)
                  }}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    const newDate = new Date(date)
                    newDate.setDate(newDate.getDate() + 1)
                    setDate(newDate)
                  }}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
          </Card>

          <Tabs
            defaultValue="day"
            className="space-y-4"
            onValueChange={(value) => setView(value as "day" | "week" | "month")}
          >
            <TabsList>
              <TabsTrigger value="day">Día</TabsTrigger>
              <TabsTrigger value="week">Semana</TabsTrigger>
              <TabsTrigger value="month">Mes</TabsTrigger>
            </TabsList>
            <TabsContent value="day" className="space-y-4">
              {eventsForSelectedDate.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-10">
                    <p className="text-muted-foreground mb-4">No hay eventos registrados para esta fecha</p>
                    <Link href="/dashboard/event">
                      <Button className="gap-2">
                        <PlusCircle className="h-4 w-4" />
                        Registrar evento
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {eventsForSelectedDate.map((event) => (
                    <Card key={event.id}>
                      <CardHeader className="pb-2">
                        <div className="flex justify-between">
                          <CardTitle className="text-lg">{event.eventTypeLabel}</CardTitle>
                          <span className="text-sm text-muted-foreground">
                            {new Date(event.startTime).toLocaleTimeString("es-ES", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                            {event.endTime &&
                              ` - ${new Date(event.endTime).toLocaleTimeString("es-ES", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}`}
                          </span>
                        </div>
                        <CardDescription>Estado emocional: {event.emotionalStateLabel}</CardDescription>
                      </CardHeader>
                      <CardContent>{event.notes && <p className="text-sm">{event.notes}</p>}</CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="week">
              <Card>
                <CardContent className="py-6">
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    Vista semanal (en desarrollo)
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="month">
              <Card>
                <CardContent className="py-6">
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    Vista mensual (en desarrollo)
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
