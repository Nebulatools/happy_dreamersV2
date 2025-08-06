// Componente base para todos los gráficos - elimina duplicación de código
// Maneja estados de carga, error y wrapper consistente

"use client"

import React, { ReactNode } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, AlertCircle, LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { colors, spacing, typography, animations, happyDreamersTokens, getChartColor } from "@/lib/design-system"

interface BaseChartProps {
  title: string
  description?: string
  icon?: LucideIcon
  iconColor?: string
  loading?: boolean
  error?: string | boolean
  children: ReactNode
  height?: number | string
  className?: string
  // Para gráficos que no usan Card
  noCard?: boolean
  // Para personalizar el mensaje de carga
  loadingMessage?: string
  // Para personalizar el mensaje de error
  errorMessage?: string
  // Para cuando no hay datos
  noData?: boolean
  noDataMessage?: string
}

// Skeleton de carga para gráficos
export function ChartSkeleton({ height = 300 }: { height?: number | string }) {
  const heightValue = typeof height === 'number' ? `${height}px` : height
  
  return (
    <div 
      className="animate-pulse bg-gray-100 rounded-lg flex items-center justify-center"
      style={{ height: heightValue }}
    >
      <div className="flex flex-col items-center space-y-2">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <p className="text-sm text-gray-500">Cargando datos...</p>
      </div>
    </div>
  )
}

// Componente de error para gráficos
export function ChartError({ 
  message = "Error al cargar datos", 
  height = 300 
}: { 
  message?: string
  height?: number | string 
}) {
  const heightValue = typeof height === 'number' ? `${height}px` : height
  
  return (
    <div 
      className="bg-red-50 rounded-lg flex items-center justify-center border border-red-200"
      style={{ height: heightValue }}
    >
      <div className="flex flex-col items-center space-y-2">
        <AlertCircle className="h-8 w-8 text-red-500" />
        <p className="text-sm text-red-600">{message}</p>
      </div>
    </div>
  )
}

// Componente de no data
export function ChartNoData({ 
  message = "No hay datos disponibles", 
  height = 300 
}: { 
  message?: string
  height?: number | string 
}) {
  const heightValue = typeof height === 'number' ? `${height}px` : height
  
  return (
    <div 
      className="bg-gray-50 rounded-lg flex items-center justify-center border border-gray-200"
      style={{ height: heightValue }}
    >
      <div className="flex flex-col items-center space-y-2 text-gray-500">
        <svg
          className="h-8 w-8"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
        <p className="text-sm">{message}</p>
      </div>
    </div>
  )
}

// Componente base principal
export function BaseChart({
  title,
  description,
  icon: Icon,
  iconColor = `text-[${colors.brand.mediumBlue}]`,
  loading = false,
  error = false,
  children,
  height = 300,
  className,
  noCard = false,
  loadingMessage = "Cargando datos...",
  errorMessage = "Error al cargar datos",
  noData = false,
  noDataMessage = "No hay datos disponibles",
}: BaseChartProps) {
  // Si está cargando
  if (loading) {
    if (noCard) {
      return <ChartSkeleton height={height} />
    }
    
    return (
      <Card className={cn("", className)}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{title}</CardTitle>
              {description && <CardDescription>{description}</CardDescription>}
            </div>
            {Icon && <Icon className={cn("h-5 w-5", iconColor)} />}
          </div>
        </CardHeader>
        <CardContent>
          <ChartSkeleton height={height} />
        </CardContent>
      </Card>
    )
  }

  // Si hay error
  if (error) {
    const errorMsg = typeof error === 'string' ? error : errorMessage
    
    if (noCard) {
      return <ChartError message={errorMsg} height={height} />
    }
    
    return (
      <Card className={cn("", className)}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{title}</CardTitle>
              {description && <CardDescription>{description}</CardDescription>}
            </div>
            {Icon && <Icon className={cn("h-5 w-5", iconColor)} />}
          </div>
        </CardHeader>
        <CardContent>
          <ChartError message={errorMsg} height={height} />
        </CardContent>
      </Card>
    )
  }

  // Si no hay datos
  if (noData) {
    if (noCard) {
      return <ChartNoData message={noDataMessage} height={height} />
    }
    
    return (
      <Card className={cn("", className)}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{title}</CardTitle>
              {description && <CardDescription>{description}</CardDescription>}
            </div>
            {Icon && <Icon className={cn("h-5 w-5", iconColor)} />}
          </div>
        </CardHeader>
        <CardContent>
          <ChartNoData message={noDataMessage} height={height} />
        </CardContent>
      </Card>
    )
  }

  // Render normal con datos
  if (noCard) {
    return <>{children}</>
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {Icon && <Icon className={cn("h-5 w-5", iconColor)} />}
        </div>
      </CardHeader>
      <CardContent>
        <div style={{ height: typeof height === 'number' ? `${height}px` : height }}>
          {children}
        </div>
      </CardContent>
    </Card>
  )
}

// Constantes de diseño para gráficos - Migrado al sistema de diseño
export const CHART_COLORS = {
  primary: colors.brand.mediumBlue,
  primaryLight: colors.brand.lightBlue,
  secondary: colors.chart.tertiary,
  secondaryLight: '#FFDD85',
  success: colors.status.success,
  warning: colors.status.warning,
  danger: colors.status.error,
  info: colors.status.info,
  purple: colors.chart.primary,
  pink: '#F472B6',
  gray: colors.gray[400],
  // Paleta para múltiples series - usa la función getChartColor
  palette: [
    colors.chart.primary,
    colors.chart.secondary,
    colors.chart.tertiary,
    colors.chart.quaternary,
    colors.chart.quinary,
    colors.chart.senary,
    colors.brand.mediumBlue,
    colors.brand.lightBlue,
  ]
}

// Dimensiones estándar - Usa las del sistema de diseño
export const CHART_DIMENSIONS = happyDreamersTokens.chartDimensions

// Configuración común para Recharts - Usa el sistema de diseño
export const CHART_CONFIG = {
  margin: { 
    top: parseInt(spacing[1]), 
    right: parseInt(spacing[2.5]), 
    left: parseInt(spacing[2.5]), 
    bottom: parseInt(spacing[1]) 
  },
  animationDuration: parseInt(animations.duration[1000]),
  strokeWidth: 2,
  fontSize: parseInt(typography.fontSize.xs[0]),
  fontFamily: typography.fontFamily.sans.join(', '),
}

// Utilidad para formatear valores en gráficos
export function formatChartValue(value: number, type: 'hours' | 'minutes' | 'count' | 'percentage' = 'count'): string {
  switch (type) {
    case 'hours':
      return `${value.toFixed(1)}h`
    case 'minutes':
      return `${Math.round(value)}min`
    case 'percentage':
      return `${Math.round(value)}%`
    case 'count':
    default:
      return value.toString()
  }
}

// Hook para datos de gráfico con estado
export function useChartState<T>(
  fetchData: () => Promise<T>
): {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
} {
  const [data, setData] = React.useState<T | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await fetchData()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [fetchData])

  React.useEffect(() => {
    loadData()
  }, [loadData])

  return {
    data,
    loading,
    error,
    refetch: loadData,
  }
}

export default BaseChart