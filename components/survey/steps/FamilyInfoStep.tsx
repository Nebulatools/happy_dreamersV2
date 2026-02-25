// Paso 1: Información Familiar
// Componente modular y reutilizable para datos familiares

import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { Users } from "lucide-react"
import type { SurveyStepProps } from "../types/survey.types"

export function FamilyInfoStep({ data, onChange, errors = {}, context = {} }: SurveyStepProps) {
  const accountType: string = context?.accountType || data?.primaryCaregiver || ""
  const userPrefill = context?.userPrefill || {}

  const [activeTab, setActiveTab] = useState<"papa" | "mama">(() =>
    accountType === "mother" ? "mama" : "papa"
  )

  const updateParentFields = (parent: "papa" | "mama", fields: Record<string, any>) => {
    const currentPrimary = data?.primaryCaregiver || accountType || ""
    const resolvedPrimary = currentPrimary || (parent === "mama" ? "mother" : "father")

    onChange({
      ...data,
      [parent]: {
        ...data[parent],
        ...fields,
      },
      primaryCaregiver: resolvedPrimary,
    })
  }

  const updateField = (parent: "papa" | "mama", field: string, value: any) => {
    updateParentFields(parent, { [field]: value })
  }

  const [hasInjectedPrefill, setHasInjectedPrefill] = useState(false)

  useEffect(() => {
    setHasInjectedPrefill(false)
  }, [accountType])

  useEffect(() => {
    if (hasInjectedPrefill) return

    const targetParent: "papa" | "mama" | null = accountType === "mother"
      ? "mama"
      : accountType === "father"
        ? "papa"
        : null

    if (!targetParent) return

    const parentData = (data as any)?.[targetParent] || {}

    const namePrefill = typeof userPrefill?.name === "string" ? userPrefill.name.trim() : ""
    const phonePrefill = typeof userPrefill?.phone === "string" ? userPrefill.phone.trim() : ""
    const emailPrefill = typeof userPrefill?.email === "string" ? userPrefill.email.trim() : ""

    const updates: Record<string, string> = {}
    if (!parentData?.nombre && namePrefill) updates.nombre = namePrefill
    if (!parentData?.telefono && phonePrefill) updates.telefono = phonePrefill
    if (!parentData?.email && emailPrefill) updates.email = emailPrefill

    if (Object.keys(updates).length === 0) {
      setHasInjectedPrefill(true)
      return
    }

    onChange({
      ...data,
      [targetParent]: {
        ...parentData,
        ...updates,
      },
      primaryCaregiver: accountType || data?.primaryCaregiver || "",
    })

    setHasInjectedPrefill(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountType, userPrefill?.name, userPrefill?.phone, userPrefill?.email, data, hasInjectedPrefill])

  const getError = (parent: string, field: string): string | undefined => {
    const parentErrors = errors[parent] as any
    return parentErrors?.[field]
  }

  const hasError = (parent: string, field: string): boolean => {
    return !!getError(parent, field)
  }

  // Cambiar de pestaña automáticamente cuando la validación indique un campo con error en otra sección
  useEffect(() => {
    const handler = (e: any) => {
      const fieldPath: string | undefined = e?.detail?.fieldPath
      if (!fieldPath) return
      if (fieldPath.startsWith("mama.")) {
        setActiveTab("mama")
      } else if (fieldPath.startsWith("papa.")) {
        setActiveTab("papa")
      }

      // Intentar enfocar el campo una vez cambie la pestaña
      setTimeout(() => {
        const mappedId = fieldPath.replace(/\./g, "-")
        const el = document.getElementById(mappedId) as HTMLElement | null
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" })
          el.focus?.()
        }
      }, 120)
    }

    if (typeof window !== "undefined") {
      window.addEventListener("survey:focus-field", handler)
      return () => window.removeEventListener("survey:focus-field", handler)
    }
  }, [])

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
          onClick={() => setActiveTab("papa")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "papa"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-600 hover:text-gray-800"
          }`}
        >
          Sobre Papá
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("mama")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "mama"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-600 hover:text-gray-800"
          }`}
        >
          Sobre Mamá
        </button>
      </div>

      {/* Contenido según tab activa */}
      {activeTab === "papa" ? (
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
                onChange={(e) => updateField("papa", "nombre", e.target.value)}
                placeholder="Nombre del padre"
                className={hasError("papa", "nombre") ? "border-red-500" : ""}
              />
              {hasError("papa", "nombre") && (
                <p className="text-red-500 text-sm mt-1">{getError("papa", "nombre")}</p>
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
                onChange={(e) => updateField("papa", "edad", e.target.value)}
                onWheel={(e) => { e.currentTarget.blur() }}
                placeholder="Edad"
                className={hasError("papa", "edad") ? "border-red-500" : ""}
              />
              {hasError("papa", "edad") && (
                <p className="text-red-500 text-sm mt-1">{getError("papa", "edad")}</p>
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
                onChange={(e) => updateField("papa", "ocupacion", e.target.value)}
                placeholder="Ocupación del padre"
                className={hasError("papa", "ocupacion") ? "border-red-500" : ""}
              />
              {hasError("papa", "ocupacion") && (
                <p className="text-red-500 text-sm mt-1">{getError("papa", "ocupacion")}</p>
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
                onChange={(e) => updateField("papa", "direccion", e.target.value)}
                placeholder="Dirección completa"
                className={hasError("papa", "direccion") ? "border-red-500" : ""}
              />
              {hasError("papa", "direccion") && (
                <p className="text-red-500 text-sm mt-1">{getError("papa", "direccion")}</p>
              )}
            </div>
            
            {/* 5. Ciudad */}
            <div>
              <Label htmlFor="papa-ciudad">
                5. Ciudad
              </Label>
              <Input 
                id="papa-ciudad"
                value={data.papa?.ciudad || ""}
                onChange={(e) => updateField("papa", "ciudad", e.target.value)}
                placeholder="Ciudad"
              />
            </div>
            
            {/* 6. Teléfono */}
            <div>
              <Label htmlFor="papa-telefono">
                6. Teléfono
              </Label>
              <Input 
                id="papa-telefono"
                value={data.papa?.telefono || ""}
                onChange={(e) => updateField("papa", "telefono", e.target.value)}
                placeholder="Número de teléfono"
              />
            </div>
            
            {/* 7. Correo electrónico */}
            <div className="md:col-span-2">
              <Label htmlFor="papa-email">
                7. Correo electrónico: <span className="text-red-500">*</span>
              </Label>
              <Input 
                id="papa-email"
                type="email"
                value={data.papa?.email || ""}
                onChange={(e) => updateField("papa", "email", e.target.value)}
                placeholder="Correo electrónico"
                className={hasError("papa", "email") ? "border-red-500" : ""}
              />
              {hasError("papa", "email") && (
                <p className="text-red-500 text-sm mt-1">{getError("papa", "email")}</p>
              )}
            </div>
          </div>
          
          {/* 8. ¿Papá trabaja fuera de casa? */}
          <div>
            <Label>8. ¿Papá trabaja fuera de casa?</Label>
            <RadioGroup
              value={data.papa?.trabajaFueraCasa === true ? "si" : data.papa?.trabajaFueraCasa === false ? "no" : ""}
              onValueChange={(value) => {
                const worksOutside = value === "si"
                onChange({
                  ...data,
                  papa: {
                    ...data.papa,
                    trabajaFueraCasa: worksOutside,
                    horaRegresoTrabajo: worksOutside ? data.papa?.horaRegresoTrabajo || "" : "",
                  },
                })
              }}
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
            {data.papa?.trabajaFueraCasa && (
              <div className="mt-3 max-w-xs">
                <Label htmlFor="papa-hora-regreso" className="text-sm text-gray-600">
                  ¿A qué hora regresa de trabajar?
                </Label>
                <Input
                  id="papa-hora-regreso"
                  value={data.papa?.horaRegresoTrabajo || ""}
                  onChange={(e) =>
                    onChange({
                      ...data,
                      papa: {
                        ...data.papa,
                        horaRegresoTrabajo: e.target.value,
                      },
                    })
                  }
                  placeholder="Ej: 6:00 pm"
                  className="mt-1"
                />
              </div>
            )}
          </div>
          
          {/* 9. ¿Tiene o ha tenido alguna alergia? */}
          <div>
            <Label>9. ¿Tiene o ha tenido alguna alergia?</Label>
            <RadioGroup
              value={data.papa?.tieneAlergias === true ? "si" : data.papa?.tieneAlergias === false ? "no" : ""}
              onValueChange={(value) => {
                const hasAllergies = value === "si"
                onChange({
                  ...data,
                  papa: {
                    ...data.papa,
                    tieneAlergias: hasAllergies,
                    alergias: hasAllergies ? data.papa?.alergias || "" : "",
                  },
                })
              }}
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
            {data.papa?.tieneAlergias && (
              <div className="mt-3">
                <Label htmlFor="papa-alergias-detalle" className="text-sm text-gray-600">
                  Describe las alergias de papá
                </Label>
                <Input
                  id="papa-alergias-detalle"
                  value={data.papa?.alergias || ""}
                  onChange={(e) => updateField("papa", "alergias", e.target.value)}
                  placeholder="Ej: Alergia al polvo, lácteos..."
                  className={hasError("papa", "alergias") ? "border-red-500 mt-1" : "mt-1"}
                />
                {hasError("papa", "alergias") && (
                  <p className="text-red-500 text-sm mt-1">{getError("papa", "alergias")}</p>
                )}
              </div>
            )}
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
                onChange={(e) => updateField("mama", "nombre", e.target.value)}
                placeholder="Nombre de la madre"
                className={hasError("mama", "nombre") ? "border-red-500" : ""}
              />
              {hasError("mama", "nombre") && (
                <p className="text-red-500 text-sm mt-1">{getError("mama", "nombre")}</p>
              )}
            </div>
            
            {/* 2. Edad */}
            <div>
              <Label htmlFor="mama-edad">
                2. Edad
              </Label>
              <Input
                id="mama-edad"
                type="number"
                value={data.mama?.edad || ""}
                onChange={(e) => updateField("mama", "edad", e.target.value)}
                onWheel={(e) => { e.currentTarget.blur() }}
                placeholder="Edad (opcional)"
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
                onChange={(e) => updateField("mama", "ocupacion", e.target.value)}
                placeholder="Ocupación de la madre"
                className={hasError("mama", "ocupacion") ? "border-red-500" : ""}
              />
              {hasError("mama", "ocupacion") && (
                <p className="text-red-500 text-sm mt-1">{getError("mama", "ocupacion")}</p>
              )}
            </div>
          </div>
          
          {/* 4. ¿Tiene la misma dirección que papá? */}
          <div>
            <Label>4. ¿Tiene la misma dirección que papá?</Label>
            <RadioGroup
              value={data.mama?.mismaDireccionPapa === true ? "si" : data.mama?.mismaDireccionPapa === false ? "no" : ""}
              onValueChange={(value) => {
                const sameAddress = value === "si"
                updateParentFields("mama", {
                  mismaDireccionPapa: sameAddress,
                  direccion: sameAddress ? "" : data.mama?.direccion || "",
                  ciudad: sameAddress ? "" : data.mama?.ciudad || "",
                })
              }}
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
                onChange={(e) => updateField("mama", "direccion", e.target.value)}
                placeholder="Dirección completa"
                className={hasError("mama", "direccion") ? "border-red-500" : ""}
              />
              {hasError("mama", "direccion") && (
                <p className="text-red-500 text-sm mt-1">{getError("mama", "direccion")}</p>
              )}
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 5. Ciudad */}
            {!data.mama?.mismaDireccionPapa && (
              <div>
                <Label htmlFor="mama-ciudad">
                  5. Ciudad: <span className="text-red-500">*</span>
                </Label>
                <Input 
                  id="mama-ciudad"
                  value={data.mama?.ciudad || ""}
                  onChange={(e) => updateField("mama", "ciudad", e.target.value)}
                  placeholder="Ciudad"
                  className={hasError("mama", "ciudad") ? "border-red-500" : ""}
                />
                {hasError("mama", "ciudad") && (
                  <p className="text-red-500 text-sm mt-1">{getError("mama", "ciudad")}</p>
                )}
              </div>
            )}

            {/* 6. Teléfono */}
            <div>
              <Label htmlFor="mama-telefono">
                6. Teléfono: <span className="text-red-500">*</span>
              </Label>
              <Input 
                id="mama-telefono"
                value={data.mama?.telefono || ""}
                onChange={(e) => updateField("mama", "telefono", e.target.value)}
                placeholder="Número de teléfono"
                className={hasError("mama", "telefono") ? "border-red-500" : ""}
              />
              {hasError("mama", "telefono") && (
                <p className="text-red-500 text-sm mt-1">{getError("mama", "telefono")}</p>
              )}
            </div>
            
            {/* 7. Correo electrónico */}
            <div className="md:col-span-2">
              <Label htmlFor="mama-email">
                7. Correo electrónico: <span className="text-red-500">*</span>
              </Label>
              <Input 
                id="mama-email"
                type="email"
                value={data.mama?.email || ""}
                onChange={(e) => updateField("mama", "email", e.target.value)}
                placeholder="Correo electrónico"
                className={hasError("mama", "email") ? "border-red-500" : ""}
              />
              {hasError("mama", "email") && (
                <p className="text-red-500 text-sm mt-1">{getError("mama", "email")}</p>
              )}
            </div>
          </div>
          
          {/* 8. ¿Mamá trabaja fuera de casa? */}
          <div>
            <Label>8. ¿Mamá trabaja fuera de casa?</Label>
            <RadioGroup
              value={data.mama?.trabajaFueraCasa === true ? "si" : data.mama?.trabajaFueraCasa === false ? "no" : ""}
              onValueChange={(value) => updateField("mama", "trabajaFueraCasa", value === "si")}
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
              onValueChange={(value) => updateField("mama", "puedeDormir", value === "si")}
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
              onChange={(e) => updateField("mama", "apetito", e.target.value)}
              placeholder="Describe tu apetito..."
              rows={2}
            />
          </div>
          
          {/* 11. ¿Tienes pensamientos negativos que te generen miedo? */}
          <div>
            <Label>11. ¿Tienes pensamientos negativos que te generen miedo?</Label>
            <RadioGroup
              value={data.mama?.pensamientosNegativos === true ? "si" : data.mama?.pensamientosNegativos === false ? "no" : ""}
              onValueChange={(value) => {
                const hasNegativeThoughts = value === "si"
                onChange({
                  ...data,
                  mama: {
                    ...data.mama,
                    pensamientosNegativos: hasNegativeThoughts,
                    pensamientosNegativosDetalle: hasNegativeThoughts ? data.mama?.pensamientosNegativosDetalle || "" : "",
                  },
                })
              }}
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
            {data.mama?.pensamientosNegativos && (
              <div className="mt-3">
                <Label htmlFor="mama-pensamientos-detalle" className="text-sm text-gray-600">
                  Por favor, describe qué tipo de pensamientos negativos tienes
                </Label>
                <Textarea
                  id="mama-pensamientos-detalle"
                  value={data.mama?.pensamientosNegativosDetalle || ""}
                  onChange={(e) => updateField("mama", "pensamientosNegativosDetalle", e.target.value)}
                  placeholder="Describe los pensamientos negativos que te generan miedo..."
                  rows={3}
                  className="mt-1"
                />
              </div>
            )}
          </div>
          
          {/* 12. ¿Tienes o has tenido alguna alergia? */}
          <div>
            <Label>12. ¿Tienes o has tenido alguna alergia?</Label>
            <RadioGroup
              value={data.mama?.tieneAlergias === true ? "si" : data.mama?.tieneAlergias === false ? "no" : ""}
              onValueChange={(value) => {
                const hasAllergies = value === "si"
                onChange({
                  ...data,
                  mama: {
                    ...data.mama,
                    tieneAlergias: hasAllergies,
                    alergias: hasAllergies ? data.mama?.alergias || "" : "",
                  },
                })
              }}
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
            {data.mama?.tieneAlergias && (
              <div className="mt-3">
                <Label htmlFor="mama-alergias-detalle" className="text-sm text-gray-600">
                  Describe las alergias de mamá
                </Label>
                <Input
                  id="mama-alergias-detalle"
                  value={data.mama?.alergias || ""}
                  onChange={(e) => updateField("mama", "alergias", e.target.value)}
                  placeholder="Ej: Polen, mariscos..."
                  className={hasError("mama", "alergias") ? "border-red-500 mt-1" : "mt-1"}
                />
                {hasError("mama", "alergias") && (
                  <p className="text-red-500 text-sm mt-1">{getError("mama", "alergias")}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
