// Paso 5: Actividad Física
// Información sobre actividad física, pantallas y salud del niño

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
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

  const updateSituacion = (situacion: string, checked: boolean) => {
    const situaciones = data.situacionesHijo || []
    if (checked) {
      onChange({ ...data, situacionesHijo: [...situaciones, situacion] })
    } else {
      onChange({ 
        ...data, 
        situacionesHijo: situaciones.filter((s: string) => s !== situacion) 
      })
    }
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
          onValueChange={(value) => updateField('vePantallas', value === 'si')}
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
      </div>

      {/* 2. ¿Practica actividad física? */}
      <div>
        <Label>2. ¿Tu hijo(a) practica alguna actividad física, estimulación temprana o deporte?</Label>
        <RadioGroup
          value={data.practicaActividad === true ? "si" : data.practicaActividad === false ? "no" : ""}
          onValueChange={(value) => updateField('practicaActividad', value === 'si')}
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
      </div>

      {/* 3. Actividades cuando está despierto (OPTIONAL) */}
      <div>
        <Label htmlFor="actividades-despierto">
          3. ¿Qué actividades realiza tu hijo(a) cuando está despierto? (OPTIONAL)
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
          onValueChange={(value) => updateField('signosIrritabilidad', value === 'si')}
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
      </div>

      {/* 5. Situaciones de salud (OPTIONAL) */}
      <div>
        <Label>5. ¿Tu hijo(a) ha sufrido de algunas de las siguientes situaciones? (OPTIONAL)</Label>
        <div className="space-y-2 mt-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="sit-alergias"
              checked={data.situacionesHijo?.includes('alergias') || false}
              onCheckedChange={(checked) => updateSituacion('alergias', checked as boolean)}
            />
            <Label htmlFor="sit-alergias">Alergias</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="sit-infecciones-oido"
              checked={data.situacionesHijo?.includes('infecciones-oido') || false}
              onCheckedChange={(checked) => updateSituacion('infecciones-oido', checked as boolean)}
            />
            <Label htmlFor="sit-infecciones-oido">Infecciones de oído frecuentes</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="sit-asma"
              checked={data.situacionesHijo?.includes('asma') || false}
              onCheckedChange={(checked) => updateSituacion('asma', checked as boolean)}
            />
            <Label htmlFor="sit-asma">Asma</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="sit-rinitis"
              checked={data.situacionesHijo?.includes('rinitis') || false}
              onCheckedChange={(checked) => updateSituacion('rinitis', checked as boolean)}
            />
            <Label htmlFor="sit-rinitis">Rinitis</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="sit-nariz-tapada"
              checked={data.situacionesHijo?.includes('nariz-tapada') || false}
              onCheckedChange={(checked) => updateSituacion('nariz-tapada', checked as boolean)}
            />
            <Label htmlFor="sit-nariz-tapada">Frecuente nariz tapada</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="sit-dermatitis"
              checked={data.situacionesHijo?.includes('dermatitis') || false}
              onCheckedChange={(checked) => updateSituacion('dermatitis', checked as boolean)}
            />
            <Label htmlFor="sit-dermatitis">Dermatitis atópica</Label>
          </div>
        </div>
      </div>
    </div>
  )
}