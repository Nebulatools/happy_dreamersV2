"use client"

import React, { useState, useEffect } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Plus, Minus, Clock, Timer } from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { buildLocalDate, dateToTimestamp } from "@/lib/datetime"

export type EndTimeMode = "duration" | "manual"

interface DurationEndTimeSelectorProps {
  // Datos de hora de inicio (necesarios para calcular endTime desde duracion)
  startDate: string       // yyyy-MM-dd
  startTime: string       // HH:mm
  timezone: string
  // Estado actual de endTime
  hasEndTime: boolean
  endDate: string
  endTimeValue: string
  // Duracion inicial (si el evento ya tiene duracion calculada)
  initialDuration?: number
  // Color de acento del modal padre
  accentColor?: string    // ej: "green", "amber", "cyan"
  // Callbacks
  onEndTimeChange: (data: {
    hasEndTime: boolean
    endDate: string
    endTimeValue: string
    endTimeISO?: string    // ISO timestamp listo para usar en editOptions
  }) => void
  // Funcion para obtener hora actual (DevTime compatible)
  getCurrentTime: () => Date
}

/**
 * Componente compartido para seleccionar duracion o hora de fin en modales de eventos.
 * Ofrece 2 tabs:
 * - "Duracion": input de minutos con botones rapidos, calcula endTime automaticamente
 * - "Hora de fin": date+time picker manual
 */
