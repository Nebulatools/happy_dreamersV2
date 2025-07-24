"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"
import { BarChart as BarChartIcon } from "lucide-react"

import { createLogger } from "@/lib/logger"

const logger = createLogger("CustomSleepChart")


// Definición de la estructura de un evento individual procesado para el gráfico
interface ProcessedEvent {
  eventId: string;
  name: string;
  startHour: number; // Hora de inicio en el eje de 24h (6AM = 0)
  duration: number;  // Duración en horas
  color: string;
  type: string;
  notes: string;
  emotionalState: string;
}

// Contenedor para los eventos de un día específico
interface DayData {
  date: string;
  events: ProcessedEvent[];
}

interface CustomSleepChartProps {
  // Los datos que vienen de la API pueden tener cualquier formato
  data: any[];
}

export function CustomSleepChart({ data }: CustomSleepChartProps) {

  // 1. Lógica Central: Preparar los datos para la línea de tiempo
  const prepareTimelineData = () => {
    if (!data || data.length === 0) return []

    const eventsByDay: Record<string, DayData> = {}

    // Función auxiliar para formatear un objeto Date a "DD/MM/YYYY"
    const formatDate = (date: Date) => {
      // Verificar que la fecha sea válida antes de formatear
      if (isNaN(date.getTime())) {
        logger.error("Fecha inválida:", date)
        return "Fecha inválida"
      }
      return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date)
    }

    // a) Procesar y distribuir cada evento en los días correspondientes
    data.forEach((event: any) => {
      // Validar que el evento tenga los datos mínimos necesarios
      if (!event.date || event.startHour === undefined || event.duration === undefined) {
        return
      }

      // Parsear la fecha de manera más robusta - soporta DD/MM y DD/MM/YYYY
      const dateParts = String(event.date).split("/")
      if (dateParts.length < 2 || dateParts.length > 3) {
        logger.error("Formato de fecha inválido:", event.date)
        return
      }
      
      const day = parseInt(dateParts[0], 10)
      const month = parseInt(dateParts[1], 10)
      // Si no hay año, usar el año actual
      const year = dateParts.length === 3 ? parseInt(dateParts[2], 10) : new Date().getFullYear()
      
      // Verificar que los valores sean números válidos
      if (isNaN(day) || isNaN(month) || isNaN(year)) {
        logger.error("Valores de fecha inválidos:", { day, month, year, originalDate: event.date })
        return
      }
      
      const eventDate = new Date(year, month - 1, day)

      // Convertir la hora del evento a nuestro eje de 24h (donde 6AM es 0)
      let adjustedStartHour = event.startHour - 6
      if (adjustedStartHour < 0) {
        adjustedStartHour += 24
      }

      const durationInHours = event.duration / 60
      const eventEndHour = adjustedStartHour + durationInHours

      const eventPayload: Omit<ProcessedEvent, "startHour" | "duration"> = {
        eventId: event.eventId,
        name: event.name,
        color: event.color,
        type: event.type,
        notes: event.notes,
        emotionalState: event.emotionalState,
      }
      
      // b) Dividir el evento si cruza las 6 AM del día siguiente
      if (eventEndHour > 24) {
        const durationInFirstDay = 24 - adjustedStartHour
        if (durationInFirstDay > 0.01) { // Evitar segmentos muy pequeños
          const dateStr1 = formatDate(eventDate)
          if (!eventsByDay[dateStr1]) eventsByDay[dateStr1] = { date: dateStr1, events: [] }
          eventsByDay[dateStr1].events.push({ ...eventPayload, startHour: adjustedStartHour, duration: durationInFirstDay })
        }

        const remainingDuration = eventEndHour - 24
        if (remainingDuration > 0.01) {
          const nextDay = new Date(eventDate)
          nextDay.setDate(nextDay.getDate() + 1)
          const dateStr2 = formatDate(nextDay)
          if (!eventsByDay[dateStr2]) eventsByDay[dateStr2] = { date: dateStr2, events: [] }
          eventsByDay[dateStr2].events.push({ ...eventPayload, startHour: 0, duration: remainingDuration })
        }
      } else {
        // El evento completo cabe en un solo día
        const dateStr = formatDate(eventDate)
        if (!eventsByDay[dateStr]) {
          eventsByDay[dateStr] = { date: dateStr, events: [] }
        }
        eventsByDay[dateStr].events.push({ ...eventPayload, startHour: adjustedStartHour, duration: durationInHours })
      }
    })

    // c) Para cada día, crear los "segmentos" (eventos y espacios vacíos)
    const timelineData = Object.values(eventsByDay).map((dayData: DayData) => {
      const chartData: any = { date: dayData.date }
      const segments: { duration: number; info: Partial<ProcessedEvent> & { type: string } }[] = []
      let lastEnd = 0

      const sortedEvents = dayData.events.sort((a, b) => a.startHour - b.startHour)

      sortedEvents.forEach((event: ProcessedEvent) => {
        // Añadir un segmento de espacio libre si hay un hueco
        if (event.startHour > lastEnd) {
          segments.push({
            duration: event.startHour - lastEnd,
            info: { type: "free" },
          })
        }
        // Añadir el segmento del evento
        segments.push({
          duration: event.duration,
          info: { ...event, type: event.type || "event" },
        })
        lastEnd = event.startHour + event.duration
      })

      // Añadir el último segmento de espacio libre hasta completar las 24h
      if (lastEnd < 24) {
        segments.push({
          duration: 24 - lastEnd,
          info: { type: "free" },
        })
      }
      
      // Convertir los segmentos al formato que Recharts necesita
      segments.forEach((seg, index) => {
        chartData[`segment_${index}`] = seg.duration
        chartData[`segment_${index}_info`] = seg.info
      })

      return chartData
    })

    // d) Ordenar los días cronológicamente
    return timelineData.sort((a, b) => {
      const dateA = a.date.split("/").reverse().join("-")
      const dateB = b.date.split("/").reverse().join("-")
      return new Date(dateA).getTime() - new Date(dateB).getTime()
    })
  }

  const finalTimelineData = prepareTimelineData()

  // Obtener todas las claves de segmentos (ej: 'segment_0', 'segment_1', etc.)
  const segmentKeys: string[] = Array.from(
    finalTimelineData.reduce((keys, dayData) => {
      Object.keys(dayData).forEach(key => {
        if (key.startsWith("segment_") && !key.endsWith("_info")) {
          keys.add(key)
        }
      })
      return keys
    }, new Set<string>())
  )

  // 2. Tooltip Personalizado: Mostrar info al pasar el ratón
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length > 0) {
      // Obtener todos los eventos del día desde el payload completo
      const dayPayload = payload[0].payload
      const allEvents: any[] = []
      
      // Recopilar todos los eventos del día
      Object.keys(dayPayload).forEach(key => {
        if (key.endsWith("_info")) {
          const eventInfo = dayPayload[key]
          if (eventInfo && eventInfo.type !== "free") {
            allEvents.push(eventInfo)
          }
        }
      })

      // Si no hay eventos, mostrar mensaje informativo
      if (allEvents.length === 0) {
        return (
          <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg">
            <p className="font-semibold text-gray-800 mb-2">Día: {label}</p>
            <p className="text-sm text-gray-500">Sin eventos registrados</p>
          </div>
        )
      }

      // Ordenar eventos por hora de inicio
      allEvents.sort((a, b) => a.startHour - b.startHour)

      return (
        <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg max-w-xs">
          <p className="font-semibold text-gray-800 mb-2">Día: {label}</p>
          <div className="space-y-2">
            {allEvents.map((eventInfo, index) => {
              const hours = Math.floor(eventInfo.duration)
              const minutes = Math.round((eventInfo.duration % 1) * 60)
              const durationText = hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`
              
              const realStartHour = (eventInfo.startHour + 6)
              const startH = Math.floor(realStartHour) % 24
              const startM = Math.round((realStartHour % 1) * 60)
              const startTime = `${String(startH).padStart(2, "0")}:${String(startM).padStart(2, "0")}`

              return (
                <div key={index} className="border-l-2 pl-2" style={{ borderColor: eventInfo.color }}>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: eventInfo.color }}></div>
                    <span className="text-sm font-medium">{eventInfo.name}</span>
                  </div>
                  <p className="text-xs text-gray-600 ml-5">
                    {startTime} • {durationText}
                  </p>
                  {eventInfo.notes && (
                    <p className="text-xs text-gray-500 ml-5">📝 {eventInfo.notes}</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )
    }
    return null
  }

  // Función para formatear las etiquetas del eje Y (las horas)
  const formatYAxis = (value: number) => {
    const hour = (Math.floor(value) + 6) % 24
    return `${hour.toString().padStart(2, "0")}:00`
  }

  // 3. Renderizado del Componente
  return (
    <Card className="col-span-1 lg:col-span-2 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChartIcon className="text-indigo-600" />
          Línea de Tiempo Diaria
        </CardTitle>
        <CardDescription>
          Visualización de eventos en su hora exacta (eje de 6AM a 6AM).
        </CardDescription>
      </CardHeader>
      <CardContent className="h-[500px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={finalTimelineData}
            margin={{ top: 20, right: 30, left: 40, bottom: 20 }}
            barCategoryGap="20%" // Espacio entre las barras de cada día
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis 
              dataKey="date"
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              type="number"
              domain={[0, 24]}
              tickFormatter={formatYAxis}
              tick={{ fontSize: 12 }}
              label={{ value: "Hora del día", angle: -90, position: "insideLeft", offset: -25 }}
              ticks={[0, 3, 6, 9, 12, 15, 18, 21, 24]}
            />
            <Tooltip 
              content={<CustomTooltip />} 
              cursor={{ fill: "rgba(230, 230, 250, 0.5)" }}
              allowEscapeViewBox={{ x: false, y: false }}
              position={{ x: undefined, y: undefined }}
            />
            
            {/* La clave: Renderizar cada segmento con su propio color */}
            {segmentKeys.map((segKey) => (
              <Bar
                key={segKey}
                dataKey={segKey}
                stackId="timeline"
                name=""
                isAnimationActive={false} // Desactivar animación para evitar bugs con <Cell>
              >
                {finalTimelineData.map((dayData, index) => {
                  const segInfo = dayData[`${segKey}_info`]
                  const color = segInfo && segInfo.type !== "free"
                    ? segInfo.color || "#8884d8" // Color por defecto si no viene
                    : "transparent"
                  return <Cell key={`cell-${index}-${segKey}`} fill={color} />
                })}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
        
        {/* Leyenda personalizada */}
        <div className="flex flex-wrap gap-4 mt-4 justify-center">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-900"></div>
            <span className="text-xs">🌙 Sueño nocturno</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-xs">😴 Siestas</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span className="text-xs">🍽️ Comidas</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-xs">⚽ Actividad</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-500"></div>
            <span className="text-xs">🎮 Juego</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 