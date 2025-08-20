// 🔄 Componente de navegación de calendario
"use client"

import React from 'react'
import { format, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, isSameMonth, startOfWeek, endOfWeek } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

type ViewMode = "month" | "week" | "day"

interface CalendarNavigationProps {
  date: Date;
  view: ViewMode;
  onDateChange: (date: Date) => void;
  onViewChange: (view: ViewMode) => void;
}

export function CalendarNavigation({
  date,
  view,
  onDateChange,
  onViewChange
}: CalendarNavigationProps) {
  
  // Navegación anterior
  const navigatePrevious = () => {
    if (view === "month") {
      onDateChange(subMonths(date, 1))
    } else if (view === "week") {
      onDateChange(subWeeks(date, 1))
    } else {
      onDateChange(subDays(date, 1))
    }
  }

  // Navegación siguiente
  const navigateNext = () => {
    if (view === "month") {
      onDateChange(addMonths(date, 1))
    } else if (view === "week") {
      onDateChange(addWeeks(date, 1))
    } else {
      onDateChange(addDays(date, 1))
    }
  }

  // Título según la vista
  const getDateTitle = () => {
    if (view === "month") {
      return format(date, "MMMM yyyy", { locale: es })
    } else if (view === "week") {
      const weekStart = startOfWeek(date, { weekStartsOn: 0 })
      const weekEnd = endOfWeek(date, { weekStartsOn: 0 })
      if (isSameMonth(weekStart, weekEnd)) {
        return format(weekStart, "d", { locale: es }) + " - " + format(weekEnd, "d 'de' MMMM yyyy", { locale: es })
      } else {
        return format(weekStart, "d 'de' MMM", { locale: es }) + " - " + format(weekEnd, "d 'de' MMM yyyy", { locale: es })
      }
    } else {
      return format(date, "EEEE, d 'de' MMMM yyyy", { locale: es })
    }
  }

  return (
    <div className="space-y-3">
      {/* Selector de vista */}
      <div className="flex items-center justify-center gap-1 bg-gray-100 p-1 rounded-lg w-fit mx-auto">
        <Button
          variant={view === "month" ? "default" : "ghost"}
          size="sm"
          className={view === "month" ? "bg-white shadow-sm" : ""}
          onClick={() => onViewChange("month")}
        >
          Mensual
        </Button>
        <Button
          variant={view === "week" ? "default" : "ghost"}
          size="sm"
          className={view === "week" ? "bg-white shadow-sm" : ""}
          onClick={() => onViewChange("week")}
        >
          Semanal
        </Button>
        <Button
          variant={view === "day" ? "default" : "ghost"}
          size="sm"
          className={view === "day" ? "bg-white shadow-sm" : ""}
          onClick={() => onViewChange("day")}
        >
          Diario
        </Button>
      </div>

      {/* Navegación de fecha */}
      <div className="flex items-center justify-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={navigatePrevious}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <h2 className="text-xl font-semibold min-w-[200px] text-center">
          {getDateTitle()}
        </h2>
        
        <Button
          variant="outline"
          size="icon"
          onClick={navigateNext}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}