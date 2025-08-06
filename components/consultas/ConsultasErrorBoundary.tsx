// Error Boundary específico para el módulo de consultas
// Captura errores y permite recuperación sin perder el trabajo

"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { createLogger } from '@/lib/logger'

const logger = createLogger('ConsultasErrorBoundary')

interface Props {
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

export class ConsultasErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): State {
    // Actualizar el estado para que el siguiente renderizado muestre la UI de error
    return { hasError: true, error, errorInfo: null }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log del error para análisis
    logger.error('Error capturado en ConsultasErrorBoundary:', {
      error: error.toString(),
      stack: error.stack,
      componentStack: errorInfo.componentStack
    })
    
    // Actualizar el estado con información detallada
    this.setState({
      error,
      errorInfo
    })
  }

  handleReset = () => {
    // Resetear el estado de error
    this.setState({ hasError: false, error: null, errorInfo: null })
    
    // Opcionalmente, recargar la página si es necesario
    // window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      // UI de fallback cuando hay un error
      if (this.props.fallback) {
        return <>{this.props.fallback}</>
      }

      return (
        <div className="container py-8">
          <Card className="max-w-2xl mx-auto border-destructive">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                Error en el Módulo de Consultas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-destructive/10 p-4 rounded-lg">
                <p className="text-sm font-medium mb-2">
                  Ha ocurrido un error inesperado. Tu trabajo ha sido guardado.
                </p>
                <p className="text-sm text-muted-foreground">
                  {this.state.error?.message || 'Error desconocido'}
                </p>
              </div>
              
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Puedes intentar:
                </p>
                <ul className="text-sm space-y-1 ml-4 list-disc text-muted-foreground">
                  <li>Hacer clic en "Reintentar" para volver al estado anterior</li>
                  <li>Navegar a otra sección y volver</li>
                  <li>Recargar la página si el problema persiste</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <Button 
                  onClick={this.handleReset}
                  variant="default"
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reintentar
                </Button>
                <Button 
                  onClick={() => window.location.reload()}
                  variant="outline"
                >
                  Recargar Página
                </Button>
              </div>

              {/* Información de debug en desarrollo */}
              {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                <details className="mt-4">
                  <summary className="text-xs text-muted-foreground cursor-pointer">
                    Detalles técnicos (desarrollo)
                  </summary>
                  <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-h-40">
                    {this.state.error?.stack}
                  </pre>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}