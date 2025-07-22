// Componente Time Picker personalizado según diseño de Figma

"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface TimeOption {
  value: string
  label: string
}

interface TimePickerProps {
  value?: string
  onChange?: (value: string) => void
  options: TimeOption[]
  className?: string
  label?: string
  description?: string
}

const TimePicker = React.forwardRef<HTMLDivElement, TimePickerProps>(
  ({ value, onChange, options, className, label, description }, ref) => {
    return (
      <div ref={ref} className={cn("space-y-4", className)}>
        {label && (
          <div className="space-y-1">
            <h3 className="text-xl font-semibold text-[#2F2F2F]">{label}</h3>
            {description && (
              <p className="text-sm text-[#666666]">{description}</p>
            )}
          </div>
        )}
        
        <div className="flex flex-wrap gap-2">
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => onChange?.(option.value)}
              className={cn(
                "px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200",
                "border-2",
                value === option.value
                  ? "border-[#4A90E2] bg-[#4A90E2]/10 text-[#4A90E2]"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    )
  }
)
TimePicker.displayName = "TimePicker"

export { TimePicker }