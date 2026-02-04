// Paso 2: Sobre la Dinámica Familiar
// Información sobre la estructura familiar y contacto

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { Home } from "lucide-react"
import type { SurveyStepProps } from "../types/survey.types"
import { SiblingsList, type SiblingInfo } from "../SiblingsList"

export function FamilyDynamicsStep({ data, onChange, errors = {} }: SurveyStepProps) {
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

  return (
    <div className="space-y-8">
      <h3 className="text-xl font-semibold text-[#2F2F2F] flex items-center gap-2">
        <Home className="w-5 h-5" />
        SOBRE LA DINÁMICA FAMILIAR
      </h3>

      {/* 1. ¿Quiénes más viven en la casa? */}
      <div>
        <Label htmlFor="otros-residentes">
          1. ¿Quienes mas viven en la casa?
        </Label>
        <Textarea
          id="otros-residentes"
          value={data.otrosResidentes || ""}
          onChange={(e) => updateField("otrosResidentes", e.target.value)}
          placeholder="Describe quiénes más viven en la casa..."
          rows={2}
        />
      </div>

      {/* Lista de Hermanos */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <SiblingsList
          value={(data.hijosInfo as SiblingInfo[]) || []}
          onChange={(siblings) => {
            onChange({
              ...data,
              hijosInfo: siblings,
              cantidadHijos: siblings.length
            })
          }}
        />
      </div>

      {/* 2. Selector de contacto principal */}
      <div>
        <Label>2. ¿De quién será el contacto principal para seguimiento? <span className="text-red-500">*</span></Label>
        <RadioGroup
          value={data.contactoPrincipal || ""}
          onValueChange={(value) => updateField("contactoPrincipal", value)}
        >
          <div className="flex gap-4 mt-2">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="mama" id="contacto-mama" />
              <Label htmlFor="contacto-mama">Mamá</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="papa" id="contacto-papa" />
              <Label htmlFor="contacto-papa">Papá</Label>
            </div>
          </div>
        </RadioGroup>
        {hasError("contactoPrincipal") && (
          <p className="text-red-500 text-sm mt-1">{getError("contactoPrincipal")}</p>
        )}
        <p className="text-sm text-gray-500 mt-2">
          Se utilizará el teléfono y correo electrónico proporcionados en la sección de información familiar
        </p>
      </div>

      {/* 3. ¿Cómo supiste de mis servicios? */}
      <div>
        <Label htmlFor="como-supiste">
          3. ¿Cómo supiste de mis servicios?
        </Label>
        <Textarea
          id="como-supiste"
          value={data.comoSupiste || ""}
          onChange={(e) => updateField("comoSupiste", e.target.value)}
          placeholder="¿Cómo te enteraste de nuestros servicios?"
          rows={2}
        />
      </div>

      {/* 4. Libros consultados */}
      <div>
        <Label htmlFor="libros-consultados">
          4. ¿Qué libros acerca de sueño infantil han consultado?
        </Label>
        <Textarea
          id="libros-consultados"
          value={data.librosConsultados || ""}
          onChange={(e) => updateField("librosConsultados", e.target.value)}
          placeholder="Lista los libros que han leído sobre sueño infantil..."
          rows={2}
        />
      </div>

      {/* 5. ¿Están en contra de algún método? */}
      <div>
        <Label htmlFor="metodos-contra">
          5. ¿Están en contra de algún método de entrenamiento?
        </Label>
        <Textarea
          id="metodos-contra"
          value={data.metodosContra || ""}
          onChange={(e) => updateField("metodosContra", e.target.value)}
          placeholder="¿Hay algún método que no estén dispuestos a usar?"
          rows={2}
        />
      </div>

      {/* 6. ¿Has contratado otro asesor? */}
      <div>
        <Label>6. ¿Has contratado a algún otro asesor de sueño o intentado entrenar antes?</Label>
        <RadioGroup
          value={data.otroAsesor === true ? "si" : data.otroAsesor === false ? "no" : ""}
          onValueChange={(value) => {
            const hadOtherAdvisor = value === "si"
            onChange({
              ...data,
              otroAsesor: hadOtherAdvisor,
              otroAsesorDetalle: hadOtherAdvisor ? data.otroAsesorDetalle || "" : "",
            })
          }}
        >
          <div className="flex gap-4 mt-2">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="si" id="otro-asesor-si" />
              <Label htmlFor="otro-asesor-si">Sí</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="otro-asesor-no" />
              <Label htmlFor="otro-asesor-no">No</Label>
            </div>
          </div>
        </RadioGroup>
        {data.otroAsesor && (
          <div className="mt-3">
            <Label htmlFor="otro-asesor-detalle" className="text-sm text-gray-600">
              Por favor, describe tu experiencia previa
            </Label>
            <Textarea
              id="otro-asesor-detalle"
              value={data.otroAsesorDetalle || ""}
              onChange={(e) => updateField("otroAsesorDetalle", e.target.value)}
              placeholder="Describe qué métodos probaste y qué resultados obtuviste..."
              rows={3}
              className={hasError("otroAsesorDetalle") ? "border-red-500 mt-1" : "mt-1"}
            />
            {hasError("otroAsesorDetalle") && (
              <p className="text-red-500 text-sm mt-1">{getError("otroAsesorDetalle")}</p>
            )}
          </div>
        )}
      </div>

      {/* 7. ¿Quién atiende en la noche? */}
      <div>
        <Label htmlFor="quien-atiende">
          7. ¿Quién o quiénes se levantan a atender a tu hijo(a) cuando se despierta en la noche? <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id="quien-atiende"
          value={data.quienAtiende || ""}
          onChange={(e) => updateField("quienAtiende", e.target.value)}
          placeholder="Describe quién atiende al niño en la noche..."
          rows={2}
          className={hasError("quienAtiende") ? "border-red-500" : ""}
        />
        {hasError("quienAtiende") && (
          <p className="text-red-500 text-sm mt-1">{getError("quienAtiende")}</p>
        )}
      </div>
    </div>
  )
}
