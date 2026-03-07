/**
 * AnalysisView - Vista principal de analisis multi-dia para la Bitacora
 *
 * Muestra N columnas (default 4) con resumen diario de eventos.
 * Navegacion con flechas para desplazar el rango de fechas.
 */

"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react"
import { addDays, subDays, isToday, format, startOfDay } from "date-fns"
import { es } from "date-fns/locale"
import { DayColumn } from "./DayColumn"
import {
  groupEventsByDay,
  analyzeDayEvents,
  type DayAnalysis,
} from "@/lib/bitacora/analysis-utils"
import { DEFAULT_TIMEZONE } from "@/lib/datetime"

interface AnalysisViewProps {
  events: any[] // Raw events del cache de BitacoraTab
  childName: string
  timezone?: string
}

export function AnalysisView({
  events,
  childName,
  timezone = DEFAULT_TIMEZONE,
}: AnalysisViewProps) {
  const [centerDate, setCenterDate] = useState<Date>(() => startOfDay(new Date()))
  const daysToShow = 4

  // Rango de fechas: centerDate - (daysToShow - 1) hasta centerDate
  // Asi el dia mas reciente esta a la derecha
  const fromDate = useMemo(
    () => subDays(centerDate, daysToShow - 1),
    [centerDate, daysToShow]
  )
  const toDate = centerDate

  // Procesar eventos en DayAnalysis[]
  const dayAnalyses: DayAnalysis[] = useMemo(() => {
    if (!events || events.length === 0) {
      // Generar dias vacios
      const days: DayAnalysis[] = []
      for (let i = 0; i < daysToShow; i++) {
        const day = addDays(fromDate, i)
        days.push(
          analyzeDayEvents([], day, timezone)
        )
      }
      return days
    }

    const grouped = groupEventsByDay(events, fromDate, toDate, timezone)
    const analyses: DayAnalysis[] = []

    for (let i = 0; i < daysToShow; i++) {
      const day = addDays(fromDate, i)
      const dateKey = format(day, "yyyy-MM-dd")
      const dayEvents = grouped.get(dateKey) || []
      analyses.push(analyzeDayEvents(dayEvents, day, timezone))
    }

    return analyses
  }, [events, fromDate, toDate, daysToShow, timezone])

  // Navegacion
  const navigateBack = () => {
    setCenterDate((prev) => subDays(prev, daysToShow))
  }

  const navigateForward = () => {
    setCenterDate((prev) => addDays(prev, daysToShow))
  }

  const navigateToToday = () => {
    setCenterDate(startOfDay(new Date()))
  }

  // Titulo del rango
  const rangeTitle = useMemo(() => {
    const from = format(fromDate, "d MMM", { locale: es })
    const to = format(toDate, "d MMM yyyy", { locale: es })
    return `${from} - ${to}`
  }, [fromDate, toDate])

  return (
    <div className="space-y-3">
      {/* Barra de navegacion */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={navigateBack}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium text-gray-700 min-w-[180px] text-center">
            {rangeTitle}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={navigateForward}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-gray-500 hover:text-gray-700"
          onClick={navigateToToday}
        >
          <CalendarDays className="h-3.5 w-3.5 mr-1" />
          Hoy
        </Button>
      </div>

      {/* Grid de columnas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3" style={{ minHeight: "400px" }}>
        {dayAnalyses.map((analysis) => (
          <DayColumn
            key={analysis.dateKey}
            analysis={analysis}
            isToday={isToday(analysis.date)}
          />
        ))}
      </div>
    </div>
  )
}
