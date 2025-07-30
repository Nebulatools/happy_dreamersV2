// Paso 2: Sobre la Dinámica Familiar
// Información sobre la estructura familiar y contacto

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { Home } from "lucide-react"
import type { SurveyStepProps } from '../types/survey.types'

export function FamilyDynamicsStep({ data, onChange, errors = {} }: SurveyStepProps) {
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
        <Home className="w-5 h-5" />
        SOBRE LA DINÁMICA FAMILIAR
      </h3>

      {/* 1. ¿Cuántos hijos tienen? */}
      <div>
        <Label htmlFor="hijos-info">
          1. ¿Cuántos hijos tienen? Escribe el nombre, fecha de nacimiento y edad de cada uno de ellos. (Pon un asterisco en el nombre del hijo(a) que desean ayudar) <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id="hijos-info"
          value={data.hijosInfo || ""}
          onChange={(e) => updateField('hijosInfo', e.target.value)}
          placeholder="Ejemplo: *Juan (15/03/2019, 5 años), María (20/08/2021, 3 años)"
          rows={3}
          className={hasError('hijosInfo') ? 'border-red-500' : ''}
        />
        {hasError('hijosInfo') && (
          <p className="text-red-500 text-sm mt-1">{getError('hijosInfo')}</p>
        )}
      </div>

      {/* 2. ¿Quiénes más viven en la casa? */}
      <div>
        <Label htmlFor="otros-residentes">
          2. ¿Quiénes más viven en la casa?
        </Label>
        <Textarea
          id="otros-residentes"
          value={data.otrosResidentes || ""}
          onChange={(e) => updateField('otrosResidentes', e.target.value)}
          placeholder="Describe quiénes más viven en la casa..."
          rows={2}
        />
      </div>

      {/* 3. Número telefónico para llamadas de seguimiento */}
      <div>
        <Label htmlFor="telefono-seguimiento">
          3. ¿Cuál es el número telefónico en el cual se podrán hacer las llamadas de seguimiento? <span className="text-red-500">*</span>
        </Label>
        <Input
          id="telefono-seguimiento"
          value={data.telefonoSeguimiento || ""}
          onChange={(e) => updateField('telefonoSeguimiento', e.target.value)}
          placeholder="Número de teléfono"
          className={hasError('telefonoSeguimiento') ? 'border-red-500' : ''}
        />
        {hasError('telefonoSeguimiento') && (
          <p className="text-red-500 text-sm mt-1">{getError('telefonoSeguimiento')}</p>
        )}
      </div>

      {/* 4. Email para observaciones */}
      <div>
        <Label htmlFor="email-observaciones">
          4. ¿Cuál es el correo electrónico en el cual se enviarán las observaciones del registro de sueño? <span className="text-red-500">*</span>
        </Label>
        <Input
          id="email-observaciones"
          type="email"
          value={data.emailObservaciones || ""}
          onChange={(e) => updateField('emailObservaciones', e.target.value)}
          placeholder="Correo electrónico"
          className={hasError('emailObservaciones') ? 'border-red-500' : ''}
        />
        {hasError('emailObservaciones') && (
          <p className="text-red-500 text-sm mt-1">{getError('emailObservaciones')}</p>
        )}
      </div>

      {/* 5. ¿Cómo supiste de mis servicios? */}
      <div>
        <Label htmlFor="como-supiste">
          5. ¿Cómo supiste de mis servicios?
        </Label>
        <Textarea
          id="como-supiste"
          value={data.comoSupiste || ""}
          onChange={(e) => updateField('comoSupiste', e.target.value)}
          placeholder="¿Cómo te enteraste de nuestros servicios?"
          rows={2}
        />
      </div>

      {/* 6. Libros consultados */}
      <div>
        <Label htmlFor="libros-consultados">
          6. ¿Qué libros acerca de sueño infantil han consultado?
        </Label>
        <Textarea
          id="libros-consultados"
          value={data.librosConsultados || ""}
          onChange={(e) => updateField('librosConsultados', e.target.value)}
          placeholder="Lista los libros que han leído sobre sueño infantil..."
          rows={2}
        />
      </div>

      {/* 7. ¿Están en contra de algún método? */}
      <div>
        <Label htmlFor="metodos-contra">
          7. ¿Están en contra de algún método de entrenamiento?
        </Label>
        <Textarea
          id="metodos-contra"
          value={data.metodosContra || ""}
          onChange={(e) => updateField('metodosContra', e.target.value)}
          placeholder="¿Hay algún método que no estén dispuestos a usar?"
          rows={2}
        />
      </div>

      {/* 8. ¿Has contratado otro asesor? (OPTIONAL) */}
      <div>
        <Label>8. ¿Has contratado a algún otro asesor de sueño o intentado entrenar antes? (OPTIONAL)</Label>
        <RadioGroup
          value={data.otroAsesor === true ? "si" : data.otroAsesor === false ? "no" : ""}
          onValueChange={(value) => updateField('otroAsesor', value === 'si')}
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
      </div>

      {/* 9. ¿Quién atiende en la noche? */}
      <div>
        <Label htmlFor="quien-atiende">
          9. ¿Quién o quiénes se levantan a atender a tu hijo(a) cuando se despierta en la noche? <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id="quien-atiende"
          value={data.quienAtiende || ""}
          onChange={(e) => updateField('quienAtiende', e.target.value)}
          placeholder="Describe quién atiende al niño en la noche..."
          rows={2}
          className={hasError('quienAtiende') ? 'border-red-500' : ''}
        />
        {hasError('quienAtiende') && (
          <p className="text-red-500 text-sm mt-1">{getError('quienAtiende')}</p>
        )}
      </div>
    </div>
  )
}