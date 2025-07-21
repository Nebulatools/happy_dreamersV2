"use client"

import { cn } from "@/lib/utils"

interface EmotionalStateSelectorProps {
  value?: string
  onValueChange: (value: string) => void
}

const emotionalStates = [
  {
    id: "calm",
    label: "Tranquilo",
    emoji: "😊",
    color: "bg-green-50 border-green-200 text-green-700",
    selectedColor: "bg-green-100 border-green-300"
  },
  {
    id: "restless", 
    label: "Inquieto",
    emoji: "😕",
    color: "bg-yellow-50 border-yellow-200 text-yellow-700",
    selectedColor: "bg-yellow-100 border-yellow-300"
  },
  {
    id: "agitated",
    label: "Alterado", 
    emoji: "😣",
    color: "bg-red-50 border-red-200 text-red-700",
    selectedColor: "bg-red-100 border-red-300"
  }
]

export function EmotionalStateSelector({ value, onValueChange }: EmotionalStateSelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {emotionalStates.map((state) => {
        const isSelected = value === state.id
        
        return (
          <button
            key={state.id}
            type="button"
            onClick={() => onValueChange(state.id)}
            className={cn(
              "flex flex-col items-center gap-2 p-3 border rounded-xl transition-all",
              "hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1",
              isSelected ? state.selectedColor : state.color
            )}
          >
            <span className="text-2xl">{state.emoji}</span>
            <span className="text-sm font-medium text-center">{state.label}</span>
          </button>
        )
      })}
    </div>
  )
}
