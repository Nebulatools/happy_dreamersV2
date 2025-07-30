// Paso 3: Historial
// Información sobre el niño, prenatal y desarrollo

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Baby } from "lucide-react"
import type { SurveyStepProps } from '../types/survey.types'

export function ChildHistoryStep({ data, onChange, errors = {} }: SurveyStepProps) {
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

  const updateCondicion = (condicion: string, checked: boolean) => {
    const condiciones = data.condicionesEmbarazo || []
    if (checked) {
      onChange({ ...data, condicionesEmbarazo: [...condiciones, condicion] })
    } else {
      onChange({ 
        ...data, 
        condicionesEmbarazo: condiciones.filter((c: string) => c !== condicion) 
      })
    }
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

  return (
    <div className="space-y-8">
      <h3 className="text-xl font-semibold text-[#2F2F2F] flex items-center gap-2">
        <Baby className="w-5 h-5" />
        HISTORIAL
      </h3>

      {/* Información básica del niño */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 1. Nombre del hijo */}
          <div>
            <Label htmlFor="nombre-hijo">
              1. Nombre de tu hijo <span className="text-red-500">*</span>
            </Label>
            <Input
              id="nombre-hijo"
              value={data.nombreHijo || ""}
              onChange={(e) => updateField('nombreHijo', e.target.value)}
              placeholder="Nombre del niño"
              className={hasError('nombreHijo') ? 'border-red-500' : ''}
            />
            {hasError('nombreHijo') && (
              <p className="text-red-500 text-sm mt-1">{getError('nombreHijo')}</p>
            )}
          </div>

          {/* 2. Fecha de nacimiento */}
          <div>
            <Label htmlFor="fecha-nacimiento">
              2. Fecha de Nacimiento <span className="text-red-500">*</span>
            </Label>
            <Input
              id="fecha-nacimiento"
              type="date"
              value={data.fechaNacimiento || ""}
              onChange={(e) => updateField('fechaNacimiento', e.target.value)}
              className={hasError('fechaNacimiento') ? 'border-red-500' : ''}
            />
            {hasError('fechaNacimiento') && (
              <p className="text-red-500 text-sm mt-1">{getError('fechaNacimiento')}</p>
            )}
          </div>

          {/* 3. Peso */}
          <div>
            <Label htmlFor="peso-hijo">
              3. Peso <span className="text-red-500">*</span>
            </Label>
            <Input
              id="peso-hijo"
              value={data.pesoHijo || ""}
              onChange={(e) => updateField('pesoHijo', e.target.value)}
              placeholder="Ej: 15 kg"
              className={hasError('pesoHijo') ? 'border-red-500' : ''}
            />
            {hasError('pesoHijo') && (
              <p className="text-red-500 text-sm mt-1">{getError('pesoHijo')}</p>
            )}
          </div>

          {/* 4. Percentil de peso */}
          <div>
            <Label htmlFor="percentil-peso">
              4. Percentil de Peso
            </Label>
            <Input
              id="percentil-peso"
              value={data.percentilPeso || ""}
              onChange={(e) => updateField('percentilPeso', e.target.value)}
              placeholder="Ej: 50"
            />
          </div>
        </div>
      </div>

      {/* Información Prenatal */}
      <div className="space-y-4">
        <h4 className="text-lg font-semibold text-[#2F2F2F]">Información Prenatal</h4>
        
        {/* 1. Embarazo planeado */}
        <div>
          <Label>1. ¿Fue tu embarazo planeado?</Label>
          <RadioGroup
            value={data.embarazoPlaneado === true ? "si" : data.embarazoPlaneado === false ? "no" : ""}
            onValueChange={(value) => updateField('embarazoPlaneado', value === 'si')}
          >
            <div className="flex gap-4 mt-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="si" id="embarazo-planeado-si" />
                <Label htmlFor="embarazo-planeado-si">Sí</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="embarazo-planeado-no" />
                <Label htmlFor="embarazo-planeado-no">No</Label>
              </div>
            </div>
          </RadioGroup>
        </div>

        {/* 2. Problemas en embarazo */}
        <div>
          <Label>2. ¿Tuviste algún problema en tu embarazo?</Label>
          <RadioGroup
            value={data.problemasEmbarazo === true ? "si" : data.problemasEmbarazo === false ? "no" : ""}
            onValueChange={(value) => updateField('problemasEmbarazo', value === 'si')}
          >
            <div className="flex gap-4 mt-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="si" id="problemas-embarazo-si" />
                <Label htmlFor="problemas-embarazo-si">Sí</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="problemas-embarazo-no" />
                <Label htmlFor="problemas-embarazo-no">No</Label>
              </div>
            </div>
          </RadioGroup>
        </div>

        {/* 3. Durante el embarazo padeciste */}
        <div>
          <Label>3. Durante tu embarazo padeciste:</Label>
          <div className="space-y-2 mt-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="cond-anemia"
                checked={data.condicionesEmbarazo?.includes('anemia') || false}
                onCheckedChange={(checked) => updateCondicion('anemia', checked as boolean)}
              />
              <Label htmlFor="cond-anemia">Anemia</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="cond-infecciones"
                checked={data.condicionesEmbarazo?.includes('infecciones') || false}
                onCheckedChange={(checked) => updateCondicion('infecciones', checked as boolean)}
              />
              <Label htmlFor="cond-infecciones">Infecciones</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="cond-ninguna"
                checked={data.condicionesEmbarazo?.includes('ninguna') || false}
                onCheckedChange={(checked) => updateCondicion('ninguna', checked as boolean)}
              />
              <Label htmlFor="cond-ninguna">Ninguna</Label>
            </div>
          </div>
        </div>

        {/* 4. Tipo de parto */}
        <div>
          <Label>4. Tu parto fue:</Label>
          <RadioGroup
            value={data.tipoParto || ""}
            onValueChange={(value) => updateField('tipoParto', value)}
          >
            <div className="space-y-2 mt-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="vaginal" id="parto-vaginal" />
                <Label htmlFor="parto-vaginal">Vaginal</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="cesarea" id="parto-cesarea" />
                <Label htmlFor="parto-cesarea">Cesárea</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="vaginal-despues-cesarea" id="parto-vdc" />
                <Label htmlFor="parto-vdc">Vaginal después de Cesárea</Label>
              </div>
            </div>
          </RadioGroup>
        </div>

        {/* 5. Complicaciones durante el parto */}
        <div>
          <Label>5. ¿Tuviste alguna complicación durante el parto?</Label>
          <RadioGroup
            value={data.complicacionesParto === true ? "si" : data.complicacionesParto === false ? "no" : ""}
            onValueChange={(value) => updateField('complicacionesParto', value === 'si')}
          >
            <div className="flex gap-4 mt-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="si" id="complicaciones-parto-si" />
                <Label htmlFor="complicaciones-parto-si">Sí</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="complicaciones-parto-no" />
                <Label htmlFor="complicaciones-parto-no">No</Label>
              </div>
            </div>
          </RadioGroup>
        </div>

        {/* 6. Bebé nacido a término */}
        <div>
          <Label>6. ¿Tu bebé nació a término?</Label>
          <RadioGroup
            value={data.nacioTermino === true ? "si" : data.nacioTermino === false ? "no" : ""}
            onValueChange={(value) => updateField('nacioTermino', value === 'si')}
          >
            <div className="flex gap-4 mt-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="si" id="nacio-termino-si" />
                <Label htmlFor="nacio-termino-si">Sí</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="nacio-termino-no" />
                <Label htmlFor="nacio-termino-no">No</Label>
              </div>
            </div>
          </RadioGroup>
        </div>

        {/* 7. Problemas al nacer */}
        <div>
          <Label>7. ¿Tuvo tu bebé algún problema al nacer?</Label>
          <RadioGroup
            value={data.problemasNacer === true ? "si" : data.problemasNacer === false ? "no" : ""}
            onValueChange={(value) => updateField('problemasNacer', value === 'si')}
          >
            <div className="flex gap-4 mt-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="si" id="problemas-nacer-si" />
                <Label htmlFor="problemas-nacer-si">Sí</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="problemas-nacer-no" />
                <Label htmlFor="problemas-nacer-no">No</Label>
              </div>
            </div>
          </RadioGroup>
        </div>

        {/* 8. Pediatra (OPTIONAL) */}
        <div>
          <Label htmlFor="pediatra">
            8. ¿Quién es tu pediatra? (OPTIONAL)
          </Label>
          <Input
            id="pediatra"
            value={data.pediatra || ""}
            onChange={(e) => updateField('pediatra', e.target.value)}
            placeholder="Nombre del pediatra"
          />
        </div>

        {/* 9. Pediatra descartó problemas */}
        <div>
          <Label>9. ¿Ha descartado tu pediatra algún problema médico que contribuya a los problemas de dormir de tu hijo(a)?</Label>
          <RadioGroup
            value={data.pediatraDescarto === true ? "si" : data.pediatraDescarto === false ? "no" : ""}
            onValueChange={(value) => updateField('pediatraDescarto', value === 'si')}
          >
            <div className="flex gap-4 mt-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="si" id="pediatra-descarto-si" />
                <Label htmlFor="pediatra-descarto-si">Sí</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="pediatra-descarto-no" />
                <Label htmlFor="pediatra-descarto-no">No</Label>
              </div>
            </div>
          </RadioGroup>
        </div>

        {/* 10. Pediatra confirma que puede dormir toda la noche */}
        <div>
          <Label>10. ¿Confirmaría tu pediatra que tu niño(a) puede dormir toda la noche dada su edad, peso y salud?</Label>
          <RadioGroup
            value={data.pediatraConfirma === true ? "si" : data.pediatraConfirma === false ? "no" : ""}
            onValueChange={(value) => updateField('pediatraConfirma', value === 'si')}
          >
            <div className="flex gap-4 mt-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="si" id="pediatra-confirma-si" />
                <Label htmlFor="pediatra-confirma-si">Sí</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="pediatra-confirma-no" />
                <Label htmlFor="pediatra-confirma-no">No</Label>
              </div>
            </div>
          </RadioGroup>
        </div>

        {/* 11. Tratamiento médico */}
        <div>
          <Label>11. ¿Está tu hijo(a) bajo algún tratamiento médico o tomando algún medicamento?</Label>
          <RadioGroup
            value={data.tratamientoMedico === true ? "si" : data.tratamientoMedico === false ? "no" : ""}
            onValueChange={(value) => updateField('tratamientoMedico', value === 'si')}
          >
            <div className="flex gap-4 mt-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="si" id="tratamiento-medico-si" />
                <Label htmlFor="tratamiento-medico-si">Sí</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="tratamiento-medico-no" />
                <Label htmlFor="tratamiento-medico-no">No</Label>
              </div>
            </div>
          </RadioGroup>
        </div>
      </div>
    </div>
  )
}