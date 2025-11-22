// Paso 4: Desarrollo y Salud
// Información sobre desarrollo, alimentación y problemas del niño

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import type { CheckedState } from "@radix-ui/react-checkbox"
import { Heart } from "lucide-react"
import type { SurveyStepProps } from '../types/survey.types'

export function HealthDevStep({ data, onChange, errors = {} }: SurveyStepProps) {
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

  const updateProblemaHijo = (
    problema: string,
    checked: CheckedState,
    extraUpdates: Record<string, any> = {}
  ) => {
    const isChecked = checked === true
    const problemas = data.problemasHijo || []
    const alreadySelected = problemas.includes(problema)
    const nextProblemas = isChecked
      ? (alreadySelected ? problemas : [...problemas, problema])
      : problemas.filter((p: string) => p !== problema)

    onChange({
      ...data,
      problemasHijo: nextProblemas,
      ...extraUpdates
    })
  }

  const updateSituacionSalud = (
    situacion: string,
    checked: CheckedState,
    extraUpdates: Record<string, any> = {}
  ) => {
    const isChecked = checked === true
    const situaciones = data.situacionesHijo || []
    const alreadySelected = situaciones.includes(situacion)
    const nextSituaciones = isChecked
      ? (alreadySelected ? situaciones : [...situaciones, situacion])
      : situaciones.filter((s: string) => s !== situacion)

    onChange({
      ...data,
      situacionesHijo: nextSituaciones,
      ...extraUpdates
    })
  }

  return (
    <div className="space-y-8">
      <h3 className="text-xl font-semibold text-[#2F2F2F] flex items-center gap-2">
        <Heart className="w-5 h-5" />
        DESARROLLO Y SALUD
      </h3>

      {/* Hitos del desarrollo */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 1. Rodar en ambos lados */}
          <div>
            <Label htmlFor="rodar-meses">
              1. ¿Cuándo fue su hijo/a capaz de rodar en ambos lados? (Meses)
            </Label>
            <Input
              id="rodar-meses"
              type="number"
              value={data.rodarMeses || ""}
              onChange={(e) => updateField('rodarMeses', e.target.value)}
              placeholder="Edad en meses"
            />
          </div>

          {/* 2. Sentarse */}
          <div>
            <Label htmlFor="sentarse-meses">
              2. ¿Cuándo fue su hijo/a capaz de sentarse? (Meses)
            </Label>
            <Input
              id="sentarse-meses"
              type="number"
              value={data.sentarseMeses || ""}
              onChange={(e) => updateField('sentarseMeses', e.target.value)}
              placeholder="Edad en meses"
            />
          </div>

          {/* 3. Gatear */}
          <div>
            <Label htmlFor="gatear-meses">
              3. ¿Cuándo fue su hijo/a capaz de gatear? (Meses)
            </Label>
            <Input
              id="gatear-meses"
              type="number"
              value={data.gatearMeses || ""}
              onChange={(e) => updateField('gatearMeses', e.target.value)}
              placeholder="Edad en meses"
            />
          </div>

          {/* 4. Pararse */}
          <div>
            <Label htmlFor="pararse-meses">
              4. ¿Cuándo fue su hijo/a capaz de pararse? (Meses)
            </Label>
            <Input
              id="pararse-meses"
              type="number"
              value={data.pararseMeses || ""}
              onChange={(e) => updateField('pararseMeses', e.target.value)}
              placeholder="Edad en meses"
            />
          </div>

          {/* 5. Caminar */}
          <div>
            <Label htmlFor="caminar-meses">
              5. ¿Cuándo fue su hijo/a capaz de caminar? (Meses)
            </Label>
            <Input
              id="caminar-meses"
              type="number"
              value={data.caminarMeses || ""}
              onChange={(e) => updateField('caminarMeses', e.target.value)}
              placeholder="Edad en meses"
            />
          </div>
        </div>
      </div>

      {/* 6. Tu hijo utiliza */}
      <div>
        <Label>6. Su hijo/a utiliza:</Label>
        <RadioGroup
          value={data.hijoUtiliza || ""}
          onValueChange={(value) => updateField('hijoUtiliza', value)}
        >
          <div className="flex gap-4 mt-2">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="vaso" id="utiliza-vaso" />
              <Label htmlFor="utiliza-vaso">Vaso</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="biberon" id="utiliza-biberon" />
              <Label htmlFor="utiliza-biberon">Biberón</Label>
            </div>
          </div>
        </RadioGroup>
      </div>

      {/* 7. Tu hijo se alimenta de */}
      <div>
        <Label>7. Su hijo/a se alimenta de:</Label>
        <RadioGroup
          value={data.alimentacion || ""}
          onValueChange={(value) => {
            onChange({
              ...data,
              alimentacion: value,
              alimentacionOtro: value === 'otro' ? data.alimentacionOtro || "" : ""
            })
          }}
        >
          <div className="space-y-2 mt-2">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="formula" id="alimenta-formula" />
              <Label htmlFor="alimenta-formula">Fórmula</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="leche-materna" id="alimenta-materna" />
              <Label htmlFor="alimenta-materna">Leche materna exclusiva</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="materna-formula" id="alimenta-mixta" />
              <Label htmlFor="alimenta-mixta">Leche materna y fórmula</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="solidos" id="alimenta-solidos" />
              <Label htmlFor="alimenta-solidos">Sólidos</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="otro" id="alimenta-otro" />
              <Label htmlFor="alimenta-otro">Otro</Label>
            </div>
            {data.alimentacion === 'otro' && (
              <div className="ml-6 mt-2">
                <Input
                  id="alimentacion-otro-detalle"
                  value={data.alimentacionOtro || ""}
                  onChange={(e) => updateField('alimentacionOtro', e.target.value)}
                  placeholder="Especifica el tipo de alimentación..."
                  className="max-w-md"
                />
              </div>
            )}
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="ninguna" id="alimenta-ninguna" />
              <Label htmlFor="alimenta-ninguna">Ninguna</Label>
            </div>
          </div>
        </RadioGroup>
      </div>

      {/* 8. ¿Tu hijo come sólidos? */}
      <div>
        <Label>8. ¿Su hijo/a come sólidos?</Label>
        <RadioGroup
          value={data.comeSolidos === true ? "si" : data.comeSolidos === false ? "no" : ""}
          onValueChange={(value) => updateField('comeSolidos', value === 'si')}
        >
          <div className="flex gap-4 mt-2">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="si" id="come-solidos-si" />
              <Label htmlFor="come-solidos-si">Sí</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="come-solidos-no" />
              <Label htmlFor="come-solidos-no">No</Label>
            </div>
          </div>
        </RadioGroup>
      </div>

      {/* 9. Tu hijo(a) - Lista de checkboxes */}
      <div>
        <Label>9. Su hijo/a:</Label>
        <div className="space-y-3 mt-2">
          <div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="prob-chupa-dedo"
                checked={data.problemasHijo?.includes('chupa-dedo') || false}
                onCheckedChange={(checked) => {
                  const isChecked = checked === true
                  updateProblemaHijo('chupa-dedo', checked, isChecked ? {} : { planDejarDedo: '' })
                }}
              />
              <Label htmlFor="prob-chupa-dedo">Se chupa el dedo</Label>
            </div>
            {data.problemasHijo?.includes('chupa-dedo') && (
              <div className="ml-6 mt-2">
                <Label htmlFor="plan-dejar-dedo" className="text-sm text-gray-600">
                  ¿Planea dejarlo?
                </Label>
                <RadioGroup
                  value={data.planDejarDedo || ""}
                  onValueChange={(value) => updateField('planDejarDedo', value)}
                  className="mt-1"
                >
                  <div className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="si" id="plan-dejar-dedo-si" />
                      <Label htmlFor="plan-dejar-dedo-si">Sí</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="plan-dejar-dedo-no" />
                      <Label htmlFor="plan-dejar-dedo-no">No</Label>
                    </div>
                  </div>
                </RadioGroup>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="prob-usa-chupon"
              checked={data.problemasHijo?.includes('usa-chupon') || false}
              onCheckedChange={(checked) => {
                const isChecked = checked === true
                updateProblemaHijo('usa-chupon', checked, isChecked ? {} : { planDejarChupon: '' })
              }}
            />
            <Label htmlFor="prob-usa-chupon">Usa chupón</Label>
          </div>
          {data.problemasHijo?.includes('usa-chupon') && (
            <div className="ml-6 mt-2">
              <Label htmlFor="plan-dejar-chupon" className="text-sm text-gray-600">
                ¿Planea dejarlo?
              </Label>
              <RadioGroup
                value={data.planDejarChupon || ""}
                onValueChange={(value) => updateField('planDejarChupon', value)}
                className="mt-1"
              >
                <div className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="si" id="plan-dejar-chupon-si" />
                    <Label htmlFor="plan-dejar-chupon-si">Sí</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="plan-dejar-chupon-no" />
                    <Label htmlFor="plan-dejar-chupon-no">No</Label>
                  </div>
                </div>
              </RadioGroup>
            </div>
          )}

          <div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="prob-objeto-seguridad"
                checked={data.problemasHijo?.includes('objeto-seguridad') || false}
                onCheckedChange={(checked) => {
                  const isChecked = checked === true
                  updateProblemaHijo('objeto-seguridad', checked, isChecked ? {} : { nombreObjetoSeguridad: '' })
                }}
              />
              <Label htmlFor="prob-objeto-seguridad">Tiene un objeto de seguridad como un trapito o peluche</Label>
            </div>
            {data.problemasHijo?.includes('objeto-seguridad') && (
              <div className="ml-6 mt-2">
                <Label htmlFor="nombre-objeto-seguridad" className="text-sm text-gray-600">
                  Nombre del objeto
                </Label>
                <Input
                  id="nombre-objeto-seguridad"
                  value={data.nombreObjetoSeguridad || ""}
                  onChange={(e) => updateField('nombreObjetoSeguridad', e.target.value)}
                  placeholder="Ej: Mi mantita, Osito..."
                  className="max-w-md mt-1"
                />
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="prob-problemas-medicos"
              checked={data.problemasHijo?.includes('problemas-medicos') || false}
              onCheckedChange={(checked) => {
                const isChecked = checked === true
                updateProblemaHijo('problemas-medicos', checked, isChecked ? {} : { problemasMedicosDetalle: '' })
              }}
            />
            <Label htmlFor="prob-problemas-medicos">Tiene o ha tenido problemas médicos o del desarrollo</Label>
          </div>
          {data.problemasHijo?.includes('problemas-medicos') && (
            <div className="ml-6 mt-2">
              <Label htmlFor="problemas-medicos-detalle" className="text-sm text-gray-600">
                ¿Cuál?
              </Label>
              <Input
                id="problemas-medicos-detalle"
                value={data.problemasMedicosDetalle || ""}
                onChange={(e) => updateField('problemasMedicosDetalle', e.target.value)}
                placeholder="Ej: Asma, hipotonía, diagnóstico neurológico..."
                className="max-w-md mt-1"
              />
            </div>
          )}
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="prob-moja-cama"
              checked={data.problemasHijo?.includes('moja-cama') || false}
              onCheckedChange={(checked) => updateProblemaHijo('moja-cama', checked === true)}
            />
            <Label htmlFor="prob-moja-cama">Moja la cama durante la noche</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="prob-sonambulo"
              checked={data.problemasHijo?.includes('sonambulo') || false}
              onCheckedChange={(checked) => updateProblemaHijo('sonambulo', checked === true)}
            />
            <Label htmlFor="prob-sonambulo">Es sonámbulo</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="prob-ronca"
              checked={data.problemasHijo?.includes('ronca') || false}
              onCheckedChange={(checked) => updateProblemaHijo('ronca', checked === true)}
            />
            <Label htmlFor="prob-ronca">Ronca</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="prob-respira-boca"
              checked={data.problemasHijo?.includes('respira-boca') || false}
              onCheckedChange={(checked) => updateProblemaHijo('respira-boca', checked === true)}
            />
            <Label htmlFor="prob-respira-boca">Respira por la boca</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="prob-cae-cama"
              checked={data.problemasHijo?.includes('cae-cama') || false}
              onCheckedChange={(checked) => updateProblemaHijo('cae-cama', checked === true)}
            />
            <Label htmlFor="prob-cae-cama">Se cae de la cama con frecuencia</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="prob-inquieto"
              checked={data.problemasHijo?.includes('inquieto') || false}
              onCheckedChange={(checked) => updateProblemaHijo('inquieto', checked === true)}
            />
            <Label htmlFor="prob-inquieto">Es muy inquieto para dormir</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="prob-transpira"
              checked={data.problemasHijo?.includes('transpira') || false}
              onCheckedChange={(checked) => updateProblemaHijo('transpira', checked === true)}
            />
            <Label htmlFor="prob-transpira">Transpira mucho cuando duerme</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="prob-reflujo"
              checked={data.problemasHijo?.includes('reflujo') || false}
              onCheckedChange={(checked) => updateProblemaHijo('reflujo', checked === true)}
            />
            <Label htmlFor="prob-reflujo">Tiene o ha tenido reflujo y/o cólicos</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="prob-pesadillas"
              checked={data.problemasHijo?.includes('pesadillas') || false}
              onCheckedChange={(checked) => updateProblemaHijo('pesadillas', checked === true)}
            />
            <Label htmlFor="prob-pesadillas">Tiene o ha tenido pesadillas</Label>
          </div>
        </div>
      </div>

      {/* 10. ¿Ha tenido algunas de las siguientes situaciones? */}
      <div>
        <Label>10. ¿Su hijo/a ha sufrido de algunas de las siguientes situaciones?</Label>
        <div className="space-y-3 mt-2">
          <div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="salud-alergia-ambiental"
                checked={data.situacionesHijo?.includes('alergia-ambiental') || false}
                onCheckedChange={(checked) => {
                  const isChecked = checked === true
                  updateSituacionSalud('alergia-ambiental', checked, isChecked ? {} : { alergiaAmbientalDetalle: '' })
                }}
              />
              <Label htmlFor="salud-alergia-ambiental">Alergia ambiental</Label>
            </div>
            {data.situacionesHijo?.includes('alergia-ambiental') && (
              <div className="ml-6 mt-2">
                <Label htmlFor="alergia-ambiental-detalle" className="text-sm text-gray-600">
                  ¿A qué es alérgico(a)?
                </Label>
                <Input
                  id="alergia-ambiental-detalle"
                  value={data.alergiaAmbientalDetalle || ""}
                  onChange={(e) => updateField('alergiaAmbientalDetalle', e.target.value)}
                  placeholder="Ej: Polen, polvo, ácaros, mascotas..."
                  className="max-w-md mt-1"
                />
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="salud-alergia-alimenticia"
                checked={data.situacionesHijo?.includes('alergia-alimenticia') || false}
                onCheckedChange={(checked) => {
                  const isChecked = checked === true
                  updateSituacionSalud('alergia-alimenticia', checked, isChecked ? {} : { alergiaAlimenticiaDetalle: '' })
                }}
              />
              <Label htmlFor="salud-alergia-alimenticia">Alergia alimenticia</Label>
            </div>
            {data.situacionesHijo?.includes('alergia-alimenticia') && (
              <div className="ml-6 mt-2">
                <Label htmlFor="alergia-alimenticia-detalle" className="text-sm text-gray-600">
                  ¿A qué alimentos es alérgico(a)?
                </Label>
                <Input
                  id="alergia-alimenticia-detalle"
                  value={data.alergiaAlimenticiaDetalle || ""}
                  onChange={(e) => updateField('alergiaAlimenticiaDetalle', e.target.value)}
                  placeholder="Ej: Leche, huevo, nueces, mariscos..."
                  className="max-w-md mt-1"
                />
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="salud-infecciones-oido"
                checked={data.situacionesHijo?.includes('infecciones-oido') || false}
                onCheckedChange={(checked) => {
                  const isChecked = checked === true
                  updateSituacionSalud('infecciones-oido', checked, isChecked ? {} : { infeccionesOidoDetalle: '' })
                }}
              />
              <Label htmlFor="salud-infecciones-oido">Infecciones de oído frecuentes</Label>
            </div>
            {data.situacionesHijo?.includes('infecciones-oido') && (
              <div className="ml-6 mt-2">
                <Label htmlFor="infecciones-oido-detalle" className="text-sm text-gray-600">
                  ¿Cuántas veces ha tenido infecciones de oído?
                </Label>
                <Input
                  id="infecciones-oido-detalle"
                  type="number"
                  value={data.infeccionesOidoDetalle || ""}
                  onChange={(e) => updateField('infeccionesOidoDetalle', e.target.value)}
                  placeholder="Número de veces"
                  className="max-w-md mt-1"
                />
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="salud-asma"
              checked={data.situacionesHijo?.includes('asma') || false}
              onCheckedChange={(checked) => updateSituacionSalud('asma', checked === true)}
            />
            <Label htmlFor="salud-asma">Asma</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="salud-rinitis"
              checked={data.situacionesHijo?.includes('rinitis') || false}
              onCheckedChange={(checked) => updateSituacionSalud('rinitis', checked === true)}
            />
            <Label htmlFor="salud-rinitis">Rinitis</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="salud-nariz-tapada"
              checked={data.situacionesHijo?.includes('nariz-tapada') || false}
              onCheckedChange={(checked) => updateSituacionSalud('nariz-tapada', checked === true)}
            />
            <Label htmlFor="salud-nariz-tapada">Nariz frecuentemente tapada</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="salud-dermatitis"
              checked={data.situacionesHijo?.includes('dermatitis') || false}
              onCheckedChange={(checked) => updateSituacionSalud('dermatitis', checked === true)}
            />
            <Label htmlFor="salud-dermatitis">Dermatitis atópica</Label>
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="salud-dificultad-respirar"
                checked={data.situacionesHijo?.includes('dificultad-respirar') || false}
                onCheckedChange={(checked) => {
                  const isChecked = checked === true
                  updateSituacionSalud('dificultad-respirar', checked, isChecked ? {} : { dificultadRespirarDetalle: '' })
                }}
              />
              <Label htmlFor="salud-dificultad-respirar">Dificultad para respirar</Label>
            </div>
            {data.situacionesHijo?.includes('dificultad-respirar') && (
              <div className="ml-6 mt-2">
                <Label htmlFor="dificultad-respirar-detalle" className="text-sm text-gray-600">
                  ¿Cuándo y cómo se manifiesta?
                </Label>
                <Input
                  id="dificultad-respirar-detalle"
                  value={data.dificultadRespirarDetalle || ""}
                  onChange={(e) => updateField('dificultadRespirarDetalle', e.target.value)}
                  placeholder="Ej: Durante la noche, al hacer ejercicio, con tos..."
                  className="max-w-md mt-1"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
