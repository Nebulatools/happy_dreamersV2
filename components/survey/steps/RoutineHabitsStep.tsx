// Paso 6: Rutina y Hábitos de Sueño
// Información sobre rutinas diarias y hábitos de sueño del niño

import { useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Moon } from "lucide-react"
import type { SurveyStepProps } from "../types/survey.types"

export function RoutineHabitsStep({ data, onChange, errors = {} }: SurveyStepProps) {
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

  // Función helper para obtener el valor con su predeterminado
  const getValueOrDefault = (field: keyof typeof data, defaultValue: string) => {
    const value = data[field]
    console.log(`getValueOrDefault - field: ${String(field)}, value: "${value}", defaultValue: "${defaultValue}"`)
    return (value === undefined || value === null || value === "") ? defaultValue : value
  }

  useEffect(() => {
    console.log("RoutineHabitsStep mounted, data:", data)
    // Establecer valores predeterminados solo si están vacíos o undefined
    let hasChanges = false
    const updates: any = {}

    if (!data.horaAcostarBebe || data.horaAcostarBebe === "") {
      console.log("Setting horaAcostarBebe to 20:00")
      updates.horaAcostarBebe = "20:00"
      hasChanges = true
    }
    if (!data.tiempoDormir || data.tiempoDormir === "") {
      console.log("Setting tiempoDormir to 20")
      updates.tiempoDormir = "20"
      hasChanges = true
    }
    if (!data.horaDespertarDesde && !data.horaDespertar) {
      console.log("Setting horaDespertarDesde to 06:00")
      updates.horaDespertarDesde = "06:00"
      hasChanges = true
    }
    if (!data.horaDespertarHasta) {
      console.log("Setting horaDespertarHasta to 07:00")
      updates.horaDespertarHasta = "07:00"
      hasChanges = true
    }

    if (hasChanges) {
      console.log("Applying updates:", updates)
      onChange({
        ...data,
        ...updates,
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="space-y-8">
      <h3 className="text-xl font-semibold text-[#2F2F2F] flex items-center gap-2">
        <Moon className="w-5 h-5" />
        RUTINA Y HÁBITOS DE SUEÑO
      </h3>

      {/* 1. Día típico (24 horas) */}
      <div>
        <Label htmlFor="dia-tipico">
          1. Explique DETALLADAMENTE un día típico (24 horas) de su hijo/a, desde que se despierta por la mañana y a lo largo de la noche <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id="dia-tipico"
          value={data.diaTipico || ""}
          onChange={(e) => updateField("diaTipico", e.target.value)}
          placeholder="Describe detalladamente un día completo desde que despierta hasta que duerme..."
          rows={5}
          className={hasError("diaTipico") ? "border-red-500" : ""}
        />
        {hasError("diaTipico") && (
          <p className="text-red-500 text-sm mt-1">{getError("diaTipico")}</p>
        )}
      </div>

      {/* 2. ¿Va al kinder o guardería? */}
      <div>
        <Label>2. ¿Va su hijo/a al kinder o guardería?</Label>
        <RadioGroup
          value={data.vaKinder === true ? "si" : data.vaKinder === false ? "no" : ""}
          onValueChange={(value) => {
            const attendsKinder = value === "si"
            onChange({
              ...data,
              vaKinder: attendsKinder,
              kinderDetalle: attendsKinder ? data.kinderDetalle || "" : "",
            })
          }}
        >
          <div className="flex gap-4 mt-2">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="si" id="kinder-si" />
              <Label htmlFor="kinder-si">Sí</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="kinder-no" />
              <Label htmlFor="kinder-no">No</Label>
            </div>
          </div>
        </RadioGroup>
        {data.vaKinder && (
          <div className="mt-3">
            <Label htmlFor="kinder-detalle" className="text-sm text-gray-600">
              ¿Desde cuándo y qué horario?
            </Label>
            <Textarea
              id="kinder-detalle"
              value={data.kinderDetalle || ""}
              onChange={(e) => updateField("kinderDetalle", e.target.value)}
              placeholder="Ej: Desde enero 2024, de 8am a 2pm..."
              rows={2}
              className="mt-1"
            />
          </div>
        )}
      </div>

      {/* 3. ¿Quién pasa la mayoría del tiempo con el niño? */}
      <div>
        <Label htmlFor="quien-cuida">
          3. ¿Quién pasa la mayoría del tiempo con su hijo/a? <span className="text-red-500">*</span>
        </Label>
        <Input
          id="quien-cuida"
          value={data.quienCuida || ""}
          onChange={(e) => updateField("quienCuida", e.target.value)}
          placeholder="Ej: Mamá, papá, abuela, niñera..."
          className={hasError("quienCuida") ? "border-red-500" : ""}
        />
        {hasError("quienCuida") && (
          <p className="text-red-500 text-sm mt-1">{getError("quienCuida")}</p>
        )}
      </div>

      {/* 4. Cuando salen de noche, ¿quién cuida? */}
      <div>
        <Label htmlFor="quien-cuida-noche">
          4. Si usted y su pareja salen de casa en la noche, ¿quién cuida a su hijo/a mientras regresan?
        </Label>
        <Input
          id="quien-cuida-noche"
          value={data.quienCuidaNoche || ""}
          onChange={(e) => updateField("quienCuidaNoche", e.target.value)}
          placeholder="Ej: Abuela, tía, niñera..."
        />
      </div>

      {/* 5. Cuando salen de noche, ¿dónde duerme? */}
      <div>
        <Label htmlFor="donde-duerme-salida">
          5. Cuando usted y su pareja salen de noche, ¿dónde duerme su hijo/a?
        </Label>
        <Input
          id="donde-duerme-salida"
          value={data.dondeDuermeSalida || ""}
          onChange={(e) => updateField("dondeDuermeSalida", e.target.value)}
          placeholder="Ej: En su cama, con la abuela, en casa de familiares..."
        />
      </div>

      {/* 6. Rutina para dormir */}
      <div>
        <Label htmlFor="rutina-dormir">
          6. Explique cuál es la rutina que siguen por la noche para ir a dormir (qué hacen ANTES de acostarse). Indique a qué hora inicia y termina. <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id="rutina-dormir"
          value={data.rutinaDormir || ""}
          onChange={(e) => updateField("rutinaDormir", e.target.value)}
          placeholder="Describe la rutina: baño, cena, cuento, etc. Incluye horarios de inicio y fin..."
          rows={4}
          className={hasError("rutinaDormir") ? "border-red-500" : ""}
        />
        {hasError("rutinaDormir") && (
          <p className="text-red-500 text-sm mt-1">{getError("rutinaDormir")}</p>
        )}
      </div>

      {/* 7. Hora específica para dormir */}
      <div>
        <Label htmlFor="hora-dormir">
          7. ¿Existe una hora específica para ir a dormir? ¿Cuál es? <span className="text-red-500">*</span>
        </Label>
        <Input
          id="hora-dormir"
          value={data.horaDormir || ""}
          onChange={(e) => updateField("horaDormir", e.target.value)}
          placeholder="Ej: 20:00, 20:30..."
          className={hasError("horaDormir") ? "border-red-500" : ""}
        />
        {hasError("horaDormir") && (
          <p className="text-red-500 text-sm mt-1">{getError("horaDormir")}</p>
        )}
      </div>

      {/* 8. ¿Se queda dormido de forma independiente? */}
      <div>
        <Label>8. ¿Su hijo/a se queda dormido de forma independiente?</Label>
        <RadioGroup
          value={data.duermeSolo === true ? "si" : data.duermeSolo === false ? "no" : ""}
          onValueChange={(value) => {
            const duermeSolo = value === "si"
            onChange({
              ...data,
              duermeSolo,
              comoLograDormir: duermeSolo ? "" : data.comoLograDormir || "",
            })
          }}
        >
          <div className="flex gap-4 mt-2">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="si" id="duerme-solo-si" />
              <Label htmlFor="duerme-solo-si">Sí</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="duerme-solo-no" />
              <Label htmlFor="duerme-solo-no">No</Label>
            </div>
          </div>
        </RadioGroup>
        {data.duermeSolo === false && (
          <div className="mt-3">
            <Label htmlFor="como-logra-dormir" className="text-sm text-gray-600">
              ¿Cómo logras que se duerma?
            </Label>
            <Textarea
              id="como-logra-dormir"
              value={data.comoLograDormir || ""}
              onChange={(e) => updateField("comoLograDormir", e.target.value)}
              placeholder="Ej: En brazos, dándole pecho, paseándolo, etc."
              rows={2}
              className="mt-1"
            />
          </div>
        )}
      </div>

      {/* 9. Oscuridad del cuarto */}
      <div>
        <Label>9. ¿Qué tan oscuro es el cuarto de su hijo/a? ¿Deja usted:</Label>
        <RadioGroup
          value={data.oscuridadCuarto || ""}
          onValueChange={(value) => {
            onChange({
              ...data,
              oscuridadCuarto: value,
              colorLamparita: value === "lamparita" ? data.colorLamparita || "" : "",
            })
          }}
        >
          <div className="space-y-2 mt-2">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="lamparita" id="osc-lamparita" />
              <Label htmlFor="osc-lamparita">Lamparita prendida</Label>
            </div>
            {data.oscuridadCuarto === "lamparita" && (
              <div className="ml-6 mt-2">
                <Label htmlFor="color-lamparita" className="text-sm text-gray-600">
                  ¿De qué color es la lamparita?
                </Label>
                <Input
                  id="color-lamparita"
                  value={data.colorLamparita || ""}
                  onChange={(e) => updateField("colorLamparita", e.target.value)}
                  placeholder="Ej: Blanca cálida, azul, amarilla..."
                  className="max-w-md mt-1"
                />
              </div>
            )}
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="puerta-abierta" id="osc-puerta" />
              <Label htmlFor="osc-puerta">Puerta abierta</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="luz-bano" id="osc-bano" />
              <Label htmlFor="osc-bano">Luz del baño prendida</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="luz-mercurial" id="osc-mercurial" />
              <Label htmlFor="osc-mercurial">Luz mercurial de la calle</Label>
            </div>
          </div>
        </RadioGroup>
      </div>

      {/* 10. ¿Usan ruido blanco? */}
      <div>
        <Label>10. ¿Usan ustedes ruido blanco?</Label>
        <RadioGroup
          value={data.ruidoBlanco === true ? "si" : data.ruidoBlanco === false ? "no" : ""}
          onValueChange={(value) => updateField("ruidoBlanco", value === "si")}
        >
          <div className="flex gap-4 mt-2">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="si" id="ruido-si" />
              <Label htmlFor="ruido-si">Sí</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="ruido-no" />
              <Label htmlFor="ruido-no">No</Label>
            </div>
          </div>
        </RadioGroup>
      </div>

      {/* 11. Temperatura del cuarto */}
      <div>
        <Label htmlFor="temperatura">
          11. Aproximadamente, ¿a qué temperatura está el cuarto al dormir?
        </Label>
        <Input
          id="temperatura"
          value={data.temperaturaCuarto || ""}
          onChange={(e) => updateField("temperaturaCuarto", e.target.value)}
          placeholder="Ej: 22°C, fresco, templado..."
        />
      </div>

      {/* G4 Humedad del cuarto */}
      <div>
        <Label htmlFor="humedad-habitacion">
          ¿Cómo describirías la humedad de la habitación donde duerme?
        </Label>
        <p className="text-sm text-gray-500 mb-2">
          La humedad puede afectar la calidad del sueño y las alergias respiratorias.
        </p>
        <Select
          value={data.humedadHabitacion || ""}
          onValueChange={(value) => updateField("humedadHabitacion", value)}
        >
          <SelectTrigger id="humedad-habitacion" className="max-w-xs">
            <SelectValue placeholder="Selecciona una opción" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="seca">Seca (poca humedad)</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="humeda">Húmeda (mucha humedad)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 12. Tipo de pijama */}
      <div>
        <Label htmlFor="tipo-pijama">
          12. Describe qué tipo de pijama usa su hijo/a.
        </Label>
        <Textarea
          id="tipo-pijama"
          value={data.tipoPiyama || ""}
          onChange={(e) => updateField("tipoPiyama", e.target.value)}
          placeholder="Describe el tipo de pijama: manga larga/corta, material, grosor..."
          rows={2}
        />
      </div>

      {/* 13. ¿Usa saco para dormir? */}
      <div>
        <Label>13. ¿Usa su hijo/a saco para dormir?</Label>
        <RadioGroup
          value={data.usaSaco === true ? "si" : data.usaSaco === false ? "no" : ""}
          onValueChange={(value) => updateField("usaSaco", value === "si")}
        >
          <div className="flex gap-4 mt-2">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="si" id="saco-si" />
              <Label htmlFor="saco-si">Sí</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="saco-no" />
              <Label htmlFor="saco-no">No</Label>
            </div>
          </div>
        </RadioGroup>
      </div>

      {/* 14. ¿Te quedas hasta que duerma? */}
      <div>
        <Label>14. ¿Se queda usted con él/ella hasta que concilie el sueño?</Label>
        <RadioGroup
          value={data.teQuedasHastaDuerma === true ? "si" : data.teQuedasHastaDuerma === false ? "no" : ""}
          onValueChange={(value) => updateField("teQuedasHastaDuerma", value === "si")}
        >
          <div className="flex gap-4 mt-2">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="si" id="quedas-si" />
              <Label htmlFor="quedas-si">Sí</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="quedas-no" />
              <Label htmlFor="quedas-no">No</Label>
            </div>
          </div>
        </RadioGroup>
      </div>

      {/* 15. ¿Dónde duerme tu hijo? - Opción múltiple */}
      <div>
        <Label>15. ¿Dónde duerme su hijo/a por las noches? <span className="text-red-500">*</span></Label>
        <p className="text-sm text-gray-500 mt-1">Puede seleccionar múltiples opciones</p>
        <div className="space-y-2 mt-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="donde-cama-cuarto"
              checked={data.dondeDuerme?.includes("cama-cuarto") || false}
              onCheckedChange={(checked) => {
                const isChecked = checked === true
                const lugares = data.dondeDuerme || []
                if (isChecked) {
                  updateField("dondeDuerme", [...lugares, "cama-cuarto"])
                } else {
                  updateField("dondeDuerme", lugares.filter((l: string) => l !== "cama-cuarto"))
                }
              }}
            />
            <Label htmlFor="donde-cama-cuarto">Cama en su cuarto</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="donde-cama-padres"
              checked={data.dondeDuerme?.includes("cama-cuarto-padres") || false}
              onCheckedChange={(checked) => {
                const isChecked = checked === true
                const lugares = data.dondeDuerme || []
                if (isChecked) {
                  updateField("dondeDuerme", [...lugares, "cama-cuarto-padres"])
                } else {
                  updateField("dondeDuerme", lugares.filter((l: string) => l !== "cama-cuarto-padres"))
                }
              }}
            />
            <Label htmlFor="donde-cama-padres">Cama en su cuarto con alguno de los padres</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="donde-cuna-cuarto"
              checked={data.dondeDuerme?.includes("cuna-cuarto") || false}
              onCheckedChange={(checked) => {
                const isChecked = checked === true
                const lugares = data.dondeDuerme || []
                if (isChecked) {
                  updateField("dondeDuerme", [...lugares, "cuna-cuarto"])
                } else {
                  updateField("dondeDuerme", lugares.filter((l: string) => l !== "cuna-cuarto"))
                }
              }}
            />
            <Label htmlFor="donde-cuna-cuarto">Cuna/corral en su cuarto</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="donde-cuna-padres"
              checked={data.dondeDuerme?.includes("cuna-padres") || false}
              onCheckedChange={(checked) => {
                const isChecked = checked === true
                const lugares = data.dondeDuerme || []
                if (isChecked) {
                  updateField("dondeDuerme", [...lugares, "cuna-padres"])
                } else {
                  updateField("dondeDuerme", lugares.filter((l: string) => l !== "cuna-padres"))
                }
              }}
            />
            <Label htmlFor="donde-cuna-padres">Cuna/corral en cuarto de papás</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="donde-solo-padres"
              checked={data.dondeDuerme?.includes("cama-padres") || false}
              onCheckedChange={(checked) => {
                const isChecked = checked === true
                const lugares = data.dondeDuerme || []
                if (isChecked) {
                  updateField("dondeDuerme", [...lugares, "cama-padres"])
                } else {
                  updateField("dondeDuerme", lugares.filter((l: string) => l !== "cama-padres"))
                }
              }}
            />
            <Label htmlFor="donde-solo-padres">Cama de papás</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="donde-cuna-luego"
              checked={data.dondeDuerme?.includes("cuna-luego-padres") || false}
              onCheckedChange={(checked) => {
                const isChecked = checked === true
                const lugares = data.dondeDuerme || []
                if (isChecked) {
                  updateField("dondeDuerme", [...lugares, "cuna-luego-padres"])
                } else {
                  updateField("dondeDuerme", lugares.filter((l: string) => l !== "cuna-luego-padres"))
                }
              }}
            />
            <Label htmlFor="donde-cuna-luego">Primero en su cuna/corral y luego a cama de papás</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="donde-cama-luego"
              checked={data.dondeDuerme?.includes("cama-luego-padres") || false}
              onCheckedChange={(checked) => {
                const isChecked = checked === true
                const lugares = data.dondeDuerme || []
                if (isChecked) {
                  updateField("dondeDuerme", [...lugares, "cama-luego-padres"])
                } else {
                  updateField("dondeDuerme", lugares.filter((l: string) => l !== "cama-luego-padres"))
                }
              }}
            />
            <Label htmlFor="donde-cama-luego">Primero en su cama y luego a cama de papás</Label>
          </div>
        </div>
        {hasError("dondeDuerme") && (
          <p className="text-red-500 text-sm mt-1">{getError("dondeDuerme")}</p>
        )}
      </div>

      {/* 16. ¿Comparte habitación? */}
      <div>
        <Label>16. ¿Tu hijo(a) comparte la habitación con algún miembro de la familia?</Label>
        <RadioGroup
          value={data.comparteHabitacion === true ? "si" : data.comparteHabitacion === false ? "no" : ""}
          onValueChange={(value) => {
            const shares = value === "si"
            onChange({
              ...data,
              comparteHabitacion: shares,
              comparteHabitacionCon: shares ? data.comparteHabitacionCon || "" : "",
            })
          }}
        >
          <div className="flex gap-4 mt-2">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="si" id="comparte-si" />
              <Label htmlFor="comparte-si">Sí</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="comparte-no" />
              <Label htmlFor="comparte-no">No</Label>
            </div>
          </div>
        </RadioGroup>
        {data.comparteHabitacion && (
          <div className="mt-3">
            <Label htmlFor="comparte-con" className="text-sm text-gray-600">
              ¿Con quién comparte la habitación?
            </Label>
            <Input
              id="comparte-con"
              value={data.comparteHabitacionCon || ""}
              onChange={(e) => updateField("comparteHabitacionCon", e.target.value)}
              placeholder="Ej: Hermano mayor, hermana..."
              className="max-w-md mt-1"
            />
          </div>
        )}
      </div>

      {/* 17. Hora de acostarse bebé - Time Picker */}
      <div>
        <Label htmlFor="hora-acostarse-bebe">
          17. ¿A qué hora acuestas a tu bebé a dormir?
        </Label>
        <Input
          id="hora-acostarse-bebe"
          type="time"
          step="300"
          value={getValueOrDefault("horaAcostarBebe", "20:00")}
          onChange={(e) => updateField("horaAcostarBebe", e.target.value)}
          className="max-w-xs"
        />
      </div>

      {/* 18. Tiempo para dormir - Time Picker con incrementos de 5 minutos */}
      <div>
        <Label htmlFor="tiempo-dormir">
          18. ¿Cuánto tiempo le toma a tu hijo(a) conciliar el sueño?
        </Label>
        <div className="flex items-center gap-2">
          <Input
            id="tiempo-dormir"
            type="number"
            min="0"
            step="5"
            value={data.tiempoDormir || ""}
            onChange={(e) => updateField("tiempoDormir", e.target.value)}
            onWheel={(e) => { e.currentTarget.blur() }}
            placeholder="Ej: 20"
            className="max-w-xs"
          />
          <span className="text-sm text-gray-600">minutos</span>
        </div>
      </div>

      {/* 19. Hora de despertarse - Rango (Desde / Hasta) */}
      <div>
        <Label>
          19. ¿A qué hora se despierta tu hijo(a) por la mañana?
        </Label>
        <div className="flex gap-4 mt-2">
          <div className="flex-1 max-w-[180px]">
            <Label htmlFor="hora-despertar-desde" className="text-sm text-gray-600">Desde</Label>
            <Input
              id="hora-despertar-desde"
              type="time"
              step="300"
              value={data.horaDespertarDesde || data.horaDespertar || "06:00"}
              onChange={(e) => updateField("horaDespertarDesde", e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="flex-1 max-w-[180px]">
            <Label htmlFor="hora-despertar-hasta" className="text-sm text-gray-600">Hasta</Label>
            <Input
              id="hora-despertar-hasta"
              type="time"
              step="300"
              value={data.horaDespertarHasta || "07:00"}
              onChange={(e) => updateField("horaDespertarHasta", e.target.value)}
              className={`mt-1 ${
                data.horaDespertarHasta && data.horaDespertarDesde && data.horaDespertarHasta < data.horaDespertarDesde
                  ? "border-red-500"
                  : ""
              }`}
            />
          </div>
        </div>
        {data.horaDespertarHasta && data.horaDespertarDesde && data.horaDespertarHasta < data.horaDespertarDesde && (
          <p className="text-red-500 text-sm mt-1">La hora &quot;Hasta&quot; debe ser posterior a la hora &quot;Desde&quot;</p>
        )}
      </div>

      {/* 20. ¿Despierta por la noche? */}
      <div>
        <Label>20. ¿Tu hijo(a) despierta por la noche?</Label>
        <RadioGroup
          value={data.despiertaNoche === true ? "si" : data.despiertaNoche === false ? "no" : ""}
          onValueChange={(value) => updateField("despiertaNoche", value === "si")}
        >
          <div className="flex gap-4 mt-2">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="si" id="despierta-si" />
              <Label htmlFor="despierta-si">Sí</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="despierta-no" />
              <Label htmlFor="despierta-no">No</Label>
            </div>
          </div>
        </RadioGroup>
      </div>

      {/* 21. Veces que despierta */}
      <div>
        <Label htmlFor="veces-despierta">
          21. ¿Cuántas veces despierta?
        </Label>
        <Input
          id="veces-despierta"
          value={data.vecesDespierta || ""}
          onChange={(e) => updateField("vecesDespierta", e.target.value)}
          placeholder="Ej: 2-3 veces"
        />
      </div>

      {/* 22. ¿Cuánto tiempo despierto? */}
      <div>
        <Label htmlFor="tiempo-despierto">
          22. ¿Cuánto tiempo permanece despierto cuando se despierta?
        </Label>
        <Input
          id="tiempo-despierto"
          value={data.tiempoDespierto || ""}
          onChange={(e) => updateField("tiempoDespierto", e.target.value)}
          placeholder="Ej: 15-30 minutos"
        />
      </div>

      {/* 23. ¿Desde qué edad se despierta? */}
      <div>
        <Label htmlFor="desde-cuando-despierta">
          23. ¿Desde qué edad (en meses) se despierta?
        </Label>
        <Input
          id="desde-cuando-despierta"
          value={data.desdeCuandoDespierta || ""}
          onChange={(e) => updateField("desdeCuandoDespierta", e.target.value)}
          placeholder="Ej: Desde los 6 meses"
        />
      </div>

      {/* 24. ¿Qué haces cuando despierta? */}
      <div>
        <Label htmlFor="que-haces-despierta">
          24. ¿Qué haces cuando tu bebé se despierta en la noche?
        </Label>
        <Textarea
          id="que-haces-despierta"
          value={data.queHacesDespierta || ""}
          onChange={(e) => updateField("queHacesDespierta", e.target.value)}
          placeholder="Describe qué haces cuando se despierta..."
          rows={3}
        />
      </div>

      {/* 25. ¿Toma siestas? */}
      <div>
        <Label>25. ¿Tu hijo(a) toma siestas durante el día?</Label>
        <RadioGroup
          value={data.tomaSiestas === true ? "si" : data.tomaSiestas === false ? "no" : ""}
          onValueChange={(value) => updateField("tomaSiestas", value === "si")}
        >
          <div className="flex gap-4 mt-2">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="si" id="siestas-si" />
              <Label htmlFor="siestas-si">Sí</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="siestas-no" />
              <Label htmlFor="siestas-no">No</Label>
            </div>
          </div>
        </RadioGroup>
      </div>

      {/* 26. Número de siestas */}
      <div>
        <Label htmlFor="numero-siestas">
          26. ¿Cuántas? ¿A qué hora(s)?
        </Label>
        <Input
          id="numero-siestas"
          value={data.numeroSiestas || ""}
          onChange={(e) => updateField("numeroSiestas", e.target.value)}
          placeholder="Ej: 2 siestas, 10:00 y 15:00"
        />
      </div>

      {/* 27. Cómo lo duermen en las siestas */}
      <div>
        <Label htmlFor="duracion-total-siestas">
          27. ¿Cómo lo duermen en las siestas?
        </Label>
        <Input
          id="duracion-total-siestas"
          value={data.duracionTotalSiestas || ""}
          onChange={(e) => updateField("duracionTotalSiestas", e.target.value)}
          placeholder="Ej: En brazos, paseándolo, en coche, pecho, etc."
        />
      </div>

      {/* 28. ¿Dónde toma siestas? */}
      <div>
        <Label htmlFor="donde-siestas">
          28. ¿Dónde toma las siestas?
        </Label>
        <Input
          id="donde-siestas"
          value={data.dondeSiestas || ""}
          onChange={(e) => updateField("dondeSiestas", e.target.value)}
          placeholder="Ej: En su cuna, en brazos..."
        />
      </div>

      {/* 29. Sueño y lugar cuando viajan */}
      <div>
        <Label htmlFor="duerme-mejor-viaja">
          29. Cuando viajas, ¿sientes que tu hijo duerme mejor, peor o igual? ¿Dónde duerme en los viajes?
        </Label>
        <div className="mt-2 space-y-2">
          <RadioGroup
            value={data.duermeMejorViaja || ""}
            onValueChange={(value) => updateField("duermeMejorViaja", value)}
          >
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Mejor" id="duerme-viaje-mejor" />
                <Label htmlFor="duerme-viaje-mejor">Mejor</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Peor" id="duerme-viaje-peor" />
                <Label htmlFor="duerme-viaje-peor">Peor</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Igual" id="duerme-viaje-igual" />
                <Label htmlFor="duerme-viaje-igual">Igual</Label>
              </div>
            </div>
          </RadioGroup>
          <Input
            id="donde-duerme-viajes"
            value={data.dondeDuermeViaja || data.dondeViermesViaja || ""}
            onChange={(e) =>
              onChange({
                ...data,
                dondeDuermeViaja: e.target.value,
                dondeViermesViaja: e.target.value,
              })
            }
            placeholder="Ej: En cuna portátil, cama de hotel, con los padres, etc."
          />
        </div>
      </div>

      {/* 30. Principal preocupación */}
      <div>
        <Label htmlFor="principal-preocupacion">
          30. ¿Cuál es tu principal preocupación con respecto al sueño de tu hijo(a)?
        </Label>
        <Textarea
          id="principal-preocupacion"
          value={data.principalPreocupacion || ""}
          onChange={(e) => updateField("principalPreocupacion", e.target.value)}
          placeholder="Describe tu principal preocupación..."
          rows={3}
        />
      </div>

      {/* 31. ¿Desde cuándo problema? */}
      <div>
        <Label htmlFor="desde-cuando-problema">
          31. ¿Desde cuándo existe este problema?
        </Label>
        <Input
          id="desde-cuando-problema"
          value={data.desdeCuandoProblema || ""}
          onChange={(e) => updateField("desdeCuandoProblema", e.target.value)}
          placeholder="Ej: Desde hace 3 meses"
        />
      </div>

      {/* 32. Objetivo de los padres */}
      <div>
        <Label htmlFor="objetivo-padres">
          32. ¿Cuál es el objetivo que como papás les gustaría ver en los hábitos de sueño de su hijo(a)? Por favor, sean específicos. Por ejemplo, ¿Qué objetivos tienen en cuanto a horarios y lugar dónde les gustaría que duerma durante la noche? <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id="objetivo-padres"
          value={data.objetivoPadres || ""}
          onChange={(e) => updateField("objetivoPadres", e.target.value)}
          placeholder="Describe específicamente qué cambios desean ver en los hábitos de sueño..."
          rows={4}
          className={hasError("objetivoPadres") ? "border-red-500" : ""}
        />
        {hasError("objetivoPadres") && (
          <p className="text-red-500 text-sm mt-1">{getError("objetivoPadres")}</p>
        )}
      </div>

      {/* 33. Información adicional */}
      <div>
        <Label htmlFor="info-adicional">
          33. ¿Existe alguna otra información que consideren relevante que deba saber?
        </Label>
        <Textarea
          id="info-adicional"
          value={data.infoAdicional || ""}
          onChange={(e) => updateField("infoAdicional", e.target.value)}
          placeholder="Cualquier información adicional que consideres importante..."
          rows={3}
        />
      </div>

      {/* Mensaje final */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-800">
          Gracias por tomarse el tiempo de llenar este cuestionario. Esta información me servirá para juntos crear un plan que se ajuste a las necesidades de su hijo(a) y la familia.
          Les recuerdo que para lograr cambios, su compromiso es esencial durante todo este proceso.
        </p>
      </div>
    </div>
  )
}
