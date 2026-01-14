// Componente para visualizar y editar planes detallados de niños
// Permite editar rutina diaria, objetivos y recomendaciones

"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Clock, 
  Moon, 
  Sun, 
  Utensils, 
  Target, 
  AlertCircle,
  Moon as Nap,
  Info,
  Edit,
  Save,
  X,
  Plus,
  Minus,
  Trash2,
  Activity as ActivityIcon,
} from "lucide-react"
import { ChildPlan } from "@/types/models"
import { PlanEventEditModal, PlanEventData, PlanEventType } from "./PlanEventEditModal"

interface EditablePlanDisplayProps {
  plan: ChildPlan
  onPlanUpdate?: (updatedPlan: ChildPlan) => void
}

type SleepRoutine = NonNullable<ChildPlan["sleepRoutine"]>

const EMPTY_SLEEP_ROUTINE: SleepRoutine = {
  suggestedBedtime: "",
  suggestedWakeTime: "",
  numberOfNaps: 0,
  napDuration: "",
  wakeWindows: "",
  notes: "",
}

type TemplateEventType = "nap" | "meal" | "activity" | "bedtime" | "wake"

type EventTemplate = {
  id: string
  type: TemplateEventType
  label: string
  duration?: number
  description?: string
  suggestedTime?: string
}

const EVENT_TEMPLATES: EventTemplate[] = [
  { id: "nap-morning", type: "nap", label: "Siesta matutina", duration: 60, suggestedTime: "09:30", description: "Descanso ligero después del desayuno" },
  { id: "nap-midday", type: "nap", label: "Siesta de mediodía", duration: 75, suggestedTime: "12:30", description: "Recarga de energía antes de la tarde" },
  { id: "nap-afternoon", type: "nap", label: "Siesta vespertina", duration: 45, suggestedTime: "16:00", description: "Descanso corto antes de la rutina vespertina" },
  { id: "meal-breakfast", type: "meal", label: "Desayuno", suggestedTime: "07:30", description: "Comida completa para iniciar el día" },
  { id: "meal-lunch", type: "meal", label: "Comida", suggestedTime: "12:00", description: "Plato fuerte del día" },
  { id: "meal-dinner", type: "meal", label: "Cena ligera", suggestedTime: "18:30", description: "Alternativa suave antes de dormir" },
  { id: "meal-snack", type: "meal", label: "Snack saludable", suggestedTime: "15:30", description: "Fruta o yogurt" },
  { id: "activity-play", type: "activity", label: "Juego activo", duration: 30, suggestedTime: "10:30", description: "Actividad motriz o al aire libre" },
  { id: "activity-quiet", type: "activity", label: "Actividad tranquila", duration: 20, suggestedTime: "18:00", description: "Lectura o rompecabezas" },
  { id: "activity-winddown", type: "activity", label: "Rutina de relajación", duration: 15, suggestedTime: "19:30", description: "Baño y masajes suaves" },
  { id: "core-wake", type: "wake", label: "Hora de despertar", suggestedTime: "07:00", description: "Despertar recomendado" },
  { id: "core-bedtime", type: "bedtime", label: "Dormir", suggestedTime: "20:00", description: "" },
]

const getTemplateByType = (type: TemplateEventType) => {
  const matches = EVENT_TEMPLATES.filter(template => template.type === type)
  return matches.length ? matches : EVENT_TEMPLATES
}

const buildEventFromTemplate = (template: EventTemplate, prev?: Partial<NewEventState>): NewEventState => {
  const baseDuration = template.type === "nap" || template.type === "activity"
    ? template.duration ?? prev?.duration ?? 30
    : undefined

  return {
    type: template.type,
    templateId: template.id,
    label: template.label,
    time: template.suggestedTime ?? prev?.time ?? "14:00",
    duration: baseDuration,
    description: template.description ?? prev?.description ?? "",
  }
}

type NewEventState = {
  type: TemplateEventType
  templateId: string
  label: string
  time: string
  duration?: number
  description: string
}

