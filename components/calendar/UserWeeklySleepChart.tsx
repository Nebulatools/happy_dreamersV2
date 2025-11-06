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
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-lg text-sm min-w-[180px]">
      <div className="font-semibold text-gray-900 mb-2">{dayData.displayDate}</div>
      <div className="space-y-1.5">
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
  if (!formattedGraphicalItems || formattedGraphicalItems.length === 0) return null
  if (!data || !yAxisMap || !xAxisMap) return null

  const yAxis = yAxisMap[0]
  const xAxis = xAxisMap[0]

  if (!yAxis || !xAxis) return null

  const lines: JSX.Element[] = []

  // Encontrar el item que corresponde a la barra de sueño nocturno (nightHours)
  const nightBars = formattedGraphicalItems.find((item: any) => item.props?.dataKey === 'nightHours')

  if (!nightBars || !nightBars.props?.data) return null

  nightBars.props.data.forEach((barData: any, index: number) => {
    const dayData = data[index] as DailyUserSleepData

    if (!dayData || !dayData.wakingPositions || dayData.wakingPositions.length === 0) return
    if (dayData.nightHours === 0) return // No hay sueño nocturno, no mostrar líneas

    // Obtener las coordenadas de la barra
    const barItem = barData
    if (!barItem || typeof barItem.x !== 'number' || typeof barItem.y !== 'number') return

    const barX = barItem.x + (barItem.width / 2) // Centro de la barra
    const barTop = barItem.y // Parte superior de la barra azul
    const barHeight = barItem.height // Altura de la barra azul

    // Para cada despertar, dibujar una línea roja
    dayData.wakingPositions.forEach((wakingPosition, wakingIndex) => {
      // wakingPosition está en horas relativas al inicio del sueño nocturno (0 a nightHours)
      // Convertir a posición Y dentro de la barra azul
      const positionRatio = dayData.nightHours > 0 ? wakingPosition / dayData.nightHours : 0
      const yPosition = barTop + barHeight * (1 - positionRatio) // Invertir porque Y crece hacia abajo

      lines.push(
        <line
          key={`waking-${dayData.isoDate}-${wakingIndex}`}
          x1={barX - 15}
          x2={barX + 15}
          y1={yPosition}
          y2={yPosition}
          stroke={WAKING_COLOR}
          strokeWidth={3}
          strokeLinecap="round"
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

  // Calcular promedios para mostrar arriba del gráfico
  const averageTotal = data.reduce((sum, d) => sum + d.totalHours, 0) / (data.length || 1)
  const averageNight = data.reduce((sum, d) => sum + d.nightHours, 0) / (data.length || 1)
  const averageNaps = data.reduce((sum, d) => sum + d.napHours, 0) / (data.length || 1)

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/* Header con promedios - responsive */}
      <div className="flex flex-col gap-2">
        <div className="text-sm text-gray-600">
          <span className="font-medium">Promedio diario: </span>
          <span className="text-lg font-semibold text-blue-600">
            {formatHours(averageTotal)}
          </span>
        </div>
        <div className="flex flex-wrap gap-4 md:gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: NAP_COLOR }} />
            <span className="text-gray-600">siestas: </span>
            <span className="font-medium">{formatHours(averageNaps)}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: NIGHT_COLOR }} />
            <span className="text-gray-600">noche: </span>
            <span className="font-medium">{formatHours(averageNight)}</span>
          </div>
        </div>
      </div>

      {/* Título de la sección */}
      <div className="text-sm font-medium text-gray-700">
        Horas de sueño (siestas + noche)
      </div>

      {/* Gráfico - responsive con altura ajustable */}
      <div className="relative w-full h-[350px] md:h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{
              top: 20,
              right: window.innerWidth < 768 ? 10 : 30,
              left: window.innerWidth < 768 ? 5 : 20,
              bottom: 60
            }}
            barCategoryGap={window.innerWidth < 768 ? "10%" : "20%"}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />

            {/* Eje X con días y fechas - responsive */}
            <XAxis
              dataKey="label"
              tick={({ x, y, payload }) => {
                const dayData = data.find((d) => d.label === payload.value)
                return (
                  <g transform={`translate(${x},${y})`}>
                    <text
                      x={0}
                      y={0}
                      dy={16}
                      textAnchor="middle"
                      fill="#4B5563"
                      fontSize={window.innerWidth < 768 ? 10 : 12}
                      fontWeight={500}
                    >
                      {payload.value}
                    </text>
                    <text
                      x={0}
                      y={18}
                      dy={16}
                      textAnchor="middle"
                      fill="#9CA3AF"
                      fontSize={window.innerWidth < 768 ? 9 : 11}
                    >
                      {dayData?.dateNumber || ""}
                    </text>
                  </g>
                )
              }}
              height={60}
            />

            {/* Eje Y con horas - responsive */}
            <YAxis
              domain={[0, maxHours]}
              tick={{ fontSize: window.innerWidth < 768 ? 10 : 12, fill: "#6B7280" }}
              tickFormatter={(value) => `${value}h`}
              width={window.innerWidth < 768 ? 35 : 50}
            />

            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(37, 99, 235, 0.05)" }} />

            {/* Leyenda - responsive */}
            <Legend
              verticalAlign="bottom"
              align="center"
              wrapperStyle={{ fontSize: window.innerWidth < 768 ? 10 : 12, paddingTop: 20 }}
              payload={[
                { value: "Siestas", type: "square", color: NAP_COLOR },
                { value: "Sueño nocturno", type: "square", color: NIGHT_COLOR },
                { value: "Despertares nocturnos", type: "line", color: WAKING_COLOR },
              ]}
            />

            {/* Barra de siestas (naranja, abajo) */}
            <Bar
              dataKey="napHours"
              stackId="sleep"
              fill={NAP_COLOR}
              radius={[0, 0, 6, 6]}
            />

            {/* Barra de sueño nocturno (azul, arriba) */}
            <Bar
              dataKey="nightHours"
              stackId="sleep"
              fill={NIGHT_COLOR}
              radius={[6, 6, 0, 0]}
            >
              {/* Renderizar líneas de despertares dentro de la barra azul */}
              <RenderWakingLines />
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
