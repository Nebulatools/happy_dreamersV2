// Paso 4: Desarrollo y Salud
// Información sobre desarrollo, alimentación y problemas del niño

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
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

  const updateProblemaHijo = (problema: string, checked: boolean) => {
    const problemas = data.problemasHijo || []
    if (checked) {
      onChange({ ...data, problemasHijo: [...problemas, problema] })
    } else {
      onChange({ 
        ...data, 
        problemasHijo: problemas.filter((p: string) => p !== problema) 
      })
    }
  }

  const updateSituacionSalud = (situacion: string, checked: boolean) => {
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
          onValueChange={(value) => updateField('alimentacion', value)}
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
        <div className="space-y-2 mt-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="prob-chupa-dedo"
              checked={data.problemasHijo?.includes('chupa-dedo') || false}
              onCheckedChange={(checked) => updateProblemaHijo('chupa-dedo', checked as boolean)}
            />
            <Label htmlFor="prob-chupa-dedo">Se chupa el dedo</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="prob-usa-chupon"
              checked={data.problemasHijo?.includes('usa-chupon') || false}
              onCheckedChange={(checked) => updateProblemaHijo('usa-chupon', checked as boolean)}
            />
            <Label htmlFor="prob-usa-chupon">Usa chupón</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="prob-objeto-seguridad"
              checked={data.problemasHijo?.includes('objeto-seguridad') || false}
              onCheckedChange={(checked) => updateProblemaHijo('objeto-seguridad', checked as boolean)}
            />
            <Label htmlFor="prob-objeto-seguridad">Tiene un objeto de seguridad como un trapito o peluche</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="prob-problemas-medicos"
              checked={data.problemasHijo?.includes('problemas-medicos') || false}
              onCheckedChange={(checked) => updateProblemaHijo('problemas-medicos', checked as boolean)}
            />
            <Label htmlFor="prob-problemas-medicos">Tiene o ha tenido problemas médicos o del desarrollo</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="prob-moja-cama"
              checked={data.problemasHijo?.includes('moja-cama') || false}
              onCheckedChange={(checked) => updateProblemaHijo('moja-cama', checked as boolean)}
            />
            <Label htmlFor="prob-moja-cama">Moja la cama durante la noche</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="prob-sonambulo"
              checked={data.problemasHijo?.includes('sonambulo') || false}
              onCheckedChange={(checked) => updateProblemaHijo('sonambulo', checked as boolean)}
            />
            <Label htmlFor="prob-sonambulo">Es sonámbulo</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="prob-ronca"
              checked={data.problemasHijo?.includes('ronca') || false}
              onCheckedChange={(checked) => updateProblemaHijo('ronca', checked as boolean)}
            />
            <Label htmlFor="prob-ronca">Ronca</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="prob-respira-boca"
              checked={data.problemasHijo?.includes('respira-boca') || false}
              onCheckedChange={(checked) => updateProblemaHijo('respira-boca', checked as boolean)}
            />
            <Label htmlFor="prob-respira-boca">Respira por la boca</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="prob-cae-cama"
              checked={data.problemasHijo?.includes('cae-cama') || false}
              onCheckedChange={(checked) => updateProblemaHijo('cae-cama', checked as boolean)}
            />
            <Label htmlFor="prob-cae-cama">Se cae de la cama con frecuencia</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="prob-inquieto"
              checked={data.problemasHijo?.includes('inquieto') || false}
              onCheckedChange={(checked) => updateProblemaHijo('inquieto', checked as boolean)}
            />
            <Label htmlFor="prob-inquieto">Es muy inquieto para dormir</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="prob-transpira"
              checked={data.problemasHijo?.includes('transpira') || false}
              onCheckedChange={(checked) => updateProblemaHijo('transpira', checked as boolean)}
            />
            <Label htmlFor="prob-transpira">Transpira mucho cuando duerme</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="prob-reflujo"
              checked={data.problemasHijo?.includes('reflujo') || false}
              onCheckedChange={(checked) => updateProblemaHijo('reflujo', checked as boolean)}
            />
            <Label htmlFor="prob-reflujo">Tiene o ha tenido reflujo y/o cólicos</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="prob-pesadillas"
              checked={data.problemasHijo?.includes('pesadillas') || false}
              onCheckedChange={(checked) => updateProblemaHijo('pesadillas', checked as boolean)}
            />
            <Label htmlFor="prob-pesadillas">Tiene o ha tenido pesadillas</Label>
          </div>
        </div>
      </div>

      {/* 10. ¿Ha tenido algunas de las siguientes situaciones? */}
      <div>
        <Label>10. ¿Su hijo/a ha sufrido de algunas de las siguientes situaciones?</Label>
        <div className="space-y-2 mt-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="salud-alergias"
              checked={data.situacionesHijo?.includes('alergias') || false}
              onCheckedChange={(checked) => updateSituacionSalud('alergias', checked as boolean)}
            />
            <Label htmlFor="salud-alergias">Alergias</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="salud-infecciones-oido"
              checked={data.situacionesHijo?.includes('infecciones-oido') || false}
              onCheckedChange={(checked) => updateSituacionSalud('infecciones-oido', checked as boolean)}
            />
            <Label htmlFor="salud-infecciones-oido">Infecciones de oído frecuentes</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="salud-asma"
              checked={data.situacionesHijo?.includes('asma') || false}
              onCheckedChange={(checked) => updateSituacionSalud('asma', checked as boolean)}
            />
            <Label htmlFor="salud-asma">Asma</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="salud-rinitis"
              checked={data.situacionesHijo?.includes('rinitis') || false}
              onCheckedChange={(checked) => updateSituacionSalud('rinitis', checked as boolean)}
            />
            <Label htmlFor="salud-rinitis">Rinitis</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="salud-nariz-tapada"
              checked={data.situacionesHijo?.includes('nariz-tapada') || false}
              onCheckedChange={(checked) => updateSituacionSalud('nariz-tapada', checked as boolean)}
            />
            <Label htmlFor="salud-nariz-tapada">Nariz frecuentemente tapada</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="salud-dermatitis"
              checked={data.situacionesHijo?.includes('dermatitis') || false}
              onCheckedChange={(checked) => updateSituacionSalud('dermatitis', checked as boolean)}
            />
            <Label htmlFor="salud-dermatitis">Dermatitis atópica</Label>
          </div>
        </div>
      </div>
    </div>
  )
}
