// Componente para alternar entre layout lateral y inferior del resumen
// Permite mejor aprovechamiento del espacio según preferencias del usuario

"use client"

import React from 'react'
import { 
  SidebarOpen, 
  ArrowDown,
  Monitor,
  Smartphone
} from "lucide-react"
import { cn } from '@/lib/utils'

export type LayoutMode = 'lateral' | 'bottom'

interface LayoutToggleProps {
  currentLayout: LayoutMode
  onLayoutChange: (layout: LayoutMode) => void
  className?: string
}

export function LayoutToggle({ 
  currentLayout, 
  onLayoutChange, 
  className 
}: LayoutToggleProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="text-sm font-medium text-gray-600 hidden md:inline">
        Layout:
      </span>
      
      <div className="flex bg-gray-100 rounded-lg p-1">
        {/* Botón Layout Lateral */}
        <button
          onClick={() => onLayoutChange('lateral')}
          className={cn(
            "layout-toggle-button px-3 py-2 text-sm font-medium flex items-center gap-2 rounded-md transition-all duration-200",
            currentLayout === 'lateral' 
              ? "layout-toggle-active shadow-sm" 
              : "hover:bg-white"
          )}
          title="Resumen lateral (mejor para pantallas anchas)"
        >
          <SidebarOpen className="w-4 h-4" />
          <span className="hidden sm:inline">Lateral</span>
        </button>
        
        {/* Botón Layout Inferior */}
        <button
          onClick={() => onLayoutChange('bottom')}
          className={cn(
            "layout-toggle-button px-3 py-2 text-sm font-medium flex items-center gap-2 rounded-md transition-all duration-200",
            currentLayout === 'bottom' 
              ? "layout-toggle-active shadow-sm" 
              : "hover:bg-white"
          )}
          title="Resumen inferior (mejor para pantallas pequeñas)"
        >
          <ArrowDown className="w-4 h-4" />
          <span className="hidden sm:inline">Inferior</span>
        </button>
      </div>
      
      {/* Indicador responsive */}
      <div className="hidden lg:flex items-center gap-1 text-xs text-gray-500">
        <Monitor className="w-3 h-3" />
        <span>Escritorio</span>
      </div>
      
      <div className="lg:hidden flex items-center gap-1 text-xs text-gray-500">
        <Smartphone className="w-3 h-3" />
        <span className="hidden sm:inline">Móvil</span>
      </div>
    </div>
  )
}

// Hook para manejar la preferencia de layout
export function useLayoutPreference(defaultLayout: LayoutMode = 'lateral') {
  const [layout, setLayout] = React.useState<LayoutMode>(defaultLayout)

  // Cargar preferencia guardada
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('calendar-layout-preference')
      if (saved === 'lateral' || saved === 'bottom') {
        setLayout(saved)
      }
    }
  }, [])

  // Guardar preferencia cuando cambia
  const handleLayoutChange = React.useCallback((newLayout: LayoutMode) => {
    setLayout(newLayout)
    if (typeof window !== 'undefined') {
      localStorage.setItem('calendar-layout-preference', newLayout)
    }
  }, [])

  return [layout, handleLayoutChange] as const
}

// Componente de indicador de layout recomendado
export function LayoutRecommendation({ 
  className 
}: { 
  className?: string 
}) {
  const [screenSize, setScreenSize] = React.useState<'mobile' | 'tablet' | 'desktop'>('desktop')

  React.useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth
      if (width < 768) {
        setScreenSize('mobile')
      } else if (width < 1024) {
        setScreenSize('tablet')
      } else {
        setScreenSize('desktop')
      }
    }

    updateScreenSize()
    window.addEventListener('resize', updateScreenSize)
    return () => window.removeEventListener('resize', updateScreenSize)
  }, [])

  const getRecommendation = () => {
    switch (screenSize) {
      case 'mobile':
        return {
          layout: 'bottom' as LayoutMode,
          reason: 'Mejor para pantallas pequeñas'
        }
      case 'tablet':
        return {
          layout: 'bottom' as LayoutMode,
          reason: 'Aprovecha mejor el espacio vertical'
        }
      case 'desktop':
        return {
          layout: 'lateral' as LayoutMode,
          reason: 'Aprovecha el espacio horizontal'
        }
    }
  }

  const recommendation = getRecommendation()

  return (
    <div className={cn(
      "text-xs text-gray-500 bg-blue-50 border border-blue-200 rounded-lg p-2",
      className
    )}>
      <div className="flex items-center gap-1">
        <span className="font-medium">Recomendado:</span>
        <span>{recommendation.layout === 'lateral' ? 'Lateral' : 'Inferior'}</span>
      </div>
      <div className="mt-1 opacity-75">{recommendation.reason}</div>
    </div>
  )
}