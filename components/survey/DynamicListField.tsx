// Componente generico reutilizable para listas dinamicas en el wizard de encuesta
// Permite agregar/eliminar items con un renderizado personalizado por item

"use client"

import { Button } from "@/components/ui/button"
import { Plus, X } from "lucide-react"

export interface DynamicListFieldProps<T> {
  items: T[]
  onChange: (items: T[]) => void
  maxItems: number
  renderItem: (item: T, index: number, onChange: (updated: T) => void) => React.ReactNode
  addLabel: string // Ej: "Agregar siesta"
  emptyMessage?: string // Ej: "No hay siestas registradas"
  createEmpty: () => T // Funcion factory para crear un item vacio
}

export function DynamicListField<T>({
  items: rawItems,
  onChange,
  maxItems,
  renderItem,
  addLabel,
  emptyMessage,
  createEmpty,
}: DynamicListFieldProps<T>) {
  // Validacion defensiva: datos existentes pueden ser null/undefined
  const items = Array.isArray(rawItems) ? rawItems : []

  const addItem = () => {
    if (items.length >= maxItems) return
    onChange([...items, createEmpty()])
  }

  const removeItem = (index: number) => {
    const updated = items.filter((_, i) => i !== index)
    onChange(updated)
  }

  const updateItem = (index: number, updated: T) => {
    const newItems = items.map((item, i) => (i === index ? updated : item))
    onChange(newItems)
  }

  return (
    <div className="space-y-3">
      {/* Lista de items */}
      {items.length === 0 && emptyMessage && (
        <p className="text-sm text-gray-400 italic">{emptyMessage}</p>
      )}

      {items.map((item, index) => (
        <div
          key={index}
          className="relative p-3 rounded-lg border border-gray-200 bg-gray-50 transition-opacity duration-200"
        >
          {/* Boton para eliminar */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => removeItem(index)}
            className="absolute top-2 right-2 h-6 w-6 text-red-400 hover:text-red-600 hover:bg-red-50"
          >
            <X className="w-3.5 h-3.5" />
          </Button>

          {/* Contenido del item renderizado por el caller */}
          <div className="pr-8">
            {renderItem(item, index, (updated) => updateItem(index, updated))}
          </div>
        </div>
      ))}

      {/* Boton para agregar y contador */}
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addItem}
          disabled={items.length >= maxItems}
          className="whitespace-nowrap"
        >
          <Plus className="w-4 h-4 mr-1" />
          {addLabel}
        </Button>

        {items.length > 0 && (
          <span className="text-xs text-gray-400">
            {items.length} de {maxItems}
          </span>
        )}
      </div>
    </div>
  )
}
