"use client"

import React, { useMemo } from "react"
import {
  ResponsiveContainer,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Bar,
  ReferenceLine,
  Customized,
} from "recharts"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { es } from "date-fns/locale"

// Colores según el diseño de referencia
const NIGHT_COLOR = "#5B8DEF" // Azul para sueño nocturno
const NAP_COLOR = "#FF8A34" // Naranja para siestas
const WAKING_COLOR = "#E11D48" // Rojo para despertares

export interface DailyUserSleepData {
  label: string // "Dom", "Lun", etc.
  dateNumber: string // "15", "16", etc.
  isoDate: string // ISO date string
  displayDate: string // "Domingo 15 de julio"
  nightHours: number // Horas de sueño nocturno
  napHours: number // Horas de siestas
  totalHours: number // Total de horas
  wakingsCount: number // Número de despertares
  wakingPositions: number[] // Posiciones horarias de los despertares (relativas al inicio del sueño nocturno)
}

interface UserWeeklySleepChartProps {
  data: DailyUserSleepData[]
  className?: string
}

const formatHours = (hours: number) => {
  const totalMinutes = Math.round(hours * 60)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  if (m === 0) {
    return `${h}h`
  }
  return `${h}h ${m.toString().padStart(2, "0")}min`
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload || payload.length === 0) return null

  const dayData = payload[0]?.payload as DailyUserSleepData | undefined
  if (!dayData) return null

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 sm:px-4 sm:py-3 shadow-lg text-xs sm:text-sm min-w-[160px] sm:min-w-[180px]">
      <div className="font-semibold text-gray-900 mb-1.5 sm:mb-2 text-xs sm:text-sm">{dayData.displayDate}</div>
      <div className="space-y-1 sm:space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Total:</span>
          <span className="font-semibold text-blue-600">{formatHours(dayData.totalHours)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Noche:</span>
          <span className="font-medium" style={{ color: NIGHT_COLOR }}>
            {formatHours(dayData.nightHours)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Siestas:</span>
          <span className="font-medium" style={{ color: NAP_COLOR }}>
            {formatHours(dayData.napHours)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Despertares:</span>
          <span className="font-medium" style={{ color: WAKING_COLOR }}>
            {dayData.wakingsCount}
          </span>
        </div>
      </div>
    </div>
  )
}

// Componente personalizado para renderizar las líneas de despertares
// Las líneas se posicionan DENTRO de la barra azul del sueño nocturno
const RenderWakingLines = ({ formattedGraphicalItems, data, yAxisMap, xAxisMap }: any) => {
  if (!formattedGraphicalItems || formattedGraphicalItems.length === 0) {
    return null
  }
  if (!data || !yAxisMap || !xAxisMap) {
    return null
  }

  const yAxis = yAxisMap[0]
  const xAxis = xAxisMap[0]

  if (!yAxis || !xAxis) {
    return null
  }

  const lines: JSX.Element[] = []

  // Buscar el item que corresponde a la serie de sueño nocturno
  const nightBars =
    formattedGraphicalItems.find((item: any) => (item?.item?.props?.dataKey ?? item?.props?.dataKey) === 'nightHours')
    ?? formattedGraphicalItems[0]

  const barData = nightBars?.props?.data || nightBars?.item?.props?.data

  if (!nightBars || !barData) {
    return null
  }

  barData.forEach((dayPoint: any, index: number) => {
    const dayData = data[index] as DailyUserSleepData

    if (!dayData || !dayData.wakingPositions || dayData.wakingPositions.length === 0) return
    if (dayData.nightHours === 0) return // No hay sueño nocturno, no mostrar líneas

    // Obtener las coordenadas de la barra desde dayPoint
    if (!dayPoint || typeof dayPoint.x !== 'number' || typeof dayPoint.y !== 'number') {
      return
    }

    const barX = dayPoint.x + (dayPoint.width / 2) // Centro de la barra
    const barTop = dayPoint.y // Parte superior de la barra azul (apilada sobre naranja)
    const barHeight = dayPoint.height // Altura de la barra azul

    // Para cada despertar, dibujar una línea roja
    dayData.wakingPositions.forEach((wakingHoursFromStart, wakingIndex) => {
      // wakingHoursFromStart: horas desde el inicio del sueño nocturno (ej: 2.5 horas)
      // Necesitamos posicionar esto dentro de la barra azul

      if (wakingHoursFromStart < 0 || wakingHoursFromStart > dayData.nightHours) {
        return
      }

      // Calcular posición Y dentro de la barra azul
      // La barra crece de abajo hacia arriba, pero Y crece hacia abajo
      const positionRatio = wakingHoursFromStart / dayData.nightHours
      const yPosition = barTop + barHeight * (1 - positionRatio)

      lines.push(
        <line
          key={`waking-${dayData.isoDate}-${wakingIndex}`}
          x1={barX - 20}
          x2={barX + 20}
          y1={yPosition}
          y2={yPosition}
          stroke={WAKING_COLOR}
          strokeWidth={4}
          strokeLinecap="round"
          opacity={1}
        />
      )
    })
  })

  return <g>{lines}</g>
}

export function UserWeeklySleepChart({ data, className }: UserWeeklySleepChartProps) {
  const maxHours = useMemo(() => {
    const maxValue = Math.max(...data.map((point) => point.totalHours), 0)
    return Math.max(8, Math.ceil(maxValue + 1))
  }, [data])

  // Calcular promedios para mostrar arriba del gráfico utilizando solo días con datos
  const sleepDays = data.filter((day) => day.totalHours > 0)
  const nightDays = data.filter((day) => day.nightHours > 0)
  const napDays = data.filter((day) => day.napHours > 0)

  const averageTotal = sleepDays.length
    ? sleepDays.reduce((sum, d) => sum + d.totalHours, 0) / sleepDays.length
    : 0

  const averageNight = nightDays.length
    ? nightDays.reduce((sum, d) => sum + d.nightHours, 0) / nightDays.length
    : 0

  const averageNaps = napDays.length
    ? napDays.reduce((sum, d) => sum + d.napHours, 0) / napDays.length
    : 0

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/* Header con promedios - responsive para mobile y tablet */}
      <div className="flex flex-col gap-1.5 sm:gap-2">
        <div className="text-xs sm:text-sm text-gray-600">
          <span className="font-medium">Promedio diario: </span>
          <span className="text-base sm:text-lg font-semibold text-blue-600">
            {formatHours(averageTotal)}
          </span>
        </div>
        <div className="flex flex-wrap gap-3 sm:gap-4 md:gap-6 text-xs sm:text-sm">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded" style={{ backgroundColor: NAP_COLOR }} />
            <span className="text-gray-600">siestas: </span>
            <span className="font-medium">{formatHours(averageNaps)}</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded" style={{ backgroundColor: NIGHT_COLOR }} />
            <span className="text-gray-600">noche: </span>
            <span className="font-medium">{formatHours(averageNight)}</span>
          </div>
        </div>
      </div>

      {/* Título de la sección - responsive */}
      <div className="text-xs sm:text-sm font-medium text-gray-700">
        Horas de sueño (siestas + noche)
      </div>

      {/* Gráfico - responsive con altura ajustable para mobile portrait y landscape */}
      <div className="relative w-full h-[300px] sm:h-[350px] md:h-[400px] lg:h-[450px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{
              top: 15,
              right: window.innerWidth < 640 ? 5 : window.innerWidth < 768 ? 10 : 30,
              left: window.innerWidth < 640 ? 0 : window.innerWidth < 768 ? 5 : 20,
              bottom: window.innerWidth < 640 ? 50 : 60
            }}
            barCategoryGap={window.innerWidth < 640 ? "5%" : window.innerWidth < 768 ? "10%" : "20%"}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />

            {/* Eje X con días y fechas - responsive */}
            <XAxis
              dataKey="label"
              tick={({ x, y, payload }) => {
                const dayData = data.find((d) => d.label === payload.value)
                const isMobile = window.innerWidth < 640
                const isTablet = window.innerWidth < 768
                return (
                  <g transform={`translate(${x},${y})`}>
                    <text
                      x={0}
                      y={0}
                      dy={isMobile ? 12 : 16}
                      textAnchor="middle"
                      fill="#4B5563"
                      fontSize={isMobile ? 9 : isTablet ? 10 : 12}
                      fontWeight={500}
                    >
                      {payload.value}
                    </text>
                    <text
                      x={0}
                      y={isMobile ? 14 : 18}
                      dy={isMobile ? 12 : 16}
                      textAnchor="middle"
                      fill="#9CA3AF"
                      fontSize={isMobile ? 8 : isTablet ? 9 : 11}
                    >
                      {dayData?.dateNumber || ""}
                    </text>
                  </g>
                )
              }}
              height={window.innerWidth < 640 ? 50 : 60}
            />

            {/* Eje Y con horas - responsive */}
            <YAxis
              domain={[0, maxHours]}
              tick={{
                fontSize: window.innerWidth < 640 ? 9 : window.innerWidth < 768 ? 10 : 12,
                fill: "#6B7280"
              }}
              tickFormatter={(value) => `${value}h`}
              width={window.innerWidth < 640 ? 30 : window.innerWidth < 768 ? 35 : 50}
            />

            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(37, 99, 235, 0.05)" }} />

            {/* Leyenda - responsive */}
            <Legend
              verticalAlign="bottom"
              align="center"
              wrapperStyle={{
                fontSize: window.innerWidth < 640 ? 9 : window.innerWidth < 768 ? 10 : 12,
                paddingTop: window.innerWidth < 640 ? 10 : 20,
                paddingBottom: window.innerWidth < 640 ? 5 : 0
              }}
              iconSize={window.innerWidth < 640 ? 8 : 10}
              payload={[
                { value: "Siestas", type: "square", color: NAP_COLOR },
                { value: "Sueño nocturno", type: "square", color: NIGHT_COLOR },
                { value: "Despertares nocturnos", type: "line", color: WAKING_COLOR },
              ]}
            />

            {/* Barra de sueño nocturno (azul, base) */}
            <Bar
              dataKey="nightHours"
              stackId="sleep"
              fill={NIGHT_COLOR}
              radius={[0, 0, 6, 6]}
            />

            {/* Barra de siestas (naranja, parte superior) */}
            <Bar
              dataKey="napHours"
              stackId="sleep"
              fill={NAP_COLOR}
              radius={[6, 6, 0, 0]}
            />

            {/* Renderizar líneas de despertares dentro de la barra azul */}
            <Customized component={RenderWakingLines} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
