// Componente para capturar información de hermanos
// Usado en FamilyDynamicsStep para el perfil del niño

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Trash2, Users } from "lucide-react"
import { differenceInYears, differenceInMonths, parseISO, isValid } from "date-fns"

export interface SiblingInfo {
  nombre: string
  fechaNacimiento: string
  edad: number
  esElQueNecesitaAyuda: boolean
}

interface SiblingsListProps {
  value: SiblingInfo[]
  onChange: (siblings: SiblingInfo[]) => void
  childName?: string // Nombre del niño principal para identificarlo
}

// Calcula la edad en años y meses desde una fecha de nacimiento
function calculateAge(fechaNacimiento: string): number {
  if (!fechaNacimiento) return 0

  const birthDate = parseISO(fechaNacimiento)
  if (!isValid(birthDate)) return 0

  const now = new Date()
  const years = differenceInYears(now, birthDate)

  // Si es menor de 1 año, devolver en fracciones (meses/12)
  if (years < 1) {
    const months = differenceInMonths(now, birthDate)
    return Math.round(months / 12 * 10) / 10 // Redondear a 1 decimal
  }

  return years
}

// Formatea la edad para mostrar
function formatAge(fechaNacimiento: string): string {
  if (!fechaNacimiento) return "-"

  const birthDate = parseISO(fechaNacimiento)
  if (!isValid(birthDate)) return "-"

  const now = new Date()
  const years = differenceInYears(now, birthDate)
  const totalMonths = differenceInMonths(now, birthDate)

  if (years < 1) {
    return `${totalMonths} ${totalMonths === 1 ? "mes" : "meses"}`
  }

  return `${years} ${years === 1 ? "año" : "años"}`
}

export function SiblingsList({ value: rawValue, onChange, childName }: SiblingsListProps) {
  // Validacion defensiva: surveys existentes pueden tener hijosInfo como null/undefined
  const value = Array.isArray(rawValue) ? rawValue : []
  const [newSibling, setNewSibling] = useState<Partial<SiblingInfo>>({
    nombre: "",
    fechaNacimiento: "",
    esElQueNecesitaAyuda: false
  })

  const addSibling = () => {
    if (!newSibling.nombre || !newSibling.fechaNacimiento) return

    const sibling: SiblingInfo = {
      nombre: newSibling.nombre,
      fechaNacimiento: newSibling.fechaNacimiento,
      edad: calculateAge(newSibling.fechaNacimiento),
      esElQueNecesitaAyuda: newSibling.esElQueNecesitaAyuda || false
    }

    onChange([...value, sibling])
    setNewSibling({ nombre: "", fechaNacimiento: "", esElQueNecesitaAyuda: false })
  }

  const removeSibling = (index: number) => {
    const updated = value.filter((_, i) => i !== index)
    onChange(updated)
  }

  const updateSibling = (index: number, field: keyof SiblingInfo, fieldValue: any) => {
    const updated = value.map((sibling, i) => {
      if (i !== index) return sibling

      const newSibling = { ...sibling, [field]: fieldValue }

      // Recalcular edad si cambia la fecha de nacimiento
      if (field === "fechaNacimiento") {
        newSibling.edad = calculateAge(fieldValue)
      }

      return newSibling
    })
    onChange(updated)
  }

  const toggleNeedsHelp = (index: number) => {
    // Solo uno puede ser el que necesita ayuda
    const updated = value.map((sibling, i) => ({
      ...sibling,
      esElQueNecesitaAyuda: i === index ? !sibling.esElQueNecesitaAyuda : false
    }))
    onChange(updated)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4 text-gray-500" />
        <Label className="font-medium">Hermanos</Label>
      </div>

      <p className="text-sm text-gray-500">
        Agrega los hermanos del niño. La edad se calcula automáticamente desde la fecha de nacimiento.
      </p>

      {/* Lista de hermanos existentes */}
      {value.length > 0 && (
        <div className="space-y-3">
          {value.map((sibling, index) => (
            <div
              key={index}
              className={`flex items-center gap-3 p-3 rounded-lg border ${
                sibling.esElQueNecesitaAyuda
                  ? "border-blue-300 bg-blue-50"
                  : "border-gray-200 bg-gray-50"
              }`}
            >
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input
                  value={sibling.nombre}
                  onChange={(e) => updateSibling(index, "nombre", e.target.value)}
                  placeholder="Nombre"
                  className="bg-white"
                />
                <Input
                  type="date"
                  value={sibling.fechaNacimiento}
                  onChange={(e) => updateSibling(index, "fechaNacimiento", e.target.value)}
                  className="bg-white"
                />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {formatAge(sibling.fechaNacimiento)}
                  </span>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`needs-help-${index}`}
                      checked={sibling.esElQueNecesitaAyuda}
                      onCheckedChange={() => toggleNeedsHelp(index)}
                    />
                    <Label
                      htmlFor={`needs-help-${index}`}
                      className="text-xs text-gray-600 cursor-pointer"
                    >
                      Necesita ayuda
                    </Label>
                  </div>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeSibling(index)}
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Formulario para agregar nuevo hermano */}
      <div className="flex items-end gap-3 p-3 rounded-lg border border-dashed border-gray-300 bg-gray-50">
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="new-sibling-name" className="text-xs text-gray-500">
              Nombre del hermano
            </Label>
            <Input
              id="new-sibling-name"
              value={newSibling.nombre || ""}
              onChange={(e) => setNewSibling({ ...newSibling, nombre: e.target.value })}
              placeholder="Nombre"
              className="bg-white mt-1"
            />
          </div>
          <div>
            <Label htmlFor="new-sibling-birth" className="text-xs text-gray-500">
              Fecha de nacimiento
            </Label>
            <Input
              id="new-sibling-birth"
              type="date"
              value={newSibling.fechaNacimiento || ""}
              onChange={(e) => setNewSibling({ ...newSibling, fechaNacimiento: e.target.value })}
              className="bg-white mt-1"
            />
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addSibling}
          disabled={!newSibling.nombre || !newSibling.fechaNacimiento}
          className="whitespace-nowrap"
        >
          <Plus className="w-4 h-4 mr-1" />
          Agregar
        </Button>
      </div>

      {value.length > 0 && (
        <p className="text-xs text-gray-400">
          Total: {value.length} {value.length === 1 ? "hermano" : "hermanos"}
        </p>
      )}
    </div>
  )
}
