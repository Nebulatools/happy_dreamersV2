// Error Boundary para prevenir crashes de la aplicación
// Captura errores en el árbol de componentes y muestra UI de fallback

"use client"

import React, { Component, ErrorInfo, ReactNode } from "react"
import { AlertTriangle, RefreshCw, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createLogger } from "@/lib/logger"
import Link from "next/link"

const logger = createLogger("ErrorBoundary")

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  // Para identificar el contexto del error
  context?: string
  // Si debe mostrar detalles técnicos (solo en desarrollo)
  showDetails?: boolean
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  errorCount: number
}

// Componente de fallback por defecto
export function ErrorFallback({ 
  error, 
  resetError, 
  context = "aplicación",
  showDetails = false, 
}: { 
  error?: Error | null
  resetError?: () => void
  context?: string
  showDetails?: boolean
}) {
  return (
    <div className="min-h-[400px] flex items-center justify-center p-4">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-red-100 p-3 rounded-full">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </div>
          <CardTitle className="text-2xl text-gray-900">
            ¡Ups! Algo salió mal
          </CardTitle>
          <CardDescription className="text-base mt-2">
            Ha ocurrido un error inesperado en la {context}. 
            Por favor, intenta recargar la página o volver al inicio.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Mostrar detalles del error solo en desarrollo */}
          {showDetails && error && process.env.NODE_ENV === "development" && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-700 mb-2">
                Detalles del error (solo visible en desarrollo):
              </p>
              <code className="text-xs text-red-600 block overflow-auto">
                {error.message}
              </code>
              {error.stack && (
                <details className="mt-2">
                  <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                    Ver stack trace
                  </summary>
                  <pre className="text-xs text-gray-600 mt-2 overflow-auto max-h-40">
                    {error.stack}
                  </pre>
                </details>
              )}
            </div>
          )}
          
          {/* Acciones disponibles */}
          <div className="flex flex-col sm:flex-row gap-3">
            {resetError && (
              <Button 
                onClick={resetError}
                variant="default"
                className="flex-1"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Intentar de nuevo
              </Button>
            )}
            
            <Button 
              variant="outline"
              className="flex-1"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Recargar página
            </Button>
            
            <Link href="/dashboard" className="flex-1">
              <Button variant="outline" className="w-full">
                <Home className="h-4 w-4 mr-2" />
                Ir al inicio
              </Button>
            </Link>
          </div>
          
          {/* Mensaje de ayuda */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>¿Necesitas ayuda?</strong> Si el problema persiste, 
              por favor contacta al soporte técnico o intenta más tarde.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Clase Error Boundary
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Actualizar el estado para que el siguiente renderizado muestre la UI de fallback
    return { 
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, context = "Unknown" } = this.props
    
    // Log del error para servicios de monitoreo
    logger.error("Component error caught", {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
      errorInfo: {
        componentStack: errorInfo.componentStack,
      },
      context,
    })
    
    // Incrementar contador de errores
    this.setState(prevState => ({
      errorInfo,
      errorCount: prevState.errorCount + 1,
    }))
    
    // Callback personalizado si se proporciona
    if (onError) {
      onError(error, errorInfo)
    }
    
    // En producción, aquí enviaríamos a un servicio de monitoreo como Sentry
    if (process.env.NODE_ENV === "production") {
      // TODO: Integrar con servicio de monitoreo
      // Sentry.captureException(error, { contexts: { react: errorInfo } })
    }
  }

  resetErrorBoundary = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  componentDidUpdate(prevProps: Props) {
    // Resetear el error si los children cambian (navegación, etc)
    if (prevProps.children !== this.props.children && this.state.hasError) {
      this.resetErrorBoundary()
    }
  }

  render() {
    const { hasError, error, errorCount } = this.state
    const { children, fallback, context, showDetails } = this.props
    
    // Si hay demasiados errores consecutivos, mostrar un mensaje especial
    if (errorCount > 3) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-4">
          <Card className="max-w-lg w-full border-red-200">
            <CardHeader className="text-center">
              <CardTitle className="text-xl text-red-600">
                Múltiples errores detectados
              </CardTitle>
              <CardDescription>
                La aplicación está experimentando problemas técnicos. 
                Por favor, recarga la página completa.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => window.location.reload()}
                className="w-full"
                variant="destructive"
              >
                Recargar aplicación
              </Button>
            </CardContent>
          </Card>
        </div>
      )
    }
    
    if (hasError) {
      // Si se proporciona un fallback personalizado, usarlo
      if (fallback) {
        return <>{fallback}</>
      }
      
      // Usar el fallback por defecto
      return (
        <ErrorFallback 
          error={error} 
          resetError={this.resetErrorBoundary}
          context={context}
          showDetails={showDetails}
        />
      )
    }

    return children
  }
}

// Hook para usar Error Boundary de forma declarativa
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null)
  
  React.useEffect(() => {
    if (error) {
      throw error
    }
  }, [error])
  
  const resetError = React.useCallback(() => {
    setError(null)
  }, [])
  
  const captureError = React.useCallback((error: Error) => {
    setError(error)
  }, [])
  
  return { captureError, resetError }
}

// HOC para envolver componentes con Error Boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, "children">
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}

export default ErrorBoundary