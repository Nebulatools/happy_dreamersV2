"use client"

import React from "react"
import {
  ComposedChart,
  Line,
  Scatter,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useSleepData } from "@/hooks/use-sleep-data"
import { useEventsCache } from "@/hooks/use-events-cache"
import {
  addDays,
  differenceInMinutes,
  format,
  isAfter,
  isBefore,
  isSameDay,
  parseISO,
  setHours,
  setMinutes,
  startOfDay,
  subDays,
} from "date-fns"
import { es } from "date-fns/locale"

type SeriesPoint = {
  date: Date
  label: string
  sleepHours: number | null
  wakeups: number
  bedTime?: number | null
  wakeTime?: number | null
}

// Convierte Date a hora decimal (HH + mm/60) y ajusta madrugada a 24-32
function timeToDecimal(date: Date): number {
  const h = date.getHours()
  const m = date.getMinutes()
  const dec = h + m / 60
  // Para poder mostrar noche y madrugada en un solo eje continuo
  // si es antes de las 9am, lo pasamos a 24-32
  if (dec < 9) return dec + 24
  return dec
}

function decimalToTimeString(decimal: number | null | undefined): string {
  if (decimal === null || decimal === undefined) return "--:--"
  let d = decimal
  if (d >= 24) d -= 24
  const hh = Math.floor(d)
  const mm = Math.round((d - hh) * 60)
  return `${hh.toString().padStart(2, "0")}:${mm.toString().padStart(2, "0")}`
}

interface SleepMetricsCombinedChartProps {
  childId: string
  dateRange?: "7-days" | "30-days" | "90-days"
}

