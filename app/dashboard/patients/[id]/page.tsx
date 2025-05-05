// Página de detalle de paciente
// Muestra información detallada de un paciente específico

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Calendar, BarChart3, FileText, MessageSquare } from "lucide-react"

// Datos de ejemplo para el paciente
const mockPatient = {
  id: "1",
  name: "Ana García",
  lastName: "García",
  birthDate: "2022-01-15",
  parentName: "María García",
  parentEmail: "maria@example.com",
  parentPhone: "123-456-7890",
  lastVisit: "2025-04-25",
  status: "Activo",
}

export default function PatientDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("overview")

  // En una aplicación real, aquí cargaríamos los datos del paciente desde la API
  // usando el ID proporcionado en params.id

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Volver</span>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {mockPatient.name} {mockPatient.lastName}
            </h1>
            <p className="text-muted-foreground">
              Paciente desde {new Date(mockPatient.birthDate).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Enviar mensaje
          </Button>
          <Button className="gap-2">
            <Calendar className="h-4 w-4" />
            Programar consulta
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="sleep">Sueño</TabsTrigger>
          <TabsTrigger value="survey">Encuesta</TabsTrigger>
          <TabsTrigger value="events">Eventos</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Información del paciente</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-2">
                  <div className="flex justify-between">
                    <dt className="font-medium">Nombre completo:</dt>
                    <dd>
                      {mockPatient.name} {mockPatient.lastName}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium">Fecha de nacimiento:</dt>
                    <dd>{new Date(mockPatient.birthDate).toLocaleDateString()}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium">Edad:</dt>
                    <dd>3 años</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium">Estado:</dt>
                    <dd>{mockPatient.status}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Información del padre/madre</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-2">
                  <div className="flex justify-between">
                    <dt className="font-medium">Nombre:</dt>
                    <dd>{mockPatient.parentName}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium">Email:</dt>
                    <dd>{mockPatient.parentEmail}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium">Teléfono:</dt>
                    <dd>{mockPatient.parentPhone}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resumen de sueño</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-2">
                  <div className="flex justify-between">
                    <dt className="font-medium">Promedio de horas:</dt>
                    <dd>8.5h</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium">Despertares nocturnos:</dt>
                    <dd>2 por noche</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium">Calidad del sueño:</dt>
                    <dd>7/10</dd>
                  </div>
                  <div className="mt-4">
                    <Button variant="outline" size="sm" className="w-full gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Ver estadísticas completas
                    </Button>
                  </div>
                </dl>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Eventos recientes</CardTitle>
              <CardDescription>Últimos eventos registrados para este paciente</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="rounded-full p-1 bg-primary/10">
                    <Calendar className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">Hora de dormir</p>
                    <p className="text-xs text-muted-foreground">30 de abril, 8:30 PM</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="rounded-full p-1 bg-primary/10">
                    <Calendar className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">Siesta</p>
                    <p className="text-xs text-muted-foreground">30 de abril, 2:00 PM - 3:30 PM</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="rounded-full p-1 bg-primary/10">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">Actualización de encuesta</p>
                    <p className="text-xs text-muted-foreground">28 de abril, 10:15 AM</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sleep">
          <Card>
            <CardHeader>
              <CardTitle>Patrones de sueño</CardTitle>
              <CardDescription>Análisis detallado de los patrones de sueño</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px] flex items-center justify-center bg-muted/40 rounded-md">
              Gráficos y análisis de sueño
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="survey">
          <Card>
            <CardHeader>
              <CardTitle>Respuestas de la encuesta</CardTitle>
              <CardDescription>Información recopilada en la encuesta inicial</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px] overflow-y-auto">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">Información de los Padres</h3>
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2 border-b pb-2">
                      <span className="font-medium">Nombre de la madre:</span>
                      <span>María García</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 border-b pb-2">
                      <span className="font-medium">Edad de la madre:</span>
                      <span>35 años</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 border-b pb-2">
                      <span className="font-medium">Nombre del padre:</span>
                      <span>Juan García</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 border-b pb-2">
                      <span className="font-medium">Edad del padre:</span>
                      <span>37 años</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-2">Historia del Niño</h3>
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2 border-b pb-2">
                      <span className="font-medium">Fecha de nacimiento:</span>
                      <span>15 de enero de 2022</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 border-b pb-2">
                      <span className="font-medium">Peso al nacer:</span>
                      <span>3.2 kg</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 border-b pb-2">
                      <span className="font-medium">Nacimiento a término:</span>
                      <span>Sí</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-2">Rutinas de Sueño</h3>
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2 border-b pb-2">
                      <span className="font-medium">Hora de acostarse:</span>
                      <span>8:30 PM</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 border-b pb-2">
                      <span className="font-medium">Despertares nocturnos:</span>
                      <span>Sí</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 border-b pb-2">
                      <span className="font-medium">Se calma solo:</span>
                      <span>No</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 border-b pb-2">
                      <span className="font-medium">Ubicación para dormir:</span>
                      <span>Cuna en su cuarto</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events">
          <Card>
            <CardHeader>
              <CardTitle>Registro de eventos</CardTitle>
              <CardDescription>Historial completo de eventos registrados</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px] flex items-center justify-center bg-muted/40 rounded-md">
              Tabla de eventos registrados
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
