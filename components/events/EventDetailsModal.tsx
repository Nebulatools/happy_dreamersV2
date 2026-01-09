"use client"

import { format, differenceInHours, differenceInMinutes } from "date-fns"
import { es } from "date-fns/locale"
import { Calendar, Clock, Moon, Sun, AlertCircle, Trash2, Pencil } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { formatTime } from "@/lib/datetime"
import type { Event } from "@/types/models"

// ============================================
// Funciones helper para formatear campos de eventos
// ============================================

const getEventTypeIcon = (type: string) => {
  switch(type) {
  case "sleep":
    return <Moon className="w-4 h-4" />
  case "nap":
    return <Sun className="w-4 h-4" />
  case "wake":
    return <Sun className="w-4 h-4" />
  case "night_waking":
    return <AlertCircle className="w-4 h-4" />
  default:
    return null
  }
}

const getEventTypeColor = (type: string) => {
  // Colores pasteles unificados con la tabla de eventos
  switch(type) {
  case "sleep":
    return "bg-blue-200 text-blue-800"
  case "nap":
    return "bg-blue-100 text-blue-600"
  case "wake":
    return "bg-amber-200 text-amber-800"
  case "night_waking":
    return "bg-red-200 text-red-800"
  case "feeding":
    return "bg-sky-200 text-sky-800"
  case "night_feeding":
    return "bg-yellow-200 text-yellow-800"
  case "medication":
    return "bg-purple-200 text-purple-800"
  case "activity":
  case "extra_activities":
    return "bg-indigo-200 text-indigo-800"
  default:
    return "bg-gray-200 text-gray-800"
  }
}

const getEventTypeName = (type: string) => {
  const types: Record<string, string> = {
    sleep: "Dormir",
    bedtime: "Dormir",
    nap: "Siesta",
    wake: "Despertar",
    night_waking: "Despertar nocturno",
    feeding: "Alimentacion",
    night_feeding: "Alimentacion nocturna",
    medication: "Medicamento",
    activity: "Actividad Extra",
    extra_activities: "Actividad Extra",
    meal: "Comida",
    play: "Juego",
    bath: "Bano",
    other: "Otro",
  }
  return types[type] || type
}

const getEmotionalStateName = (state: string) => {
  const states: Record<string, string> = {
    happy: "Feliz",
    calm: "Tranquilo",
    neutral: "Neutral",
    excited: "Emocionado",
    tired: "Cansado",
    irritable: "Irritable",
    sad: "Triste",
    anxious: "Ansioso",
    restless: "Inquieto",
  }
  return states[state] || state
}

const getFeedingTypeName = (type: string) => {
  const types: Record<string, string> = {
    breast: "Pecho",
    bottle: "Biberon",
    solids: "Solidos",
  }
  return types[type] || type
}

const getBabyStateName = (state: string) => {
  const states: Record<string, string> = {
    awake: "Despierto",
    asleep: "Dormido",
  }
  return states[state] || state
}

const getActivityImpactName = (impact: string) => {
  const impacts: Record<string, string> = {
    positive: "Positivo",
    neutral: "Neutral",
    negative: "Negativo",
  }
  return impacts[impact] || impact
}

