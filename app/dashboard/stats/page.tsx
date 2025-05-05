// Página de estadísticas
// Muestra gráficos y análisis de los patrones de sueño

"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function StatsPage() {
  const [period, setPeriod] = useState("week")

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Estadísticas</h1>
          <p className="text-muted-foreground">Análisis detallado de los patrones de sueño</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Seleccionar período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Última semana</SelectItem>
            <SelectItem value="month">Último mes</SelectItem>
            <SelectItem value="3months">Últimos 3 meses</SelectItem>
            <SelectItem value="year">Último año</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="sleep" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sleep">Sueño</TabsTrigger>
          <TabsTrigger value="activity">Actividad</TabsTrigger>
          <TabsTrigger value="mood">Estado de ánimo</TabsTrigger>
          <TabsTrigger value="progress">Progreso</TabsTrigger>
        </TabsList>

        <TabsContent value="sleep" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Promedio de horas de sueño</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">8.2h</div>
                <p className="text-xs text-muted-foreground">+0.3h comparado con el período anterior</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Despertares nocturnos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">1.8</div>
                <p className="text-xs text-muted-foreground">-0.5 comparado con el período anterior</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tiempo para dormir</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">15min</div>
                <p className="text-xs text-muted-foreground">-5min comparado con el período anterior</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Calidad del sueño</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">7.5/10</div>
                <p className="text-xs text-muted-foreground">+0.8 comparado con el período anterior</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Horas de sueño por día</CardTitle>
                <CardDescription>Distribución de las horas de sueño durante el período seleccionado</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px] flex items-center justify-center bg-muted/40 rounded-md">
                Gráfico de horas de sueño
              </CardContent>
            </Card>
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Despertares nocturnos</CardTitle>
                <CardDescription>Frecuencia de despertares durante la noche</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px] flex items-center justify-center bg-muted/40 rounded-md">
                Gráfico de despertares nocturnos
              </CardContent>
            </Card>
            <Card className="col-span-2">
              <CardHeader>
                <CardTitle>Patrones de sueño</CardTitle>
                <CardDescription>Análisis de los ciclos de sueño y períodos de vigilia</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px] flex items-center justify-center bg-muted/40 rounded-md">
                Gráfico de patrones de sueño
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Actividad física</CardTitle>
              <CardDescription>Tiempo dedicado a diferentes tipos de actividades</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px] flex items-center justify-center bg-muted/40 rounded-md">
              Gráfico de actividad física
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mood" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Estado de ánimo</CardTitle>
              <CardDescription>Distribución de los estados emocionales registrados</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px] flex items-center justify-center bg-muted/40 rounded-md">
              Gráfico de estado de ánimo
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="progress" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Progreso</CardTitle>
              <CardDescription>Evolución de los indicadores clave a lo largo del tiempo</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px] flex items-center justify-center bg-muted/40 rounded-md">
              Gráfico de progreso
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