export function EditablePlanDisplay({ plan, onPlanUpdate }: EditablePlanDisplayProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [editedPlan, setEditedPlan] = useState<ChildPlan>(plan)
  const [hasChanges, setHasChanges] = useState(false)
  const [showEventModal, setShowEventModal] = useState(false)
  const [showEditEventModal, setShowEditEventModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState<PlanEventData | null>(null)
  const [showActivePlanWarning, setShowActivePlanWarning] = useState(() => {
    if (typeof window === "undefined") return true
    return localStorage.getItem("hideActivePlanWarning") !== "true"
  })
  const defaultTemplate = EVENT_TEMPLATES[0]
  const [newEvent, setNewEvent] = useState<NewEventState>(() => buildEventFromTemplate(defaultTemplate))
  const [timelineOrder, setTimelineOrder] = useState<string[]>([])
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const templatesForCurrentType = useMemo(
    () => EVENT_TEMPLATES.filter(template => template.type === newEvent.type),
    [newEvent.type]
  )

  // Reiniciar cuando cambia el plan
  useEffect(() => {
    if (!plan) return
    const clonedPlan = clonePlan(plan)
    const events = createTimeline(clonedPlan)
    const initialOrder = deriveOrder(plan.schedule?.timelineOrder, events.map(event => event.id))
    setEditedPlan(clonedPlan)
    setTimelineOrder(initialOrder)
    setHasChanges(false)
  }, [plan])

  // Validación defensiva
  if (!plan) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No hay datos del plan disponibles
        </CardContent>
      </Card>
    )
  }

  // Función para formatear hora con validación
  const formatTime = (time: string) => {
    if (!time || typeof time !== "string") return "N/A"
    
    const parts = time.split(":")
    if (parts.length !== 2) return time
    
    const [hour, minute] = parts
    const hourNum = parseInt(hour)
    if (isNaN(hourNum)) return time
    
    const period = hourNum >= 12 ? "PM" : "AM"
    const displayHour = hourNum > 12 ? hourNum - 12 : hourNum === 0 ? 12 : hourNum
    return `${displayHour}:${minute} ${period}`
  }

  // Función para obtener ícono según el tipo de comida
  const getMealIcon = (type: string) => {
    return <Utensils className="h-4 w-4" />
  }


  // Normaliza hora a HH:MM y valida
  const normalizeTime = (t?: string | null) => {
    if (!t || typeof t !== "string") return null
    const m = t.match(/^(\d{1,2}):(\d{2})$/)
    if (!m) return null
    const hh = Math.max(0, Math.min(23, parseInt(m[1], 10)))
    const mm = Math.max(0, Math.min(59, parseInt(m[2], 10)))
    return `${String(hh).padStart(2,"0")}:${String(mm).padStart(2,"0")}`
  }

  const hasLegacySleepRoutineData = (routine?: ChildPlan["sleepRoutine"] | null) => {
    if (!routine || typeof routine !== "object") return false
    return Boolean(
      routine.suggestedBedtime ||
      routine.suggestedWakeTime ||
      routine.napDuration ||
      routine.wakeWindows ||
      (typeof routine.numberOfNaps === "number" && routine.numberOfNaps > 0)
    )
  }

  const normalizeLegacySleepRoutine = (routine?: ChildPlan["sleepRoutine"] | null) => {
    if (!hasLegacySleepRoutineData(routine)) return undefined
    const source = routine as SleepRoutine
    return {
      ...EMPTY_SLEEP_ROUTINE,
      ...source,
      numberOfNaps: typeof source.numberOfNaps === "number" ? source.numberOfNaps : 0,
    }
  }

  const hasCustomSleepRoutineNotes = (routine?: ChildPlan["sleepRoutine"] | null) => {
    if (!routine || typeof routine !== "object") return false
    return Boolean(routine.notes && routine.notes.trim().length > 0)
  }

  const buildLegacySleepRoutineText = (routine?: SleepRoutine) => {
    if (!routine) return ""
    const description: string[] = []
    if (routine.suggestedBedtime) {
      description.push(`Hora de dormir sugerida: ${formatTime(routine.suggestedBedtime)}`)
    }
    if (routine.suggestedWakeTime) {
      description.push(`Hora de despertar sugerida: ${formatTime(routine.suggestedWakeTime)}`)
    }
    if (typeof routine.numberOfNaps === "number" && routine.numberOfNaps > 0) {
      description.push(`Número de siestas: ${routine.numberOfNaps}`)
    }
    if (routine.napDuration) {
      description.push(`Duración aproximada de siestas: ${routine.napDuration}`)
    }
    if (routine.wakeWindows) {
      description.push(`Ventanas de vigilia: ${routine.wakeWindows}`)
    }
    return description.join("\n")
  }

  const getSleepRoutineNotes = (routine?: ChildPlan["sleepRoutine"] | null) => {
    if (!routine || typeof routine !== "object") return ""
    if (routine.notes && routine.notes.trim().length > 0) {
      return routine.notes
    }
    return buildLegacySleepRoutineText(normalizeLegacySleepRoutine(routine))
  }

  const serializeSleepRoutine = (routine?: ChildPlan["sleepRoutine"] | null) => {
    if (!routine || typeof routine !== "object") return undefined
    const payload: Partial<SleepRoutine> = {}

    if (routine.suggestedBedtime) {
      payload.suggestedBedtime = normalizeTime(routine.suggestedBedtime) || routine.suggestedBedtime
    }
    if (routine.suggestedWakeTime) {
      payload.suggestedWakeTime = normalizeTime(routine.suggestedWakeTime) || routine.suggestedWakeTime
    }
    if (typeof routine.numberOfNaps === "number") {
      payload.numberOfNaps = routine.numberOfNaps
    }
    if (routine.napDuration) {
      payload.napDuration = routine.napDuration
    }
    if (routine.wakeWindows) {
      payload.wakeWindows = routine.wakeWindows
    }
    if (routine.notes && routine.notes.trim().length > 0) {
      payload.notes = routine.notes
    }

    return Object.keys(payload).length > 0 ? payload : undefined
  }

  const generateEventId = (prefix: string) => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return `${prefix}-${crypto.randomUUID()}`
    }
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
  }

  const ensureMealId = (meal: any, fallback: string, persist = true) => {
    if (!meal) return fallback || generateEventId("meal")
    if (meal.id) return meal.id
    if (meal._id) {
      if (persist) {
        meal.id = `meal-${meal._id}`
        return meal.id
      }
      return `meal-${meal._id}`
    }
    if (!persist) {
      return fallback || generateEventId("meal")
    }
    meal.id = generateEventId("meal")
    return meal.id
  }

  const ensureNapId = (nap: any, fallback: string, persist = true) => {
    if (!nap) return fallback || generateEventId("nap")
    if (nap.id) return nap.id
    if (nap._id) {
      if (persist) {
        nap.id = `nap-${nap._id}`
        return nap.id
      }
      return `nap-${nap._id}`
    }
    if (!persist) {
      return fallback || generateEventId("nap")
    }
    nap.id = generateEventId("nap")
    return nap.id
  }

  const ensureActivityId = (activity: any, fallback: string, persist = true) => {
    if (!activity) return fallback || generateEventId("activity")
    if (activity.id) return activity.id
    if (activity._id) {
      if (persist) {
        activity.id = `activity-${activity._id}`
        return activity.id
      }
      return `activity-${activity._id}`
    }
    if (!persist) {
      return fallback || generateEventId("activity")
    }
    activity.id = generateEventId("activity")
    return activity.id
  }

  const deriveOrder = (savedOrder: string[] | undefined | null, events: string[]) => {
    if (savedOrder && savedOrder.length) {
      const sanitized = savedOrder.filter(id => events.includes(id))
      const missing = events.filter(id => !sanitized.includes(id))
      return [...sanitized, ...missing]
    }
    return events
  }

  const arraysEqual = (a: string[] = [], b: string[] = []) => {
    if (a.length !== b.length) return false
    return a.every((value, index) => value === b[index])
  }

  const clonePlan = (planData: ChildPlan): ChildPlan => {
    try {
      if (typeof structuredClone === "function") {
        return structuredClone(planData)
      }
    } catch {
      // structuredClone not available, fallback below
    }
    return JSON.parse(JSON.stringify(planData))
  }

  const persistTimelineOrder = (newOrder: string[]) => {
    setTimelineOrder(newOrder)
    setEditedPlan(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        timelineOrder: newOrder,
      },
    }))
    setHasChanges(true)
  }

  const END_DROP_ID = "__timeline_end__"

  const getSanitizedOrder = () => {
    const ids = timelineEvents.map(event => event.id)
    const baseOrder = (timelineOrder.length ? timelineOrder : ids).filter(id => ids.includes(id))
    ids.forEach(id => {
      if (!baseOrder.includes(id)) {
        baseOrder.push(id)
      }
    })
    return baseOrder
  }

  const reorderTimeline = (sourceId: string, targetId: string | null) => {
    if (!sourceId) return
    const currentOrder = getSanitizedOrder()
    const fromIndex = currentOrder.indexOf(sourceId)
    if (fromIndex === -1) return
    currentOrder.splice(fromIndex, 1)
    if (!targetId || targetId === END_DROP_ID) {
      currentOrder.push(sourceId)
    } else {
      const toIndex = currentOrder.indexOf(targetId)
      if (toIndex === -1) {
        currentOrder.push(sourceId)
      } else {
        currentOrder.splice(toIndex, 0, sourceId)
      }
    }
    persistTimelineOrder(currentOrder)
  }

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    const target = e.target as HTMLElement
    if (target?.closest("input, textarea, select, button, [data-prevent-drag]")) {
      e.preventDefault()
      return
    }
    setDraggingId(id)
    setDragOverId(id)
    e.dataTransfer.effectAllowed = "move"
    try {
      e.dataTransfer.setData("text/plain", id)
    } catch {
      // Algunos navegadores lanzan al usar inputs; ignoramos
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, id?: string) => {
    e.preventDefault()
    if (id) {
      setDragOverId(id)
    }
    e.dataTransfer.dropEffect = "move"
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetId: string | null) => {
    e.preventDefault()
    const dataId = draggingId || e.dataTransfer.getData("text/plain")
    reorderTimeline(dataId, targetId)
    setDraggingId(null)
    setDragOverId(null)
  }

  const handleDragEnd = () => {
    setDraggingId(null)
    setDragOverId(null)
  }

  type TimelineEvent = {
    id: string
    time: string
    type: "bedtime" | "wake" | "meal" | "activity" | "nap"
    title: string
    description: string
    duration?: number
    icon: React.ReactNode
    mealIndex?: number
    napIndex?: number
    activityIndex?: number
  }

  // Constante para límite de madrugada (eventos antes de 06:00 son "post-bedtime")
  const EARLY_MORNING_CUTOFF = 6 * 60 // 06:00 = 360 minutos

  // Convierte HH:MM a minutos desde medianoche
  const timeToMinutes = (time: string): number => {
    const [h, m] = time.split(":").map(Number)
    return h * 60 + m
  }

  // Ordena eventos por "día lógico" del niño:
  // despertar → actividades diurnas → dormir → eventos nocturnos (madrugada)
  const sortByLogicalDay = (events: TimelineEvent[], wakeTime?: string | null): TimelineEvent[] => {
    const wakeMinutes = timeToMinutes(wakeTime || "07:00")

    const wakeEvent = events.find(e => e.type === "wake")
    const bedtimeEvent = events.find(e => e.type === "bedtime")
    const postBedtime: TimelineEvent[] = []
    const daytime: TimelineEvent[] = []

    events.forEach(event => {
      if (event.type === "wake" || event.type === "bedtime") return
      const mins = timeToMinutes(event.time)
      // Evento es nocturno si: antes de despertar Y antes de las 06:00
      if (mins < wakeMinutes && mins < EARLY_MORNING_CUTOFF) {
        postBedtime.push(event)
      } else {
        daytime.push(event)
      }
    })

    const byTime = (a: TimelineEvent, b: TimelineEvent) =>
      timeToMinutes(a.time) - timeToMinutes(b.time)

    daytime.sort(byTime)
    postBedtime.sort(byTime)

    const result: TimelineEvent[] = []
    if (wakeEvent) result.push(wakeEvent)
    result.push(...daytime)
    if (bedtimeEvent) result.push(bedtimeEvent)
    result.push(...postBedtime)

    return result
  }

  const createTimeline = (planData: ChildPlan, persistIds = true) => {
    const events: TimelineEvent[] = []
    const schedule = planData?.schedule || {}

    const wakeT = normalizeTime(schedule?.wakeTime)
    if (wakeT) {
      events.push({
        id: "wakeTime",
        time: wakeT,
        type: "wake",
        title: "Despertar",
        description: "Hora de levantarse",
        icon: <Sun className="h-4 w-4" />,
      })
    }

    ;(schedule?.meals || []).forEach((meal: any, index: number) => {
      const mt = normalizeTime(meal?.time as any)
      if (!mt) return
      const type = typeof meal?.type === "string" ? meal.type : "comida"
      const fallbackId = `meal-${meal?._id || `${index}-${mt}`}`
      const id = ensureMealId(meal, fallbackId, persistIds)
      events.push({
        id,
        time: mt,
        type: "meal",
        title: type && type.length ? type.charAt(0).toUpperCase() + type.slice(1) : "Comida",
        description: meal?.description || "",
        icon: getMealIcon(type),
        mealIndex: index,
      })
    })

    if (schedule?.naps) {
      schedule.naps.forEach((nap: any, index: number) => {
        const napTime = normalizeTime(nap?.time || nap?.start)
        if (!napTime) return
        const dur = typeof nap?.duration === "number" ? nap.duration : undefined
        const fallbackId = `nap-${nap?._id || `${index}-${napTime}`}`
        const id = ensureNapId(nap, fallbackId, persistIds)
        events.push({
          id,
          time: napTime,
          type: "nap",
          title: "Siesta",
          description: nap?.description || (dur ? `Siesta de ${dur} minutos` : "Siesta"),
          duration: dur,
          icon: <Nap className="h-4 w-4" />,
          napIndex: index,
        })
      })
    }

    if (schedule?.activities) {
      schedule.activities.forEach((activity: any, index: number) => {
        const activityTime = normalizeTime(activity?.time)
        if (!activityTime) return
        const fallbackId = `activity-${activity?._id || `${index}-${activityTime}`}`
        const id = ensureActivityId(activity, fallbackId, persistIds)
        const dur = typeof activity?.duration === "number" ? activity.duration : undefined
        events.push({
          id,
          time: activityTime,
          type: "activity",
          title: activity?.activity || "Actividad",
          description: activity?.description || "",
          duration: dur,
          icon: <ActivityIcon className="h-4 w-4" />,
          activityIndex: index,
        })
      })
    }

    const bedT = normalizeTime(schedule?.bedtime)
    if (bedT) {
      events.push({
        id: "bedtime",
        time: bedT,
        type: "bedtime",
        title: "Dormir",
        description: "",
        icon: <Moon className="h-4 w-4" />,
      })
    }

    // Filtrar eventos válidos (sin ordenar aquí - se ordena después)
    return events.filter(e => typeof e.time === "string")
  }

  // Crear timeline con ordenamiento por día lógico
  const timelineEvents = useMemo(() => {
    const events = createTimeline(editedPlan)
    return sortByLogicalDay(events, editedPlan?.schedule?.wakeTime)
  }, [editedPlan])

  useEffect(() => {
    if (!timelineEvents.length) return
    const ids = timelineEvents.map(event => event.id)
    setTimelineOrder(prevOrder => {
      const sanitized = prevOrder.filter(id => ids.includes(id))
      const missing = ids.filter(id => !sanitized.includes(id))
      if (!missing.length && sanitized.length === prevOrder.length) {
        return prevOrder
      }
      const newOrder = [...sanitized, ...missing]
      setEditedPlan(prev => {
        if (!prev) return prev
        if (arraysEqual(prev.schedule?.timelineOrder || [], newOrder)) return prev
        return {
          ...prev,
          schedule: {
            ...prev.schedule,
            timelineOrder: newOrder,
          },
        }
      })
      return newOrder
    })
  }, [timelineEvents])

  // Manejar cambios en la rutina diaria
  const handleScheduleChange = (field: string, value: string) => {
    const updatedPlan = { ...editedPlan }
    
    if (field === "wakeTime" || field === "bedtime") {
      updatedPlan.schedule[field] = value
    }
    
    setEditedPlan(updatedPlan)
    setHasChanges(true)
  }

  const clearScheduleField = (field: "wakeTime" | "bedtime") => {
    const updatedPlan = { ...editedPlan }
    if (updatedPlan.schedule[field]) {
      updatedPlan.schedule[field] = ""
      const targetId = field === "wakeTime" ? "wakeTime" : "bedtime"
      const newOrder = getSanitizedOrder().filter(id => id !== targetId)
      updatedPlan.schedule.timelineOrder = newOrder
      setTimelineOrder(newOrder)
      setEditedPlan(updatedPlan)
      setHasChanges(true)
    }
  }

  // Manejar cambios en las comidas
  const handleMealChange = (index: number, field: "time" | "description", value: string) => {
    const updatedPlan = { ...editedPlan }
    updatedPlan.schedule.meals[index][field] = value
    setEditedPlan(updatedPlan)
    setHasChanges(true)
  }

  // Eliminar comida
  const removeMeal = (index: number) => {
    const updatedPlan = { ...editedPlan }
    if (updatedPlan.schedule.meals?.length) {
      const removedMeal = updatedPlan.schedule.meals[index]
      const removedId = removedMeal?.id
      updatedPlan.schedule.meals.splice(index, 1)
      if (removedId) {
        const newOrder = getSanitizedOrder().filter(id => id !== removedId)
        updatedPlan.schedule.timelineOrder = newOrder
        setTimelineOrder(newOrder)
      }
      setEditedPlan(updatedPlan)
      setHasChanges(true)
    }
  }

  // Manejar cambios en las siestas
  const handleNapChange = (index: number, field: "time" | "duration" | "description", value: string | number) => {
    const updatedPlan = { ...editedPlan }
    if (!updatedPlan.schedule.naps) {
      updatedPlan.schedule.naps = []
    }
    
    if (field === "duration") {
      updatedPlan.schedule.naps[index][field] = Number(value)
    } else if (field === "time" || field === "description") {
      updatedPlan.schedule.naps[index][field] = String(value)
    }
    
    setEditedPlan(updatedPlan)
    setHasChanges(true)
  }

  const handleActivityChange = (
    index: number,
    field: "time" | "duration" | "description" | "activity",
    value: string | number
  ) => {
    const updatedPlan = { ...editedPlan }
    if (!updatedPlan.schedule.activities) {
      updatedPlan.schedule.activities = []
    }
    const target = updatedPlan.schedule.activities[index]
    if (!target) return
    
    if (field === "duration") {
      target.duration = Number(value)
    } else if (field === "time") {
      target.time = String(value)
    } else if (field === "description") {
      target.description = String(value)
    } else if (field === "activity") {
      target.activity = String(value)
    }
    
    setEditedPlan(updatedPlan)
    setHasChanges(true)
  }

  // Abrir modal de edicion para un evento existente
  const handleOpenEditModal = (event: TimelineEvent) => {
    const eventData: PlanEventData = {
      id: event.id,
      type: event.type as PlanEventType,
      time: event.time,
      title: event.title,
      description: event.description,
      duration: event.duration,
      mealIndex: event.mealIndex,
      napIndex: event.napIndex,
      activityIndex: event.activityIndex,
    }
    setEditingEvent(eventData)
    setShowEditEventModal(true)
  }

  // Guardar cambios del modal de edicion
  const handleSaveEditedEvent = (updatedEvent: PlanEventData) => {
    const updatedPlan = { ...editedPlan }
    const oldEvent = editingEvent
    if (!oldEvent) return

    // Si el tipo cambio, necesitamos eliminar el evento viejo y crear uno nuevo
    if (oldEvent.type !== updatedEvent.type) {
      // Eliminar evento anterior
      if (oldEvent.type === "wake") {
        updatedPlan.schedule.wakeTime = ""
      } else if (oldEvent.type === "bedtime") {
        updatedPlan.schedule.bedtime = ""
      } else if (oldEvent.type === "meal" && oldEvent.mealIndex !== undefined) {
        updatedPlan.schedule.meals?.splice(oldEvent.mealIndex, 1)
      } else if (oldEvent.type === "nap" && oldEvent.napIndex !== undefined) {
        updatedPlan.schedule.naps?.splice(oldEvent.napIndex, 1)
      } else if (oldEvent.type === "activity" && oldEvent.activityIndex !== undefined) {
        updatedPlan.schedule.activities?.splice(oldEvent.activityIndex, 1)
      }

      // Crear nuevo evento segun el nuevo tipo
      if (updatedEvent.type === "wake") {
        updatedPlan.schedule.wakeTime = updatedEvent.time
      } else if (updatedEvent.type === "bedtime") {
        updatedPlan.schedule.bedtime = updatedEvent.time
      } else if (updatedEvent.type === "meal") {
        if (!updatedPlan.schedule.meals) updatedPlan.schedule.meals = []
        const newMeal = {
          time: updatedEvent.time,
          type: updatedEvent.title || "Comida",
          description: updatedEvent.description || "",
        }
        ensureMealId(newMeal, `meal-${updatedPlan.schedule.meals.length}-${newMeal.time}`)
        updatedPlan.schedule.meals.push(newMeal)
      } else if (updatedEvent.type === "nap") {
        if (!updatedPlan.schedule.naps) updatedPlan.schedule.naps = []
        const newNap = {
          time: updatedEvent.time,
          duration: updatedEvent.duration || 60,
          description: updatedEvent.description || "",
        }
        ensureNapId(newNap, `nap-${updatedPlan.schedule.naps.length}-${newNap.time}`)
        updatedPlan.schedule.naps.push(newNap)
      } else if (updatedEvent.type === "activity") {
        if (!updatedPlan.schedule.activities) updatedPlan.schedule.activities = []
        const newActivity = {
          time: updatedEvent.time,
          activity: updatedEvent.title || "Actividad",
          duration: updatedEvent.duration || 30,
          description: updatedEvent.description || "",
        }
        ensureActivityId(newActivity, `activity-${updatedPlan.schedule.activities.length}-${newActivity.time}`)
        updatedPlan.schedule.activities.push(newActivity)
      }
    } else {
      // Mismo tipo, solo actualizar campos
      if (updatedEvent.type === "wake") {
        updatedPlan.schedule.wakeTime = updatedEvent.time
      } else if (updatedEvent.type === "bedtime") {
        updatedPlan.schedule.bedtime = updatedEvent.time
      } else if (updatedEvent.type === "meal" && updatedEvent.mealIndex !== undefined) {
        const meal = updatedPlan.schedule.meals?.[updatedEvent.mealIndex]
        if (meal) {
          meal.time = updatedEvent.time
          meal.type = updatedEvent.title || meal.type
          meal.description = updatedEvent.description || ""
        }
      } else if (updatedEvent.type === "nap" && updatedEvent.napIndex !== undefined) {
        const nap = updatedPlan.schedule.naps?.[updatedEvent.napIndex]
        if (nap) {
          nap.time = updatedEvent.time
          nap.duration = updatedEvent.duration || 60
          nap.description = updatedEvent.description || ""
        }
      } else if (updatedEvent.type === "activity" && updatedEvent.activityIndex !== undefined) {
        const activity = updatedPlan.schedule.activities?.[updatedEvent.activityIndex]
        if (activity) {
          activity.time = updatedEvent.time
          activity.activity = updatedEvent.title || activity.activity
          activity.duration = updatedEvent.duration || 30
          activity.description = updatedEvent.description || ""
        }
      }
    }

    // Recalcular orden del timeline (aplicando orden logico)
    const events = createTimeline(updatedPlan)
    const sortedEvents = sortByLogicalDay(events, updatedPlan.schedule?.wakeTime)
    const recalculatedOrder = sortedEvents.map(e => e.id)
    updatedPlan.schedule.timelineOrder = recalculatedOrder
    setEditedPlan(updatedPlan)
    setTimelineOrder(recalculatedOrder)
    setHasChanges(true)
    setShowEditEventModal(false)
    setEditingEvent(null)
  }

  // Eliminar evento del timeline
  const handleDeleteEvent = (event: TimelineEvent) => {
    if (event.type === "wake") {
      clearScheduleField("wakeTime")
    } else if (event.type === "bedtime") {
      clearScheduleField("bedtime")
    } else if (event.type === "meal" && event.mealIndex !== undefined) {
      removeMeal(event.mealIndex)
    } else if (event.type === "nap" && event.napIndex !== undefined) {
      removeNap(event.napIndex)
    } else if (event.type === "activity" && event.activityIndex !== undefined) {
      removeActivity(event.activityIndex)
    }
  }

  const handleOpenEventModal = (type: TemplateEventType = "nap") => {
    const template = getTemplateByType(type)[0]
    setNewEvent(prev => buildEventFromTemplate(template, prev))
    setShowEventModal(true)
  }

  const confirmAddEvent = () => {
    if (!newEvent.time) {
      toast.error("Selecciona una hora válida para el evento")
      return
    }

    const updatedPlan = { ...editedPlan }

    switch (newEvent.type) {
    case "nap": {
      if (!updatedPlan.schedule.naps) {
        updatedPlan.schedule.naps = []
      }
      const napToAdd = {
        time: newEvent.time,
        duration: newEvent.duration || 60,
        description: newEvent.description || "",
      }
      ensureNapId(napToAdd, `nap-${updatedPlan.schedule.naps.length}-${napToAdd.time}`)
      updatedPlan.schedule.naps.push(napToAdd)
      break
    }
    case "meal": {
      if (!updatedPlan.schedule.meals) {
        updatedPlan.schedule.meals = []
      }
      const mealToAdd = {
        time: newEvent.time,
        type: newEvent.label || "Comida",
        description: newEvent.description || "",
      }
      ensureMealId(mealToAdd, `meal-${updatedPlan.schedule.meals.length}-${mealToAdd.time}`)
      updatedPlan.schedule.meals.push(mealToAdd)
      break
    }
    case "activity": {
      if (!updatedPlan.schedule.activities) {
        updatedPlan.schedule.activities = []
      }
      const activityToAdd = {
        time: newEvent.time,
        activity: newEvent.label || "Actividad",
        duration: newEvent.duration || 30,
        description: newEvent.description || "",
      }
      ensureActivityId(activityToAdd, `activity-${updatedPlan.schedule.activities.length}-${activityToAdd.time}`)
      updatedPlan.schedule.activities.push(activityToAdd)
      break
    }
    case "bedtime": {
      updatedPlan.schedule.bedtime = newEvent.time
      break
    }
    case "wake": {
      updatedPlan.schedule.wakeTime = newEvent.time
      break
    }
    default:
      break
    }

    // Recalcular orden del timeline (aplicando orden logico)
    const events = createTimeline(updatedPlan)
    const sortedEvents = sortByLogicalDay(events, updatedPlan.schedule?.wakeTime)
    const recalculatedOrder = sortedEvents.map(event => event.id)
    updatedPlan.schedule.timelineOrder = recalculatedOrder
    setEditedPlan(updatedPlan)
    setTimelineOrder(recalculatedOrder)
    setHasChanges(true)
    setShowEventModal(false)
  }

  // Eliminar siesta
  const removeNap = (index: number) => {
    const updatedPlan = { ...editedPlan }
    if (updatedPlan.schedule.naps) {
      const removedNap = updatedPlan.schedule.naps[index]
      const removedId = removedNap?.id
      updatedPlan.schedule.naps.splice(index, 1)
      if (removedId) {
        const newOrder = getSanitizedOrder().filter(id => id !== removedId)
        updatedPlan.schedule.timelineOrder = newOrder
        setTimelineOrder(newOrder)
      }
      setEditedPlan(updatedPlan)
      setHasChanges(true)
    }
  }

  const removeActivity = (index: number) => {
    const updatedPlan = { ...editedPlan }
    if (updatedPlan.schedule.activities) {
      const removedActivity = updatedPlan.schedule.activities[index]
      const removedId = removedActivity?.id
      updatedPlan.schedule.activities.splice(index, 1)
      if (removedId) {
        const newOrder = getSanitizedOrder().filter(id => id !== removedId)
        updatedPlan.schedule.timelineOrder = newOrder
        setTimelineOrder(newOrder)
      }
      setEditedPlan(updatedPlan)
      setHasChanges(true)
    }
  }

  const handleSleepRoutineNotesChange = (value: string) => {
    setEditedPlan(prev => {
      const currentRoutine = prev.sleepRoutine && typeof prev.sleepRoutine === "object"
        ? prev.sleepRoutine
        : undefined

      if (!value.trim()) {
        if (!currentRoutine) {
          return { ...prev, sleepRoutine: undefined }
        }
        const { notes: _removedNotes, ...rest } = currentRoutine
        return {
          ...prev,
          sleepRoutine: hasLegacySleepRoutineData(rest) ? rest : undefined,
        }
      }

      return {
        ...prev,
        sleepRoutine: {
          ...EMPTY_SLEEP_ROUTINE,
          ...(currentRoutine || {}),
          notes: value,
        },
      }
    })
    setHasChanges(true)
  }

  const handleClearSleepRoutine = () => {
    setEditedPlan(prev => ({
      ...prev,
      sleepRoutine: undefined,
    }))
    setHasChanges(true)
  }

  // Manejar cambios en objetivos
  const handleObjectiveChange = (index: number, value: string) => {
    const updatedPlan = { ...editedPlan }
    updatedPlan.objectives[index] = value
    setEditedPlan(updatedPlan)
    setHasChanges(true)
  }

  // Agregar nuevo objetivo
  const addObjective = () => {
    const updatedPlan = { ...editedPlan }
    updatedPlan.objectives.push("")
    setEditedPlan(updatedPlan)
    setHasChanges(true)
  }

  // Eliminar objetivo
  const removeObjective = (index: number) => {
    const updatedPlan = { ...editedPlan }
    updatedPlan.objectives.splice(index, 1)
    setEditedPlan(updatedPlan)
    setHasChanges(true)
  }

  // Manejar cambios en recomendaciones
  const handleRecommendationChange = (index: number, value: string) => {
    const updatedPlan = { ...editedPlan }
    updatedPlan.recommendations[index] = value
    setEditedPlan(updatedPlan)
    setHasChanges(true)
  }

  // Agregar nueva recomendación
  const addRecommendation = () => {
    const updatedPlan = { ...editedPlan }
    updatedPlan.recommendations.push("")
    setEditedPlan(updatedPlan)
    setHasChanges(true)
  }

  // Eliminar recomendación
  const removeRecommendation = (index: number) => {
    const updatedPlan = { ...editedPlan }
    updatedPlan.recommendations.splice(index, 1)
    setEditedPlan(updatedPlan)
    setHasChanges(true)
  }

  // Guardar cambios
  const handleSave = async () => {
    setIsSaving(true)
    
    try {
      // Depuración: Verificar que el ID existe
      console.log("Guardando plan con ID:", plan._id)
      console.log("Plan completo:", plan)
      
      if (!plan._id) {
        throw new Error("El plan no tiene un ID válido")
      }
      
      const response = await fetch(`/api/consultas/plans/${plan._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          schedule: editedPlan.schedule,
          objectives: editedPlan.objectives,
          recommendations: editedPlan.recommendations,
          sleepRoutine: serializeSleepRoutine(editedPlan.sleepRoutine),
          // Enviar información adicional para crear el plan si no existe
          childId: plan.childId,
          userId: plan.userId,
          planNumber: plan.planNumber,
          planVersion: plan.planVersion,
          planType: plan.planType,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Error al guardar los cambios")
      }

      const updatedPlan = await response.json()
      
      // Actualizar el plan en el componente padre si existe el callback
      if (onPlanUpdate) {
        onPlanUpdate(updatedPlan.plan)
      }
      
      setEditedPlan(updatedPlan.plan)
      setHasChanges(false)
      
      toast.success("Plan actualizado correctamente")
    } catch (error: any) {
      console.error("Error guardando cambios:", error)
      toast.error(error.message || "Error al guardar los cambios")
    } finally {
      setIsSaving(false)
    }
  }

  // Cancelar edición
  const sleepRoutineNotes = useMemo(
    () => getSleepRoutineNotes(editedPlan.sleepRoutine),
    [editedPlan.sleepRoutine]
  )

  const hasSleepRoutineNotes = hasCustomSleepRoutineNotes(editedPlan.sleepRoutine)

  const displaySleepRoutine = normalizeLegacySleepRoutine(editedPlan.sleepRoutine)

  const handleCancel = () => {
    const resetPlan = clonePlan(plan)
    const events = createTimeline(resetPlan)
    const order = deriveOrder(plan.schedule?.timelineOrder, events.map(event => event.id))
    setEditedPlan(resetPlan)
    setTimelineOrder(order)
    setHasChanges(false)
  }

  return (
    <div className="space-y-4">
      {/* Barra de acciones y advertencia */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Advertencia si el plan está activo - compacta y dismissable */}
        {editedPlan.status === "active" && showActivePlanWarning && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-1.5 flex items-center gap-2 flex-1 min-w-0">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <p className="text-sm text-amber-800 dark:text-amber-200 truncate">
              <span className="font-medium">Plan activo</span> - cambios visibles para usuarios
            </p>
            <button
              onClick={() => {
                setShowActivePlanWarning(false)
                localStorage.setItem("hideActivePlanWarning", "true")
              }}
              className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 p-0.5 flex-shrink-0"
              title="Ocultar aviso"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        
        {/* Botones de acción - solo aparecen cuando hay cambios */}
        {hasChanges && (
          <div className="flex gap-2 ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={isSaving}
            >
              <X className="h-4 w-4 mr-1" />
              Descartar
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
            >
              <Save className="h-4 w-4 mr-1" />
              {isSaving ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Timeline principal - Rutina Diaria */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Rutina Diaria
              </CardTitle>
              <CardDescription>
                Horarios estructurados para el día
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {timelineEvents.map((event, index) => (
                  <div key={event.id} className="flex items-start gap-4">
                    {/* Timeline visual */}
                    <div className="flex flex-col items-center">
                      <div className={`
                        p-2 rounded-full border-2 
                        ${event.type === "bedtime" ? "bg-purple-100 border-purple-500 text-purple-600" :
                          event.type === "wake" ? "bg-yellow-100 border-yellow-500 text-yellow-600" :
                          event.type === "meal" ? "bg-orange-100 border-orange-500 text-orange-600" :
                          event.type === "activity" ? "bg-blue-100 border-blue-500 text-blue-600" :
                          "bg-indigo-100 border-indigo-500 text-indigo-600"}
                      `}>
                        {event.icon}
                      </div>
                      {index < timelineEvents.length - 1 && (
                        <div className="w-px h-8 bg-border mt-2" />
                      )}
                    </div>

                    {/* Contenido del evento */}
                    <div className="flex-1 pb-4">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-lg">
                            {formatTime(event.time)}
                          </span>
                          <Badge variant="outline">
                            {event.title}
                          </Badge>
                          {event.duration && (
                            <Badge variant="secondary">
                              {event.duration} min
                            </Badge>
                          )}
                        </div>
                        {/* Botones de editar y eliminar - siempre visibles */}
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEditModal(event)}
                            title="Editar evento"
                          >
                            <Edit className="h-4 w-4 text-muted-foreground hover:text-primary" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteEvent(event)}
                            title="Eliminar evento"
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                          </Button>
                        </div>
                      </div>
                      {event.description && (
                        <p className="text-muted-foreground">
                          {event.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}

                {/* Boton para agregar evento - siempre visible */}
                <Button
                  variant="outline"
                  onClick={() => handleOpenEventModal()}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar evento
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Panel lateral con objetivos, rutina y recomendaciones */}
        <div className="space-y-6">
          {/* Rutina de Sueño */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Moon className="h-5 w-5" />
                Rutina de Sueño
              </CardTitle>
              <CardDescription>
                Escribe la recomendación exacta que verán los padres en su dashboard
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Label htmlFor="sleep-routine-notes">Descripcion recomendada</Label>
                <Textarea
                  id="sleep-routine-notes"
                  value={sleepRoutineNotes}
                  onChange={(e) => handleSleepRoutineNotesChange(e.target.value)}
                  placeholder="Ej: Dormir entre 7:30 y 8:00 pm, 2 siestas de 60-90 minutos, Ventanas de vigilia de 2-3 horas"
                  rows={4}
                  className="min-h-[100px]"
                />
                <p className="text-xs text-muted-foreground">
                  Este texto se mostrara tal cual al usuario en su dashboard.
                </p>
                {sleepRoutineNotes && (
                  <div className="flex justify-end">
                    <Button variant="ghost" size="sm" onClick={handleClearSleepRoutine}>
                      Limpiar seccion
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Objetivos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Objetivos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {editedPlan.objectives.map((objective: any, index: number) => {
                  const text = typeof objective === "string"
                    ? objective
                    : objective && typeof objective === "object"
                      ? (objective.description || JSON.stringify(objective))
                      : String(objective ?? "")
                  return (
                    <div key={index} className="flex items-start gap-2">
                      <Textarea
                        value={text}
                        onChange={(e) => handleObjectiveChange(index, e.target.value)}
                        className="flex-1 min-h-[60px]"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeObjective(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  )
                })}
                <Button
                  variant="outline"
                  onClick={addObjective}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Objetivo
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recomendaciones */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Recomendaciones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {editedPlan.recommendations.map((recommendation: any, index: number) => {
                  const text = typeof recommendation === "string"
                    ? recommendation
                    : recommendation && typeof recommendation === "object"
                      ? (recommendation.description || JSON.stringify(recommendation))
                      : String(recommendation ?? "")
                  return (
                    <div key={index} className="flex items-start gap-2">
                      <Textarea
                        value={text}
                        onChange={(e) => handleRecommendationChange(index, e.target.value)}
                        className="flex-1 min-h-[60px]"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRecommendation(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  )
                })}
                <Button
                  variant="outline"
                  onClick={addRecommendation}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Recomendacion
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Información adicional para planes de refinamiento por transcript */}
          {editedPlan.planType === "transcript_refinement" && editedPlan.transcriptAnalysis && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Ajustes Realizados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {editedPlan.transcriptAnalysis.improvements && editedPlan.transcriptAnalysis.improvements.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm mb-2">Mejoras:</h4>
                      <div className="space-y-1">
                        {editedPlan.transcriptAnalysis.improvements.map((improvement, index) => (
                          <p key={index} className="text-xs text-muted-foreground">
                            • {improvement}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {editedPlan.transcriptAnalysis.adjustments && editedPlan.transcriptAnalysis.adjustments.length > 0 && (
                    <div>
                      <Separator className="my-3" />
                      <h4 className="font-medium text-sm mb-2">Ajustes:</h4>
                      <div className="space-y-1">
                        {editedPlan.transcriptAnalysis.adjustments.map((adjustment, index) => (
                          <p key={index} className="text-xs text-muted-foreground">
                            • {adjustment}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Metadata del plan */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Información del Plan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Número de Plan:</span>
                  <span>{editedPlan.planNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tipo:</span>
                  <span>
                    {editedPlan.planType === "initial" ? "Inicial" : 
                      editedPlan.planType === "event_based" ? "Progresión basada en eventos" :
                        editedPlan.planType === "transcript_refinement" ? "Refinamiento por transcript" : 
                          "Actualización"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Basado en:</span>
                  <span>
                    {editedPlan.basedOn === "survey_stats_rag" 
                      ? "Survey + Stats + RAG" 
                      : editedPlan.basedOn === "events_stats_rag"
                        ? `Plan ${editedPlan.basedOnPlan?.planVersion || "anterior"} + ${editedPlan.eventAnalysis?.eventsAnalyzed || "X"} eventos + RAG`
                        : editedPlan.basedOn === "transcript_analysis"
                          ? "Análisis de transcript"
                          : editedPlan.basedOn}
                  </span>
                </div>
                {/* Resumen mínimo de datos usados para Progresión */}
                {editedPlan.planType === "event_based" && (
                  <>
                    <Separator className="my-2" />
                    <div className="text-xs">
                      Usado: base v{editedPlan.basedOnPlan?.planVersion || editedPlan.eventAnalysis?.basePlanVersion || "N/A"} • eventos {editedPlan.eventsDateRange?.totalEventsAnalyzed ?? editedPlan.eventAnalysis?.eventsAnalyzed ?? "N/A"} • {
                        editedPlan.eventsDateRange?.fromDate ? new Date(editedPlan.eventsDateRange.fromDate as any).toLocaleDateString() : "N/A"
                      } → {
                        editedPlan.eventsDateRange?.toDate ? new Date(editedPlan.eventsDateRange.toDate as any).toLocaleDateString() : "N/A"
                      } • RAG {(editedPlan.eventAnalysis?.ragSources && editedPlan.eventAnalysis.ragSources.length) || 0}
                    </div>
                  </>
                )}
                {editedPlan.sourceData && (
                  <>
                    <Separator className="my-2" />
                    <div className="flex justify-between">
                      <span>Eventos analizados:</span>
                      <span>{editedPlan.sourceData.totalEvents}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Fuentes RAG:</span>
                      <span>{editedPlan.sourceData.ragSources.length}</span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal para agregar evento */}
      <Dialog open={showEventModal} onOpenChange={setShowEventModal}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Agregar evento a la rutina
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Tipo de evento */}
            <div>
              <Label>Tipo de evento</Label>
              <Select
                value={newEvent.type}
                onValueChange={(value) => {
                  const nextType = value as TemplateEventType
                  const defaults = getTemplateByType(nextType)[0]
                  setNewEvent((prev) => buildEventFromTemplate(defaults, { ...prev, type: nextType }))
                }}
              >
                <SelectTrigger className="min-h-[44px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nap">Siesta</SelectItem>
                  <SelectItem value="meal">Comida</SelectItem>
                  <SelectItem value="activity">Actividad</SelectItem>
                  <SelectItem value="wake">Hora de despertar</SelectItem>
                  <SelectItem value="bedtime">Hora de dormir</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Hora */}
            <div>
              <Label>Hora</Label>
              <Input
                type="time"
                value={newEvent.time}
                onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
              />
            </div>

            {/* Nombre/Tipo - solo para meal y activity */}
            {newEvent.type === "meal" && (
              <div>
                <Label>Tipo de comida</Label>
                <Input
                  value={newEvent.label}
                  onChange={(e) => setNewEvent({ ...newEvent, label: e.target.value })}
                  placeholder="Ej: Desayuno, Comida, Cena, Snack..."
                />
              </div>
            )}

            {newEvent.type === "activity" && (
              <div>
                <Label>Nombre de la actividad</Label>
                <Input
                  value={newEvent.label}
                  onChange={(e) => setNewEvent({ ...newEvent, label: e.target.value })}
                  placeholder="Ej: Juego activo, Lectura, Rutina de relajacion..."
                />
              </div>
            )}

            {/* Duracion con botones +/- - solo para nap y activity */}
            {newEvent.type === "nap" && (
              <div>
                <Label>Duracion (min)</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setNewEvent({ ...newEvent, duration: Math.max(5, (newEvent.duration || 60) - 5) })}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    type="number"
                    value={newEvent.duration || 60}
                    onChange={(e) => setNewEvent({ ...newEvent, duration: parseInt(e.target.value) || 60 })}
                    className="text-center"
                    min="5"
                    max="180"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setNewEvent({ ...newEvent, duration: Math.min(180, (newEvent.duration || 60) + 5) })}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {newEvent.type === "activity" && (
              <div>
                <Label>Duracion (min)</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setNewEvent({ ...newEvent, duration: Math.max(5, (newEvent.duration || 30) - 15) })}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    type="number"
                    value={newEvent.duration || 30}
                    onChange={(e) => setNewEvent({ ...newEvent, duration: parseInt(e.target.value) || 30 })}
                    className="text-center"
                    min="5"
                    max="240"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setNewEvent({ ...newEvent, duration: Math.min(240, (newEvent.duration || 30) + 15) })}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Descripcion - para nap, meal, activity */}
            {(newEvent.type === "nap" || newEvent.type === "meal" || newEvent.type === "activity") && (
              <div>
                <Label>Descripcion (opcional)</Label>
                <Textarea
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  placeholder={
                    newEvent.type === "nap"
                      ? "Ej: Siesta en habitacion oscura, despues del almuerzo..."
                      : newEvent.type === "meal"
                        ? "Ej: Leche con fruta, comida completa..."
                        : "Ej: Actividad motriz, lectura tranquila..."
                  }
                  rows={2}
                  maxLength={200}
                />
              </div>
            )}

            {/* Botones */}
            <div className="flex gap-2 pt-2">
              <Button 
                onClick={confirmAddEvent}
                className="flex-1"
              >
                Agregar evento
              </Button>
              <Button 
                variant="outline"
                onClick={() => setShowEventModal(false)}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal para editar evento existente */}
      <PlanEventEditModal
        open={showEditEventModal}
        onClose={() => {
          setShowEditEventModal(false)
          setEditingEvent(null)
        }}
        event={editingEvent}
        onSave={handleSaveEditedEvent}
      />
    </div>
  )
}
