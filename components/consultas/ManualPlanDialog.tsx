"use client"

import { useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Plus, Trash2 } from "lucide-react"

export type ManualPlanType = "initial" | "event_based" | "transcript_refinement"

export interface ManualPlanItemOption {
  value: ManualPlanType
  label: string
  enabled: boolean
  description?: string
  nextVersion?: string
}

export interface ManualPlanFormValues {
  planType: ManualPlanType
  title: string
  bedtime: string
  wakeTime: string
  objectives: string[]
  recommendations: string[]
  meals: Array<{ time: string; type: string; description: string }>
  activities: Array<{ time: string; activity: string; duration: number; description: string }>
  naps: Array<{ time: string; duration: number; description?: string }>
  notes?: string
  status: "borrador" | "activo" | "completado" | "superseded" | "archived"
}

interface ManualPlanDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  options: ManualPlanItemOption[]
  onSubmit: (values: ManualPlanFormValues) => Promise<void>
  submitting: boolean
}

const statusOptions: ManualPlanFormValues["status"][] = ["borrador", "activo", "completado", "superseded", "archived"]

const emptyMeal = { time: "", type: "", description: "" }
const emptyActivity = { time: "", activity: "", duration: 30, description: "" }
const emptyNap = { time: "", duration: 60, description: "" }

