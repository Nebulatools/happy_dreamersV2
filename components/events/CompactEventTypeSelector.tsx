"use client"

import { useState } from "react"
import { Check, ChevronDown, Activity, Bed } from "lucide-react"
import { cn } from "@/lib/utils"
import { eventTypes } from "@/lib/event-types"

interface CompactEventTypeSelectorProps {
  value?: string
  onValueChange: (value: string) => void
}

const eventTypeColors = {
  sleep: "text-blue-600 bg-blue-50",
  nap: "text-orange-600 bg-orange-50",
  wake: "text-yellow-600 bg-yellow-50",
  night_waking: "text-red-600 bg-red-50",
  activity: "text-purple-600 bg-purple-50",
}

export function CompactEventTypeSelector({ value, onValueChange }: CompactEventTypeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const selectedType = eventTypes.find(type => type.id === value)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between px-3 py-2.5 bg-white border border-gray-200 rounded-lg",
          "hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1",
          !selectedType && "text-gray-500"
        )}
      >
        <div className="flex items-center gap-2">
          {selectedType ? (
            <>
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", eventTypeColors[selectedType.id as keyof typeof eventTypeColors])}>
                <selectedType.icon className="w-4 h-4" />
              </div>
              <span className="text-gray-900 font-medium">{selectedType.label}</span>
            </>
          ) : (
            <>
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                <Activity className="w-4 h-4 text-gray-400" />
              </div>
              <span>Tipo de evento</span>
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
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
            <div className="grid grid-cols-2 gap-1 p-1">
              {eventTypes.map((type) => {
                const Icon = type.icon
                const isSelected = value === type.id
                const typeColor = eventTypeColors[type.id as keyof typeof eventTypeColors]
                
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => {
                      onValueChange(type.id)
                      setIsOpen(false)
                    }}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-md transition-colors",
                      "hover:bg-gray-50",
                      isSelected && "bg-blue-50"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center",
                      isSelected ? "bg-blue-100 text-blue-600" : typeColor
                    )}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className={cn(
                      "text-sm font-medium",
                      isSelected ? "text-blue-900" : "text-gray-700"
                    )}>
                      {type.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}