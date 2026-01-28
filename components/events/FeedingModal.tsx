"use client"

import React, { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { UtensilsCrossed, Plus, Minus, Heart, Milk } from "lucide-react"
import { cn } from "@/lib/utils"
import { FeedingModalData, FeedingType, EditOptions } from "./types"
import { format } from "date-fns"
import { useDevTime } from "@/context/dev-time-context"
import { useUser } from "@/context/UserContext"
import { buildLocalDate, dateToTimestamp, DEFAULT_TIMEZONE } from "@/lib/datetime"

interface FeedingModalProps {
  open: boolean
  onClose: () => void
  onConfirm: (data: FeedingModalData, editOptions?: EditOptions) => void | Promise<void>
  childName: string
  mode?: "create" | "edit"
  initialData?: {
    feedingType?: FeedingType
    feedingAmount?: number
    feedingDuration?: number
    babyState?: "awake" | "asleep"
    feedingNotes?: string
    startTime?: string
    endTime?: string
    eventId?: string
  }
}

/**
 * Modal para capturar información de alimentación
 * Registra tipo, cantidad, duración, estado del bebé y notas
 */
export function FeedingModal({
  open,
  onClose,
  onConfirm,
  childName,
  mode = "create",
  initialData,
}: FeedingModalProps) {
  const { getCurrentTime } = useDevTime()
  const { userData } = useUser()
  const timezone = userData?.timezone || DEFAULT_TIMEZONE
  const [feedingType, setFeedingType] = useState<FeedingType>(initialData?.feedingType || "breast")
  const [feedingAmount, setFeedingAmount] = useState<number>(() => {
    if (typeof initialData?.feedingAmount === "number") return initialData.feedingAmount
    const t = initialData?.feedingType || "breast"
    if (t === "breast") return 15
    if (t === "bottle") return 4
    return 50
  })
  const [feedingDuration, setFeedingDuration] = useState<number>(initialData?.feedingDuration || 15) // Default 15 min
  const [babyState, setBabyState] = useState<"awake" | "asleep">(initialData?.babyState || "awake")
  const [feedingNotes, setFeedingNotes] = useState<string>(initialData?.feedingNotes || "")
  const [bottleUnit, setBottleUnit] = useState<"oz" | "ml">("oz") // Unidad para biberón
  // Hora de inicio: en create es cuando empezo la alimentacion, en edit es la hora guardada
  const [feedingTime, setFeedingTime] = useState<string>(() => {
    if (mode === "edit" && initialData?.startTime) {
      return format(new Date(initialData.startTime), "HH:mm")
    }
    return format(getCurrentTime(), "HH:mm")
  })
  const [eventDate, setEventDate] = useState<string>(() => {
    if (mode === "edit" && initialData?.startTime) {
      return format(new Date(initialData.startTime), "yyyy-MM-dd")
    }
    return format(getCurrentTime(), "yyyy-MM-dd")
  })
  // Estados para hora de fin (endTime) - solo en modo edicion
  const [endDate, setEndDate] = useState<string>(() => {
    if (mode === "edit" && initialData?.endTime) {
      return format(new Date(initialData.endTime), "yyyy-MM-dd")
    }
    return format(getCurrentTime(), "yyyy-MM-dd")
  })
  const [endTimeValue, setEndTimeValue] = useState<string>(() => {
    if (mode === "edit" && initialData?.endTime) {
      return format(new Date(initialData.endTime), "HH:mm")
    }
    return ""
  })
  const [hasEndTime, setHasEndTime] = useState<boolean>(() => {
    return mode === "edit" && !!initialData?.endTime
  })
  const [isProcessing, setIsProcessing] = useState(false)

  // Inicializar con datos cuando se abre en modo edición
  useEffect(() => {
    if (open && mode === "edit" && initialData) {
      setFeedingType(initialData.feedingType || "breast")
      if (typeof initialData.feedingAmount === "number") {
        setFeedingAmount(initialData.feedingAmount)
      } else {
        setFeedingAmount(initialData.feedingType === "breast" ? 15 : initialData.feedingType === "bottle" ? 4 : 50)
      }
      setFeedingDuration(initialData.feedingDuration || 15)
      setBabyState(initialData.babyState || "awake")
      setFeedingNotes(initialData.feedingNotes || "")
      if (initialData.startTime) {
        setEventDate(format(new Date(initialData.startTime), "yyyy-MM-dd"))
        setFeedingTime(format(new Date(initialData.startTime), "HH:mm"))
      }
      // Inicializar hora de fin si existe
      if (initialData.endTime) {
        setEndDate(format(new Date(initialData.endTime), "yyyy-MM-dd"))
        setEndTimeValue(format(new Date(initialData.endTime), "HH:mm"))
        setHasEndTime(true)
      } else {
        setEndDate(format(getCurrentTime(), "yyyy-MM-dd"))
        setEndTimeValue("")
        setHasEndTime(false)
      }
    }
    // En modo create, actualizar la hora al abrir el modal
    if (open && mode === "create") {
      setFeedingTime(format(getCurrentTime(), "HH:mm"))
    }
  }, [open, mode, initialData, getCurrentTime])

  // Tipos de alimentación disponibles con íconos oficiales y colores
  const feedingTypes = [
    {
      value: "breast" as FeedingType,
      label: "Pecho",
      Icon: Heart,
      color: "text-pink-500",        // #EC4899
      selectedBg: "bg-pink-50",
      selectedBorder: "border-pink-500",
      selectedText: "text-pink-700",
      description: "Lactancia materna",
      unit: "minutos",
    },
    {
      value: "bottle" as FeedingType,
      label: "Biberón",
      Icon: Milk,
      color: "text-sky-500",         // #0EA5E9
      selectedBg: "bg-sky-50",
      selectedBorder: "border-sky-500",
      selectedText: "text-sky-700",
      description: "Leche o fórmula",
      unit: "oz",
    },
    {
      value: "solids" as FeedingType,
      label: "Sólidos",
      Icon: UtensilsCrossed,
      color: "text-emerald-500",     // #10B981
      selectedBg: "bg-emerald-50",
      selectedBorder: "border-emerald-500",
      selectedText: "text-emerald-700",
      description: "Comida sólida",
      unit: "gr",
    },
  ]

  // Estados del bebé durante la alimentación
  const babyStates = [
    { value: "awake" as const, label: "Despierto", description: "Alimentación normal" },
    { value: "asleep" as const, label: "Dormido", description: "Toma nocturna" },
  ]

  // Configuración según tipo de alimentación
  const getAmountConfig = () => {
    switch (feedingType) {
    case "breast": {
      // Dinámico: 1–10 paso 1; >10 paso 5
      const step = feedingAmount <= 10 ? 1 : 5
      return { min: 1, max: 120, step, unit: "min", label: "Duración (min)" }
    }
    case "bottle":
      // Selector de unidad: oz o ml
      const unit = bottleUnit
      const max = unit === "oz" ? 16 : 500
      const step = unit === "oz" ? 1 : 10
      return { min: 1, max, step, unit, label: `Cantidad (${unit})` }
    case "solids":
      // Para sólidos: solo input de texto para describir el alimento
      return { min: 0, max: 0, step: 0, unit: "", label: "Descripción del alimento" }
    }
  }

  const amountConfig = getAmountConfig()

  // Ajustar cantidad/duración
  const adjustAmount = (increment: number) => {
    setFeedingAmount(prev => {
      // Recalcular step dinámico para pecho
      const dynamicStep = feedingType === "breast" ? (prev <= 10 ? 1 : 5) : amountConfig.step
      const inc = increment === amountConfig.step ? dynamicStep : increment
      const newValue = prev + inc
      return Math.max(amountConfig.min, Math.min(amountConfig.max, newValue))
    })
  }

  // Ajustar duración
  const adjustDuration = (increment: number) => {
    setFeedingDuration(prev => {
      const newValue = prev + increment
      return Math.max(1, Math.min(60, newValue))
    })
  }

  // Formatear el texto de cantidad
  const formatAmountText = (amount: number): string => {
    if (feedingType === "breast") {
      return `${amount} minutos`
    }
    return `${amount} ${amountConfig.unit}`
  }

  // Formatear el texto de duración
  const formatDurationText = (minutes: number): string => {
    if (minutes >= 60) return `${Math.floor(minutes/60)}h ${minutes%60}min`
    return `${minutes} min`
  }

  const handleConfirm = async () => {
    setIsProcessing(true)

    // Normalización: sólidos siempre despierto
    const normalizedBabyState = feedingType === "solids" ? "awake" : babyState
    const data: FeedingModalData = {
      feedingType,
      feedingAmount: feedingType === "bottle" ? feedingAmount : undefined,
      babyState: normalizedBabyState,
      feedingNotes,
      // Nueva propiedad: hora de inicio (para calcular startTime en el Button)
      feedingTime,
    }

    // Construir editOptions solo en modo edición
    let editOptions: EditOptions | undefined
    if (mode === "edit" && eventDate && feedingTime) {
      const startDateObj = buildLocalDate(eventDate, feedingTime)
      editOptions = {
        startTime: dateToTimestamp(startDateObj, timezone),
      }

      // Construir endTime si existe
      if (hasEndTime && endTimeValue) {
        const endDateTime = buildLocalDate(endDate, endTimeValue)
        editOptions.endTime = dateToTimestamp(endDateTime, timezone)
      }
    }

    await onConfirm(data, editOptions)
    setIsProcessing(false)

    // Reset para próxima vez
    setFeedingType("breast")
    setFeedingAmount(4)
    setBabyState("awake")
    setFeedingNotes("")
  }

  const handleCancel = () => {
    onClose()
    // Reset
    if (mode === "edit" && initialData) {
      // En modo edición, restaurar valores iniciales
      setFeedingType(initialData.feedingType || "breast")
      setFeedingAmount(initialData.feedingAmount || 4)
      setBabyState(initialData.babyState || "awake")
      setFeedingNotes(initialData.feedingNotes || "")
      if (initialData.startTime) {
        setEventDate(format(new Date(initialData.startTime), "yyyy-MM-dd"))
        setFeedingTime(format(new Date(initialData.startTime), "HH:mm"))
      }
      // Restaurar endTime si existe
      if (initialData.endTime) {
        setEndDate(format(new Date(initialData.endTime), "yyyy-MM-dd"))
        setEndTimeValue(format(new Date(initialData.endTime), "HH:mm"))
        setHasEndTime(true)
      } else {
        setEndDate(format(getCurrentTime(), "yyyy-MM-dd"))
        setEndTimeValue("")
        setHasEndTime(false)
      }
    } else {
      // En modo creación, limpiar todo
      setFeedingType("breast")
      setFeedingAmount(4)
      setBabyState("awake")
      setFeedingNotes("")
      const now = getCurrentTime()
      setEventDate(format(now, "yyyy-MM-dd"))
      setFeedingTime(format(now, "HH:mm"))
      setEndDate(format(now, "yyyy-MM-dd"))
      setEndTimeValue("")
      setHasEndTime(false)
    }
  }

  return (
    <Dialog 
      open={open} 
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          handleCancel()
        }
      }}
    >
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UtensilsCrossed className="w-5 h-5 text-emerald-500" />
            {mode === "edit" ? "Editar Alimentación" : "Registro de Alimentación"}
          </DialogTitle>
          <DialogDescription>
            {mode === "edit" 
              ? `Modifica los detalles de la alimentación de ${childName}`
              : `Registra la alimentación de ${childName}`}
          </DialogDescription>
        </DialogHeader>

        {/* Hora de inicio - Visible en ambos modos */}
        <div className={cn("pb-4", mode === "edit" ? "border-b" : "")}>
          {mode === "edit" ? (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Fecha</label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Hora de inicio</label>
                <input
                  type="time"
                  value={feedingTime}
                  onChange={(e) => setFeedingTime(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Hora de inicio</label>
              <input
                type="time"
                value={feedingTime}
                onChange={(e) => setFeedingTime(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-lg text-center focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <p className="text-xs text-gray-500 text-center">Cuando empezo la alimentacion</p>
            </div>
          )}
        </div>

        {/* Hora de fin - Solo visible en modo edición */}
        {mode === "edit" && (
          <div className="space-y-3 pb-4 border-b">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-gray-700">
                Hora de fin
              </div>
              {!hasEndTime && (
                <button
                  type="button"
                  onClick={() => {
                    setHasEndTime(true)
                    setEndDate(eventDate)
                    setEndTimeValue(format(getCurrentTime(), "HH:mm"))
                  }}
                  className="text-xs text-green-600 hover:text-green-700 underline"
                >
                  + Agregar hora de fin
                </button>
              )}
            </div>
            {hasEndTime ? (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs text-gray-500">Fecha</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-500">Hora</label>
                  <div className="flex gap-1">
                    <input
                      type="time"
                      value={endTimeValue}
                      onChange={(e) => setEndTimeValue(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setHasEndTime(false)
                        setEndTimeValue("")
                      }}
                      className="px-2 text-gray-400 hover:text-red-500"
                      title="Quitar hora de fin"
                    >
                      x
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-gray-500 italic">
                No hay hora de fin registrada
              </div>
            )}
          </div>
        )}

        {/* Sección 1: Tipo de Alimentación */}
        <div className="space-y-3 mt-4">
          <div className="text-sm font-medium text-gray-700">
            Tipo de alimentación
          </div>
          <div className="grid grid-cols-3 gap-2">
            {feedingTypes.map(type => {
              const isSelected = feedingType === type.value
              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => {
                    setFeedingType(type.value)
                    // Ajustar cantidad por defecto según tipo
                    if (type.value === "breast") setFeedingAmount(15)
                    else if (type.value === "bottle") setFeedingAmount(4)
                    else setFeedingAmount(50)
                    // Sólidos: siempre despierto
                    if (type.value === "solids") setBabyState("awake")
                  }}
                  disabled={isProcessing}
                  className={cn(
                    "p-3 rounded-lg border-2 transition-all text-center",
                    isSelected
                      ? `${type.selectedBorder} ${type.selectedBg}`
                      : "border-gray-200 hover:border-gray-300"
                  )}
                >
                  <type.Icon className={cn("w-6 h-6 mx-auto mb-1", type.color)} />
                  <div className={cn(
                    "font-medium text-sm",
                    isSelected ? type.selectedText : "text-gray-700"
                  )}>
                    {type.label}
                  </div>
                  <div className="text-xs text-gray-500">
                    {type.description}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Sección 2: Campos según tipo de alimentación */}
        <div className="space-y-4 border-t pt-4">
          {/* PECHO: Sin campo de duración - se calcula automáticamente */}
          {feedingType === "breast" && (
            <div className="text-center py-4 text-sm text-gray-500">
              La duración se calculará automáticamente al guardar
            </div>
          )}

          {/* BIBERÓN: Cantidad con selector oz/ml */}
          {feedingType === "bottle" && (
            <>
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-gray-700">
                  Cantidad
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setBottleUnit("oz")
                      setFeedingAmount(4) // Reset al cambiar unidad
                    }}
                    className={cn(
                      "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                      bottleUnit === "oz"
                        ? "bg-green-500 text-white"
                        : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                    )}
                  >
                    oz
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBottleUnit("ml")
                      setFeedingAmount(120) // Reset al cambiar unidad
                    }}
                    className={cn(
                      "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                      bottleUnit === "ml"
                        ? "bg-green-500 text-white"
                        : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                    )}
                  >
                    ml
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-center gap-4 py-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => adjustAmount(-amountConfig.step)}
                  disabled={isProcessing || feedingAmount <= amountConfig.min}
                  className="h-10 w-10 rounded-full"
                >
                  <Minus className="h-4 w-4" />
                </Button>

                <div className="bg-green-50 border-2 border-green-200 rounded-xl px-3 py-3 min-w-[200px] text-center flex items-center gap-2 justify-center">
                  <div className="text-2xl font-bold text-green-600">
                    {feedingAmount} {bottleUnit}
                  </div>
                  <input
                    type="number"
                    className="w-16 h-9 text-center text-sm border rounded-md bg-white"
                    value={feedingAmount}
                    min={amountConfig.min}
                    max={amountConfig.max}
                    onChange={(e) => {
                      const val = Number(e.target.value)
                      if (Number.isFinite(val)) {
                        setFeedingAmount(Math.max(amountConfig.min, Math.min(amountConfig.max, val)))
                      }
                    }}
                  />
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => adjustAmount(amountConfig.step)}
                  disabled={isProcessing || feedingAmount >= amountConfig.max}
                  className="h-10 w-10 rounded-full"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}

          {/* SÓLIDOS: Solo input de texto para descripción */}
          {feedingType === "solids" && (
            <>
              <div className="text-sm font-medium text-gray-700">
                Descripción del alimento (opcional)
              </div>
              <textarea
                value={feedingNotes}
                onChange={(e) => setFeedingNotes(e.target.value)}
                disabled={isProcessing}
                placeholder="Describe qué alimento sólido consumió el bebé..."
                className="w-full p-3 border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                rows={3}
                maxLength={500}
              />
            </>
          )}
        </div>

        {/* Sección 3: Estado del Bebé (solo para pecho y biberón) */}
        {feedingType !== "solids" && (
          <div className="space-y-3 border-t pt-4">
            <div className="text-sm font-medium text-gray-700">
              Estado de {childName}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {babyStates.map(state => (
                <button
                  key={state.value}
                  type="button"
                  onClick={() => setBabyState(state.value)}
                  disabled={isProcessing}
                  className={cn(
                    "p-3 rounded-lg border-2 transition-all text-center",
                    babyState === state.value
                      ? "border-green-500 bg-green-50"
                      : "border-gray-200 hover:border-gray-300"
                  )}
                >
                  <div className={cn(
                    "font-medium text-sm",
                    babyState === state.value ? "text-green-700" : "text-gray-700"
                  )}>
                    {state.label}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {state.description}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Sección 4: Notas adicionales (solo para pecho y biberón) */}
        {feedingType !== "solids" && (
          <div className="space-y-2 border-t pt-4">
            <div className="text-sm font-medium text-gray-700">
              Notas adicionales (opcional)
            </div>
            <textarea
              value={feedingNotes}
              onChange={(e) => setFeedingNotes(e.target.value)}
              disabled={isProcessing}
              placeholder="¿Cómo fue la alimentación? ¿Se terminó todo? ¿Hubo alguna dificultad? ¿Cambio de posición?"
              className="w-full p-3 border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-gray-500">
              Esta información ayuda a entender los patrones de alimentación
            </p>
          </div>
        )}

        {/* Botones de acción */}
        <div className="flex gap-2 mt-6">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isProcessing}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isProcessing}
            className="flex-1 bg-green-500 hover:bg-green-600"
          >
            {isProcessing 
              ? (mode === "edit" ? "Guardando..." : "Registrando...") 
              : (mode === "edit" ? "Guardar Cambios" : "Confirmar")}
          </Button>
        </div>

        <p className="text-xs text-gray-500 text-center mt-2">
          Esta información ayuda a entender los patrones de alimentación
        </p>
      </DialogContent>
    </Dialog>
  )
}