export function ManualPlanDialog({ open, onOpenChange, options, onSubmit, submitting }: ManualPlanDialogProps) {
  const defaultOption = useMemo(() => options.find(opt => opt.enabled) || options[0], [options])

  const [planType, setPlanType] = useState<ManualPlanType>(defaultOption?.value || "initial")
  const [title, setTitle] = useState("")
  const [bedtime, setBedtime] = useState("")
  const [wakeTime, setWakeTime] = useState("")
  const [objectivesText, setObjectivesText] = useState("")
  const [recommendationsText, setRecommendationsText] = useState("")
  const [notes, setNotes] = useState("")
  const [status, setStatus] = useState<ManualPlanFormValues["status"]>("borrador")
  const [meals, setMeals] = useState<typeof emptyMeal[]>([])
  const [activities, setActivities] = useState<typeof emptyActivity[]>([])
  const [naps, setNaps] = useState<typeof emptyNap[]>([])

  useEffect(() => {
    if (open) {
      setPlanType(defaultOption?.value || "initial")
      setTitle("")
      setBedtime("")
      setWakeTime("")
      setObjectivesText("")
      setRecommendationsText("")
      setNotes("")
      setStatus("borrador")
      setMeals([])
      setActivities([])
      setNaps([])
    }
  }, [open, defaultOption])

  const handleAddMeal = () => setMeals(prev => [...prev, { ...emptyMeal }])
  const handleUpdateMeal = (index: number, field: keyof typeof emptyMeal, value: string) => {
    setMeals(prev => prev.map((meal, idx) => idx === index ? { ...meal, [field]: value } : meal))
  }
  const handleRemoveMeal = (index: number) => setMeals(prev => prev.filter((_, idx) => idx !== index))

  const handleAddActivity = () => setActivities(prev => [...prev, { ...emptyActivity }])
  const handleUpdateActivity = <K extends keyof typeof emptyActivity>(index: number, field: K, value: typeof emptyActivity[K]) => {
    setActivities(prev => prev.map((activity, idx) => idx === index ? { ...activity, [field]: value } : activity))
  }
  const handleRemoveActivity = (index: number) => setActivities(prev => prev.filter((_, idx) => idx !== index))

  const handleAddNap = () => setNaps(prev => [...prev, { ...emptyNap }])
  const handleUpdateNap = <K extends keyof typeof emptyNap>(index: number, field: K, value: typeof emptyNap[K]) => {
    setNaps(prev => prev.map((nap, idx) => idx === index ? { ...nap, [field]: value } : nap))
  }
  const handleRemoveNap = (index: number) => setNaps(prev => prev.filter((_, idx) => idx !== index))

  const handleSubmit = async () => {
    if (!bedtime || !wakeTime) return
    await onSubmit({
      planType,
      title,
      bedtime,
      wakeTime,
      objectives: objectivesText.split('\n').map(line => line.trim()).filter(Boolean),
      recommendations: recommendationsText.split('\n').map(line => line.trim()).filter(Boolean),
      meals: meals.filter(meal => meal.time && meal.type),
      activities: activities.filter(activity => activity.time && activity.activity),
      naps: naps.filter(nap => nap.time && nap.duration),
      notes: notes.trim() ? notes.trim() : undefined,
      status
    })
  }

  const effectiveOptions = options.length > 0 ? options : [{ value: "initial", label: "Plan Inicial", enabled: true }]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Crear plan manual</DialogTitle>
          <DialogDescription>
            Define el plan manualmente. Puedes agregar comidas, siestas y actividades según lo que acordaste con la familia.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-2">
          <div className="space-y-6 py-2">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Tipo de plan</Label>
                <Select value={planType} onValueChange={(value) => setPlanType(value as ManualPlanType)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {effectiveOptions.map(option => (
                      <SelectItem key={option.value} value={option.value} disabled={!option.enabled}>
                        {option.label}{option.nextVersion ? ` (${option.nextVersion})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {effectiveOptions.find(opt => opt.value === planType)?.description && (
                  <p className="text-xs text-muted-foreground">
                    {effectiveOptions.find(opt => opt.value === planType)?.description}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Estatus inicial</Label>
                <Select value={status} onValueChange={(value) => setStatus(value as ManualPlanFormValues["status"])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(statusOption => (
                      <SelectItem key={statusOption} value={statusOption}>
                        {statusOption.charAt(0).toUpperCase() + statusOption.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Título del plan</Label>
              <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Plan Manual para Luna" />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Hora de despertar</Label>
                <Input type="time" value={wakeTime} onChange={(event) => setWakeTime(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Hora de dormir</Label>
                <Input type="time" value={bedtime} onChange={(event) => setBedtime(event.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Objetivos principales (un objetivo por línea)</Label>
              <Textarea value={objectivesText} onChange={(event) => setObjectivesText(event.target.value)} rows={3} placeholder="Establecer rutina de sueño...
Reducir despertares nocturnos..." />
            </div>

            <div className="space-y-2">
              <Label>Recomendaciones (una recomendación por línea)</Label>
              <Textarea value={recommendationsText} onChange={(event) => setRecommendationsText(event.target.value)} rows={3} placeholder="Bajar luces 30 minutos antes...
Evitar pantallas después de las 19:00..." />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Comidas</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddMeal}>
                  <Plus className="h-3 w-3 mr-1" /> Agregar comida
                </Button>
              </div>
              <div className="space-y-2">
                {meals.length === 0 && (
                  <p className="text-xs text-muted-foreground">Agrega comidas para guiar horarios de alimentación.</p>
                )}
                {meals.map((meal, index) => (
                  <div key={index} className="grid gap-2 md:grid-cols-12 items-end">
                    <div className="md:col-span-3">
                      <Label className="text-xs">Hora</Label>
                      <Input type="time" value={meal.time} onChange={(event) => handleUpdateMeal(index, "time", event.target.value)} />
                    </div>
                    <div className="md:col-span-3">
                      <Label className="text-xs">Tipo</Label>
                      <Input value={meal.type} onChange={(event) => handleUpdateMeal(index, "type", event.target.value)} placeholder="Desayuno" />
                    </div>
                    <div className="md:col-span-5">
                      <Label className="text-xs">Descripción</Label>
                      <Input value={meal.description} onChange={(event) => handleUpdateMeal(index, "description", event.target.value)} placeholder="Yogur + fruta" />
                    </div>
                    <div className="md:col-span-1 flex justify-end">
                      <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveMeal(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Siestas</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddNap}>
                  <Plus className="h-3 w-3 mr-1" /> Agregar siesta
                </Button>
              </div>
              <div className="space-y-2">
                {naps.length === 0 && (
                  <p className="text-xs text-muted-foreground">Las siestas ayudarán a mostrar descansos diurnos.</p>
                )}
                {naps.map((nap, index) => (
                  <div key={index} className="grid gap-2 md:grid-cols-12 items-end">
                    <div className="md:col-span-3">
                      <Label className="text-xs">Hora</Label>
                      <Input type="time" value={nap.time} onChange={(event) => handleUpdateNap(index, "time", event.target.value)} />
                    </div>
                    <div className="md:col-span-3">
                      <Label className="text-xs">Duración (min)</Label>
                      <Input type="number" min={10} step={5} value={nap.duration} onChange={(event) => handleUpdateNap(index, "duration", Number(event.target.value))} />
                    </div>
                    <div className="md:col-span-5">
                      <Label className="text-xs">Descripción</Label>
                      <Input value={nap.description || ""} onChange={(event) => handleUpdateNap(index, "description", event.target.value)} placeholder="Siesta ligera" />
                    </div>
                    <div className="md:col-span-1 flex justify-end">
                      <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveNap(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Actividades clave</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddActivity}>
                  <Plus className="h-3 w-3 mr-1" /> Agregar actividad
                </Button>
              </div>
              <div className="space-y-2">
                {activities.length === 0 && (
                  <p className="text-xs text-muted-foreground">Programa rutinas como lectura, baño o juego tranquilo.</p>
                )}
                {activities.map((activity, index) => (
                  <div key={index} className="grid gap-2 md:grid-cols-12 items-end">
                    <div className="md:col-span-3">
                      <Label className="text-xs">Hora</Label>
                      <Input type="time" value={activity.time} onChange={(event) => handleUpdateActivity(index, "time", event.target.value)} />
                    </div>
                    <div className="md:col-span-3">
                      <Label className="text-xs">Actividad</Label>
                      <Input value={activity.activity} onChange={(event) => handleUpdateActivity(index, "activity", event.target.value)} placeholder="Lectura" />
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-xs">Duración (min)</Label>
                      <Input type="number" min={5} step={5} value={activity.duration} onChange={(event) => handleUpdateActivity(index, "duration", Number(event.target.value))} />
                    </div>
                    <div className="md:col-span-3">
                      <Label className="text-xs">Descripción</Label>
                      <Input value={activity.description} onChange={(event) => handleUpdateActivity(index, "description", event.target.value)} placeholder="Luces suaves, música calma" />
                    </div>
                    <div className="md:col-span-1 flex justify-end">
                      <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveActivity(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notas internas</Label>
              <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} placeholder="Anota cualquier detalle adicional o acuerdos con la familia." />
            </div>
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={!bedtime || !wakeTime || submitting}>
            {submitting ? "Guardando..." : "Guardar plan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