export function DurationEndTimeSelector({
  startDate,
  startTime,
  timezone,
  hasEndTime,
  endDate,
  endTimeValue,
  initialDuration,
  accentColor = "green",
  onEndTimeChange,
  getCurrentTime,
}: DurationEndTimeSelectorProps) {
  // Determinar tab inicial basado en si ya hay endTime
  const [activeTab, setActiveTab] = useState<EndTimeMode>(() => {
    if (hasEndTime) return "duration"
    return "duration"
  })

  // Duracion en minutos
  const [duration, setDuration] = useState<number>(() => {
    if (initialDuration && initialDuration > 0) return initialDuration
    return 15
  })

  // Re-sincronizar duracion cuando cambian los datos iniciales
  useEffect(() => {
    if (initialDuration && initialDuration > 0) {
      setDuration(initialDuration)
    }
  }, [initialDuration])

  // Opciones rapidas de duracion
  const quickOptions = [5, 10, 15, 30, 60]

  // Calcular endTime desde duracion y emitir cambio
  const emitDurationChange = (mins: number) => {
    if (!startDate || !startTime) return

    const startDateObj = buildLocalDate(startDate, startTime)
    const endDateObj = new Date(startDateObj.getTime() + mins * 60 * 1000)

    onEndTimeChange({
      hasEndTime: true,
      endDate: format(endDateObj, "yyyy-MM-dd"),
      endTimeValue: format(endDateObj, "HH:mm"),
      endTimeISO: dateToTimestamp(endDateObj, timezone),
    })
  }

  // Manejar cambio de duracion con botones +/-
  const handleDurationChange = (newDuration: number) => {
    const clamped = Math.max(1, Math.min(480, newDuration))
    setDuration(clamped)
    emitDurationChange(clamped)
  }

  // Manejar seleccion de opcion rapida
  const handleQuickOption = (mins: number) => {
    setDuration(mins)
    emitDurationChange(mins)
  }

  // Manejar cambio manual de hora de fin
  const handleManualEndTimeChange = (newEndDate: string, newEndTime: string) => {
    if (newEndDate && newEndTime) {
      const endDateObj = buildLocalDate(newEndDate, newEndTime)
      onEndTimeChange({
        hasEndTime: true,
        endDate: newEndDate,
        endTimeValue: newEndTime,
        endTimeISO: dateToTimestamp(endDateObj, timezone),
      })
    } else {
      onEndTimeChange({
        hasEndTime: true,
        endDate: newEndDate,
        endTimeValue: newEndTime,
      })
    }
  }

  // Quitar hora de fin
  const handleRemoveEndTime = () => {
    onEndTimeChange({
      hasEndTime: false,
      endDate: format(getCurrentTime(), "yyyy-MM-dd"),
      endTimeValue: "",
    })
  }

  // Formatear duracion para mostrar
  const formatDuration = (mins: number): string => {
    if (mins >= 60) {
      const h = Math.floor(mins / 60)
      const m = mins % 60
      return m > 0 ? `${h}h ${m}min` : `${h}h`
    }
    return `${mins} min`
  }

  // Formatear label de opcion rapida
  const formatQuickLabel = (mins: number): string => {
    if (mins >= 60) return `${mins / 60}h`
    return `${mins}m`
  }

  // Colores basados en accentColor
  const ringColor = `focus:ring-${accentColor}-500`
  const tabActiveClass = `data-[state=active]:text-${accentColor}-700`

  // Si no hay endTime y el usuario no ha interactuado, mostrar boton para agregar
  if (!hasEndTime && activeTab === "duration") {
    // Iniciar directamente con el tab de duracion activado
  }

  return (
    <div className="space-y-2">
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as EndTimeMode)}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2 h-9">
          <TabsTrigger value="duration" className="text-xs gap-1">
            <Timer className="w-3 h-3" />
            Duracion
          </TabsTrigger>
          <TabsTrigger value="manual" className="text-xs gap-1">
            <Clock className="w-3 h-3" />
            Hora de fin
          </TabsTrigger>
        </TabsList>

        {/* Tab: Duracion */}
        <TabsContent value="duration" className="space-y-3 mt-3">
          {/* Botones rapidos */}
          <div className="flex gap-1.5 justify-center flex-wrap">
            {quickOptions.map((mins) => (
              <button
                key={mins}
                type="button"
                onClick={() => handleQuickOption(mins)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-full border transition-colors",
                  duration === mins
                    ? "bg-gray-800 text-white border-gray-800"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                )}
              >
                {formatQuickLabel(mins)}
              </button>
            ))}
          </div>

          {/* Selector +/- */}
          <div className="flex items-center justify-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => handleDurationChange(duration - (duration > 60 ? 15 : duration > 10 ? 5 : 1))}
              disabled={duration <= 1}
              className="h-9 w-9 rounded-full"
            >
              <Minus className="h-4 w-4" />
            </Button>

            <div className="bg-gray-50 border rounded-lg px-4 py-2 min-w-[120px] text-center">
              <div className="text-lg font-semibold text-gray-800">
                {formatDuration(duration)}
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => handleDurationChange(duration + (duration >= 60 ? 15 : duration >= 10 ? 5 : 1))}
              disabled={duration >= 480}
              className="h-9 w-9 rounded-full"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Boton para quitar endTime */}
          {hasEndTime && (
            <button
              type="button"
              onClick={handleRemoveEndTime}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors mx-auto block"
            >
              Quitar hora de fin
            </button>
          )}
        </TabsContent>

        {/* Tab: Hora de fin manual */}
        <TabsContent value="manual" className="space-y-3 mt-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Fecha</label>
              <input
                type="date"
                value={hasEndTime ? endDate : format(getCurrentTime(), "yyyy-MM-dd")}
                onChange={(e) => {
                  const newDate = e.target.value
                  const newTime = endTimeValue || format(getCurrentTime(), "HH:mm")
                  handleManualEndTimeChange(newDate, newTime)
                }}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Hora</label>
              <input
                type="time"
                value={hasEndTime ? endTimeValue : ""}
                onChange={(e) => {
                  const newTime = e.target.value
                  const newDate = hasEndTime ? endDate : format(getCurrentTime(), "yyyy-MM-dd")
                  handleManualEndTimeChange(newDate, newTime)
                }}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
            </div>
          </div>

          {/* Boton para quitar endTime */}
          {hasEndTime && (
            <button
              type="button"
              onClick={handleRemoveEndTime}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors mx-auto block"
            >
              Quitar hora de fin
            </button>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
