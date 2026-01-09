"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Clock, Plus, Minus } from "lucide-react"

export type PlanEventType = "wake" | "bedtime" | "nap" | "meal" | "activity"

export interface PlanEventData {
  id: string
  type: PlanEventType
  time: string
  title?: string
  description?: string
  duration?: number
  mealIndex?: number
  napIndex?: number
  activityIndex?: number
}

interface PlanEventEditModalProps {
  open: boolean
  onClose: () => void
  event: PlanEventData | null
  onSave: (updatedEvent: PlanEventData) => void
}

const planEventTypes = [
  { id: "wake", label: "Despertar" },
  { id: "bedtime", label: "Dormir" },
  { id: "nap", label: "Siesta" },
  { id: "meal", label: "Comida" },
  { id: "activity", label: "Actividad" },
]

export function PlanEventEditModal({
  open,
  onClose,
  event,
  onSave,
}: PlanEventEditModalProps) {
  const [eventType, setEventType] = useState<PlanEventType>("nap")
  const [time, setTime] = useState("12:00")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [duration, setDuration] = useState(60)

  useEffect(() => {
    if (event && open) {
      setEventType(event.type)
      setTime(event.time || "12:00")
      setTitle(event.title || "")
      setDescription(event.description || "")
      setDuration(event.duration || (event.type === "nap" ? 60 : 30))
    }
  }, [event, open])

  const handleSave = () => {
    if (!event) return

    const updatedEvent: PlanEventData = {
      ...event,
      type: eventType,
      time,
      title: (eventType === "meal" || eventType === "activity") ? title : undefined,
      description: (eventType !== "wake" && eventType !== "bedtime") ? description : undefined,
      duration: (eventType === "nap" || eventType === "activity") ? duration : undefined,
    }

    onSave(updatedEvent)
    onClose()
  }

  const handleTypeChange = (newType: PlanEventType) => {
    setEventType(newType)
    if (newType === "nap" && !duration) {
      setDuration(60)
    } else if (newType === "activity" && !duration) {
      setDuration(30)
    }
  }

  if (!event) return null

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Editar Evento del Plan
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Tipo de evento */}
          <div>
            <Label>Tipo de evento</Label>
            <Select value={eventType} onValueChange={(val) => handleTypeChange(val as PlanEventType)}>
              <SelectTrigger className="min-h-[44px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {planEventTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Hora */}
          <div>
            <Label>Hora</Label>
            <Input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>

          {/* Nombre/Tipo - solo para meal y activity */}
          {eventType === "meal" && (
            <div>
              <Label>Tipo de comida</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Desayuno, Comida, Cena, Snack..."
              />
            </div>
          )}

          {eventType === "activity" && (
            <div>
              <Label>Nombre de la actividad</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Juego activo, Lectura, Rutina de relajacion..."
              />
            </div>
          )}

          {/* Duracion con botones +/- - solo para nap y activity */}
          {eventType === "nap" && (
            <div>
              <Label>Duracion (min)</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setDuration(Math.max(5, duration - 5))}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value) || 60)}
                  className="text-center"
                  min="5"
                  max="180"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setDuration(Math.min(180, duration + 5))}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {eventType === "activity" && (
            <div>
              <Label>Duracion (min)</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setDuration(Math.max(5, duration - 15))}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value) || 30)}
                  className="text-center"
                  min="5"
                  max="240"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setDuration(Math.min(240, duration + 15))}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Descripcion - para nap, meal, activity */}
          {(eventType === "nap" || eventType === "meal" || eventType === "activity") && (
            <div>
              <Label>Descripcion (opcional)</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={
                  eventType === "nap"
                    ? "Ej: Siesta en habitacion oscura, despues del almuerzo..."
                    : eventType === "meal"
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
              onClick={handleSave}
              className="flex-1"
            >
              Guardar
            </Button>
            <Button 
              variant="outline"
              onClick={onClose}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
