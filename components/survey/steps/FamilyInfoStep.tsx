// Paso 1: Información Familiar
// Componente modular y reutilizable para datos familiares

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { Users } from "lucide-react"
import type { SurveyStepProps } from '../types/survey.types'

export function FamilyInfoStep({ data, onChange, errors = {} }: SurveyStepProps) {
  const [activeTab, setActiveTab] = useState<'papa' | 'mama'>('papa')
  
  const updateField = (parent: 'papa' | 'mama', field: string, value: any) => {
    onChange({
      ...data,
      [parent]: {
        ...data[parent],
        [field]: value
      }
    })
  }

  const getError = (parent: string, field: string): string | undefined => {
    const parentErrors = errors[parent] as any
    return parentErrors?.[field]
  }

  const hasError = (parent: string, field: string): boolean => {
    return !!getError(parent, field)
  }

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-[#2F2F2F] flex items-center gap-2">
        <Users className="w-5 h-5" />
        INFORMACIÓN FAMILIAR
      </h3>
      
      {/* Botones de navegación */}
      <div className="flex gap-2 border-b">
        <button
          type="button"
          onClick={() => setActiveTab('papa')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'papa'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Sobre Papá
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('mama')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'mama'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Sobre Mamá
        </button>
      </div>

      {/* Contenido según tab activa */}
      {activeTab === 'papa' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Nombre */}
            <div>
              <Label htmlFor="papa-nombre">
                1. Nombre: <span className="text-red-500">*</span>
              </Label>
              <Input 
                id="papa-nombre"
                value={data.papa?.nombre || ""}
                onChange={(e) => updateField('papa', 'nombre', e.target.value)}
                placeholder="Nombre del padre"
                className={hasError('papa', 'nombre') ? 'border-red-500' : ''}
              />
              {hasError('papa', 'nombre') && (
                <p className="text-red-500 text-sm mt-1">{getError('papa', 'nombre')}</p>
              )}
            </div>
            
            {/* 2. Edad */}
            <div>
              <Label htmlFor="papa-edad">
                2. Edad: <span className="text-red-500">*</span>
              </Label>
              <Input 
                id="papa-edad"
                type="number"
                value={data.papa?.edad || ""}
                onChange={(e) => updateField('papa', 'edad', e.target.value)}
                placeholder="Edad"
                className={hasError('papa', 'edad') ? 'border-red-500' : ''}
              />
              {hasError('papa', 'edad') && (
                <p className="text-red-500 text-sm mt-1">{getError('papa', 'edad')}</p>
              )}
            </div>
            
            {/* 3. Ocupación */}
            <div className="md:col-span-2">
              <Label htmlFor="papa-ocupacion">
                3. Ocupación: <span className="text-red-500">*</span>
              </Label>
              <Input 
                id="papa-ocupacion"
                value={data.papa?.ocupacion || ""}
                onChange={(e) => updateField('papa', 'ocupacion', e.target.value)}
                placeholder="Ocupación del padre"
                className={hasError('papa', 'ocupacion') ? 'border-red-500' : ''}
              />
              {hasError('papa', 'ocupacion') && (
                <p className="text-red-500 text-sm mt-1">{getError('papa', 'ocupacion')}</p>
              )}
            </div>
            
            {/* 4. Dirección */}
            <div className="md:col-span-2">
              <Label htmlFor="papa-direccion">
                4. Dirección: <span className="text-red-500">*</span>
              </Label>
              <Input 
                id="papa-direccion"
                value={data.papa?.direccion || ""}
                onChange={(e) => updateField('papa', 'direccion', e.target.value)}
                placeholder="Dirección completa"
                className={hasError('papa', 'direccion') ? 'border-red-500' : ''}
              />
              {hasError('papa', 'direccion') && (
                <p className="text-red-500 text-sm mt-1">{getError('papa', 'direccion')}</p>
              )}
            </div>
            
            {/* 5. Ciudad (OPTIONAL) */}
            <div>
              <Label htmlFor="papa-ciudad">
                5. Ciudad: (OPTIONAL)
              </Label>
              <Input 
                id="papa-ciudad"
                value={data.papa?.ciudad || ""}
                onChange={(e) => updateField('papa', 'ciudad', e.target.value)}
                placeholder="Ciudad"
              />
            </div>
            
            {/* 6. Teléfono (OPTIONAL) */}
            <div>
              <Label htmlFor="papa-telefono">
                6. Teléfono: (OPTIONAL)
              </Label>
              <Input 
                id="papa-telefono"
                value={data.papa?.telefono || ""}
                onChange={(e) => updateField('papa', 'telefono', e.target.value)}
                placeholder="Número de teléfono"
              />
            </div>
            
            {/* 7. Email */}
            <div className="md:col-span-2">
              <Label htmlFor="papa-email">
                7. Email: <span className="text-red-500">*</span>
              </Label>
              <Input 
                id="papa-email"
                type="email"
                value={data.papa?.email || ""}
                onChange={(e) => updateField('papa', 'email', e.target.value)}
                placeholder="Correo electrónico"
                className={hasError('papa', 'email') ? 'border-red-500' : ''}
              />
              {hasError('papa', 'email') && (
                <p className="text-red-500 text-sm mt-1">{getError('papa', 'email')}</p>
              )}
            </div>
          </div>
          
          {/* 8. ¿Papá trabaja fuera de casa? */}
          <div>
            <Label>8. ¿Papá trabaja fuera de casa?</Label>
            <RadioGroup
              value={data.papa?.trabajaFueraCasa === true ? "si" : data.papa?.trabajaFueraCasa === false ? "no" : ""}
              onValueChange={(value) => updateField('papa', 'trabajaFueraCasa', value === 'si')}
            >
              <div className="flex gap-4 mt-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="si" id="papa-trabaja-si" />
                  <Label htmlFor="papa-trabaja-si">Sí</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="papa-trabaja-no" />
                  <Label htmlFor="papa-trabaja-no">No</Label>
                </div>
              </div>
            </RadioGroup>
          </div>
          
          {/* 9. ¿Tiene o ha tenido alguna alergia? */}
          <div>
            <Label>9. ¿Tiene o ha tenido alguna alergia?</Label>
            <RadioGroup
              value={data.papa?.tieneAlergias === true ? "si" : data.papa?.tieneAlergias === false ? "no" : ""}
              onValueChange={(value) => updateField('papa', 'tieneAlergias', value === 'si')}
            >
              <div className="flex gap-4 mt-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="si" id="papa-alergias-si" />
                  <Label htmlFor="papa-alergias-si">Sí</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="papa-alergias-no" />
                  <Label htmlFor="papa-alergias-no">No</Label>
                </div>
              </div>
            </RadioGroup>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Nombre */}
            <div>
              <Label htmlFor="mama-nombre">
                1. Nombre: <span className="text-red-500">*</span>
              </Label>
              <Input 
                id="mama-nombre"
                value={data.mama?.nombre || ""}
                onChange={(e) => updateField('mama', 'nombre', e.target.value)}
                placeholder="Nombre de la madre"
                className={hasError('mama', 'nombre') ? 'border-red-500' : ''}
              />
              {hasError('mama', 'nombre') && (
                <p className="text-red-500 text-sm mt-1">{getError('mama', 'nombre')}</p>
              )}
            </div>
            
            {/* 2. Edad (OPTIONAL) */}
            <div>
              <Label htmlFor="mama-edad">
                2. Edad: (OPTIONAL)
              </Label>
              <Input 
                id="mama-edad"
                type="number"
                value={data.mama?.edad || ""}
                onChange={(e) => updateField('mama', 'edad', e.target.value)}
                placeholder="Edad"
              />
            </div>
            
            {/* 3. Ocupación */}
            <div className="md:col-span-2">
              <Label htmlFor="mama-ocupacion">
                3. Ocupación: <span className="text-red-500">*</span>
              </Label>
              <Input 
                id="mama-ocupacion"
                value={data.mama?.ocupacion || ""}
                onChange={(e) => updateField('mama', 'ocupacion', e.target.value)}
                placeholder="Ocupación de la madre"
                className={hasError('mama', 'ocupacion') ? 'border-red-500' : ''}
              />
              {hasError('mama', 'ocupacion') && (
                <p className="text-red-500 text-sm mt-1">{getError('mama', 'ocupacion')}</p>
              )}
            </div>
          </div>
          
          {/* 4. ¿Tiene la misma dirección que papá? */}
          <div>
            <Label>4. ¿Tiene la misma dirección que papá?</Label>
            <RadioGroup
              value={data.mama?.mismaDireccionPapa === true ? "si" : data.mama?.mismaDireccionPapa === false ? "no" : ""}
              onValueChange={(value) => updateField('mama', 'mismaDireccionPapa', value === 'si')}
            >
              <div className="flex gap-4 mt-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="si" id="mama-misma-dir-si" />
                  <Label htmlFor="mama-misma-dir-si">Sí</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="mama-misma-dir-no" />
                  <Label htmlFor="mama-misma-dir-no">No</Label>
                </div>
              </div>
            </RadioGroup>
          </div>
          
          {!data.mama?.mismaDireccionPapa && (
            <div>
              <Label htmlFor="mama-direccion">
                Dirección: <span className="text-red-500">*</span>
              </Label>
              <Input 
                id="mama-direccion"
                value={data.mama?.direccion || ""}
                onChange={(e) => updateField('mama', 'direccion', e.target.value)}
                placeholder="Dirección completa"
                className={hasError('mama', 'direccion') ? 'border-red-500' : ''}
              />
              {hasError('mama', 'direccion') && (
                <p className="text-red-500 text-sm mt-1">{getError('mama', 'direccion')}</p>
              )}
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 5. Ciudad */}
            <div>
              <Label htmlFor="mama-ciudad">
                5. Ciudad: <span className="text-red-500">*</span>
              </Label>
              <Input 
                id="mama-ciudad"
                value={data.mama?.ciudad || ""}
                onChange={(e) => updateField('mama', 'ciudad', e.target.value)}
                placeholder="Ciudad"
                className={hasError('mama', 'ciudad') ? 'border-red-500' : ''}
              />
              {hasError('mama', 'ciudad') && (
                <p className="text-red-500 text-sm mt-1">{getError('mama', 'ciudad')}</p>
              )}
            </div>
            
            {/* 6. Teléfono */}
            <div>
              <Label htmlFor="mama-telefono">
                6. Teléfono: <span className="text-red-500">*</span>
              </Label>
              <Input 
                id="mama-telefono"
                value={data.mama?.telefono || ""}
                onChange={(e) => updateField('mama', 'telefono', e.target.value)}
                placeholder="Número de teléfono"
                className={hasError('mama', 'telefono') ? 'border-red-500' : ''}
              />
              {hasError('mama', 'telefono') && (
                <p className="text-red-500 text-sm mt-1">{getError('mama', 'telefono')}</p>
              )}
            </div>
            
            {/* 7. Email */}
            <div className="md:col-span-2">
              <Label htmlFor="mama-email">
                7. Email: <span className="text-red-500">*</span>
              </Label>
              <Input 
                id="mama-email"
                type="email"
                value={data.mama?.email || ""}
                onChange={(e) => updateField('mama', 'email', e.target.value)}
                placeholder="Correo electrónico"
                className={hasError('mama', 'email') ? 'border-red-500' : ''}
              />
              {hasError('mama', 'email') && (
                <p className="text-red-500 text-sm mt-1">{getError('mama', 'email')}</p>
              )}
            </div>
          </div>
          
          {/* 8. ¿Mamá trabaja fuera de casa? (OPTIONAL) */}
          <div>
            <Label>8. ¿Mamá trabaja fuera de casa? (OPTIONAL)</Label>
            <RadioGroup
              value={data.mama?.trabajaFueraCasa === true ? "si" : data.mama?.trabajaFueraCasa === false ? "no" : ""}
              onValueChange={(value) => updateField('mama', 'trabajaFueraCasa', value === 'si')}
            >
              <div className="flex gap-4 mt-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="si" id="mama-trabaja-si" />
                  <Label htmlFor="mama-trabaja-si">Sí</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="mama-trabaja-no" />
                  <Label htmlFor="mama-trabaja-no">No</Label>
                </div>
              </div>
            </RadioGroup>
          </div>
          
          {/* 9. ¿Puedes dormir en la noche cuando tu hijo(a) duerme? */}
          <div>
            <Label>9. ¿Puedes dormir en la noche cuando tu hijo(a) duerme?</Label>
            <RadioGroup
              value={data.mama?.puedeDormir === true ? "si" : data.mama?.puedeDormir === false ? "no" : ""}
              onValueChange={(value) => updateField('mama', 'puedeDormir', value === 'si')}
            >
              <div className="flex gap-4 mt-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="si" id="mama-dormir-si" />
                  <Label htmlFor="mama-dormir-si">Sí</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="mama-dormir-no" />
                  <Label htmlFor="mama-dormir-no">No</Label>
                </div>
              </div>
            </RadioGroup>
          </div>
          
          {/* 10. ¿Cómo es tu apetito? */}
          <div>
            <Label htmlFor="mama-apetito">
              10. ¿Cómo es tu apetito?
            </Label>
            <Textarea
              id="mama-apetito"
              value={data.mama?.apetito || ""}
              onChange={(e) => updateField('mama', 'apetito', e.target.value)}
              placeholder="Describe tu apetito..."
              rows={2}
            />
          </div>
          
          {/* 11. ¿Tienes pensamientos negativos que te generen miedo? */}
          <div>
            <Label>11. ¿Tienes pensamientos negativos que te generen miedo?</Label>
            <RadioGroup
              value={data.mama?.pensamientosNegativos === true ? "si" : data.mama?.pensamientosNegativos === false ? "no" : ""}
              onValueChange={(value) => updateField('mama', 'pensamientosNegativos', value === 'si')}
            >
              <div className="flex gap-4 mt-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="si" id="mama-pensamientos-si" />
                  <Label htmlFor="mama-pensamientos-si">Sí</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="mama-pensamientos-no" />
                  <Label htmlFor="mama-pensamientos-no">No</Label>
                </div>
              </div>
            </RadioGroup>
          </div>
          
          {/* 12. ¿Tienes o has tenido alguna alergia? */}
          <div>
            <Label>12. ¿Tienes o has tenido alguna alergia?</Label>
            <RadioGroup
              value={data.mama?.tieneAlergias === true ? "si" : data.mama?.tieneAlergias === false ? "no" : ""}
              onValueChange={(value) => updateField('mama', 'tieneAlergias', value === 'si')}
            >
              <div className="flex gap-4 mt-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="si" id="mama-alergias-si" />
                  <Label htmlFor="mama-alergias-si">Sí</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="mama-alergias-no" />
                  <Label htmlFor="mama-alergias-no">No</Label>
                </div>
              </div>
            </RadioGroup>
          </div>
        </div>
      )}
    </div>
  )
}