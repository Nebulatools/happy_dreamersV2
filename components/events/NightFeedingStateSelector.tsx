"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Moon, Eye, Utensils } from "lucide-react"

interface NightFeedingStateSelectorProps {
  value?: string
  onChange: (value: string) => void
}

export function NightFeedingStateSelector({ value, onChange }: NightFeedingStateSelectorProps) {
  const feedingStates = [
    {
      id: "dormido",
      label: "Dormido",
      description: "El niño fue alimentado sin despertarse completamente",
      icon: <Moon className="w-5 h-5" />,
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200",
      textColor: "text-purple-700",
      badgeColor: "bg-purple-100 text-purple-800",
    },
    {
      id: "despierto", 
      label: "Despierto",
      description: "El niño se despertó completamente para la alimentación",
      icon: <Eye className="w-5 h-5" />,
      bgColor: "bg-orange-50",
      borderColor: "border-orange-200", 
      textColor: "text-orange-700",
      badgeColor: "bg-orange-100 text-orange-800",
    },
  ]

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <Utensils className="w-4 h-4 text-blue-600" />
        <span className="text-sm font-medium text-gray-700">
          Estado durante la alimentación
        </span>
      </div>
      
      <div className="grid grid-cols-1 gap-3">
        {feedingStates.map((state) => {
          const isSelected = value === state.id
          
          return (
            <Card
              key={state.id}
              className={`
                cursor-pointer transition-all duration-200 hover:shadow-md
                ${isSelected 
                  ? `${state.borderColor} border-2 ${state.bgColor} shadow-sm` 
                  : 'border-gray-200 hover:border-gray-300'
                }
              `}
              onClick={() => onChange(state.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`
                      p-2 rounded-full ${isSelected ? state.bgColor : 'bg-gray-100'}
                    `}>
                      <div className={isSelected ? state.textColor : 'text-gray-500'}>
                        {state.icon}
                      </div>
                    </div>
                    
                    <div>
                      <p className={`font-medium ${isSelected ? state.textColor : 'text-gray-700'}`}>
                        {state.label}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {state.description}
                      </p>
                    </div>
                  </div>
                  
                  {isSelected && (
                    <Badge className={state.badgeColor}>
                      Seleccionado
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
      
      {value && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
          <p className="text-sm text-blue-700">
            <strong>Importancia clínica:</strong> La diferencia entre alimentación dormido vs despierto 
            es crucial para el análisis del patrón de sueño y las recomendaciones de la Dra. Mariana.
          </p>
        </div>
      )}
    </div>
  )
}