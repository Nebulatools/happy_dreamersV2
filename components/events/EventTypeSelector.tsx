"use client"

import { useState } from "react"
import { Check, ChevronDown, Moon, Sun, Activity, Coffee } from "lucide-react"
import { cn } from "@/lib/utils"

interface EventTypeSelectorProps {
  value?: string
  onValueChange: (value: string) => void
}

const eventTypes = [
  {
    id: "sleep",
    label: "Noche completa",
    icon: Moon,
    description: "Período de sueño nocturno",
  },
  {
    id: "nap", 
    label: "Siesta",
    icon: Sun,
    description: "Período de descanso diurno",
  },
  {
    id: "wake",
    label: "Despertar",
    icon: Sun,
    description: "Momento de despertar",
  },
  {
    id: "activity",
    label: "Actividad",
    icon: Activity,
    description: "Actividad física o juego",
  },
]

export function EventTypeSelector({ value, onValueChange }: EventTypeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  
  const selectedType = eventTypes.find(type => type.id === value)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between px-3 py-3 bg-white border border-gray-200 rounded-xl",
          "hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1",
          !selectedType && "text-gray-500"
        )}
      >
        <div className="flex items-center gap-3">
          {selectedType ? (
            <>
              <div className="flex items-center justify-center w-8 h-8 bg-blue-50 rounded-lg">
                <selectedType.icon className="w-4 h-4 text-blue-600" />
              </div>
              <span className="text-gray-900 font-medium">{selectedType.label}</span>
            </>
          ) : (
            <>
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                <Activity className="w-4 h-4 text-gray-400" />
              </div>
              <span>Selecciona un tipo de evento</span>
            </>
          )}
        </div>
        <ChevronDown className={cn(
          "w-4 h-4 text-gray-400 transition-transform",
          isOpen && "transform rotate-180"
        )} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 max-h-60 overflow-auto">
            {eventTypes.map((type) => {
              const Icon = type.icon
              const isSelected = value === type.id
              
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => {
                    onValueChange(type.id)
                    setIsOpen(false)
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-gray-50",
                    "first:rounded-t-xl last:rounded-b-xl",
                    isSelected && "bg-blue-50"
                  )}
                >
                  <div className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-lg",
                    isSelected ? "bg-blue-100" : "bg-gray-100"
                  )}>
                    <Icon className={cn(
                      "w-4 h-4",
                      isSelected ? "text-blue-600" : "text-gray-500"
                    )} />
                  </div>
                  <div className="flex-1">
                    <div className={cn(
                      "font-medium",
                      isSelected ? "text-blue-900" : "text-gray-900"
                    )}>
                      {type.label}
                    </div>
                    <div className="text-sm text-gray-500">
                      {type.description}
                    </div>
                  </div>
                  {isSelected && (
                    <Check className="w-4 h-4 text-blue-600" />
                  )}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
