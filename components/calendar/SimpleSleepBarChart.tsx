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
  Scatter,
  Cell,
  Customized,
} from "recharts"
import { cn } from "@/lib/utils"

const NIGHT_COLOR = "#4C8AF7"
const NIGHT_COLOR_SELECTED = "#2563EB"
const NAP_COLOR = "#FF8A34"
const NAP_COLOR_SELECTED = "#FB6514"
const WAKING_COLOR = "#E11D48"

export interface DailySleepPoint {
  label: string
  isoDate: string
  displayDate: string
  nightHours: number
  napHours: number
  totalHours: number
  wakingsCount: number
  wakingPositions: number[]
}

export interface NightWakingPoint {
  label: string
  value: number
  isoDate: string
}

interface SimpleSleepBarChartProps {
  data: DailySleepPoint[]
  nightWakingPoints: NightWakingPoint[]
  onSelectDay?: (isoDate: string) => void
  selectedIsoDate?: string | null
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

  const dayData = payload[0]?.payload as DailySleepPoint | undefined
  if (!dayData) return null

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-md text-sm min-w-[180px]">
      <div className="font-semibold text-gray-900 mb-2">{dayData.displayDate}</div>
      <div className="flex items-center justify-between text-gray-600">
        <span>Total:</span>
        <span className="font-semibold text-gray-900">{formatHours(dayData.totalHours)}</span>
      </div>
      <div className="flex items-center justify-between text-gray-600">
        <span>Noche:</span>
        <span className="font-medium" style={{ color: NIGHT_COLOR }}>{formatHours(dayData.nightHours)}</span>
      </div>
      <div className="flex items-center justify-between text-gray-600">
        <span>Siestas:</span>
        <span className="font-medium" style={{ color: NAP_COLOR }}>{formatHours(dayData.napHours)}</span>
      </div>
      <div className="flex items-center justify-between text-gray-600">
        <span>Despertares:</span>
        <span className="font-medium" style={{ color: WAKING_COLOR }}>{dayData.wakingsCount}</span>
      </div>
    </div>
  )
}

const NightWakingMarker = ({ cx, cy }: { cx?: number; cy?: number }) => {
  if (typeof cx !== "number" || typeof cy !== "number") return null
  return (
    <line
      x1={cx - 10}
      x2={cx + 10}
      y1={cy}
      y2={cy}
      stroke={WAKING_COLOR}
      strokeWidth={3}
      strokeLinecap="round"
    />
  )
}

const EmptyState = () => (
  <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-gray-500">
    <p className="font-medium text-gray-600">No hay datos suficientes para la semana seleccionada.</p>
    <p>Registra eventos de sueño para visualizar el progreso.</p>
  </div>
)

export function SimpleSleepBarChart({
  data,
  nightWakingPoints,
  onSelectDay,
  selectedIsoDate,
  className,
}: SimpleSleepBarChartProps) {
  const hasData = data.some((point) => point.totalHours > 0)

  const maxHours = useMemo(() => {
    const maxValue = Math.max(...data.map((point) => point.totalHours), 0)
    return Math.max(6, Math.ceil(maxValue + 1))
  }, [data])

  if (data.length === 0) {
    return <EmptyState />
  }

  return (
    <div className={cn("relative h-[320px] w-full", className)}>
      {!hasData ? (
        <EmptyState />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 20, right: 20, left: 20, bottom: 10 }}
            barCategoryGap="20%"
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#4B5563" }} />
            <YAxis
              domain={[0, maxHours]}
              tick={{ fontSize: 11, fill: "#4B5563" }}
              tickFormatter={(value) => `${value}h`}
              width={40}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(37, 99, 235, 0.08)" }} />
            <Legend
              verticalAlign="bottom"
              align="left"
              wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
              payload={[
                { value: "Sueño nocturno", type: "square", color: NIGHT_COLOR },
                { value: "Siestas diurnas", type: "square", color: NAP_COLOR },
                { value: "Despertares nocturnos", type: "line", color: WAKING_COLOR },
              ]}
            />

            <Bar
              dataKey="nightHours"
              stackId="sleep"
              radius={[6, 6, 6, 6]}
              fill={NIGHT_COLOR}
              onClick={(_, index) => {
                const isoDate = data[index]?.isoDate
                if (isoDate && onSelectDay) {
                  onSelectDay(isoDate)
                }
              }}
            >
              {data.map((entry) => {
                const isSelected = selectedIsoDate === entry.isoDate
                return (
                  <Cell
                    key={`night-${entry.isoDate}`}
                    fill={isSelected ? NIGHT_COLOR_SELECTED : NIGHT_COLOR}
                    cursor="pointer"
                  />
                )
              })}
            </Bar>

            <Bar
              dataKey="napHours"
              stackId="sleep"
              radius={[6, 6, 0, 0]}
              fill={NAP_COLOR}
              onClick={(_, index) => {
                const isoDate = data[index]?.isoDate
                if (isoDate && onSelectDay) {
                  onSelectDay(isoDate)
                }
              }}
            >
              {data.map((entry) => {
                const isSelected = selectedIsoDate === entry.isoDate
                return (
                  <Cell
                    key={`nap-${entry.isoDate}`}
                    fill={isSelected ? NAP_COLOR_SELECTED : NAP_COLOR}
                    cursor={entry.napHours > 0 ? "pointer" : "default"}
                  />
                )
              })}
            </Bar>

            <Scatter
              data={nightWakingPoints}
              dataKey="value"
              legendType="none"
              shape={<NightWakingMarker />}
            />

            <Customized>
              {({ height, offset }: any) => {
                // Draw baseline at hour 0
                return (
                  <line
                    x1={offset?.left ?? 0}
                    x2={(offset?.left ?? 0) + (offset?.width ?? 0)}
                    y1={height}
                    y2={height}
                    stroke="#E5E7EB"
                  />
                )
              }}
            </Customized>
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
