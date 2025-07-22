// Componente Duration Slider personalizado según diseño de Figma

"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"
import { cn } from "@/lib/utils"

interface DurationSliderProps {
  value?: number[]
  onValueChange?: (value: number[]) => void
  max?: number
  min?: number
  step?: number
  className?: string
  showLabels?: boolean
  formatLabel?: (value: number) => string
}

const DurationSlider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  DurationSliderProps
>(({
  value,
  onValueChange,
  max = 12,
  min = 0,
  step = 0.5,
  className,
  showLabels = true,
  formatLabel,
  ...props
}, ref) => {
  const defaultFormatLabel = (val: number) => {
    const hours = Math.floor(val)
    const minutes = (val % 1) * 60
    if (minutes === 0) {
      return `${hours}h`
    }
    return `${hours}h ${minutes}min`
  }

  const format = formatLabel || defaultFormatLabel
  const currentValue = value?.[0] || 0

  return (
    <div className={cn("space-y-2", className)}>
      {showLabels && (
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700">Duración</span>
          <span className="text-sm font-semibold text-[#628BE6]">
            {format(currentValue)}
          </span>
        </div>
      )}
      <SliderPrimitive.Root
        ref={ref}
        value={value}
        onValueChange={onValueChange}
        max={max}
        min={min}
        step={step}
        className="relative flex w-full touch-none select-none items-center"
        {...props}
      >
        <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-gray-200">
          <SliderPrimitive.Range className="absolute h-full bg-gradient-to-r from-[#628BE6] to-[#67C5FF]" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-white bg-gradient-to-r from-[#628BE6] to-[#67C5FF] shadow-lg ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" />
      </SliderPrimitive.Root>
      {showLabels && (
        <div className="flex justify-between text-xs text-gray-500">
          <span>{format(min)}</span>
          <span>{format(max)}</span>
        </div>
      )}
    </div>
  )
})
DurationSlider.displayName = "DurationSlider"

export { DurationSlider }