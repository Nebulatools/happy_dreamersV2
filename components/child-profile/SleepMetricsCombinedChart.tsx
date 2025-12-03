"use client"

import React, { useMemo } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CalendarWeekView } from "@/components/calendar/CalendarWeekView"
import { useSleepData, type SleepEvent } from "@/hooks/use-sleep-data"
import { useEventsCache } from "@/hooks/use-events-cache"
import {
  addDays,
  differenceInMinutes,
  eachDayOfInterval,
  endOfDay,
  endOfWeek,
  format,
  isSameMonth,
  startOfDay,
  startOfWeek,
  subDays,
} from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { CalendarDays, Loader2 } from "lucide-react"
import { detectContinuousSleepEvents, formatMinutesAsHours as formatDuration } from "@/lib/utils/continuous-sleep-detector"
import { ContinuousSleepOverlay } from "@/components/dashboard/ContinuousSleepOverlay"

type RangeOption = "7-days" | "30-days" | "90-days"

interface EventSegment {
  id: string
  type: string
  start: Date
  end: Date
  notes?: string
}

interface DailySummary {
  totalMinutes: number
  segments: EventSegment[]
}

const WEEKDAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
const SLEEP_EVENT_TYPES = new Set([
  "sleep",
  "nap",
  "siesta",
  "dormir",
  "bedtime",
  "wake",
  "night_waking",
])

function formatMinutesAsHours(minutes: number): string {
  if (!minutes || minutes <= 0) return "0h"
  const hrs = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hrs === 0) return `${mins}m`
  if (mins === 0) return `${hrs}h`
  // Redondear a media hora para display compacto
  if (mins >= 30) return `${hrs}.5h`
  return `${hrs}h`
}

// Obtener despertares nocturnos ordenados cronológicamente
function getNightWakings(segments: EventSegment[]): EventSegment[] {
  return segments
    .filter(s => s.type === 'night_waking' || s.type === 'despertar_nocturno')
    .sort((a, b) => a.start.getTime() - b.start.getTime())
}

// Obtener siestas de un día
function getNaps(segments: EventSegment[]): EventSegment[] {
  return segments.filter(s =>
    s.type === 'nap' || s.type === 'siesta'
  )
}

function buildDailySummary(
  events: SleepEvent[],
  rangeStart: Date,
  rangeEnd: Date
): Map<string, DailySummary> {
  const summary = new Map<string, DailySummary>()

  events.forEach((event) => {
    if (!event.startTime) return

    const rawStart = new Date(event.startTime)
    const rawEnd = event.endTime ? new Date(event.endTime) : rawStart

    if (rawEnd < rangeStart || rawStart > rangeEnd) {
      return
    }

    const clampedStart = rawStart < rangeStart ? rangeStart : rawStart
    const clampedEnd = rawEnd > rangeEnd ? rangeEnd : rawEnd

    let cursor = clampedStart
    while (cursor < clampedEnd) {
      const dayStart = startOfDay(cursor)
      const nextDay = addDays(dayStart, 1)
      const segmentEnd = clampedEnd < nextDay ? clampedEnd : nextDay
      const key = format(dayStart, "yyyy-MM-dd")
      const entry = summary.get(key) ?? { totalMinutes: 0, segments: [] }
      const minutes = Math.max(0, differenceInMinutes(segmentEnd, cursor))

      if (minutes > 0 && isSleepBlock(event.eventType)) {
        entry.totalMinutes += minutes
      }

      entry.segments.push({
        id: `${event._id || event.eventType}-${cursor.getTime()}`,
        type: event.eventType,
        start: cursor,
        end: segmentEnd,
        notes: event.notes,
      })

      summary.set(key, entry)

      if (segmentEnd >= clampedEnd) {
        break
      }

      cursor = segmentEnd
    }
  })

  return summary
}

function isSleepBlock(eventType?: string | null): boolean {
  if (!eventType) return false
  return SLEEP_EVENT_TYPES.has(eventType)
}

function getRangeLabel(range: RangeOption) {
  if (range === "30-days") return "30 días"
  if (range === "90-days") return "90 días"
  return "7 días"
}

