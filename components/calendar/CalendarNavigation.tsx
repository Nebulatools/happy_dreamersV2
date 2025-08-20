// 🔄 Componente de navegación de calendario
"use client"

import React from 'react'
import { format, isSameMonth, startOfWeek, endOfWeek } from 'date-fns'
import { es } from 'date-fns/locale'

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
  
  // Título según la vista - simplificado para mostrar solo cuando sea necesario
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

  // Componente simplificado sin título - se usa en el header del período seleccionado
  // La navegación y selección de vista ahora están en CalendarPage
  return null
}