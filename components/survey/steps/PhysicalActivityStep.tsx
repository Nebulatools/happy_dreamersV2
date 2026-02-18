// Paso 5: Actividad Física
// Información sobre actividad física, pantallas y salud del niño

import { useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { Activity, Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { SurveyStepProps } from "../types/survey.types"

export function PhysicalActivityStep({ data, onChange, errors = {} }: SurveyStepProps) {
  const [activityName, setActivityName] = useState("")
  const [activityDuration, setActivityDuration] = useState("")

  const updateField = (field: string, value: any) => {
    onChange({
      ...data,
      [field]: value,
    })
  }

  const getError = (field: string): string | undefined => {
    return errors[field] as string
  }

  const hasError = (field: string): boolean => {
    return !!getError(field)
  }

  const normalizedActivities = useMemo(() => {
    const raw = data.actividadesLista
    if (!raw) return []
    if (Array.isArray(raw)) {
      return raw.map((item) =>
        typeof item === "string"
          ? { nombre: item, duracionMinutos: undefined }
          : item
      )
    }
    if (typeof raw === "string") {
      return [{ nombre: raw, duracionMinutos: undefined }]
    }
    return []
  }, [data.actividadesLista])

  const addActivity = () => {
    const nombre = activityName.trim()
    const durationNumber = parseInt(activityDuration, 10)
    if (!nombre || Number.isNaN(durationNumber) || durationNumber <= 0) return

    const next = [...normalizedActivities, { nombre, duracionMinutos: durationNumber }]
    updateField("actividadesLista", next)
    setActivityName("")
    setActivityDuration("")
  }

  return (
    <div className="space-y-8">
      <h3 className="text-xl font-semibold text-[#2F2F2F] flex items-center gap-2">
        <Activity className="w-5 h-5" />
        ACTIVIDAD FÍSICA
      </h3>

      {/* 1. ¿Tu hijo ve pantallas? */}
      <div>
        <Label>1. ¿Tu hijo(a) ve pantallas? (TV, celular, iPad, etc.)</Label>
        <RadioGroup
          value={data.vePantallas === true ? "si" : data.vePantallas === false ? "no" : ""}
          onValueChange={(value) => {
            const watchesScreens = value === "si"
            onChange({
              ...data,
              vePantallas: watchesScreens,
              pantallasDetalle: watchesScreens ? data.pantallasDetalle || "" : "",
            })
          }}
        >
          <div className="flex gap-4 mt-2">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="si" id="pantallas-si" />
              <Label htmlFor="pantallas-si">Sí</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="pantallas-no" />
              <Label htmlFor="pantallas-no">No</Label>
            </div>
          </div>
        </RadioGroup>
        {data.vePantallas && (
          <div className="mt-3">
            <Label htmlFor="pantallas-detalle" className="text-sm text-gray-600">
              ¿Qué horas y cuánto tiempo las usa?
            </Label>
            <Textarea
              id="pantallas-detalle"
              value={data.pantallasDetalle || ""}
              onChange={(e) => updateField("pantallasDetalle", e.target.value)}
              placeholder="Ej: De 3pm a 5pm, 2 horas al día..."
              rows={2}
              className="mt-1"
            />
          </div>
        )}
      </div>

      {/* 2. ¿Practica actividad física? */}
      <div>
        <Label>2. ¿Tu hijo(a) practica alguna actividad física, estimulación temprana o deporte?</Label>
        <RadioGroup
          value={data.practicaActividad === true ? "si" : data.practicaActividad === false ? "no" : ""}
          onValueChange={(value) => {
            const practices = value === "si"
            onChange({
              ...data,
              practicaActividad: practices,
              actividadesLista: practices ? data.actividadesLista || [] : [],
            })
          }}
        >
          <div className="flex gap-4 mt-2">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="si" id="actividad-si" />
              <Label htmlFor="actividad-si">Sí</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="actividad-no" />
              <Label htmlFor="actividad-no">No</Label>
            </div>
          </div>
        </RadioGroup>
        {data.practicaActividad && (
          <div className="mt-3">
            <Label className="text-sm text-gray-600">
              ¿Qué actividades practica y cuánto duran? <span className="text-gray-500">(minutos)</span>
            </Label>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_140px_auto] sm:items-end">
              <Input
                id="actividades-input"
                placeholder="Ej: Natación, fútbol, yoga..."
                value={activityName}
                onChange={(e) => setActivityName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addActivity()
                  }
                }}
              />
              <Input
                id="actividades-duracion"
                placeholder="Minutos"
                type="number"
                min={1}
                value={activityDuration}
                onChange={(e) => setActivityDuration(e.target.value)}
                onWheel={(e) => { e.currentTarget.blur() }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addActivity()
                  }
                }}
              />
              <Button type="button" variant="secondary" onClick={addActivity} className="sm:w-full">
                <Plus className="w-4 h-4 mr-2" />
                Agregar
              </Button>
            </div>
            {normalizedActivities && normalizedActivities.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {normalizedActivities.map((actividad: any, index: number) => (
                  <div
                    key={`${actividad.nombre}-${index}`}
                    className="inline-flex items-center gap-2 bg-[#8B4789] text-white px-3 py-1 rounded-full text-sm"
                  >
                    <span className="font-semibold">{actividad.nombre}</span>
                    {actividad.duracionMinutos !== undefined && (
                      <span className="text-white/80">{actividad.duracionMinutos} min</span>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        const newList = normalizedActivities.filter((_: any, i: number) => i !== index)
                        updateField("actividadesLista", newList)
                      }}
                      className="ml-1 hover:bg-white/20 rounded-full p-0.5"
                      aria-label="Eliminar actividad"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Actividades cuando está despierto */}
      <div>
        <Label htmlFor="actividades-despierto">
          3. ¿Qué actividades realiza tu hijo(a) cuando está despierto?
        </Label>
        <Textarea
          id="actividades-despierto"
          value={data.actividadesDespierto || ""}
          onChange={(e) => updateField("actividadesDespierto", e.target.value)}
          placeholder="Describe las actividades que realiza..."
          rows={3}
        />
      </div>

      {/* 4. Signos de irritabilidad */}
      <div>
        <Label>4. ¿Has notado signos de irritabilidad o mal humor en tu hijo(a)?</Label>
        <RadioGroup
          value={data.signosIrritabilidad === true ? "si" : data.signosIrritabilidad === false ? "no" : ""}
          onValueChange={(value) => {
            const hasIrritability = value === "si"
            onChange({
              ...data,
              signosIrritabilidad: hasIrritability,
              irritabilidadDetalle: hasIrritability ? data.irritabilidadDetalle || "" : "",
            })
          }}
        >
          <div className="flex gap-4 mt-2">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="si" id="irritabilidad-si" />
              <Label htmlFor="irritabilidad-si">Sí</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="irritabilidad-no" />
              <Label htmlFor="irritabilidad-no">No</Label>
            </div>
          </div>
        </RadioGroup>
        {data.signosIrritabilidad && (
          <div className="mt-3">
            <Label htmlFor="irritabilidad-detalle" className="text-sm text-gray-600">
              Describe el humor y a qué hora se presenta
            </Label>
            <Textarea
              id="irritabilidad-detalle"
              value={data.irritabilidadDetalle || ""}
              onChange={(e) => updateField("irritabilidadDetalle", e.target.value)}
              placeholder="Ej: Se pone irritable alrededor de las 6pm, llora con facilidad..."
              rows={3}
              className="mt-1"
            />
          </div>
        )}
      </div>
    </div>
  )
}