export default function SleepMetricsCombinedChart({
  childId,
  dateRange = "7-days",
}: SleepMetricsCombinedChartProps) {
  const { refreshTrigger, subscribe } = useEventsCache(childId)
  // Control interno de rango (permite cambiar entre 7/30/90 días)
  const [range, setRange] = React.useState<"7-days" | "30-days" | "90-days">(dateRange)
  const { data: sleepData, loading, error } = useSleepData(childId, range)

  React.useEffect(() => {
    const unsub = subscribe()
    return unsub
  }, [subscribe])

  const series: SeriesPoint[] = React.useMemo(() => {
    if (!sleepData?.events) return []

    // Determinar ventana temporal
    const now = new Date()
    const days = range === "30-days" ? 30 : range === "90-days" ? 90 : 7
    const start = subDays(startOfDay(now), days - 1)

    // Fechas del período (de más antiguo a más reciente)
    const daysArray: Date[] = []
    for (let i = 0; i < days; i++) {
      daysArray.push(addDays(start, i))
    }

    // Eventos relevantes ordenados por fecha
    const events = [...sleepData.events]
      .filter((e: any) => e.startTime)
      .sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())

    // Precomputar pares bedtime/sleep → wake para obtener duración por noche y asignarla al día del wake
    const nightlyDurationsByDayKey = new Map<string, number>() // key = yyyy-mm-dd

    for (let i = 0; i < events.length - 1; i++) {
      const ev = events[i]
      if (!['sleep', 'bedtime', 'dormir'].includes(ev.eventType)) continue
      const bed = parseISO(ev.startTime)

      // Buscar siguiente wake
      let wake: Date | null = null
      for (let j = i + 1; j < events.length; j++) {
        const next = events[j]
        if (!next.startTime) continue
        if (['sleep', 'bedtime', 'dormir'].includes(next.eventType)) break
        if (next.eventType === 'wake') {
          wake = parseISO(next.startTime)
          break
        }
      }

      // Ajustar por sleepDelay (máx 180m)
      const rawDelay = typeof ev.sleepDelay === 'number' ? ev.sleepDelay : 0
      const delay = Math.min(Math.max(rawDelay, 0), 180)
      const actualSleepStart = new Date(bed.getTime() + delay * 60 * 1000)

      let minutes = 0
      if (wake) {
        minutes = Math.max(0, differenceInMinutes(wake, actualSleepStart))
      } else if (['sleep', 'bedtime', 'dormir'].includes(ev.eventType)) {
        // Si no hay wake visible (p. ej. corte de rango), asumir 8h - delay si es noche
        const bedHour = bed.getHours()
        if (bedHour >= 18 || bedHour <= 6) {
          minutes = Math.max(0, 8 * 60 - delay)
          // asignar al día siguiente (asumiendo wake por la mañana)
          const assumedWake = addDays(startOfDay(bed), bedHour <= 6 ? 0 : 1)
          wake = new Date(assumedWake.getTime() + 7 * 60 * 60 * 1000) // ~07:00
        }
      }

      if (wake && minutes > 0) {
        const key = format(wake, 'yyyy-MM-dd')
        // Si ya hay una duración para ese día, usar la mayor (una noche por día)
        const prev = nightlyDurationsByDayKey.get(key) || 0
        nightlyDurationsByDayKey.set(key, Math.max(prev, minutes))
      }
    }

    // Preparar serie diaria
    const result: SeriesPoint[] = daysArray.map((d) => ({
      date: d,
      label: format(d, days <= 7 ? 'EEE d' : 'd MMM', { locale: es }),
      sleepHours: null,
      wakeups: 0,
      bedTime: null,
      wakeTime: null,
    }))

    // Contar night_waking por día
    events.forEach((e: any) => {
      if (e.eventType === 'night_waking' && e.startTime) {
        const date = parseISO(e.startTime)
        const idx = result.findIndex(p => isSameDay(p.date, date))
        if (idx >= 0) {
          result[idx].wakeups += 1
        }
      }
    })

    // Asignar sleepHours por día (minutos → horas)
    result.forEach((p) => {
      const key = format(p.date, 'yyyy-MM-dd')
      const mins = nightlyDurationsByDayKey.get(key)
      p.sleepHours = mins ? Number((mins / 60).toFixed(2)) : null
    })

    // Extraer bedtime por día (ventana 18:00 → 06:00 siguiente)
    result.forEach((p) => {
      const dayStart = startOfDay(p.date)
      const winStart = setMinutes(setHours(dayStart, 18), 0) // 18:00 del día
      const winEnd = setMinutes(setHours(addDays(dayStart, 1), 6), 0) // 06:00 del siguiente
      const bedEvent = events.find((e: any) => {
        if (!['sleep', 'bedtime', 'dormir'].includes(e.eventType) || !e.startTime) return false
        const dt = parseISO(e.startTime)
        return (isAfter(dt, winStart) || +dt === +winStart) && isBefore(dt, winEnd)
      })
      if (bedEvent) p.bedTime = timeToDecimal(parseISO(bedEvent.startTime))
    })

    // Extraer wakeTime por día (ventana 05:00 → 10:00 del mismo día)
    result.forEach((p) => {
      const dayStart = startOfDay(p.date)
      const winStart = setMinutes(setHours(dayStart, 5), 0)
      const winEnd = setMinutes(setHours(dayStart, 10), 0)
      const wakeEvent = events.find((e: any) => {
        if (e.eventType !== 'wake' || !e.startTime) return false
        const dt = parseISO(e.startTime)
        return (isAfter(dt, winStart) || +dt === +winStart) && isBefore(dt, winEnd)
      })
      if (wakeEvent) p.wakeTime = timeToDecimal(parseISO(wakeEvent.startTime))
    })

    return result
  }, [sleepData, range])

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center text-gray-500">
        Cargando métricas...
      </div>
    )
  }

  if (error || series.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center text-gray-500">
        No hay suficientes datos para mostrar la gráfica
      </div>
    )
  }

  // Ticks para el eje de tiempo (noche+madrugada)
  const timeTicks = [21, 22, 23, 24, 25, 26, 27, 28, 29, 30]

  return (
    <Card className="bg-white shadow-sm border-0">
      <CardHeader className="pb-3 md:pb-4">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-[#2F2F2F]">Resumen visual de los últimos {series.length <= 7 ? '7' : range === '30-days' ? '30' : '90'} días</CardTitle>
          <div className="flex gap-2">
            <Button 
              size="sm"
              onClick={() => setRange("7-days")}
              className={range === "7-days" ? "bg-[#F0F7FF] text-[#4A90E2] hover:bg-[#E8F4FF] h-7 md:h-8 text-xs md:text-sm px-2 md:px-3" : "h-7 md:h-8 text-xs md:text-sm px-2 md:px-3"}
              variant={range === "7-days" ? "default" : "ghost"}
            >
              7d
            </Button>
            <Button 
              size="sm"
              onClick={() => setRange("30-days")}
              className={range === "30-days" ? "bg-[#F0F7FF] text-[#4A90E2] hover:bg-[#E8F4FF] h-7 md:h-8 text-xs md:text-sm px-2 md:px-3" : "text-[#666666] h-7 md:h-8 text-xs md:text-sm px-2 md:px-3"}
              variant={range === "30-days" ? "default" : "ghost"}
            >
              30d
            </Button>
            <Button 
              size="sm"
              onClick={() => setRange("90-days")}
              className={range === "90-days" ? "bg-[#F0F7FF] text-[#4A90E2] hover:bg-[#E8F4FF] h-7 md:h-8 text-xs md:text-sm px-2 md:px-3" : "text-[#666666] h-7 md:h-8 text-xs md:text-sm px-2 md:px-3"}
              variant={range === "90-days" ? "default" : "ghost"}
            >
              3m
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="h-[320px] md:h-[380px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={series} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            {/* Eje izquierdo: horas (duración) y conteo de despertares */}
            <YAxis yAxisId="hours" domain={[0, 12]} tick={{ fontSize: 12 }} label={{ value: 'Horas', angle: -90, position: 'insideLeft' }} />
            {/* Eje derecho: hora del día (noche+madrugada) */}
            <YAxis yAxisId="time" orientation="right" domain={[21, 30]} ticks={timeTicks} tickFormatter={decimalToTimeString} tick={{ fontSize: 12 }} />
            <Tooltip 
              content={({ active, payload, label }) => {
                if (!active || !payload || payload.length === 0) return null
                const p = payload[0].payload as SeriesPoint
                return (
                  <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
                    <div className="text-sm font-semibold mb-1">{label}</div>
                    <div className="text-xs text-gray-700 space-y-1">
                      <div>Hora de despertar: <span className="font-medium">{decimalToTimeString(p.wakeTime ?? null)}</span></div>
                      <div>Hora de acostarse: <span className="font-medium">{decimalToTimeString(p.bedTime ?? null)}</span></div>
                      <div>Sueño nocturno: <span className="font-medium">{p.sleepHours ? `${p.sleepHours} h` : '--'}</span></div>
                      <div>Despertares nocturnos: <span className="font-medium">{p.wakeups}</span></div>
                    </div>
                  </div>
                )
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />

            {/* Línea: duración de sueño nocturno (horas) */}
            <Line yAxisId="hours" type="monotone" dataKey="sleepHours" name="Sueño nocturno (h)" stroke="#4A90E2" strokeWidth={2} dot={{ r: 3, fill: "#4A90E2" }} connectNulls />

            {/* Barras: número de despertares nocturnos (color más oscuro) */}
            <Bar
              yAxisId="hours"
              dataKey="wakeups"
              name="Despertares"
              fill="#F5C518"
              stroke="#C89C00"
              radius={[4, 4, 0, 0]}
              barSize={14}
            />

            {/* Puntos: hora de acostarse y hora de despertar (eje tiempo) - colores más oscuros */}
            <Scatter
              yAxisId="time"
              dataKey="bedTime"
              name="Acostarse"
              fill="#8E6CF0"
              stroke="#6B4CC2"
            />
            <Scatter
              yAxisId="time"
              dataKey="wakeTime"
              name="Despertar"
              fill="#4CAF50"
              stroke="#2E7D32"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
