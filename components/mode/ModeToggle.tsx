"use client"

import React from 'react'
import { Zap, Settings, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useModeContext } from '@/context/mode-context'
import { ModeToggleProps } from '@/types/mode-system'

/**
 * Componente toggle para alternar entre modo simple y avanzado
 * Diseño inspirado en toggles de calidad enterprise con accesibilidad completa
 */
export function ModeToggle({ 
  size = 'md',
  showLabels = true,
  showTooltips = true,
  className 
}: ModeToggleProps) {
  const { mode, toggleMode, setMode, isTransitioning } = useModeContext()

  // Configuración de tamaños
  const sizeConfig = {
    sm: {
      container: 'p-0.5',
      button: 'px-3 py-1.5 text-sm',
      icon: 'w-3 h-3'
    },
    md: {
      container: 'p-1',
      button: 'px-4 py-2 text-sm',
      icon: 'w-4 h-4'
    },
    lg: {
      container: 'p-1.5',
      button: 'px-6 py-3 text-base',
      icon: 'w-5 h-5'
    }
  }

  const config = sizeConfig[size]

  const handleModeChange = async (newMode: 'simple' | 'advanced') => {
    if (isTransitioning || mode === newMode) return
    await setMode(newMode)
  }

  const getTooltipContent = (targetMode: 'simple' | 'advanced') => {
    if (!showTooltips) return undefined
    
    return targetMode === 'simple' 
      ? 'Registro rápido con 1 click. Usa valores predeterminados inteligentes.'
      : 'Registro detallado con modales. Control completo de todos los campos.'
  }

  return (
    <div 
      className={cn(
        "flex items-center justify-center mb-4",
        className
      )}
      role="group"
      aria-label="Modo de registro de eventos"
    >
      <div 
        className={cn(
          "bg-gray-100 rounded-lg flex items-center space-x-1 transition-all duration-200",
          config.container
        )}
      >
        {/* Botón Modo Simple */}
        <button
          onClick={() => handleModeChange('simple')}
          disabled={isTransitioning}
          className={cn(
            "flex items-center rounded-md font-medium transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            config.button,
            mode === 'simple' 
              ? "bg-white text-green-600 shadow-sm ring-1 ring-green-200" 
              : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
          )}
          aria-pressed={mode === 'simple'}
          aria-describedby={showTooltips ? 'tooltip-simple' : undefined}
          title={getTooltipContent('simple')}
        >
          {isTransitioning && mode === 'simple' ? (
            <Loader2 className={cn(config.icon, "mr-2 animate-spin")} />
          ) : (
            <Zap className={cn(config.icon, "mr-2")} />
          )}
          
          {showLabels && (
            <span>Rápido</span>
          )}
        </button>

        {/* Botón Modo Avanzado */}
        <button
          onClick={() => handleModeChange('advanced')}
          disabled={isTransitioning}
          className={cn(
            "flex items-center rounded-md font-medium transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            config.button,
            mode === 'advanced' 
              ? "bg-white text-blue-600 shadow-sm ring-1 ring-blue-200" 
              : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
          )}
          aria-pressed={mode === 'advanced'}
          aria-describedby={showTooltips ? 'tooltip-advanced' : undefined}
          title={getTooltipContent('advanced')}
        >
          {isTransitioning && mode === 'advanced' ? (
            <Loader2 className={cn(config.icon, "mr-2 animate-spin")} />
          ) : (
            <Settings className={cn(config.icon, "mr-2")} />
          )}
          
          {showLabels && (
            <span>Detallado</span>
          )}
        </button>
      </div>

      {/* Indicador de estado actual (accesibilidad) */}
      <div className="sr-only" aria-live="polite">
        Modo actual: {mode === 'simple' ? 'Rápido' : 'Detallado'}
        {isTransitioning && ' - Cambiando modo...'}
      </div>

      {/* Tooltips informativos (si están habilitados) */}
      {showTooltips && (
        <>
          <div id="tooltip-simple" className="sr-only">
            Modo rápido: Registra eventos con 1 click usando valores predeterminados inteligentes
          </div>
          <div id="tooltip-advanced" className="sr-only">
            Modo detallado: Control completo con modales para especificar todos los detalles
          </div>
        </>
      )}
    </div>
  )
}

/**
 * Variante compacta del toggle para espacios reducidos
 */
export function ModeToggleCompact() {
  return (
    <ModeToggle 
      size="sm" 
      showLabels={false} 
      showTooltips={true}
      className="mb-2"
    />
  )
}

/**
 * Header informativo que explica el modo actual
 */
export function ModeHeader() {
  const { mode, preferences } = useModeContext()
  
  if (!preferences.showModeTips) return null
  
  return (
    <div className={cn(
      "p-3 rounded-lg text-sm mb-4 transition-all duration-200",
      mode === 'simple' 
        ? "bg-green-50 text-green-800 border border-green-200"
        : "bg-blue-50 text-blue-800 border border-blue-200"
    )}>
      <div className="flex items-center">
        {mode === 'simple' ? (
          <Zap className="w-4 h-4 mr-2 text-green-600" />
        ) : (
          <Settings className="w-4 h-4 mr-2 text-blue-600" />
        )}
        
        <div>
          <span className="font-medium">
            {mode === 'simple' ? 'Modo Rápido' : 'Modo Detallado'}
          </span>
          <p className="text-xs mt-1 opacity-80">
            {mode === 'simple' 
              ? 'Registro de eventos con 1 click usando valores predeterminados inteligentes'
              : 'Control completo con modales para especificar todos los detalles del evento'
            }
          </p>
        </div>
      </div>
    </div>
  )
}