function getIntensityClasses(minutes: number) {
  if (minutes >= 11 * 60) {
    return "bg-emerald-50 border-emerald-200 text-emerald-800"
  }
  if (minutes >= 9 * 60) {
    return "bg-blue-50 border-blue-200 text-blue-800"
  }
  if (minutes >= 7 * 60) {
    return "bg-sky-50 border-sky-200 text-sky-800"
  }
  if (minutes === 0) {
    return "bg-gray-50 border-dashed border-gray-200 text-gray-400"
  }
  return "bg-amber-50 border-amber-200 text-amber-800"
}

function chunkBy<T>(items: T[], chunkSize: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize))
  }
  return chunks
}

export default function SleepMetricsCombinedChart({
  childId,
  dateRange = "7-days",
  showExtendedRange = true,
  cardMode7Days = false,
}: {
  childId: string
  dateRange?: RangeOption
  showExtendedRange?: boolean
  cardMode7Days?: boolean
}) {
  const allowedRanges: RangeOption[] = showExtendedRange
    ? ["7-days", "30-days", "90-days"]
    : ["7-days", "30-days"]

  const initialRange = allowedRanges.includes(dateRange) ? dateRange : allowedRanges[0]
  const [range, setRange] = React.useState<RangeOption>(initialRange)

  const { refresh, subscribe } = useEventsCache(childId)
  const { data, loading, error } = useSleepData(childId, range)

  // Revalidar cuando se invaliden eventos en cualquier parte de la app
  React.useEffect(() => {
    const unsub = subscribe()
    return unsub
  }, [subscribe])

  const daysToShow = React.useMemo(() => {
    if (range === "30-days") return 30
    if (range === "90-days") return 90
    return 7
  }, [range])

  const windowEnd = React.useMemo(() => endOfDay(new Date()), [])
  const windowStart = React.useMemo(
    () => startOfDay(subDays(windowEnd, daysToShow - 1)),
    [windowEnd, daysToShow]
  )

  const eventsInRange = React.useMemo(() => {
    if (!data?.events?.length) return []

    return data.events.filter((event) => {
      if (!event.startTime) return false
      const start = new Date(event.startTime)
      const end = event.endTime ? new Date(event.endTime) : start
      return end >= windowStart && start <= windowEnd
    })
  }, [data?.events, windowStart, windowEnd])

  const timelineEvents = React.useMemo(() => {
    if (cardMode7Days) {
      return eventsInRange
    }
    const recent = data?.recentEvents || []
    return recent.filter((event) => {
      if (!event.startTime) return false
      const start = new Date(event.startTime)
      const end = event.endTime ? new Date(event.endTime) : start
      return end >= windowStart && start <= windowEnd
    })
  }, [cardMode7Days, data?.recentEvents, eventsInRange, windowStart, windowEnd])

  const dailySummary = React.useMemo(
    () => buildDailySummary(eventsInRange, windowStart, windowEnd),
    [eventsInRange, windowStart, windowEnd]
  )

  // Detectar eventos continuos que cruzan medianoche
  const continuousEvents = useMemo(() => {
    return detectContinuousSleepEvents(eventsInRange)
  }, [eventsInRange])

  const midpointForWeek = React.useMemo(
    () => subDays(windowEnd, Math.floor(daysToShow / 2)),
    [windowEnd, daysToShow]
  )

  const handleRangeChange = (nextRange: RangeOption) => {
    setRange(nextRange)
    refresh()
  }

  return (
    <Card className="shadow-sm border-0">
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="text-[#2F2F2F] flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-[#628BE6]" />
            Resumen visual de los últimos {getRangeLabel(range)}
          </CardTitle>
          <CardDescription className="text-sm text-gray-500">
            Vista estilo calendario con los eventos registrados del periodo seleccionado
          </CardDescription>
        </div>
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <div className="flex items-center gap-2">
            {allowedRanges.map((option) => (
              <Button
                key={option}
                size="sm"
                variant={option === range ? "default" : "outline"}
                className={cn(
                  "text-xs md:text-sm",
                  option === range ? "bg-[#F0F7FF] text-[#4A90E2]" : "text-[#666666]"
                )}
                onClick={() => handleRangeChange(option)}
              >
                {getRangeLabel(option)}
              </Button>
            ))}
          </div>
          <Button asChild variant="ghost" size="sm" className="text-xs text-[#2553A1]">
            <Link href="/dashboard/calendar">Ver bitácora completa</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <Loader2 className="h-6 w-6 animate-spin mb-3" />
            Cargando registros recientes...
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            No pudimos cargar los eventos recientes. Intenta nuevamente en unos minutos.
          </div>
        ) : eventsInRange.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-600">
            No hay eventos registrados en los últimos {getRangeLabel(range)}. Registra siestas o
            periodos de sueño para ver el calendario lleno.
          </div>
        ) : range === "7-days" && cardMode7Days ? (
          <RollingCalendarGrid
            startDate={windowStart}
            endDate={windowEnd}
            dailySummary={dailySummary}
            rangeLabel={getRangeLabel(range)}
            daysToShow={daysToShow}
            continuousEvents={continuousEvents}
          />
        ) : range === "7-days" ? (
          <div className="overflow-x-auto pb-4">
            <CalendarWeekView
              date={midpointForWeek}
              events={timelineEvents as any}
              hourHeight={24}
              className="min-w-[720px]"
            />
          </div>
        ) : (
          <RollingCalendarGrid
            startDate={windowStart}
            endDate={windowEnd}
            dailySummary={dailySummary}
            rangeLabel={getRangeLabel(range)}
            daysToShow={daysToShow}
            continuousEvents={continuousEvents}
          />
        )}
      </CardContent>
    </Card>
  )
}

