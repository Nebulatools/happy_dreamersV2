"use client"

import React, { createContext, useContext, useState, ReactNode } from 'react'

// Tipos para la configuración del header
export interface PageHeaderConfig {
  title: string
  subtitle?: string
  actions?: ReactNode // Para filtros, botones, etc.
  showSearch?: boolean
  showChildSelector?: boolean
  showNotifications?: boolean
}

// Contexto del header
interface PageHeaderContextType {
  config: PageHeaderConfig
  setConfig: (config: PageHeaderConfig) => void
  resetConfig: () => void
}

// Configuración por defecto
const defaultConfig: PageHeaderConfig = {
  title: "Dashboard",
  showSearch: false,
  showChildSelector: true,
  showNotifications: true
}

// Crear el contexto
const PageHeaderContext = createContext<PageHeaderContextType | undefined>(undefined)

// Provider del contexto
export function PageHeaderProvider({ children }: { children: ReactNode }) {
  const [config, setConfigState] = useState<PageHeaderConfig>(defaultConfig)

  const setConfig = React.useCallback((newConfig: PageHeaderConfig) => {
    setConfigState(newConfig)
  }, [])

  const resetConfig = React.useCallback(() => {
    setConfigState(defaultConfig)
  }, [])

  const contextValue = React.useMemo(() => ({
    config,
    setConfig,
    resetConfig
  }), [config, setConfig, resetConfig])

  return (
    <PageHeaderContext.Provider value={contextValue}>
      {children}
    </PageHeaderContext.Provider>
  )
}

// Hook personalizado para usar el contexto
export function usePageHeader() {
  const context = useContext(PageHeaderContext)
  if (context === undefined) {
    throw new Error('usePageHeader debe ser usado dentro de un PageHeaderProvider')
  }
  return context
}

// Hook específico para configurar el header de una página
export function usePageHeaderConfig(config: PageHeaderConfig) {
  const { setConfig, resetConfig } = usePageHeader()
  
  // Memoizar la configuración para evitar cambios innecesarios
  const memoizedConfig = React.useMemo(() => config, [
    config.title, 
    config.subtitle, 
    config.showSearch, 
    config.showChildSelector, 
    config.showNotifications,
    config.actions // incluir actions en la memoización
  ])

  React.useEffect(() => {
    setConfig(memoizedConfig)
    
    // Cleanup: resetear al desmontar el componente
    return () => {
      resetConfig()
    }
  }, [memoizedConfig, setConfig, resetConfig])

  return { setConfig }
}