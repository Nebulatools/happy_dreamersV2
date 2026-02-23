// Paso 6: Rutina y Hábitos de Sueño
// Información sobre rutinas diarias y hábitos de sueño del niño

import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Moon, Sun, CloudMoon, MoonStar, Baby, ChevronDown, ChevronUp } from "lucide-react"
import type { SurveyStepProps } from "../types/survey.types"
import { DynamicListField } from "../DynamicListField"

// Componente para secciones colapsables
function CollapsibleSection({
  title,
  icon,
  defaultOpen = true,
  children,
}: {
  title: string
  icon: React.ReactNode
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2 font-medium text-[#2F2F2F]">
          {icon}
          {title}
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        )}
      </button>
      {isOpen && (
        <div className="p-4 space-y-6">
          {children}
        </div>
      )}
    </div>
  )
}

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
    return (value === undefined || value === null || value === "") ? defaultValue : value
  }

  useEffect(() => {
    // Establecer valores predeterminados solo si están vacíos o undefined
    let hasChanges = false
    const updates: any = {}

    if (!data.horaAcostarBebe || data.horaAcostarBebe === "") {
      updates.horaAcostarBebe = "20:00"
      hasChanges = true
    }
    if (!data.tiempoDormir || data.tiempoDormir === "") {
      updates.tiempoDormir = "20"
      hasChanges = true
    }
    if (!data.horaDespertarDesde && !data.horaDespertar) {
      updates.horaDespertarDesde = "06:00"
      hasChanges = true
    }
    if (!data.horaDespertarHasta) {
      updates.horaDespertarHasta = "07:00"
      hasChanges = true
    }
    if (!data.horaDespertarManana || data.horaDespertarManana === "") {
      updates.horaDespertarManana = "07:00"
      hasChanges = true
    }

    if (hasChanges) {
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
        RUTINA Y HABITOS DE SUENO
      </h3>

      {/* ============================================================ */}
      {/* SECCION: Despertar por la manana                             */}
      {/* ============================================================ */}
      <CollapsibleSection
        title="Despertar por la manana"
        icon={<Sun className="w-4 h-4 text-yellow-500" />}
      >
        <div>
          <Label htmlFor="hora-despertar-manana">
            A que hora amanecio por la manana?
          </Label>
          <Input
            id="hora-despertar-manana"
            type="time"
            step="300"
            value={getValueOrDefault("horaDespertarManana", "07:00")}
            onChange={(e) => updateField("horaDespertarManana", e.target.value)}
            className="max-w-xs mt-1"
          />
        </div>

        <div>
          <Label>Lo despertaron o desperto solo?</Label>
          <RadioGroup
            value={data.despiertaSolo || ""}
            onValueChange={(value) => updateField("despiertaSolo", value)}
          >
            <div className="flex gap-4 mt-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="solo" id="despierta-solo-solo" />
                <Label htmlFor="despierta-solo-solo">Solo</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="lo_despiertan" id="despierta-solo-despiertan" />
                <Label htmlFor="despierta-solo-despiertan">Lo despiertan</Label>
              </div>
            </div>
          </RadioGroup>
        </div>

        <div>
          <Label>Desperto de buen humor?</Label>
          <RadioGroup
            value={data.despiertaBuenHumor || ""}
            onValueChange={(value) => updateField("despiertaBuenHumor", value)}
          >
            <div className="flex gap-4 mt-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="si" id="buen-humor-si" />
                <Label htmlFor="buen-humor-si">Si</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="buen-humor-no" />
                <Label htmlFor="buen-humor-no">No</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="a_veces" id="buen-humor-aveces" />
                <Label htmlFor="buen-humor-aveces">A veces</Label>
              </div>
            </div>
          </RadioGroup>
        </div>
      </CollapsibleSection>

      {/* ============================================================ */}
      {/* Preguntas generales (Q2-Q8 originales)                       */}
      {/* ============================================================ */}

      {/* 2. ¿Va al kinder o guardería? */}
      <div>
        <Label>2. Va su hijo/a al kinder o guarderia?</Label>
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
              <Label htmlFor="kinder-si">Si</Label>
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
              Desde cuando y que horario?
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
          3. Quien pasa la mayoria del tiempo con su hijo/a? <span className="text-red-500">*</span>
        </Label>
        <Input
          id="quien-cuida"
          value={data.quienCuida || ""}
          onChange={(e) => updateField("quienCuida", e.target.value)}
          placeholder="Ej: Mama, papa, abuela, ninera..."
          className={hasError("quienCuida") ? "border-red-500" : ""}
        />
        {hasError("quienCuida") && (
          <p className="text-red-500 text-sm mt-1">{getError("quienCuida")}</p>
        )}
      </div>

      {/* 4. Cuando salen de noche, ¿quién cuida? */}
      <div>
        <Label htmlFor="quien-cuida-noche">
          4. Si usted y su pareja salen de casa en la noche, quien cuida a su hijo/a mientras regresan?
        </Label>
        <Input
          id="quien-cuida-noche"
          value={data.quienCuidaNoche || ""}
          onChange={(e) => updateField("quienCuidaNoche", e.target.value)}
          placeholder="Ej: Abuela, tia, ninera..."
        />
      </div>

      {/* 5. Cuando salen de noche, ¿dónde duerme? */}
      <div>
        <Label htmlFor="donde-duerme-salida">
          5. Cuando usted y su pareja salen de noche, donde duerme su hijo/a?
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
          6. Explique cual es la rutina que siguen por la noche para ir a dormir (que hacen ANTES de acostarse). Indique a que hora inicia y termina. <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id="rutina-dormir"
          value={data.rutinaDormir || ""}
          onChange={(e) => updateField("rutinaDormir", e.target.value)}
          placeholder="Describe la rutina: bano, cena, cuento, etc. Incluye horarios de inicio y fin..."
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
          7. Existe una hora especifica para ir a dormir? Cual es? <span className="text-red-500">*</span>
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
        <Label>8. Su hijo/a se queda dormido de forma independiente?</Label>
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
              <Label htmlFor="duerme-solo-si">Si</Label>
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
              Como logras que se duerma?
            </Label>
            <Textarea
              id="como-logra-dormir"
              value={data.comoLograDormir || ""}
              onChange={(e) => updateField("comoLograDormir", e.target.value)}
              placeholder="Ej: En brazos, dandole pecho, paseandolo, etc."
              rows={2}
              className="mt-1"
            />
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* SECCION: Bedtime (hora de dormir por la noche)               */}
      {/* ============================================================ */}
      <CollapsibleSection
        title="Hora de dormir por la noche"
        icon={<MoonStar className="w-4 h-4 text-indigo-500" />}
      >
        {/* 17. Hora de acostarse bebé */}
        <div>
          <Label htmlFor="hora-acostarse-bebe">
            A que hora acuestas a tu bebe a dormir?
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

        {/* Que hiciste para que se durmiera (NUEVO - textarea grande) */}
        <div>
          <Label htmlFor="que-hace-para-dormir">
            Que hiciste (detallado) para que se durmiera?
          </Label>
          <p className="text-sm text-gray-500 mb-1">
            Describe con el mayor detalle posible: mecer, cantar, pecho, biberon, pasear, etc.
          </p>
          <Textarea
            id="que-hace-para-dormir"
            value={data.queHaceParaDormir || ""}
            onChange={(e) => updateField("queHaceParaDormir", e.target.value)}
            placeholder="Ej: Lo meci en brazos mientras le cantaba, luego le di pecho y se fue quedando dormido poco a poco..."
            rows={4}
          />
        </div>

        {/* Hora real a la que se durmió (NUEVO) */}
        <div>
          <Label htmlFor="hora-real-dormido-noche">
            A que hora se durmio realmente?
          </Label>
          <Input
            id="hora-real-dormido-noche"
            type="time"
            step="300"
            value={data.horaRealDormidoNoche || ""}
            onChange={(e) => updateField("horaRealDormidoNoche", e.target.value)}
            className="max-w-xs"
          />
        </div>

        {/* 18. Tiempo para dormir */}
        <div>
          <Label htmlFor="tiempo-dormir">
            Cuanto tiempo le toma a tu hijo(a) conciliar el sueno?
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
      </CollapsibleSection>

      {/* ============================================================ */}
      {/* SECCION: Siestas                                             */}
      {/* ============================================================ */}
      <CollapsibleSection
        title="Siestas"
        icon={<CloudMoon className="w-4 h-4 text-violet-400" />}
      >
        {/* 25. ¿Toma siestas? */}
        <div>
          <Label>Tu hijo(a) toma siestas durante el dia?</Label>
          <RadioGroup
            value={data.tomaSiestas === true ? "si" : data.tomaSiestas === false ? "no" : ""}
            onValueChange={(value) => updateField("tomaSiestas", value === "si")}
          >
            <div className="flex gap-4 mt-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="si" id="siestas-si" />
                <Label htmlFor="siestas-si">Si</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="siestas-no" />
                <Label htmlFor="siestas-no">No</Label>
              </div>
            </div>
          </RadioGroup>
        </div>

        {data.tomaSiestas === true && (
          <>
            {/* 26. Número de siestas */}
            <div>
              <Label htmlFor="numero-siestas">
                Cuantas siestas toma al dia?
              </Label>
              <Input
                id="numero-siestas"
                value={data.numeroSiestas || ""}
                onChange={(e) => updateField("numeroSiestas", e.target.value)}
                placeholder="Ej: 2 siestas"
              />
            </div>

            {/* 27. Cómo lo duermen en las siestas */}
            <div>
              <Label htmlFor="duracion-total-siestas">
                Como lo duermen en las siestas?
              </Label>
              <Input
                id="duracion-total-siestas"
                value={data.duracionTotalSiestas || ""}
                onChange={(e) => updateField("duracionTotalSiestas", e.target.value)}
                placeholder="Ej: En brazos, paseandolo, en coche, pecho, etc."
              />
            </div>

            {/* 28. ¿Dónde toma siestas? */}
            <div>
              <Label htmlFor="donde-siestas">
                Donde toma las siestas?
              </Label>
              <Input
                id="donde-siestas"
                value={data.dondeSiestas || ""}
                onChange={(e) => updateField("dondeSiestas", e.target.value)}
                placeholder="Ej: En su cuna, en brazos..."
              />
            </div>

            {/* Detalle estructurado por siesta (NUEVO) */}
            <div>
              <Label className="mb-2 block">Detalle de cada siesta</Label>
              <p className="text-sm text-gray-500 mb-2">
                Agrega informacion detallada por cada siesta que toma al dia.
              </p>
              <DynamicListField
                items={data.siestasDetalle || []}
                onChange={(items) => updateField("siestasDetalle", items)}
                maxItems={4}
                addLabel="Agregar siesta"
                emptyMessage="No hay siestas registradas"
                createEmpty={() => ({
                  horaIntentoDomir: "",
                  comoYDondeDuermen: "",
                  horaRealDormido: "",
                  horaDespertoSiesta: "",
                })}
                renderItem={(item, index, onItemChange) => (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-gray-700">Siesta {index + 1}</p>
                    <div>
                      <Label htmlFor={`siesta-${index}-intento`} className="text-sm text-gray-600">
                        A que hora empezaron a tratar de dormirlo?
                      </Label>
                      <Input
                        id={`siesta-${index}-intento`}
                        type="time"
                        step="300"
                        value={item.horaIntentoDomir || ""}
                        onChange={(e) => onItemChange({ ...item, horaIntentoDomir: e.target.value })}
                        className="max-w-xs mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`siesta-${index}-como`} className="text-sm text-gray-600">
                        Como y donde lo durmieron?
                      </Label>
                      <Textarea
                        id={`siesta-${index}-como`}
                        value={item.comoYDondeDuermen || ""}
                        onChange={(e) => onItemChange({ ...item, comoYDondeDuermen: e.target.value })}
                        placeholder="Ej: En brazos meciendolo en su cuarto..."
                        rows={3}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`siesta-${index}-dormido`} className="text-sm text-gray-600">
                        A que hora se durmio?
                      </Label>
                      <Input
                        id={`siesta-${index}-dormido`}
                        type="time"
                        step="300"
                        value={item.horaRealDormido || ""}
                        onChange={(e) => onItemChange({ ...item, horaRealDormido: e.target.value })}
                        className="max-w-xs mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`siesta-${index}-desperto`} className="text-sm text-gray-600">
                        A que hora desperto?
                      </Label>
                      <Input
                        id={`siesta-${index}-desperto`}
                        type="time"
                        step="300"
                        value={item.horaDespertoSiesta || ""}
                        onChange={(e) => onItemChange({ ...item, horaDespertoSiesta: e.target.value })}
                        className="max-w-xs mt-1"
                      />
                    </div>
                  </div>
                )}
              />
            </div>
          </>
        )}
      </CollapsibleSection>

      {/* ============================================================ */}
      {/* SECCION: Despertares nocturnos                               */}
      {/* ============================================================ */}
      <CollapsibleSection
        title="Despertares nocturnos"
        icon={<Baby className="w-4 h-4 text-purple-500" />}
      >
        {/* 20. ¿Despierta por la noche? */}
        <div>
          <Label>Tu hijo(a) despierta por la noche?</Label>
          <RadioGroup
            value={data.despiertaNoche === true ? "si" : data.despiertaNoche === false ? "no" : ""}
            onValueChange={(value) => updateField("despiertaNoche", value === "si")}
          >
            <div className="flex gap-4 mt-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="si" id="despierta-si" />
                <Label htmlFor="despierta-si">Si</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="despierta-no" />
                <Label htmlFor="despierta-no">No</Label>
              </div>
            </div>
          </RadioGroup>
        </div>

        {data.despiertaNoche === true && (
          <>
            {/* 21. Veces que despierta */}
            <div>
              <Label htmlFor="veces-despierta">
                Cuantas veces despierta?
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
                Cuanto tiempo permanece despierto cuando se despierta?
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
                Desde que edad (en meses) se despierta?
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
                Que haces cuando tu bebe se despierta en la noche?
              </Label>
              <Textarea
                id="que-haces-despierta"
                value={data.queHacesDespierta || ""}
                onChange={(e) => updateField("queHacesDespierta", e.target.value)}
                placeholder="Describe que haces cuando se despierta..."
                rows={3}
              />
            </div>

            {/* Detalle estructurado por despertar (NUEVO) */}
            <div>
              <Label className="mb-2 block">Detalle de cada despertar</Label>
              <p className="text-sm text-gray-500 mb-2">
                Agrega informacion detallada por cada despertar nocturno tipico.
              </p>
              <DynamicListField
                items={data.despertaresDetalle || []}
                onChange={(items) => updateField("despertaresDetalle", items)}
                maxItems={5}
                addLabel="Agregar despertar"
                emptyMessage="No hay despertares registrados"
                createEmpty={() => ({
                  horaDespertar: "",
                  queHaceParaDormir: "",
                  horaVolvioaDormir: "",
                })}
                renderItem={(item, index, onItemChange) => (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-gray-700">Despertar {index + 1}</p>
                    <div>
                      <Label htmlFor={`despertar-${index}-hora`} className="text-sm text-gray-600">
                        A que hora desperto?
                      </Label>
                      <Input
                        id={`despertar-${index}-hora`}
                        type="time"
                        step="300"
                        value={item.horaDespertar || ""}
                        onChange={(e) => onItemChange({ ...item, horaDespertar: e.target.value })}
                        className="max-w-xs mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`despertar-${index}-que-hace`} className="text-sm text-gray-600">
                        Que hiciste (detallado) para que se durmiera?
                      </Label>
                      <Textarea
                        id={`despertar-${index}-que-hace`}
                        value={item.queHaceParaDormir || ""}
                        onChange={(e) => onItemChange({ ...item, queHaceParaDormir: e.target.value })}
                        placeholder="Ej: Le di pecho, lo meci, le puse ruido blanco..."
                        rows={3}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`despertar-${index}-volvio`} className="text-sm text-gray-600">
                        A que hora se volvio a dormir?
                      </Label>
                      <Input
                        id={`despertar-${index}-volvio`}
                        type="time"
                        step="300"
                        value={item.horaVolvioaDormir || ""}
                        onChange={(e) => onItemChange({ ...item, horaVolvioaDormir: e.target.value })}
                        className="max-w-xs mt-1"
                      />
                    </div>
                  </div>
                )}
              />
            </div>
          </>
        )}
      </CollapsibleSection>

      {/* ============================================================ */}
      {/* SECCION: Tomas nocturnas (NUEVA)                             */}
      {/* ============================================================ */}
      <CollapsibleSection
        title="Tomas nocturnas"
        icon={<Moon className="w-4 h-4 text-blue-500" />}
      >
        <div>
          <Label>Tiene tomas nocturnas?</Label>
          <RadioGroup
            value={data.tieneTomasNocturnas === true ? "si" : data.tieneTomasNocturnas === false ? "no" : ""}
            onValueChange={(value) => updateField("tieneTomasNocturnas", value === "si")}
          >
            <div className="flex gap-4 mt-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="si" id="tomas-nocturnas-si" />
                <Label htmlFor="tomas-nocturnas-si">Si</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="tomas-nocturnas-no" />
                <Label htmlFor="tomas-nocturnas-no">No</Label>
              </div>
            </div>
          </RadioGroup>
        </div>

        {data.tieneTomasNocturnas === true && (
          <div>
            <Label className="mb-2 block">Detalle de cada toma nocturna</Label>
            <p className="text-sm text-gray-500 mb-2">
              Agrega informacion sobre cada toma que tiene durante la noche.
            </p>
            <DynamicListField
              items={data.tomasNocturnasDetalle || []}
              onChange={(items) => updateField("tomasNocturnasDetalle", items)}
              maxItems={5}
              addLabel="Agregar toma nocturna"
              emptyMessage="No hay tomas nocturnas registradas"
              createEmpty={() => ({
                cuantoComio: "",
                seDurmioEnToma: "",
                minutosEnVolverADormir: 0,
                queHaceParaDormir: "",
              })}
              renderItem={(item, index, onItemChange) => (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-gray-700">Toma {index + 1}</p>
                  <div>
                    <Label htmlFor={`toma-nocturna-${index}-cuanto`} className="text-sm text-gray-600">
                      Cuanto comio?
                    </Label>
                    <Input
                      id={`toma-nocturna-${index}-cuanto`}
                      value={item.cuantoComio || ""}
                      onChange={(e) => onItemChange({ ...item, cuantoComio: e.target.value })}
                      placeholder="Ej: 120ml, 4oz, pecho 10 min..."
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">Se durmio en la toma?</Label>
                    <RadioGroup
                      value={item.seDurmioEnToma || ""}
                      onValueChange={(value) => onItemChange({ ...item, seDurmioEnToma: value })}
                    >
                      <div className="flex gap-3 mt-1">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="si" id={`toma-nocturna-${index}-durmio-si`} />
                          <Label htmlFor={`toma-nocturna-${index}-durmio-si`} className="text-sm">Si</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="no" id={`toma-nocturna-${index}-durmio-no`} />
                          <Label htmlFor={`toma-nocturna-${index}-durmio-no`} className="text-sm">No</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="a_veces" id={`toma-nocturna-${index}-durmio-aveces`} />
                          <Label htmlFor={`toma-nocturna-${index}-durmio-aveces`} className="text-sm">A veces</Label>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>
                  <div>
                    <Label htmlFor={`toma-nocturna-${index}-minutos`} className="text-sm text-gray-600">
                      Cuanto tardo en volverse a dormir? (minutos)
                    </Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        id={`toma-nocturna-${index}-minutos`}
                        type="number"
                        min="0"
                        step="5"
                        value={item.minutosEnVolverADormir || ""}
                        onChange={(e) => onItemChange({
                          ...item,
                          minutosEnVolverADormir: e.target.value ? Number(e.target.value) : 0,
                        })}
                        onWheel={(e) => { e.currentTarget.blur() }}
                        placeholder="Ej: 15"
                        className="max-w-[120px]"
                      />
                      <span className="text-sm text-gray-600">minutos</span>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor={`toma-nocturna-${index}-que-hace`} className="text-sm text-gray-600">
                      Que hiciste para que durmiera?
                    </Label>
                    <Textarea
                      id={`toma-nocturna-${index}-que-hace`}
                      value={item.queHaceParaDormir || ""}
                      onChange={(e) => onItemChange({ ...item, queHaceParaDormir: e.target.value })}
                      placeholder="Ej: Lo meci, le di palmaditas, lo arrope..."
                      rows={3}
                      className="mt-1"
                    />
                  </div>
                </div>
              )}
            />
          </div>
        )}
      </CollapsibleSection>

      {/* ============================================================ */}
      {/* SECCION: Ambiente y entorno del cuarto                       */}
      {/* ============================================================ */}
      <CollapsibleSection
        title="Ambiente y entorno del cuarto"
        icon={<Moon className="w-4 h-4 text-gray-500" />}
      >
        {/* 9. Oscuridad del cuarto */}
        <div>
          <Label>Que tan oscuro es el cuarto de su hijo/a? Deja usted:</Label>
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
                    De que color es la lamparita?
                  </Label>
                  <Input
                    id="color-lamparita"
                    value={data.colorLamparita || ""}
                    onChange={(e) => updateField("colorLamparita", e.target.value)}
                    placeholder="Ej: Blanca calida, azul, amarilla..."
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
                <Label htmlFor="osc-bano">Luz del bano prendida</Label>
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
          <Label>Usan ustedes ruido blanco?</Label>
          <RadioGroup
            value={data.ruidoBlanco === true ? "si" : data.ruidoBlanco === false ? "no" : ""}
            onValueChange={(value) => updateField("ruidoBlanco", value === "si")}
          >
            <div className="flex gap-4 mt-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="si" id="ruido-si" />
                <Label htmlFor="ruido-si">Si</Label>
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
            Aproximadamente, a que temperatura esta el cuarto al dormir?
          </Label>
          <Input
            id="temperatura"
            value={data.temperaturaCuarto || ""}
            onChange={(e) => updateField("temperaturaCuarto", e.target.value)}
            placeholder="Ej: 22C, fresco, templado..."
          />
        </div>

        {/* G4 Humedad del cuarto */}
        <div>
          <Label htmlFor="humedad-habitacion">
            Como describirias la humedad de la habitacion donde duerme?
          </Label>
          <p className="text-sm text-gray-500 mb-2">
            La humedad puede afectar la calidad del sueno y las alergias respiratorias.
          </p>
          <Select
            value={data.humedadHabitacion || ""}
            onValueChange={(value) => updateField("humedadHabitacion", value)}
          >
            <SelectTrigger id="humedad-habitacion" className="max-w-xs">
              <SelectValue placeholder="Selecciona una opcion" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="seca">Seca (poca humedad)</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="humeda">Humeda (mucha humedad)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 12. Tipo de pijama */}
        <div>
          <Label htmlFor="tipo-pijama">
            Describe que tipo de pijama usa su hijo/a.
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
          <Label>Usa su hijo/a saco para dormir?</Label>
          <RadioGroup
            value={data.usaSaco === true ? "si" : data.usaSaco === false ? "no" : ""}
            onValueChange={(value) => updateField("usaSaco", value === "si")}
          >
            <div className="flex gap-4 mt-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="si" id="saco-si" />
                <Label htmlFor="saco-si">Si</Label>
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
          <Label>Se queda usted con el/ella hasta que concilie el sueno?</Label>
          <RadioGroup
            value={data.teQuedasHastaDuerma === true ? "si" : data.teQuedasHastaDuerma === false ? "no" : ""}
            onValueChange={(value) => updateField("teQuedasHastaDuerma", value === "si")}
          >
            <div className="flex gap-4 mt-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="si" id="quedas-si" />
                <Label htmlFor="quedas-si">Si</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="quedas-no" />
                <Label htmlFor="quedas-no">No</Label>
              </div>
            </div>
          </RadioGroup>
        </div>
      </CollapsibleSection>

      {/* ============================================================ */}
      {/* SECCION: Lugar donde duerme y otros                          */}
      {/* ============================================================ */}

      {/* 15. ¿Dónde duerme tu hijo? - Opción múltiple */}
      <div>
        <Label>Donde duerme su hijo/a por las noches? <span className="text-red-500">*</span></Label>
        <p className="text-sm text-gray-500 mt-1">Puede seleccionar multiples opciones</p>
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
            <Label htmlFor="donde-cuna-padres">Cuna/corral en cuarto de papas</Label>
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
            <Label htmlFor="donde-solo-padres">Cama de papas</Label>
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
            <Label htmlFor="donde-cuna-luego">Primero en su cuna/corral y luego a cama de papas</Label>
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
            <Label htmlFor="donde-cama-luego">Primero en su cama y luego a cama de papas</Label>
          </div>
        </div>
        {hasError("dondeDuerme") && (
          <p className="text-red-500 text-sm mt-1">{getError("dondeDuerme")}</p>
        )}
      </div>

      {/* 16. ¿Comparte habitación? */}
      <div>
        <Label>Tu hijo(a) comparte la habitacion con algun miembro de la familia?</Label>
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
              <Label htmlFor="comparte-si">Si</Label>
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
              Con quien comparte la habitacion?
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

      {/* 19. Hora de despertarse - Rango (Desde / Hasta) */}
      <div>
        <Label>
          A que hora se despierta tu hijo(a) por la manana?
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

      {/* 29. Sueño y lugar cuando viajan */}
      <div>
        <Label htmlFor="duerme-mejor-viaja">
          Cuando viajas, sientes que tu hijo duerme mejor, peor o igual? Donde duerme en los viajes?
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
            placeholder="Ej: En cuna portatil, cama de hotel, con los padres, etc."
          />
        </div>
      </div>

      {/* ============================================================ */}
      {/* SECCION: Preocupaciones y objetivos                          */}
      {/* ============================================================ */}

      {/* 30. Principal preocupación */}
      <div>
        <Label htmlFor="principal-preocupacion">
          Cual es tu principal preocupacion con respecto al sueno de tu hijo(a)?
        </Label>
        <Textarea
          id="principal-preocupacion"
          value={data.principalPreocupacion || ""}
          onChange={(e) => updateField("principalPreocupacion", e.target.value)}
          placeholder="Describe tu principal preocupacion..."
          rows={3}
        />
      </div>

      {/* 31. ¿Desde cuándo problema? */}
      <div>
        <Label htmlFor="desde-cuando-problema">
          Desde cuando existe este problema?
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
          Cual es el objetivo que como papas les gustaria ver en los habitos de sueno de su hijo(a)? Por favor, sean especificos. Por ejemplo, que objetivos tienen en cuanto a horarios y lugar donde les gustaria que duerma durante la noche? <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id="objetivo-padres"
          value={data.objetivoPadres || ""}
          onChange={(e) => updateField("objetivoPadres", e.target.value)}
          placeholder="Describe especificamente que cambios desean ver en los habitos de sueno..."
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
          Existe alguna otra informacion que consideren relevante que deba saber?
        </Label>
        <Textarea
          id="info-adicional"
          value={data.infoAdicional || ""}
          onChange={(e) => updateField("infoAdicional", e.target.value)}
          placeholder="Cualquier informacion adicional que consideres importante..."
          rows={3}
        />
      </div>

      {/* ============================================================ */}
      {/* SECCION: Notas adicionales (diaTipico movido al final)       */}
      {/* ============================================================ */}
      <div>
        <Label htmlFor="dia-tipico">
          Notas adicionales sobre el dia tipico (opcional)
        </Label>
        <p className="text-sm text-gray-500 mb-1">
          Si deseas agregar informacion adicional sobre un dia tipico de tu hijo/a, puedes hacerlo aqui.
        </p>
        <Textarea
          id="dia-tipico"
          value={data.diaTipico || ""}
          onChange={(e) => updateField("diaTipico", e.target.value)}
          placeholder="Describe cualquier detalle adicional sobre un dia tipico..."
          rows={4}
        />
      </div>

      {/* Mensaje final */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-800">
          Gracias por tomarse el tiempo de llenar este cuestionario. Esta informacion me servira para juntos crear un plan que se ajuste a las necesidades de su hijo(a) y la familia.
          Les recuerdo que para lograr cambios, su compromiso es esencial durante todo este proceso.
        </p>
      </div>
    </div>
  )
}
