"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

interface DurationSliderProps {
  value: number
  onValueChange: (value: number) => void
}

export function DurationSlider({ value, onValueChange }: DurationSliderProps) {
  const [isDragging, setIsDragging] = useState(false)

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value)
    onValueChange(newValue)
  }

  const handleMouseDown = () => setIsDragging(true)
  const handleMouseUp = () => setIsDragging(false)

  return (
    <div className="space-y-4">
      {/* Slider */}
      <div className="relative">
        <input
          type="range"
          min="0"
          max="12"
          step="0.5"
          value={value}
          onChange={handleSliderChange}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchEnd={handleMouseUp}
          className={cn(
            "w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1",
            isDragging && "cursor-grabbing"
          )}
          style={{
            background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${(value / 12) * 100}%, #E5E7EB ${(value / 12) * 100}%, #E5E7EB 100%)`
          }}
        />
        
        {/* Slider thumb - styled with CSS */}
        <style jsx>{`
          input[type="range"]::-webkit-slider-thumb {
            appearance: none;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: linear-gradient(145deg, #60A5FA, #3B82F6);
            cursor: pointer;
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          }
          
          input[type="range"]::-moz-range-thumb {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: linear-gradient(145deg, #60A5FA, #3B82F6);
            cursor: pointer;
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          }
        `}</style>
      </div>

      {/* Value display and labels */}
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-500">0h</span>
        
        <div className="flex items-center gap-2">
          <div className="px-3 py-1 bg-gray-100 rounded-full">
            <span className="text-lg font-semibold text-gray-800">{value}h</span>
          </div>
        </div>
        
        <span className="text-sm text-gray-500">12h</span>
      </div>
    </div>
  )
}
