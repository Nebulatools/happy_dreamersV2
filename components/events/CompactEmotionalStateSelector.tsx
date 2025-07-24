"use client"

import { cn } from "@/lib/utils"
import { Smile } from "lucide-react"

interface CompactEmotionalStateSelectorProps {
  value?: string
  onValueChange: (value: string) => void
}

const emotionalStates = [
  {
    id: "calm",
    label: "Tranquilo",
    emoji: "😊",
    color: "bg-green-50 hover:bg-green-100 border-green-200",
  },
  {
    id: "restless", 
    label: "Inquieto",
    emoji: "😕",
    color: "bg-yellow-50 hover:bg-yellow-100 border-yellow-200",
  },
  {
    id: "agitated",
    label: "Alterado", 
    emoji: "😣",
    color: "bg-red-50 hover:bg-red-100 border-red-200",
  },
]

export function CompactEmotionalStateSelector({ value, onValueChange }: CompactEmotionalStateSelectorProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <Smile className="w-4 h-4" />
        Estado Emocional
      </div>
      
      <div className="flex gap-2">
        {emotionalStates.map((state) => {
          const isSelected = value === state.id
          
          return (
            <button
              key={state.id}
              type="button"
              onClick={() => onValueChange(state.id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-3 py-2 border rounded-lg transition-all",
                "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1",
                isSelected 
                  ? "bg-blue-50 border-blue-300 shadow-sm" 
                  : state.color
              )}
            >
              <span className="text-lg">{state.emoji}</span>
              <span className={cn(
                "text-sm font-medium",
                isSelected ? "text-blue-700" : "text-gray-700"
              )}>
                {state.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}