// Paso 5: Actividad Física
// Información sobre actividad física, pantallas y salud del niño

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { Activity } from "lucide-react"
import type { SurveyStepProps } from '../types/survey.types'

export function PhysicalActivityStep({ data, onChange, errors = {} }: SurveyStepProps) {
  const updateField = (field: string, value: any) => {
    onChange({
      ...data,
      [field]: value
    })
  }

  const getError = (field: string): string | undefined => {
    return errors[field] as string
  }

  const hasError = (field: string): boolean => {
    return !!getError(field)
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
            const watchesScreens = value === 'si'
            onChange({
              ...data,
              vePantallas: watchesScreens,
              pantallasDetalle: watchesScreens ? data.pantallasDetalle || "" : ""
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
              onChange={(e) => updateField('pantallasDetalle', e.target.value)}
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
            const practices = value === 'si'
            onChange({
              ...data,
              practicaActividad: practices,
              actividadesLista: practices ? data.actividadesLista || [] : []
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
            <Label htmlFor="actividades-input" className="text-sm text-gray-600">
              ¿Qué actividades practica? (Presiona Enter después de cada actividad)
            </Label>
            <div className="mt-1">
              <Input
                id="actividades-input"
                placeholder="Ej: Natación, fútbol, yoga..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    const input = e.currentTarget
                    const value = input.value.trim()
                    if (value) {
                      const currentList = data.actividadesLista || []
                      onChange({
                        ...data,
                        actividadesLista: [...currentList, value]
                      })
                      input.value = ''
                    }
                  }
                }}
              />
              {data.actividadesLista && data.actividadesLista.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {data.actividadesLista.map((actividad: string, index: number) => (
                    <div
                      key={index}
                      className="inline-flex items-center gap-1 bg-[#8B4789] text-white px-3 py-1 rounded-full text-sm"
                    >
                      <span>{actividad}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const newList = data.actividadesLista.filter((_: string, i: number) => i !== index)
                          onChange({
                            ...data,
                            actividadesLista: newList
                          })
                        }}
                        className="ml-1 hover:bg-white/20 rounded-full p-0.5"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
          onChange={(e) => updateField('actividadesDespierto', e.target.value)}
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
            const hasIrritability = value === 'si'
            onChange({
              ...data,
              signosIrritabilidad: hasIrritability,
              irritabilidadDetalle: hasIrritability ? data.irritabilidadDetalle || "" : ""
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
              onChange={(e) => updateField('irritabilidadDetalle', e.target.value)}
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