const formatMinutes = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes} minuto${minutes !== 1 ? "s" : ""}`
  }
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) {
    return `${hours} hora${hours !== 1 ? "s" : ""}`
  }
  return `${hours} hora${hours !== 1 ? "s" : ""} y ${mins} minuto${mins !== 1 ? "s" : ""}`
}

const formatFeedingAmount = (type: string, amount: number): string => {
  if (type === "breast") {
    return `${amount} minutos`
  } else if (type === "bottle") {
    return `${amount} oz`
  } else if (type === "solids") {
    return `${amount} gr`
  }
  return `${amount}`
}

// ============================================
// Componente EventDetailsModal
// ============================================

interface EventDetailsModalProps {
  event: Event | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: () => void
  onDelete?: () => void
  showActions?: boolean
  userTimeZone?: string
}

export function EventDetailsModal({
  event,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  showActions = true,
  userTimeZone = "America/Mexico_City"
}: EventDetailsModalProps) {
  if (!event) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getEventTypeIcon(event.eventType)}
            <span>Detalles del Evento</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Badge del tipo de evento */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className={cn(
              "px-3 py-1 rounded-full text-sm font-medium inline-flex items-center gap-2",
              getEventTypeColor(event.eventType)
            )}>
              {getEventTypeIcon(event.eventType)}
              {getEventTypeName(event.eventType)}
            </div>
            {/* Badge "Nocturna" para alimentaciones durante el sueño */}
            {(event.isNightFeeding || event.eventType === "night_feeding") && (
              <div className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                Nocturna
              </div>
            )}
          </div>

          {/* Informacion principal */}
          <div className="space-y-3">
            {/* Fecha */}
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="font-medium">Fecha:</span>
              <span>{format(new Date(event.startTime), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}</span>
            </div>

            {/* Hora */}
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="font-medium">Hora:</span>
              <span>
                {formatTime(event.startTime, userTimeZone)}
                {event.endTime && ` - ${formatTime(event.endTime, userTimeZone)}`}
              </span>
            </div>

            {/* Duracion si tiene endTime */}
            {event.endTime && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="font-medium">Duracion:</span>
                <span>
                  {(() => {
                    const start = new Date(event.startTime)
                    const end = new Date(event.endTime)
                    const hours = differenceInHours(end, start)
                    const minutes = differenceInMinutes(end, start) % 60
                    if (hours > 0) {
                      return `${hours}h ${minutes > 0 ? `${minutes}min` : ""}`
                    }
                    return `${differenceInMinutes(end, start)}min`
                  })()}
                </span>
              </div>
            )}

            {/* Estado emocional */}
            {event.emotionalState && (
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">Estado emocional:</span>
                <span>{getEmotionalStateName(event.emotionalState)}</span>
              </div>
            )}
          </div>

          {/* Notas generales */}
          {event.notes && (
            <div className="border-t pt-3">
              <div className="flex items-start gap-2">
                <span className="text-sm font-medium text-gray-600">Notas:</span>
              </div>
              <p className="text-sm text-gray-700 mt-1 bg-gray-50 p-3 rounded-lg">
                {event.notes}
              </p>
            </div>
          )}

          {/* ============================================ */}
          {/* SECCIONES ESPECIFICAS POR TIPO DE EVENTO */}
          {/* ============================================ */}

          {/* SLEEP / NAP */}
          {(event.eventType === "sleep" || event.eventType === "nap") && (
            <div className="border-t pt-3 space-y-2">
              <div className="text-sm font-medium text-gray-600">
                Informacion del {event.eventType === "sleep" ? "sueno" : "siesta"}
              </div>

              {typeof event.sleepDelay === "number" && event.sleepDelay > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">Tiempo para dormirse:</span>
                  <span>{formatMinutes(event.sleepDelay)}</span>
                </div>
              )}

              {event.endTime ? (
                <div className="text-sm text-gray-700">
                  El nino durmio {(() => {
                    const start = new Date(event.startTime)
                    const end = new Date(event.endTime)
                    const hours = differenceInHours(end, start)
                    const minutes = differenceInMinutes(end, start) % 60
                    if (hours > 0) {
                      return `${hours} hora${hours > 1 ? "s" : ""} ${minutes > 0 ? `y ${minutes} minuto${minutes > 1 ? "s" : ""}` : ""}`
                    }
                    return `${differenceInMinutes(end, start)} minutos`
                  })()}
                </div>
              ) : (
                <div className="text-sm text-indigo-600">
                  El nino esta durmiendo actualmente
                </div>
              )}

              {event.didNotSleep && (
                <div className="text-sm text-orange-600 bg-orange-50 p-2 rounded">
                  No logro dormirse
                </div>
              )}
            </div>
          )}

          {/* NIGHT_WAKING */}
          {event.eventType === "night_waking" && (
            <div className="border-t pt-3 space-y-2">
              <div className="text-sm font-medium text-gray-600">
                Informacion del despertar nocturno
              </div>

              {typeof event.awakeDelay === "number" && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">Tiempo despierto:</span>
                  <span>{formatMinutes(event.awakeDelay)}</span>
                </div>
              )}

              {event.endTime && (
                <div className="text-sm text-gray-700">
                  Duracion total del episodio: {(() => {
                    const start = new Date(event.startTime)
                    const end = new Date(event.endTime)
                    const minutes = differenceInMinutes(end, start)
                    return formatMinutes(minutes)
                  })()}
                </div>
              )}
            </div>
          )}

          {/* FEEDING / NIGHT_FEEDING */}
          {(event.eventType === "feeding" || event.eventType === "night_feeding") && (
            <div className="border-t pt-3 space-y-2">
              <div className="text-sm font-medium text-gray-600">
                Informacion de alimentacion
              </div>

              {event.feedingType && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">Tipo:</span>
                  <span>{getFeedingTypeName(event.feedingType)}</span>
                </div>
              )}

              {typeof event.feedingAmount === "number" && event.feedingType && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">Cantidad:</span>
                  <span>{formatFeedingAmount(event.feedingType, event.feedingAmount)}</span>
                </div>
              )}

              {typeof event.feedingDuration === "number" && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">Duracion:</span>
                  <span>{formatMinutes(event.feedingDuration)}</span>
                </div>
              )}

              {event.babyState && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">Estado del bebe:</span>
                  <span>{getBabyStateName(event.babyState)}</span>
                </div>
              )}

              {/* Indicador de alimentación nocturna */}
              {(event.isNightFeeding || event.eventType === "night_feeding") && (
                <div className="text-sm text-purple-600 bg-purple-50 p-2 rounded">
                  Esta alimentacion ocurrio mientras el bebe dormia
                </div>
              )}

              {event.feedingNotes && (
                <div className="mt-2">
                  <span className="text-sm font-medium text-gray-600">Notas de alimentacion:</span>
                  <p className="text-sm text-gray-700 mt-1 bg-gray-50 p-2 rounded">
                    {event.feedingNotes}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* MEDICATION */}
          {event.eventType === "medication" && (
            <div className="border-t pt-3 space-y-2">
              <div className="text-sm font-medium text-gray-600">
                Informacion del medicamento
              </div>

              {event.medicationName && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">Medicamento:</span>
                  <span>{event.medicationName}</span>
                </div>
              )}

              {event.medicationDose && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">Dosis:</span>
                  <span>{event.medicationDose}</span>
                </div>
              )}

              {event.medicationTime && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">Hora de administracion:</span>
                  <span>{event.medicationTime}</span>
                </div>
              )}

              {event.medicationNotes && (
                <div className="mt-2">
                  <span className="text-sm font-medium text-gray-600">Notas del medicamento:</span>
                  <p className="text-sm text-gray-700 mt-1 bg-gray-50 p-2 rounded">
                    {event.medicationNotes}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* EXTRA_ACTIVITIES */}
          {event.eventType === "extra_activities" && (
            <div className="border-t pt-3 space-y-2">
              <div className="text-sm font-medium text-gray-600">
                Informacion de la actividad
              </div>

              {event.activityDescription && (
                <div className="flex items-start gap-2 text-sm">
                  <span className="font-medium">Descripcion:</span>
                  <span className="flex-1">{event.activityDescription}</span>
                </div>
              )}

              {typeof event.activityDuration === "number" && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">Duracion:</span>
                  <span>{formatMinutes(event.activityDuration)}</span>
                </div>
              )}

              {event.activityImpact && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">Impacto en el sueno:</span>
                  <span className={cn(
                    "px-2 py-1 rounded-full text-xs font-medium",
                    event.activityImpact === "positive" && "bg-green-100 text-green-700",
                    event.activityImpact === "neutral" && "bg-gray-100 text-gray-700",
                    event.activityImpact === "negative" && "bg-red-100 text-red-700"
                  )}>
                    {getActivityImpactName(event.activityImpact)}
                  </span>
                </div>
              )}

              {event.activityNotes && (
                <div className="mt-2">
                  <span className="text-sm font-medium text-gray-600">Notas de la actividad:</span>
                  <p className="text-sm text-gray-700 mt-1 bg-gray-50 p-2 rounded">
                    {event.activityNotes}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Botones de accion */}
        {showActions && (onEdit || onDelete) && (
          <div className="flex justify-end gap-2 pt-4 border-t">
            {onDelete && (
              <Button
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={onDelete}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Eliminar
              </Button>
            )}
            {onEdit && (
              <Button
                className="bg-primary hover:bg-primary/90 text-white"
                onClick={onEdit}
              >
                <Pencil className="w-4 h-4 mr-2" />
                Editar
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
