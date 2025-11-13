// Paso 3: Historial
// Información sobre el niño, prenatal y desarrollo

import { useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Baby } from "lucide-react"
import type { SurveyStepProps } from '../types/survey.types'

export function ChildHistoryStep({ data, onChange, errors = {}, context }: SurveyStepProps) {
  const childProfile = context?.childData
  const profileFirstName = childProfile?.firstName ?? ""
  const profileLastName = childProfile?.lastName ?? ""
  const profileBirthDateRaw = childProfile?.birthDate ?? ""

  useEffect(() => {
    if (!childProfile) return

    const fullName = [profileFirstName, profileLastName].filter(Boolean).join(" ").trim()
    const birthDate = profileBirthDateRaw ? String(profileBirthDateRaw).split("T")[0] : ""

    const updates: Record<string, any> = {}
    if (fullName && data.nombreHijo !== fullName) {
      updates.nombreHijo = fullName
    }
    if (birthDate && data.fechaNacimiento !== birthDate) {
      updates.fechaNacimiento = birthDate
    }
    if (Object.keys(updates).length > 0) {
      onChange({ ...data, ...updates })
    }
  }, [
    childProfile,
    profileFirstName,
    profileLastName,
    profileBirthDateRaw,
    data.nombreHijo,
    data.fechaNacimiento,
    onChange
  ])

  const displayName = data.nombreHijo || [profileFirstName, profileLastName].filter(Boolean).join(" ").trim()
  const displayBirthDate = data.fechaNacimiento || (profileBirthDateRaw ? String(profileBirthDateRaw).split("T")[0] : "")

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
        {childProfile && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-700 space-y-1">
            <p>
              <span className="font-medium text-gray-900">Nombre registrado:</span>{" "}
              {displayName || "—"}
            </p>
            <p>
              <span className="font-medium text-gray-900">Fecha de nacimiento:</span>{" "}
              {displayBirthDate || "—"}
            </p>
            <p className="text-xs text-gray-500">
              Esta información proviene del perfil del niño y no es necesario volver a capturarla.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {!childProfile && (
            <div>
              <Label htmlFor="nombre-hijo">
                1. Nombre de su hijo/a <span className="text-red-500">*</span>
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
          )}

          {!childProfile && (
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
          )}

          {/* 3. Peso actual */}
          <div>
            <Label htmlFor="peso-hijo">
              3. Peso actual (kg) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="peso-hijo"
              type="number"
              step="0.1"
              min="0"
              value={data.pesoHijo || ""}
              onChange={(e) => {
                const peso = e.target.value
                updateField('pesoHijo', peso)

                // Calcular percentil automáticamente si tenemos peso y edad
                if (peso && displayBirthDate) {
                  const birthDate = new Date(displayBirthDate)
                  const today = new Date()
                  const ageInMonths = Math.floor((today.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44))
                  const pesoNum = parseFloat(peso)

                  if (ageInMonths > 0 && pesoNum > 0) {
                    // Cálculo simplificado de percentil basado en rangos aproximados de la OMS
                    let percentil = 50 // Valor por defecto

                    // Rangos aproximados por edad (en meses) y peso
                    if (ageInMonths <= 12) {
                      if (pesoNum < 7) percentil = 10
                      else if (pesoNum < 8.5) percentil = 25
                      else if (pesoNum < 10) percentil = 50
                      else if (pesoNum < 11.5) percentil = 75
                      else percentil = 90
                    } else if (ageInMonths <= 24) {
                      if (pesoNum < 9) percentil = 10
                      else if (pesoNum < 10.5) percentil = 25
                      else if (pesoNum < 12) percentil = 50
                      else if (pesoNum < 13.5) percentil = 75
                      else percentil = 90
                    } else if (ageInMonths <= 36) {
                      if (pesoNum < 11) percentil = 10
                      else if (pesoNum < 12.5) percentil = 25
                      else if (pesoNum < 14) percentil = 50
                      else if (pesoNum < 15.5) percentil = 75
                      else percentil = 90
                    } else if (ageInMonths <= 60) {
                      if (pesoNum < 13) percentil = 10
                      else if (pesoNum < 15) percentil = 25
                      else if (pesoNum < 17) percentil = 50
                      else if (pesoNum < 19) percentil = 75
                      else percentil = 90
                    } else {
                      if (pesoNum < 16) percentil = 10
                      else if (pesoNum < 18) percentil = 25
                      else if (pesoNum < 21) percentil = 50
                      else if (pesoNum < 24) percentil = 75
                      else percentil = 90
                    }

                    updateField('percentilPeso', percentil.toString())
                  }
                }
              }}
              placeholder="Ej: 15.5"
              className={hasError('pesoHijo') ? 'border-red-500' : ''}
            />
            {hasError('pesoHijo') && (
              <p className="text-red-500 text-sm mt-1">{getError('pesoHijo')}</p>
            )}
          </div>

          {/* 4. Percentil de peso (auto-calculado) */}
          <div>
            <Label htmlFor="percentil-peso">
              4. Percentil de Peso
            </Label>
            <Input
              id="percentil-peso"
              value={data.percentilPeso || ""}
              readOnly
              disabled
              placeholder="Se calcula automáticamente"
              className="bg-gray-100"
            />
            <p className="text-xs text-gray-500 mt-1">
              Se calcula automáticamente basado en el peso y la edad
            </p>
          </div>
        </div>
      </div>

      {/* Información Prenatal */}
      <div className="space-y-4">
        <h4 className="text-lg font-semibold text-[#2F2F2F]">Información Prenatal</h4>
        
        {/* 1. Embarazo planeado */}
        <div>
          <Label>1. ¿Su embarazo fue planeado?</Label>
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
            onValueChange={(value) => {
              const hadProblems = value === 'si'
              onChange({
                ...data,
                problemasEmbarazo: hadProblems,
                problemasEmbarazoDetalle: hadProblems ? data.problemasEmbarazoDetalle || "" : ""
              })
            }}
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
          {data.problemasEmbarazo && (
            <div className="mt-3">
              <Label htmlFor="problemas-embarazo-detalle" className="text-sm text-gray-600">
                ¿Cuáles problemas tuviste durante el embarazo?
              </Label>
              <Textarea
                id="problemas-embarazo-detalle"
                value={data.problemasEmbarazoDetalle || ""}
                onChange={(e) => updateField('problemasEmbarazoDetalle', e.target.value)}
                placeholder="Describe los problemas que tuviste durante el embarazo..."
                rows={3}
                className="mt-1"
              />
            </div>
          )}
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
                id="cond-otro"
                checked={data.condicionesEmbarazo?.includes('otro') || false}
                onCheckedChange={(checked) => {
                  updateCondicion('otro', checked as boolean)
                  if (!checked) {
                    updateField('condicionesEmbarazoOtro', '')
                  }
                }}
              />
              <Label htmlFor="cond-otro">Otro</Label>
            </div>
            {data.condicionesEmbarazo?.includes('otro') && (
              <div className="ml-6 mt-2">
                <Input
                  id="cond-otro-detalle"
                  value={data.condicionesEmbarazoOtro || ""}
                  onChange={(e) => updateField('condicionesEmbarazoOtro', e.target.value)}
                  placeholder="Especifica la condición..."
                  className="max-w-md"
                />
              </div>
            )}
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
            onValueChange={(value) => {
              const wasFullTerm = value === 'si'
              onChange({
                ...data,
                nacioTermino: wasFullTerm,
                semanasNacimiento: wasFullTerm ? '' : data.semanasNacimiento || ""
              })
            }}
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
          {data.nacioTermino === false && (
            <div className="mt-3">
              <Label htmlFor="semanas-nacimiento" className="text-sm text-gray-600">
                ¿En qué semana nació?
              </Label>
              <select
                id="semanas-nacimiento"
                value={data.semanasNacimiento || ""}
                onChange={(e) => updateField('semanasNacimiento', e.target.value)}
                className="mt-1 w-full max-w-xs rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#8B4789] focus:outline-none focus:ring-1 focus:ring-[#8B4789]"
              >
                <option value="">Seleccionar semana</option>
                <option value="24">24 semanas</option>
                <option value="25">25 semanas</option>
                <option value="26">26 semanas</option>
                <option value="27">27 semanas</option>
                <option value="28">28 semanas</option>
                <option value="29">29 semanas</option>
                <option value="30">30 semanas</option>
                <option value="31">31 semanas</option>
                <option value="32">32 semanas</option>
                <option value="33">33 semanas</option>
                <option value="34">34 semanas</option>
                <option value="35">35 semanas</option>
                <option value="36">36 semanas</option>
              </select>
            </div>
          )}
        </div>

        {/* 7. Problemas al nacer */}
        <div>
          <Label>7. ¿Tuvo tu bebé algún problema al nacer?</Label>
          <RadioGroup
            value={data.problemasNacer === true ? "si" : data.problemasNacer === false ? "no" : ""}
            onValueChange={(value) => {
              const hadIssue = value === 'si'
              onChange({
                ...data,
                problemasNacer: hadIssue,
                problemasNacerDetalle: hadIssue ? data.problemasNacerDetalle || "" : ""
              })
            }}
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
          {data.problemasNacer && (
            <div className="mt-3">
              <Label htmlFor="problemas-nacer-detalle" className="text-sm text-gray-600">
                Describe el problema al nacer
              </Label>
              <Textarea
                id="problemas-nacer-detalle"
                value={data.problemasNacerDetalle || ""}
                onChange={(e) => updateField('problemasNacerDetalle', e.target.value)}
                placeholder="Ej: Bajo peso al nacer, dificultad respiratoria..."
                rows={3}
                className={hasError('problemasNacerDetalle') ? 'border-red-500 mt-1' : 'mt-1'}
              />
              {hasError('problemasNacerDetalle') && (
                <p className="text-red-500 text-sm mt-1">{getError('problemasNacerDetalle')}</p>
              )}
            </div>
          )}
        </div>

        {/* 8. Pediatra */}
        <div className="space-y-3">
          <Label htmlFor="pediatra">
            8. ¿Quién es tu pediatra?
          </Label>
          <Input
            id="pediatra"
            value={data.pediatra || ""}
            onChange={(e) => updateField('pediatra', e.target.value)}
            placeholder="Nombre del pediatra"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-4">
            <div>
              <Label htmlFor="pediatra-telefono" className="text-sm text-gray-600">
                Teléfono del pediatra (opcional)
              </Label>
              <Input
                id="pediatra-telefono"
                value={data.pediatraTelefono || ""}
                onChange={(e) => updateField('pediatraTelefono', e.target.value)}
                placeholder="Ej: 5512345678"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="pediatra-email" className="text-sm text-gray-600">
                Correo del pediatra (opcional)
              </Label>
              <Input
                id="pediatra-email"
                type="email"
                value={data.pediatraEmail || ""}
                onChange={(e) => updateField('pediatraEmail', e.target.value)}
                placeholder="Ej: pediatra@ejemplo.com"
                className="mt-1"
              />
            </div>
          </div>
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
            onValueChange={(value) => {
              const confirms = value === 'si'
              onChange({
                ...data,
                pediatraConfirma: confirms,
                pediatraConfirmaDetalle: confirms ? "" : data.pediatraConfirmaDetalle || ""
              })
            }}
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
          {data.pediatraConfirma === false && (
            <div className="mt-3">
              <Label htmlFor="pediatra-confirma-detalle" className="text-sm text-gray-600">
                Por favor, describe la situación
              </Label>
              <Textarea
                id="pediatra-confirma-detalle"
                value={data.pediatraConfirmaDetalle || ""}
                onChange={(e) => updateField('pediatraConfirmaDetalle', e.target.value)}
                placeholder="Describe por qué el pediatra considera que no puede dormir toda la noche..."
                rows={3}
                className="mt-1"
              />
            </div>
          )}
        </div>

        {/* 11. Tratamiento médico */}
        <div>
          <Label>11. ¿Está tu hijo(a) bajo algún tratamiento médico o tomando algún medicamento?</Label>
          <RadioGroup
            value={data.tratamientoMedico === true ? "si" : data.tratamientoMedico === false ? "no" : ""}
            onValueChange={(value) => {
              const hasTreatment = value === 'si'
              onChange({
                ...data,
                tratamientoMedico: hasTreatment,
                tratamientoMedicoDetalle: hasTreatment ? data.tratamientoMedicoDetalle || "" : ""
              })
            }}
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
          {data.tratamientoMedico && (
            <div className="mt-3">
              <Label htmlFor="tratamiento-medico-detalle" className="text-sm text-gray-600">
                ¿Cuáles medicamentos o tratamientos?
              </Label>
              <Textarea
                id="tratamiento-medico-detalle"
                value={data.tratamientoMedicoDetalle || ""}
                onChange={(e) => updateField('tratamientoMedicoDetalle', e.target.value)}
                placeholder="Especifica el nombre del medicamento, dosis y frecuencia..."
                rows={3}
                className="mt-1"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
