"use client"

/**
 * PlanVsEventsCard - Compara el plan del dia con los eventos reales
 *
 * Layout de 2 columnas:
 * - Izquierda: Plan del dia (horarios programados)
 * - Derecha: Eventos reales registrados
 *
 * Si no hay plan activo, solo muestra la columna de eventos.
 * Los eventos extras (alimentacion, medicamentos, actividades) se
 * muestran intercalados cronologicamente.
 */

import React, { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getEventIconConfig } from "@/lib/icons/event-icons"
import { formatTime, parseTimestamp } from "@/lib/datetime"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

// Tipos
interface Schedule {
  bedtime: string
  wakeTime: string
  naps?: Array<{
    time: string
    duration: number
    description?: string
  }>
}

interface ChildPlan {
  _id?: string
  schedule: Schedule
  planNumber?: number
  title?: string
  isDefault: boolean
}

interface Event {
  _id: string
  childId: string
  eventType: string
  startTime: string
  endTime?: string
  feedingType?: "breast" | "bottle" | "solids"
  medicationName?: string
  activityDescription?: string
  duration?: number
}

interface PlanVsEventsCardProps {
  plan: ChildPlan | null | undefined
  events: Event[]
  selectedDate: Date
  timezone: string
}

// Estructura para items del timeline
interface TimelineItem {
  time: string // HH:MM formato 24h
  timeDisplay: string // Para mostrar (ej: "07:00")
  type: "plan" | "event"
  category: "wake" | "sleep" | "nap" | "feeding" | "medication" | "activity" | "other"
  label: string
  eventType?: string // Para obtener icono
  feedingType?: string
  isPlan?: boolean
}

/**
 * Convierte un timestamp ISO a hora local en formato HH:MM
 */
function getTimeFromTimestamp(timestamp: string, timezone: string): string {
  try {
    const date = parseTimestamp(timestamp, timezone)
    return format(date, "HH:mm")
  } catch {
    return "00:00"
  }
}

/**
 * Formatea hora HH:MM a formato legible (ej: "7:00 AM" o "19:30")
 */
