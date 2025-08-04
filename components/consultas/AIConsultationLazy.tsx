// Componente lazy para consultas con AI - carga solo cuando se necesita
// Reduce el bundle inicial significativamente

"use client"

import React, { Suspense, lazy } from 'react'
import { Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

// Lazy load del componente de consultas AI
const AIConsultation = lazy(() => import('./AIConsultation'))

// Componente de carga mientras se descarga el módulo
function AILoadingFallback() {
  return (
    <Card className="w-full">
      <CardContent className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-12 w-12 animate-spin text-[#628BE6] mb-4" />
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          Cargando Asistente AI
        </h3>
        <p className="text-sm text-gray-600 text-center max-w-md">
          Estamos preparando el asistente inteligente de sueño infantil. 
          Esto puede tomar unos segundos la primera vez...
        </p>
        <div className="mt-6 flex items-center space-x-2">
          <div className="h-2 w-2 bg-[#628BE6] rounded-full animate-pulse" />
          <div className="h-2 w-2 bg-[#628BE6] rounded-full animate-pulse delay-75" />
          <div className="h-2 w-2 bg-[#628BE6] rounded-full animate-pulse delay-150" />
        </div>
      </CardContent>
    </Card>
  )
}

// Error boundary específico para AI
class AIErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log para monitoreo
    console.error('Error cargando módulo AI:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="w-full border-red-200">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="bg-red-100 p-3 rounded-full mb-4">
              <svg
                className="h-8 w-8 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Error al cargar el Asistente AI
            </h3>
            <p className="text-sm text-gray-600 text-center max-w-md mb-4">
              No se pudo cargar el módulo de inteligencia artificial. 
              Por favor, recarga la página o intenta más tarde.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-[#628BE6] text-white rounded-lg hover:bg-[#5279d4] transition-colors"
            >
              Recargar página
            </button>
          </CardContent>
        </Card>
      )
    }

    return this.props.children
  }
}

// Props del componente wrapper
interface AIConsultationLazyProps {
  childId?: string
  className?: string
  // Cualquier otra prop que necesite el componente original
  [key: string]: any
}

// Componente wrapper con lazy loading
export default function AIConsultationLazy(props: AIConsultationLazyProps) {
  const [shouldLoad, setShouldLoad] = React.useState(false)

  // Cargar el componente cuando sea visible o después de un delay
  React.useEffect(() => {
    // Opción 1: Cargar después de que la página principal esté lista
    const timer = setTimeout(() => {
      setShouldLoad(true)
    }, 100) // Pequeño delay para priorizar el contenido principal

    // Opción 2: Cargar cuando el componente sea visible (Intersection Observer)
    // Útil si el componente está más abajo en la página
    /*
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setShouldLoad(true)
        }
      },
      { threshold: 0.1 }
    )

    const element = document.getElementById('ai-consultation-container')
    if (element) {
      observer.observe(element)
    }

    return () => {
      clearTimeout(timer)
      if (element) {
        observer.unobserve(element)
      }
    }
    */

    return () => clearTimeout(timer)
  }, [])

  if (!shouldLoad) {
    // Mostrar un placeholder mínimo antes de cargar
    return (
      <div id="ai-consultation-container" className="min-h-[400px] flex items-center justify-center">
        <div className="text-gray-400">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <AIErrorBoundary>
      <Suspense fallback={<AILoadingFallback />}>
        <AIConsultation {...props} />
      </Suspense>
    </AIErrorBoundary>
  )
}

// Hook para pre-cargar el módulo AI cuando sea conveniente
export function usePreloadAI() {
  React.useEffect(() => {
    // Pre-cargar el módulo después de que la página esté idle
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        import('./AIConsultation')
      })
    } else {
      // Fallback para navegadores que no soportan requestIdleCallback
      setTimeout(() => {
        import('./AIConsultation')
      }, 2000)
    }
  }, [])
}

// Componente para pre-cargar AI en background (útil en páginas anteriores)
export function AIPreloader() {
  usePreloadAI()
  return null
}