// Componente Progress Bar personalizado según diseño de Figma

"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface ProgressBarProps {
  value: number
  max?: number
  className?: string
  showLabel?: boolean
  labelFormat?: (value: number, max: number) => string
  gradient?: boolean
}

const ProgressBar = React.forwardRef<HTMLDivElement, ProgressBarProps>(
  ({ value, max = 100, className, showLabel = false, labelFormat, gradient = true }, ref) => {
    const percentage = Math.min(Math.max(0, (value / max) * 100), 100)
    
    const defaultLabelFormat = (val: number, maximum: number) => `${val} de ${maximum}`
    const formatLabel = labelFormat || defaultLabelFormat

    return (
      <div className={cn("space-y-2", className)} ref={ref}>
        {showLabel && (
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">
              {formatLabel(value, max)}
            </span>
            <span className="text-sm text-gray-500">{Math.round(percentage)}%</span>
          </div>
        )}
        <div className="relative w-full h-2.5 bg-gray-200 rounded-full overflow-hidden shadow-inner">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500 ease-out",
              gradient 
                ? "bg-gradient-to-r from-[#628BE6] to-[#67C5FF]" 
                : "bg-blue-500"
            )}
            style={{ width: `${percentage}%` }}
          >
            {gradient && (
              <div className="absolute inset-0 bg-white/20 animate-pulse" />
            )}
          </div>
        </div>
      </div>
    )
  }
)
ProgressBar.displayName = "ProgressBar"

export { ProgressBar }