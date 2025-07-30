// Paso 6: Rutina y Hábitos de Sueño
// Información sobre rutinas diarias y hábitos de sueño del niño

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { Moon } from "lucide-react"
import type { SurveyStepProps } from '../types/survey.types'

export function RoutineHabitsStep({ data, onChange, errors = {} }: SurveyStepProps) {
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
        <Moon className="w-5 h-5" />
        RUTINA Y HÁBITOS DE SUEÑO
      </h3>

      {/* 1. Día típico (24 horas) */}
      <div>
        <Label htmlFor="dia-tipico">
          1. Explica DETALLADAMENTE un día típico (24 horas) de tu hijo(a), desde que se despierta por la mañana y a lo largo de la noche <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id="dia-tipico"
          value={data.diaTipico || ""}
          onChange={(e) => updateField('diaTipico', e.target.value)}
          placeholder="Describe detalladamente un día completo desde que despierta hasta que duerme..."
          rows={5}
          className={hasError('diaTipico') ? 'border-red-500' : ''}
        />
        {hasError('diaTipico') && (
          <p className="text-red-500 text-sm mt-1">{getError('diaTipico')}</p>
        )}
      </div>

      {/* 2. ¿Va al kinder o guardería? */}
      <div>
        <Label>2. ¿Va tu hijo al kinder o guardería?</Label>
        <RadioGroup
          value={data.vaKinder === true ? "si" : data.vaKinder === false ? "no" : ""}
          onValueChange={(value) => updateField('vaKinder', value === 'si')}
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
      </div>

      {/* 3. ¿Quién pasa la mayoría del tiempo con el niño? */}
      <div>
        <Label htmlFor="quien-cuida">
          3. ¿Quién pasa la mayoría del tiempo con el niño(a)? <span className="text-red-500">*</span>
        </Label>
        <Input
          id="quien-cuida"
          value={data.quienCuida || ""}
          onChange={(e) => updateField('quienCuida', e.target.value)}
          placeholder="Ej: Mamá, papá, abuela, niñera..."
          className={hasError('quienCuida') ? 'border-red-500' : ''}
        />
        {hasError('quienCuida') && (
          <p className="text-red-500 text-sm mt-1">{getError('quienCuida')}</p>
        )}
      </div>

      {/* 4. Cuando salen de noche, ¿quién cuida? */}
      <div>
        <Label htmlFor="quien-cuida-noche">
          4. Si papá y mamá salen de casa en la noche, ¿quién cuida a su hij@ mientras regresan?
        </Label>
        <Input
          id="quien-cuida-noche"
          value={data.quienCuidaNoche || ""}
          onChange={(e) => updateField('quienCuidaNoche', e.target.value)}
          placeholder="Ej: Abuela, tía, niñera..."
        />
      </div>

      {/* 5. Cuando salen de noche, ¿dónde duerme? */}
      <div>
        <Label htmlFor="donde-duerme-salida">
          5. Cuando papá y mamá salen de noche, ¿dónde duerme su hij@?
        </Label>
        <Input
          id="donde-duerme-salida"
          value={data.dondeDuermeSalida || ""}
          onChange={(e) => updateField('dondeDuermeSalida', e.target.value)}
          placeholder="Ej: En su cama, con la abuela, en casa de familiares..."
        />
      </div>

      {/* 6. Rutina para dormir */}
      <div>
        <Label htmlFor="rutina-dormir">
          6. Explica cuál es la rutina que siguen por la noche para ir a dormir (qué hacen ANTES de acostarse). Indica a qué hora inicia y termina. <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id="rutina-dormir"
          value={data.rutinaDormir || ""}
          onChange={(e) => updateField('rutinaDormir', e.target.value)}
          placeholder="Describe la rutina: baño, cena, cuento, etc. Incluye horarios de inicio y fin..."
          rows={4}
          className={hasError('rutinaDormir') ? 'border-red-500' : ''}
        />
        {hasError('rutinaDormir') && (
          <p className="text-red-500 text-sm mt-1">{getError('rutinaDormir')}</p>
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
          onChange={(e) => updateField('horaDormir', e.target.value)}
          placeholder="Ej: 20:00, 20:30..."
          className={hasError('horaDormir') ? 'border-red-500' : ''}
        />
        {hasError('horaDormir') && (
          <p className="text-red-500 text-sm mt-1">{getError('horaDormir')}</p>
        )}
      </div>

      {/* 8. ¿Se queda dormido solo? */}
      <div>
        <Label>8. ¿Tu hijo(a) se queda dormido solo?</Label>
        <RadioGroup
          value={data.duermeSolo === true ? "si" : data.duermeSolo === false ? "no" : ""}
          onValueChange={(value) => updateField('duermeSolo', value === 'si')}
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
      </div>

      {/* 9. Oscuridad del cuarto (OPTIONAL) */}
      <div>
        <Label>9. ¿Qué tan oscuro es el cuarto de tu hijo(a)? Dejas: (OPTIONAL)</Label>
        <RadioGroup
          value={data.oscuridadCuarto || ""}
          onValueChange={(value) => updateField('oscuridadCuarto', value)}
        >
          <div className="space-y-2 mt-2">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="lamparita" id="osc-lamparita" />
              <Label htmlFor="osc-lamparita">Lamparita prendida</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="puerta-abierta" id="osc-puerta" />
              <Label htmlFor="osc-puerta">Puerta abierta</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="luz-bano" id="osc-bano" />
              <Label htmlFor="osc-bano">Luz del baño prendida</Label>
            </div>
          </div>
        </RadioGroup>
      </div>

      {/* 10. ¿Usan ruido blanco? */}
      <div>
        <Label>10. ¿Usan ruido blanco?</Label>
        <RadioGroup
          value={data.ruidoBlanco === true ? "si" : data.ruidoBlanco === false ? "no" : ""}
          onValueChange={(value) => updateField('ruidoBlanco', value === 'si')}
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
          onChange={(e) => updateField('temperaturaCuarto', e.target.value)}
          placeholder="Ej: 22°C, fresco, templado..."
        />
      </div>

      {/* 12. Tipo de piyama */}
      <div>
        <Label htmlFor="tipo-piyama">
          12. Describe detalladamente qué tipo de piyama usa tu hij@.
        </Label>
        <Textarea
          id="tipo-piyama"
          value={data.tipoPiyama || ""}
          onChange={(e) => updateField('tipoPiyama', e.target.value)}
          placeholder="Describe el tipo de piyama: manga larga/corta, material, grosor..."
          rows={2}
        />
      </div>

      {/* 13. ¿Usa saco para dormir? */}
      <div>
        <Label>13. ¿Usa saco para dormir?</Label>
        <RadioGroup
          value={data.usaSaco === true ? "si" : data.usaSaco === false ? "no" : ""}
          onValueChange={(value) => updateField('usaSaco', value === 'si')}
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
        <Label>14. ¿Te quedas con él/ella hasta que concilie el sueño?</Label>
        <RadioGroup
          value={data.teQuedasHastaDuerma === true ? "si" : data.teQuedasHastaDuerma === false ? "no" : ""}
          onValueChange={(value) => updateField('teQuedasHastaDuerma', value === 'si')}
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

      {/* 15. ¿Dónde duerme tu hijo? */}
      <div>
        <Label>15. ¿Dónde duerme tu hijo por las noches? <span className="text-red-500">*</span></Label>
        <RadioGroup
          value={data.dondeDuerme || ""}
          onValueChange={(value) => updateField('dondeDuerme', value)}
        >
          <div className="space-y-2 mt-2">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="cama-cuarto" id="donde-cama-cuarto" />
              <Label htmlFor="donde-cama-cuarto">Cama en su cuarto</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="cama-cuarto-padres" id="donde-cama-padres" />
              <Label htmlFor="donde-cama-padres">Cama en su cuarto con alguno de los padres</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="cuna-cuarto" id="donde-cuna-cuarto" />
              <Label htmlFor="donde-cuna-cuarto">Cuna/corral en su cuarto</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="cuna-padres" id="donde-cuna-padres" />
              <Label htmlFor="donde-cuna-padres">Cuna/corral en cuarto de papás</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="cama-padres" id="donde-solo-padres" />
              <Label htmlFor="donde-solo-padres">Cama de papás</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="cuna-luego-padres" id="donde-cuna-luego" />
              <Label htmlFor="donde-cuna-luego">Primero en su cuna/corral y luego a cama de papás</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="cama-luego-padres" id="donde-cama-luego" />
              <Label htmlFor="donde-cama-luego">Primero en su cama y luego a cama de papás</Label>
            </div>
          </div>
        </RadioGroup>
        {hasError('dondeDuerme') && (
          <p className="text-red-500 text-sm mt-1">{getError('dondeDuerme')}</p>
        )}
      </div>

      {/* 16. ¿Comparte habitación? */}
      <div>
        <Label>16. ¿Tu hijo(a) comparte la habitación con algún miembro de la familia?</Label>
        <RadioGroup
          value={data.comparteHabitacion === true ? "si" : data.comparteHabitacion === false ? "no" : ""}
          onValueChange={(value) => updateField('comparteHabitacion', value === 'si')}
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
      </div>

      {/* 17. Hora de acostarse bebé */}
      <div>
        <Label htmlFor="hora-acostarse-bebe">
          17. ¿A qué hora acuestas a tu bebé a dormir?
        </Label>
        <Input
          id="hora-acostarse-bebe"
          value={data.horaAcostarBebe || ""}
          onChange={(e) => updateField('horaAcostarBebe', e.target.value)}
          placeholder="Ej: 20:00"
        />
      </div>

      {/* 18. Tiempo para dormir */}
      <div>
        <Label htmlFor="tiempo-dormir">
          18. ¿Cuánto tiempo le toma a tu hijo(a) conciliar el sueño?
        </Label>
        <Input
          id="tiempo-dormir"
          value={data.tiempoDormir || ""}
          onChange={(e) => updateField('tiempoDormir', e.target.value)}
          placeholder="Ej: 30 minutos"
        />
      </div>

      {/* 19. Hora de despertarse */}
      <div>
        <Label htmlFor="hora-despertar">
          19. ¿A qué hora se despierta tu hijo(a) por la mañana?
        </Label>
        <Input
          id="hora-despertar"
          value={data.horaDespertar || ""}
          onChange={(e) => updateField('horaDespertar', e.target.value)}
          placeholder="Ej: 06:30"
        />
      </div>

      {/* 20. Total de sueño nocturno */}
      <div>
        <Label htmlFor="total-sueno-nocturno">
          20. Total de sueño nocturno
        </Label>
        <Input
          id="total-sueno-nocturno"
          value={data.totalSuenoNocturno || ""}
          onChange={(e) => updateField('totalSuenoNocturno', e.target.value)}
          placeholder="Ej: 10 horas"
        />
      </div>

      {/* 21. ¿Despierta por la noche? */}
      <div>
        <Label>21. ¿Tu hijo(a) despierta por la noche?</Label>
        <RadioGroup
          value={data.despiertaNoche === true ? "si" : data.despiertaNoche === false ? "no" : ""}
          onValueChange={(value) => updateField('despiertaNoche', value === 'si')}
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

      {/* 22. Veces que despierta */}
      <div>
        <Label htmlFor="veces-despierta">
          22. ¿Cuántas veces despierta?
        </Label>
        <Input
          id="veces-despierta"
          value={data.vecesDespierta || ""}
          onChange={(e) => updateField('vecesDespierta', e.target.value)}
          placeholder="Ej: 2-3 veces"
        />
      </div>

      {/* 23. ¿Cuánto tiempo despierto? */}
      <div>
        <Label htmlFor="tiempo-despierto">
          23. ¿Cuánto tiempo permanece despierto cuando se despierta?
        </Label>
        <Input
          id="tiempo-despierto"
          value={data.tiempoDespierto || ""}
          onChange={(e) => updateField('tiempoDespierto', e.target.value)}
          placeholder="Ej: 15-30 minutos"
        />
      </div>

      {/* 24. ¿Desde cuándo se despierta? */}
      <div>
        <Label htmlFor="desde-cuando-despierta">
          24. ¿Desde cuándo se despierta?
        </Label>
        <Input
          id="desde-cuando-despierta"
          value={data.desdeCuandoDespierta || ""}
          onChange={(e) => updateField('desdeCuandoDespierta', e.target.value)}
          placeholder="Ej: Desde los 6 meses"
        />
      </div>

      {/* 25. ¿Qué haces cuando despierta? */}
      <div>
        <Label htmlFor="que-haces-despierta">
          25. ¿Qué haces cuando tu bebé se despierta en la noche?
        </Label>
        <Textarea
          id="que-haces-despierta"
          value={data.queHacesDespierta || ""}
          onChange={(e) => updateField('queHacesDespierta', e.target.value)}
          placeholder="Describe qué haces cuando se despierta..."
          rows={3}
        />
      </div>

      {/* 26. ¿Toma siestas? */}
      <div>
        <Label>26. ¿Tu hijo(a) toma siestas durante el día?</Label>
        <RadioGroup
          value={data.tomaSiestas === true ? "si" : data.tomaSiestas === false ? "no" : ""}
          onValueChange={(value) => updateField('tomaSiestas', value === 'si')}
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

      {/* 27. Número de siestas */}
      <div>
        <Label htmlFor="numero-siestas">
          27. ¿Cuántas? ¿A qué hora(s)?
        </Label>
        <Input
          id="numero-siestas"
          value={data.numeroSiestas || ""}
          onChange={(e) => updateField('numeroSiestas', e.target.value)}
          placeholder="Ej: 2 siestas, 10:00 y 15:00"
        />
      </div>

      {/* 28. Duración total siestas */}
      <div>
        <Label htmlFor="duracion-total-siestas">
          28. ¿Cuál es la duración total de las siestas?
        </Label>
        <Input
          id="duracion-total-siestas"
          value={data.duracionTotalSiestas || ""}
          onChange={(e) => updateField('duracionTotalSiestas', e.target.value)}
          placeholder="Ej: 3 horas en total"
        />
      </div>

      {/* 29. ¿Dónde toma siestas? */}
      <div>
        <Label htmlFor="donde-siestas">
          29. ¿Dónde toma las siestas?
        </Label>
        <Input
          id="donde-siestas"
          value={data.dondeSiestas || ""}
          onChange={(e) => updateField('dondeSiestas', e.target.value)}
          placeholder="Ej: En su cuna, en brazos..."
        />
      </div>

      {/* 30. Principal preocupación (OPTIONAL) */}
      <div>
        <Label htmlFor="principal-preocupacion">
          30. ¿Cuál es tu principal preocupación con respecto al sueño de tu hijo(a)? (OPTIONAL)
        </Label>
        <Textarea
          id="principal-preocupacion"
          value={data.principalPreocupacion || ""}
          onChange={(e) => updateField('principalPreocupacion', e.target.value)}
          placeholder="Describe tu principal preocupación..."
          rows={3}
        />
      </div>

      {/* 31. ¿Desde cuándo problema? (OPTIONAL) */}
      <div>
        <Label htmlFor="desde-cuando-problema">
          31. ¿Desde cuándo existe este problema? (OPTIONAL)
        </Label>
        <Input
          id="desde-cuando-problema"
          value={data.desdeCuandoProblema || ""}
          onChange={(e) => updateField('desdeCuandoProblema', e.target.value)}
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
          onChange={(e) => updateField('objetivoPadres', e.target.value)}
          placeholder="Describe específicamente qué cambios desean ver en los hábitos de sueño..."
          rows={4}
          className={hasError('objetivoPadres') ? 'border-red-500' : ''}
        />
        {hasError('objetivoPadres') && (
          <p className="text-red-500 text-sm mt-1">{getError('objetivoPadres')}</p>
        )}
      </div>

      {/* 33. Información adicional (OPTIONAL) */}
      <div>
        <Label htmlFor="info-adicional">
          33. ¿Existe alguna otra información que consideren relevante que sepa? (OPTIONAL)
        </Label>
        <Textarea
          id="info-adicional"
          value={data.infoAdicional || ""}
          onChange={(e) => updateField('infoAdicional', e.target.value)}
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