"use client"

import React, { createContext, useContext, useState, ReactNode } from 'react'

// Tipos para la configuración del header
export interface PageHeaderConfig {
  title: string
  subtitle?: string
  actions?: ReactNode // Para filtros, botones, etc.
  customContent?: ReactNode // Reemplaza TODO el contenido del header (admin desktop)
  showSearch?: boolean
  showChildSelector?: boolean
  showNotifications?: boolean
  /** Cambiar este valor fuerza re-evaluacion del customContent/actions */
  contentKey?: string
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

// Hook especifico para configurar el header de una pagina
// Usa useRef para ReactNode props (customContent, actions) que son objetos
// nuevos en cada render y causarian loop infinito en useEffect
export function usePageHeaderConfig(config: PageHeaderConfig) {
  const { setConfig, resetConfig } = usePageHeader()

  // Refs para props que son ReactNode (nuevos en cada render)
  const customContentRef = React.useRef(config.customContent)
  const actionsRef = React.useRef(config.actions)
  customContentRef.current = config.customContent
  actionsRef.current = config.actions

  // Re-ejecutar cuando cambian props primitivas o contentKey
  React.useEffect(() => {
    setConfig({
      title: config.title,
      subtitle: config.subtitle,
      showSearch: config.showSearch,
      showChildSelector: config.showChildSelector,
      showNotifications: config.showNotifications,
      contentKey: config.contentKey,
      actions: actionsRef.current,
      customContent: customContentRef.current,
    })

    return () => {
      resetConfig()
    }
    // Solo deps primitivas - ReactNode se lee de refs
    // contentKey permite forzar actualizacion cuando customContent cambia
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.title, config.subtitle, config.showSearch, config.showChildSelector, config.showNotifications, config.contentKey, setConfig, resetConfig])

  return { setConfig }
}