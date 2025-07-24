"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { format, parseISO } from "date-fns"

// Definimos el tipo para los eventos diarios
interface DayEvents {
  date: string;
  sleep: number;
  nap: number;
  activity: number;
  play: number;
  meal: number;
  total: number;
  [key: string]: string | number; // Índice para permitir acceso dinámico a las propiedades
}

interface EventTrendChartProps {
  filteredEvents: any[];
}

export function EventTrendChart({ filteredEvents }: EventTrendChartProps) {
  // Preparar los datos para el gráfico
  const eventTrendData = (() => {
    // Agrupar eventos por día
    const eventsByDay = filteredEvents.reduce<Record<string, DayEvents>>((acc, event) => {
      const day = format(parseISO(event.startTime), "yyyy-MM-dd")
      
      if (!acc[day]) {
        acc[day] = {
          date: day,
          sleep: 0,
          nap: 0,
          activity: 0,
          play: 0,
          meal: 0,
          total: 0,
        }
      }
      
      // Solo actualizamos si event.eventType está definido
      if (event.eventType) {
        acc[day][event.eventType as keyof DayEvents] = (acc[day][event.eventType as keyof DayEvents] as number || 0) + 1
      }
      acc[day].total++
      
      return acc
    }, {})
    
    // Convertir a array y ordenar por fecha
    return Object.values(eventsByDay)
      .map(day => ({
        ...day,
        name: format(parseISO(day.date), "dd/MM"),
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  })()

  return (
    <Card className="col-span-1 lg:col-span-3">
      <CardHeader>
        <CardTitle>Tendencia de eventos registrados</CardTitle>
        <CardDescription>Evolución del registro de eventos en el tiempo</CardDescription>
      </CardHeader>
      <CardContent className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={eventTrendData}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="sleep" name="Sueño" stroke="#8884d8" activeDot={{ r: 8 }} />
            <Line type="monotone" dataKey="nap" name="Siesta" stroke="#82ca9d" />
            <Line type="monotone" dataKey="activity" name="Actividad" stroke="#ffc658" />
            <Line type="monotone" dataKey="play" name="Juego" stroke="#ff7300" />
            <Line type="monotone" dataKey="meal" name="Comida" stroke="#0088FE" />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
} 