function formatTimeDisplay(time: string): string {
  const [hours, minutes] = time.split(":").map(Number)
  if (isNaN(hours) || isNaN(minutes)) return time

  // Formato 24h simplificado
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`
}

/**
 * Obtiene el label para un evento segun su tipo
 */
function getEventLabel(event: Event): string {
  switch (event.eventType) {
    case "wake":
      return "Desperto"
    case "sleep":
      return "Se durmio"
    case "nap":
      return "Siesta"
    case "night_waking":
      return "Desperto (nocturno)"
    case "feeding":
    case "night_feeding":
      if (event.feedingType === "breast") return "Pecho"
      if (event.feedingType === "bottle") return "Biberon"
      if (event.feedingType === "solids") return "Solidos"
      return "Alimentacion"
    case "medication":
      return event.medicationName || "Medicamento"
    case "extra_activities":
      return event.activityDescription || "Actividad"
    default:
      return "Evento"
  }
}

/**
 * Categoriza un eventType para ordenamiento
 */
function categorizeEventType(eventType: string): TimelineItem["category"] {
  switch (eventType) {
    case "wake":
      return "wake"
    case "sleep":
      return "sleep"
    case "nap":
      return "nap"
    case "feeding":
    case "night_feeding":
      return "feeding"
    case "medication":
      return "medication"
    case "extra_activities":
      return "activity"
    default:
      return "other"
  }
}

export function PlanVsEventsCard({
  plan,
  events,
  selectedDate,
  timezone
}: PlanVsEventsCardProps) {
  // Construir items del plan
  const planItems = useMemo(() => {
    if (!plan?.schedule) return []

    const items: TimelineItem[] = []
    const schedule = plan.schedule

    // Despertar
    if (schedule.wakeTime) {
      items.push({
        time: schedule.wakeTime,
        timeDisplay: formatTimeDisplay(schedule.wakeTime),
        type: "plan",
        category: "wake",
        label: "Despertar",
        eventType: "wake",
        isPlan: true,
      })
    }

    // Siestas
    if (schedule.naps && schedule.naps.length > 0) {
      schedule.naps.forEach((nap, idx) => {
        if (nap.time) {
          items.push({
            time: nap.time,
            timeDisplay: formatTimeDisplay(nap.time),
            type: "plan",
            category: "nap",
            label: nap.description || `Siesta ${idx + 1}`,
            eventType: "nap",
            isPlan: true,
          })
        }
      })
    }

    // Hora de dormir
    if (schedule.bedtime) {
      items.push({
        time: schedule.bedtime,
        timeDisplay: formatTimeDisplay(schedule.bedtime),
        type: "plan",
        category: "sleep",
        label: "Dormir",
        eventType: "sleep",
        isPlan: true,
      })
    }

    return items.sort((a, b) => a.time.localeCompare(b.time))
  }, [plan])

  // Construir items de eventos
  const eventItems = useMemo(() => {
    return events.map(event => {
      const time = getTimeFromTimestamp(event.startTime, timezone)
      return {
        time,
        timeDisplay: formatTimeDisplay(time),
        type: "event" as const,
        category: categorizeEventType(event.eventType),
        label: getEventLabel(event),
        eventType: event.eventType,
        feedingType: event.feedingType,
        isPlan: false,
      }
    }).sort((a, b) => a.time.localeCompare(b.time))
  }, [events, timezone])

  // Si no hay plan ni eventos, no mostrar nada
  if (planItems.length === 0 && eventItems.length === 0) {
    return null
  }

  // Determinar si hay plan activo
  const hasPlan = plan && !plan.isDefault && planItems.length > 0

  return (
    <Card className="mb-4">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm font-medium text-slate-600">
          {hasPlan ? "Plan vs Eventos de Hoy" : "Eventos de Hoy"}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        {hasPlan ? (
          // Vista de 2 columnas: Plan | Eventos
          <div className="grid grid-cols-2 gap-4">
            {/* Columna Plan */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Plan
              </div>
              {planItems.map((item, idx) => (
                <TimelineRow
                  key={`plan-${idx}`}
                  item={item}
                  variant="plan"
                />
              ))}
            </div>

            {/* Columna Eventos */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Eventos
              </div>
              {eventItems.length > 0 ? (
                eventItems.map((item, idx) => (
                  <TimelineRow
                    key={`event-${idx}`}
                    item={item}
                    variant="event"
                  />
                ))
              ) : (
                <p className="text-xs text-slate-400 italic">Sin eventos aun</p>
              )}
            </div>
          </div>
        ) : (
          // Vista de 1 columna: Solo eventos
          <div className="space-y-2">
            {eventItems.length > 0 ? (
              eventItems.map((item, idx) => (
                <TimelineRow
                  key={`event-${idx}`}
                  item={item}
                  variant="event"
                />
              ))
            ) : (
              <p className="text-xs text-slate-400 italic">Sin eventos registrados</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Componente para una fila del timeline
interface TimelineRowProps {
  item: TimelineItem
  variant: "plan" | "event"
}

function TimelineRow({ item, variant }: TimelineRowProps) {
  const iconConfig = getEventIconConfig(item.eventType || "default", item.feedingType)
  const IconComponent = iconConfig.icon

  return (
    <div className="flex items-center gap-2 text-sm">
      {/* Hora */}
      <span className={cn(
        "font-mono text-xs w-12 flex-shrink-0",
        variant === "plan" ? "text-slate-400" : "text-slate-600 font-medium"
      )}>
        {item.timeDisplay}
      </span>

      {/* Icono */}
      <div className={cn(
        "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0",
        variant === "plan" ? "bg-slate-100" : iconConfig.bgColor
      )}>
        <IconComponent
          className="w-3 h-3"
          style={{ color: variant === "plan" ? "#94a3b8" : iconConfig.color }}
        />
      </div>

      {/* Label */}
      <span className={cn(
        "truncate",
        variant === "plan" ? "text-slate-400" : "text-slate-700"
      )}>
        {item.label}
      </span>
    </div>
  )
}

export default PlanVsEventsCard