interface RollingCalendarGridProps {
  startDate: Date
  endDate: Date
  dailySummary: Map<string, DailySummary>
  rangeLabel: string
  daysToShow: number
  continuousEvents: ReturnType<typeof detectContinuousSleepEvents>
}

function RollingCalendarGrid({
  startDate,
  endDate,
  dailySummary,
  rangeLabel,
  daysToShow,
  continuousEvents,
}: RollingCalendarGridProps) {
  const isSevenDayMode = daysToShow <= 7
  const gridStart = isSevenDayMode
    ? startOfDay(startDate)
    : startOfWeek(startDate, { weekStartsOn: 0 })
  const gridEnd = isSevenDayMode
    ? endOfDay(addDays(gridStart, 6))
    : endOfWeek(endDate, { weekStartsOn: 0 })
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })
  const weeks = chunkBy(days, 7)

  // Crear Set de días que tienen eventos continuos para ocultar segmentos individuales
  const daysWithContinuousEvents = React.useMemo(() => {
    const daySet = new Set<string>()
    continuousEvents.forEach(event => {
      event.daysSpanned.forEach(day => daySet.add(day))
    })
    return daySet
  }, [continuousEvents])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{isSevenDayMode ? "Vista tipo calendario (7 días)" : "Vista semanal agrupada"}</span>
        <span>{rangeLabel}</span>
      </div>

      <div className="overflow-x-auto -mx-2 md:mx-0 pb-2">
        <div className="min-w-[720px] space-y-3">
          <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-medium text-gray-500">
            {(isSevenDayMode
              ? Array.from({ length: 7 }, (_, idx) =>
                format(addDays(gridStart, idx), "EEE", { locale: es })
              )
              : WEEKDAY_LABELS
            ).map((label, idx) => (
              <span key={`${label}-${idx}`}>{label}</span>
            ))}
          </div>

          {/* Wrapper con position relative para overlay */}
          <div className="relative">
            <div className="space-y-2">
              {weeks.map((week, idx) => (
                <div key={idx} className="grid grid-cols-7 gap-2">
                  {week.map((day) => {
                    const key = format(day, "yyyy-MM-dd")
                    const summary = dailySummary.get(key)
                    const isOutsideRange = day < startDate || day > endDate
                    const monthBreak = day.getDate() === 1
                    const classes = summary
                      ? getIntensityClasses(summary.totalMinutes)
                      : "bg-white border border-gray-200"

                    const nightWakings = summary ? getNightWakings(summary.segments) : []
                    const naps = summary ? getNaps(summary.segments) : []

                    return (
                      <div
                        key={key}
                        className={cn(
                          "min-h-[130px] rounded-xl border p-2 text-left transition-colors flex flex-col relative",
                          classes,
                          isOutsideRange && "opacity-40"
                        )}
                      >
                        {/* Horarios de despertares nocturnos */}
                        {nightWakings.length > 0 && (
                          <div className="absolute top-2 right-2 group/wake">
                            <div className="bg-night-wake text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center cursor-default">
                              {nightWakings.length}
                            </div>
                            <div className="absolute bottom-full right-0 mb-1 opacity-0 group-hover/wake:opacity-100 transition-opacity pointer-events-none z-50">
                              <div className="bg-gray-900 text-white text-[10px] rounded px-2 py-1 space-y-1">
                                {nightWakings.map((wake) => (
                                  <div key={wake.id} className="whitespace-nowrap">
                                    {format(wake.start, "HH:mm")}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span>{day.getDate()}</span>
                          {monthBreak || day.getDate() === 1 ? (
                            <span className="text-[10px] uppercase tracking-wide">
                              {format(day, "MMM", { locale: es })}
                            </span>
                          ) : (
                            <span />
                          )}
                        </div>

                        <div className="mt-2 space-y-1">
                          {summary?.segments
                            .filter((segment) => {
                              // Ocultar siestas (se muestran como circulos)
                              if (segment.type === 'nap' || segment.type === 'siesta') {
                                return false
                              }
                              // Ocultar despertares nocturnos (se muestran como badge)
                              if (segment.type === 'night_waking' || segment.type === 'despertar_nocturno') {
                                return false
                              }
                              // Ocultar segmentos de sueño si son parte de un evento continuo
                              if (daysWithContinuousEvents.has(key) && isSleepBlock(segment.type)) {
                                return false
                              }
                              return true
                            })
                            .slice(0, 3)
                            .map((segment) => (
                              <div
                                key={segment.id}
                                className="rounded-md bg-white/70 px-2 py-1 text-[11px] text-gray-700 shadow-sm"
                              >
                                <span className="font-medium mr-1">{getSegmentEmoji(segment.type)}</span>
                                {format(segment.start, "HH:mm")} - {format(segment.end, "HH:mm")}
                              </div>
                            ))}
                        </div>

                        {/* Indicadores de siestas */}
                        {naps.length > 0 && (
                          <div className="flex items-center gap-1 mt-2">
                            {naps.slice(0, 4).map((nap) => (
                              <div key={nap.id} className="relative group/nap">
                                <div className="w-4 h-4 rounded-full bg-nap cursor-default hover:ring-2 hover:ring-orange-300 transition-all" />
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 opacity-0 group-hover/nap:opacity-100 transition-opacity pointer-events-none z-50">
                                  <div className="bg-gray-900 text-white text-[10px] rounded px-2 py-1 whitespace-nowrap">
                                    Siesta: {formatMinutesAsHours(differenceInMinutes(nap.end, nap.start))}
                                  </div>
                                </div>
                              </div>
                            ))}
                            {naps.length > 4 && (
                              <span className="text-[10px] text-gray-500">+{naps.length - 4}</span>
                            )}
                          </div>
                        )}

                        <div className="mt-auto text-[11px] font-semibold">
                          Sueño total: {summary ? formatMinutesAsHours(summary.totalMinutes) : "0h"}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>

            {/* Overlay de eventos continuos */}
            {continuousEvents.length > 0 && (
              <ContinuousSleepOverlay
                continuousEvents={continuousEvents}
                visibleDays={days}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function getSegmentEmoji(eventType?: string) {
  if (!eventType) return "🌙"
  if (eventType.includes("nap") || eventType.includes("siesta")) {
    return "☀️"
  }
  if (eventType.includes("wake") || eventType.includes("despert")) {
    return "⚠️"
  }
  if (eventType.includes("meal") || eventType.includes("feeding")) {
    return "🥣"
  }
  return "🌙"
}
