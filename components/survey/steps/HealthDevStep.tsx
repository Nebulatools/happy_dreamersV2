// Paso 4: Desarrollo y Salud
// Información sobre desarrollo, alimentación y problemas del niño

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { CheckedState } from "@radix-ui/react-checkbox"
import { Heart } from "lucide-react"
import type { SurveyStepProps } from "../types/survey.types"

export function HealthDevStep({ data, onChange, errors = {} }: SurveyStepProps) {
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
      ...extraUpdates,
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
      ...extraUpdates,
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
              onChange={(e) => updateField("rodarMeses", e.target.value)}
              onWheel={(e) => { e.currentTarget.blur() }}
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
              onChange={(e) => updateField("sentarseMeses", e.target.value)}
              onWheel={(e) => { e.currentTarget.blur() }}
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
              onChange={(e) => updateField("gatearMeses", e.target.value)}
              onWheel={(e) => { e.currentTarget.blur() }}
              placeholder="Edad en meses"
            />
          </div>

          {/* 4. Pararse */}
          <div>
            <Label htmlFor="pararse-meses">
              4. ¿Cuándo fue su hijo/a capaz de pararse? (Meses)
            </Label>
            <Select
              value={
                data.pararseMeses === "aun-no-lo-hace"
                  ? "aun-no-lo-hace"
                  : data.pararseMeses
                    ? String(data.pararseMeses)
                    : ""
              }
              onValueChange={(value) => {
                if (value === "aun-no-lo-hace") {
                  updateField("pararseMeses", "aun-no-lo-hace")
                } else {
                  const numericValue = Number(value)
                  updateField("pararseMeses", Number.isNaN(numericValue) ? "" : numericValue)
                }
              }}
            >
              <SelectTrigger id="pararse-meses">
                <SelectValue placeholder="Selecciona los meses o 'Aún no lo hace'" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 36 }, (_, index) => index + 1).map((month) => (
                  <SelectItem key={month} value={String(month)}>
                    {month} {month === 1 ? "mes" : "meses"}
                  </SelectItem>
                ))}
                <SelectItem value="aun-no-lo-hace">Aún no lo hace</SelectItem>
              </SelectContent>
            </Select>
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
              onChange={(e) => updateField("caminarMeses", e.target.value)}
              onWheel={(e) => { e.currentTarget.blur() }}
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
          onValueChange={(value) => updateField("hijoUtiliza", value)}
        >
          <div className="flex gap-4 mt-2 flex-wrap">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="vaso" id="utiliza-vaso" />
              <Label htmlFor="utiliza-vaso">Vaso</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="biberon" id="utiliza-biberon" />
              <Label htmlFor="utiliza-biberon">Biberón</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="ambas" id="utiliza-ambas" />
              <Label htmlFor="utiliza-ambas">Ambas</Label>
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
              alimentacionOtro: value === "otro" ? data.alimentacionOtro || "" : "",
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
              <Label htmlFor="alimenta-materna">Leche materna</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="materna-formula" id="alimenta-mixta" />
              <Label htmlFor="alimenta-mixta">Leche materna y fórmula</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="leche-entera-vaca" id="alimenta-vaca" />
              <Label htmlFor="alimenta-vaca">Leche entera de vaca</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="otro" id="alimenta-otro" />
              <Label htmlFor="alimenta-otro">Otro</Label>
            </div>
            {data.alimentacion === "otro" && (
              <div className="ml-6 mt-2">
                <Input
                  id="alimentacion-otro-detalle"
                  value={data.alimentacionOtro || ""}
                  onChange={(e) => updateField("alimentacionOtro", e.target.value)}
                  placeholder="Especifica el tipo de alimentación..."
                  className="max-w-md"
                />
              </div>
            )}
            {(data.alimentacion === "formula" || data.alimentacion === "materna-formula") && (
              <div className="ml-6 mt-2 space-y-1">
                <Label htmlFor="alimentacion-introduccion" className="text-sm text-gray-600">
                  ¿Cuándo la introdujeron?
                </Label>
                <Input
                  id="alimentacion-introduccion"
                  value={data.alimentacionIntroduccion || ""}
                  onChange={(e) => updateField("alimentacionIntroduccion", e.target.value)}
                  placeholder="Ej. a los 4 meses"
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
          onValueChange={(value) => updateField("comeSolidos", value === "si")}
        >
          <div className="flex gap-4 mt-2">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="si" id="come-solidos-si" />
              <Label htmlFor="come-solidos-si">Si</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="come-solidos-no" />
              <Label htmlFor="come-solidos-no">No</Label>
            </div>
          </div>
        </RadioGroup>
      </div>

      {/* T11: Preguntas de lactancia */}
      <div>
        <Label>¿Tuvieron problemas con la lactancia?</Label>
        <RadioGroup
          value={data.problemasLactancia === true ? "si" : data.problemasLactancia === false ? "no" : ""}
          onValueChange={(value) => {
            updateField("problemasLactancia", value === "si")
          }}
        >
          <div className="flex gap-4 mt-2">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="si" id="problemas-lactancia-si" />
              <Label htmlFor="problemas-lactancia-si">Si</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="problemas-lactancia-no" />
              <Label htmlFor="problemas-lactancia-no">No</Label>
            </div>
          </div>
        </RadioGroup>
      </div>

      <div>
        <Label>¿Cuentas con asesoria de lactancia?</Label>
        <RadioGroup
          value={data.asesoriaLactancia === true ? "si" : data.asesoriaLactancia === false ? "no" : ""}
          onValueChange={(value) => {
            updateField("asesoriaLactancia", value === "si")
          }}
        >
          <div className="flex gap-4 mt-2">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="si" id="asesoria-lactancia-si" />
              <Label htmlFor="asesoria-lactancia-si">Si</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="asesoria-lactancia-no" />
              <Label htmlFor="asesoria-lactancia-no">No</Label>
            </div>
          </div>
        </RadioGroup>
        {data.asesoriaLactancia && (
          <div className="mt-3 ml-4">
            <Label htmlFor="asesora-lactancia-detalle">¿Quien es tu Asesora de Lactancia?</Label>
            <Input
              id="asesora-lactancia-detalle"
              value={data.asesoraLactanciaDetalle || ""}
              onChange={(e) => updateField("asesoraLactanciaDetalle", e.target.value)}
              placeholder="Nombre de la asesora..."
              className="max-w-md mt-1"
            />
          </div>
        )}
      </div>

      <div>
        <Label htmlFor="edad-alimentacion-complementaria">¿A que edad empezo la Alimentacion Complementaria? (meses)</Label>
        <Input
          id="edad-alimentacion-complementaria"
          type="number"
          min="0"
          max="36"
          value={data.edadAlimentacionComplementaria || ""}
          onChange={(e) => updateField("edadAlimentacionComplementaria", e.target.value ? Number(e.target.value) : undefined)}
          onWheel={(e) => { e.currentTarget.blur() }}
          placeholder="Edad en meses"
          className="max-w-xs mt-1"
        />
      </div>

      {/* 9. Tu hijo(a) - Lista de checkboxes */}
      <div>
        <Label>9. Su hijo/a:</Label>
        <div className="space-y-3 mt-2">
          <div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="prob-chupa-dedo"
                checked={data.problemasHijo?.includes("chupa-dedo") || false}
                onCheckedChange={(checked) => {
                  const isChecked = checked === true
                  updateProblemaHijo("chupa-dedo", checked, isChecked ? {} : { planDejarDedo: "" })
                }}
              />
              <Label htmlFor="prob-chupa-dedo">Se chupa el dedo</Label>
            </div>
            {data.problemasHijo?.includes("chupa-dedo") && (
              <div className="ml-6 mt-2">
                <Label htmlFor="plan-dejar-dedo" className="text-sm text-gray-600">
                  ¿Planea dejarlo?
                </Label>
                <RadioGroup
                  value={data.planDejarDedo || ""}
                  onValueChange={(value) => updateField("planDejarDedo", value)}
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
              checked={data.problemasHijo?.includes("usa-chupon") || false}
              onCheckedChange={(checked) => {
                const isChecked = checked === true
                updateProblemaHijo("usa-chupon", checked, isChecked ? {} : { planDejarChupon: "" })
              }}
            />
            <Label htmlFor="prob-usa-chupon">Usa chupón</Label>
          </div>
          {data.problemasHijo?.includes("usa-chupon") && (
            <div className="ml-6 mt-2">
              <Label htmlFor="plan-dejar-chupon" className="text-sm text-gray-600">
                ¿Planea dejarlo?
              </Label>
              <RadioGroup
                value={data.planDejarChupon || ""}
                onValueChange={(value) => updateField("planDejarChupon", value)}
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
                checked={data.problemasHijo?.includes("objeto-seguridad") || false}
                onCheckedChange={(checked) => {
                  const isChecked = checked === true
                  updateProblemaHijo("objeto-seguridad", checked, isChecked ? {} : { nombreObjetoSeguridad: "" })
                }}
              />
              <Label htmlFor="prob-objeto-seguridad">Tiene un objeto de seguridad como un trapito o peluche</Label>
            </div>
            {data.problemasHijo?.includes("objeto-seguridad") && (
              <div className="ml-6 mt-2">
                <Label htmlFor="nombre-objeto-seguridad" className="text-sm text-gray-600">
                  Nombre del objeto
                </Label>
                <Input
                  id="nombre-objeto-seguridad"
                  value={data.nombreObjetoSeguridad || ""}
                  onChange={(e) => updateField("nombreObjetoSeguridad", e.target.value)}
                  placeholder="Ej: Mi mantita, Osito..."
                  className="max-w-md mt-1"
                />
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="prob-problemas-medicos"
              checked={data.problemasHijo?.includes("problemas-medicos") || false}
              onCheckedChange={(checked) => {
                const isChecked = checked === true
                updateProblemaHijo("problemas-medicos", checked, isChecked ? {} : { problemasMedicosDetalle: "" })
              }}
            />
            <Label htmlFor="prob-problemas-medicos">Tiene o ha tenido problemas médicos o del desarrollo</Label>
          </div>
          {data.problemasHijo?.includes("problemas-medicos") && (
            <div className="ml-6 mt-2">
              <Label htmlFor="problemas-medicos-detalle" className="text-sm text-gray-600">
                ¿Cuál?
              </Label>
              <Input
                id="problemas-medicos-detalle"
                value={data.problemasMedicosDetalle || ""}
                onChange={(e) => updateField("problemasMedicosDetalle", e.target.value)}
                placeholder="Ej: Asma, hipotonía, diagnóstico neurológico..."
                className="max-w-md mt-1"
              />
            </div>
          )}
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="prob-moja-cama"
              checked={data.problemasHijo?.includes("moja-cama") || false}
              onCheckedChange={(checked) => updateProblemaHijo("moja-cama", checked === true)}
            />
            <Label htmlFor="prob-moja-cama">Moja la cama durante la noche</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="prob-sonambulo"
              checked={data.problemasHijo?.includes("sonambulo") || false}
              onCheckedChange={(checked) => updateProblemaHijo("sonambulo", checked === true)}
            />
            <Label htmlFor="prob-sonambulo">Es sonámbulo</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="prob-ronca"
              checked={data.problemasHijo?.includes("ronca") || false}
              onCheckedChange={(checked) => updateProblemaHijo("ronca", checked === true)}
            />
            <Label htmlFor="prob-ronca">Ronca</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="prob-respira-boca"
              checked={data.problemasHijo?.includes("respira-boca") || false}
              onCheckedChange={(checked) => updateProblemaHijo("respira-boca", checked === true)}
            />
            <Label htmlFor="prob-respira-boca">Respira por la boca</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="prob-cae-cama"
              checked={data.problemasHijo?.includes("cae-cama") || false}
              onCheckedChange={(checked) => updateProblemaHijo("cae-cama", checked === true)}
            />
            <Label htmlFor="prob-cae-cama">Se cae de la cama con frecuencia</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="prob-inquieto"
              checked={data.problemasHijo?.includes("inquieto") || false}
              onCheckedChange={(checked) => {
                const isChecked = checked === true
                updateProblemaHijo("inquieto", checked, isChecked ? {} : { descripcionInquieto: "" })
              }}
            />
            <Label htmlFor="prob-inquieto">Es muy inquieto para dormir</Label>
          </div>
          {data.problemasHijo?.includes("inquieto") && (
            <div className="ml-6 mt-2">
              <Label htmlFor="descripcion-inquieto" className="text-sm text-gray-600">
                Describe cómo es inquieto (si patalea, gira mucho, etc.)
              </Label>
              <Input
                id="descripcion-inquieto"
                value={data.descripcionInquieto || ""}
                onChange={(e) => updateField("descripcionInquieto", e.target.value)}
                placeholder="Ej: Se mueve mucho, patalea, gira constantemente..."
                className="max-w-md mt-1"
              />
            </div>
          )}
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="prob-transpira"
              checked={data.problemasHijo?.includes("transpira") || false}
              onCheckedChange={(checked) => updateProblemaHijo("transpira", checked === true)}
            />
            <Label htmlFor="prob-transpira">Transpira mucho cuando duerme</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="prob-reflujo"
              checked={data.problemasHijo?.includes("reflujo") || false}
              onCheckedChange={(checked) => {
                const isChecked = checked === true
                updateProblemaHijo("reflujo", checked, isChecked ? {} : {
                  reflujoColicosDetalle: "",
                  reflujoDetails: undefined
                })
              }}
            />
            <Label htmlFor="prob-reflujo">Tiene o ha tenido reflujo y/o cólicos</Label>
          </div>
          {data.problemasHijo?.includes("reflujo") && (
            <div className="ml-6 mt-2 space-y-3">
              <Label htmlFor="reflujo-detalle" className="text-sm text-gray-600">
                Describe el reflujo y/o cólicos que presenta
              </Label>
              <Input
                id="reflujo-detalle"
                value={data.reflujoColicosDetalle || ""}
                onChange={(e) => updateField("reflujoColicosDetalle", e.target.value)}
                placeholder="Ej: Desde qué edad, síntomas, frecuencia..."
                className="max-w-md mt-1"
              />

              {/* G2 Reflujo - Sub-checkboxes condicionales */}
              <div className="mt-3 space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Selecciona los síntomas que presenta:
                </Label>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="reflujo-vomita"
                    checked={data.reflujoDetails?.vomitaFrecuente || false}
                    onCheckedChange={(checked) => {
                      updateField("reflujoDetails", {
                        ...data.reflujoDetails,
                        vomitaFrecuente: checked === true
                      })
                    }}
                  />
                  <Label htmlFor="reflujo-vomita" className="text-sm">
                    Vomita frecuentemente después de comer
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="reflujo-arquea"
                    checked={data.reflujoDetails?.arqueaEspalda || false}
                    onCheckedChange={(checked) => {
                      updateField("reflujoDetails", {
                        ...data.reflujoDetails,
                        arqueaEspalda: checked === true
                      })
                    }}
                  />
                  <Label htmlFor="reflujo-arquea" className="text-sm">
                    Arquea la espalda al comer o después
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="reflujo-llora"
                    checked={data.reflujoDetails?.lloraAlComer || false}
                    onCheckedChange={(checked) => {
                      updateField("reflujoDetails", {
                        ...data.reflujoDetails,
                        lloraAlComer: checked === true
                      })
                    }}
                  />
                  <Label htmlFor="reflujo-llora" className="text-sm">
                    Llora o se queja al comer
                  </Label>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="prob-pesadillas"
              checked={data.problemasHijo?.includes("pesadillas") || false}
              onCheckedChange={(checked) => {
                const isChecked = checked === true
                updateProblemaHijo("pesadillas", checked, isChecked ? {} : { pesadillasDetalle: "" })
              }}
            />
            <Label htmlFor="prob-pesadillas">Tiene o ha tenido pesadillas</Label>
          </div>
          {data.problemasHijo?.includes("pesadillas") && (
            <div className="ml-6 mt-2">
              <Label htmlFor="pesadillas-detalle" className="text-sm text-gray-600">
                ¿Son al principio o al final de la noche? ¿Se calma fácilmente?
              </Label>
              <Input
                id="pesadillas-detalle"
                value={data.pesadillasDetalle || ""}
                onChange={(e) => updateField("pesadillasDetalle", e.target.value)}
                placeholder="Ej: Al inicio de la noche y se calma rápido..."
                className="max-w-md mt-1"
              />
            </div>
          )}
        </div>
      </div>

      {/* Comportamientos al dormir (antes: Sindrome de Piernas Inquietas) */}
      <div>
        <Label>¿Su hijo/a presenta alguno de los siguientes comportamientos al dormir?</Label>
        <div className="space-y-3 mt-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="rls-pataleo"
              checked={data.restlessLegSyndrome?.pataleoNocturno || false}
              onCheckedChange={(checked) => {
                updateField("restlessLegSyndrome", {
                  ...data.restlessLegSyndrome,
                  pataleoNocturno: checked === true
                })
              }}
            />
            <Label htmlFor="rls-pataleo">Patalea mucho durante la noche</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="rls-inquietas"
              checked={data.restlessLegSyndrome?.piernasInquietas || false}
              onCheckedChange={(checked) => {
                updateField("restlessLegSyndrome", {
                  ...data.restlessLegSyndrome,
                  piernasInquietas: checked === true
                })
              }}
            />
            <Label htmlFor="rls-inquietas">Mueve las piernas constantemente al dormir</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="rls-quejandose"
              checked={data.restlessLegSyndrome?.despiertaQuejandosePiernas || false}
              onCheckedChange={(checked) => {
                updateField("restlessLegSyndrome", {
                  ...data.restlessLegSyndrome,
                  despiertaQuejandosePiernas: checked === true
                })
              }}
            />
            <Label htmlFor="rls-quejandose">Se despierta quejandose de las piernas</Label>
          </div>
        </div>
      </div>

      {/* Estudio de Ferritina */}
      <div>
        <Label>¿Le han realizado un estudio de Ferritina?</Label>
        <RadioGroup
          value={data.tieneEstudioFerritina === true ? "si" : data.tieneEstudioFerritina === false ? "no" : ""}
          onValueChange={(value) => {
            updateField("tieneEstudioFerritina", value === "si")
          }}
        >
          <div className="flex gap-4 mt-2">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="si" id="estudio-ferritina-si" />
              <Label htmlFor="estudio-ferritina-si">Si</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="estudio-ferritina-no" />
              <Label htmlFor="estudio-ferritina-no">No</Label>
            </div>
          </div>
        </RadioGroup>
        {data.tieneEstudioFerritina && (
          <div className="mt-3 space-y-3 ml-4">
            <div>
              <Label htmlFor="nivel-ferritina">Nivel de Ferritina (ng/mL)</Label>
              <Input
                id="nivel-ferritina"
                type="number"
                min="0"
                max="500"
                value={data.nivelFerritina || ""}
                onChange={(e) => updateField("nivelFerritina", e.target.value ? Number(e.target.value) : undefined)}
                onWheel={(e) => { e.currentTarget.blur() }}
                placeholder="Ej: 45"
                className="max-w-xs mt-1"
              />
            </div>
            <div>
              <Label htmlFor="fecha-estudio-ferritina">Fecha del estudio</Label>
              <Input
                id="fecha-estudio-ferritina"
                type="date"
                value={data.fechaEstudioFerritina || ""}
                onChange={(e) => updateField("fechaEstudioFerritina", e.target.value)}
                className="max-w-xs mt-1"
              />
            </div>
          </div>
        )}
      </div>

      {/* T10: Nuevas preguntas de salud */}
      <div>
        <Label>¿Ha consultado con algun otro doctor?</Label>
        <RadioGroup
          value={data.consultaOtroDoctor === true ? "si" : data.consultaOtroDoctor === false ? "no" : ""}
          onValueChange={(value) => {
            updateField("consultaOtroDoctor", value === "si")
          }}
        >
          <div className="flex gap-4 mt-2">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="si" id="consulta-otro-doctor-si" />
              <Label htmlFor="consulta-otro-doctor-si">Si</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="consulta-otro-doctor-no" />
              <Label htmlFor="consulta-otro-doctor-no">No</Label>
            </div>
          </div>
        </RadioGroup>
        {data.consultaOtroDoctor && (
          <div className="mt-3 ml-4">
            <Label htmlFor="consulta-doctor-detalle">¿Que especialidad fue y por que motivo?</Label>
            <Textarea
              id="consulta-doctor-detalle"
              value={data.consultaDoctorDetalle || ""}
              onChange={(e) => updateField("consultaDoctorDetalle", e.target.value)}
              placeholder="Ej: Neurologo, por problemas de sueno..."
              className="max-w-md mt-1"
            />
          </div>
        )}
      </div>

      <div>
        <Label>¿Se le han practicado estudios medicos?</Label>
        <RadioGroup
          value={data.estudiosMedicos === true ? "si" : data.estudiosMedicos === false ? "no" : ""}
          onValueChange={(value) => {
            updateField("estudiosMedicos", value === "si")
          }}
        >
          <div className="flex gap-4 mt-2">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="si" id="estudios-medicos-si" />
              <Label htmlFor="estudios-medicos-si">Si</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="estudios-medicos-no" />
              <Label htmlFor="estudios-medicos-no">No</Label>
            </div>
          </div>
        </RadioGroup>
        {data.estudiosMedicos && (
          <div className="mt-3 ml-4">
            <Label htmlFor="estudios-medicos-detalle">¿Que tipo de estudios y por que motivo?</Label>
            <Textarea
              id="estudios-medicos-detalle"
              value={data.estudiosMedicosDetalle || ""}
              onChange={(e) => updateField("estudiosMedicosDetalle", e.target.value)}
              placeholder="Ej: Estudio de sueno, analisis de sangre..."
              className="max-w-md mt-1"
            />
          </div>
        )}
      </div>

      {/* 10. ¿Ha tenido algunas de las siguientes situaciones? */}
      <div>
        <Label>10. ¿Su hijo/a ha sufrido de algunas de las siguientes situaciones?</Label>
        <div className="space-y-3 mt-2">
          <div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="salud-alergia-ambiental"
                checked={data.situacionesHijo?.includes("alergia-ambiental") || false}
                onCheckedChange={(checked) => {
                  const isChecked = checked === true
                  updateSituacionSalud("alergia-ambiental", checked, isChecked ? {} : { alergiaAmbientalDetalle: "" })
                }}
              />
              <Label htmlFor="salud-alergia-ambiental">Alergia ambiental</Label>
            </div>
            {data.situacionesHijo?.includes("alergia-ambiental") && (
              <div className="ml-6 mt-2">
                <Label htmlFor="alergia-ambiental-detalle" className="text-sm text-gray-600">
                  ¿A qué es alérgico(a)?
                </Label>
                <Input
                  id="alergia-ambiental-detalle"
                  value={data.alergiaAmbientalDetalle || ""}
                  onChange={(e) => updateField("alergiaAmbientalDetalle", e.target.value)}
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
                checked={data.situacionesHijo?.includes("alergia-alimenticia") || false}
                onCheckedChange={(checked) => {
                  const isChecked = checked === true
                  updateSituacionSalud("alergia-alimenticia", checked, isChecked ? {} : { alergiaAlimenticiaDetalle: "" })
                }}
              />
              <Label htmlFor="salud-alergia-alimenticia">Alergia alimenticia</Label>
            </div>
            {data.situacionesHijo?.includes("alergia-alimenticia") && (
              <div className="ml-6 mt-2">
                <Label htmlFor="alergia-alimenticia-detalle" className="text-sm text-gray-600">
                  ¿A qué alimentos es alérgico(a)?
                </Label>
                <Input
                  id="alergia-alimenticia-detalle"
                  value={data.alergiaAlimenticiaDetalle || ""}
                  onChange={(e) => updateField("alergiaAlimenticiaDetalle", e.target.value)}
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
                checked={data.situacionesHijo?.includes("infecciones-oido") || false}
                onCheckedChange={(checked) => {
                  const isChecked = checked === true
                  updateSituacionSalud("infecciones-oido", checked, isChecked ? {} : { infeccionesOidoDetalle: "" })
                }}
              />
              <Label htmlFor="salud-infecciones-oido">Infecciones de oído frecuentes</Label>
            </div>
            {data.situacionesHijo?.includes("infecciones-oido") && (
              <div className="ml-6 mt-2">
                <Label htmlFor="infecciones-oido-detalle" className="text-sm text-gray-600">
                  ¿Cuántas veces ha tenido infecciones de oído?
                </Label>
                <Input
                  id="infecciones-oido-detalle"
                  type="number"
                  value={data.infeccionesOidoDetalle || ""}
                  onChange={(e) => updateField("infeccionesOidoDetalle", e.target.value)}
                  onWheel={(e) => { e.currentTarget.blur() }}
                  placeholder="Número de veces"
                  className="max-w-md mt-1"
                />
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="salud-asma"
              checked={data.situacionesHijo?.includes("asma") || false}
              onCheckedChange={(checked) => updateSituacionSalud("asma", checked === true)}
            />
            <Label htmlFor="salud-asma">Asma</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="salud-rinitis"
              checked={data.situacionesHijo?.includes("rinitis") || false}
              onCheckedChange={(checked) => updateSituacionSalud("rinitis", checked === true)}
            />
            <Label htmlFor="salud-rinitis">Rinitis</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="salud-nariz-tapada"
              checked={data.situacionesHijo?.includes("nariz-tapada") || false}
              onCheckedChange={(checked) => updateSituacionSalud("nariz-tapada", checked === true)}
            />
            <Label htmlFor="salud-nariz-tapada">Nariz frecuentemente tapada</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="salud-dermatitis"
              checked={data.situacionesHijo?.includes("dermatitis") || false}
              onCheckedChange={(checked) => updateSituacionSalud("dermatitis", checked === true)}
            />
            <Label htmlFor="salud-dermatitis">Dermatitis atópica</Label>
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="salud-dificultad-respirar"
                checked={data.situacionesHijo?.includes("dificultad-respirar") || false}
                onCheckedChange={(checked) => {
                  const isChecked = checked === true
                  updateSituacionSalud("dificultad-respirar", checked, isChecked ? {} : { dificultadRespirarDetalle: "" })
                }}
              />
              <Label htmlFor="salud-dificultad-respirar">Dificultad para respirar</Label>
            </div>
            {data.situacionesHijo?.includes("dificultad-respirar") && (
              <div className="ml-6 mt-2">
                <Label htmlFor="dificultad-respirar-detalle" className="text-sm text-gray-600">
                  ¿Cuándo y cómo se manifiesta?
                </Label>
                <Input
                  id="dificultad-respirar-detalle"
                  value={data.dificultadRespirarDetalle || ""}
                  onChange={(e) => updateField("dificultadRespirarDetalle", e.target.value)}
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
