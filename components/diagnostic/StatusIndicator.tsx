"use client"

import {
  CheckCircle,
  AlertTriangle,
  AlertCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { StatusLevel } from "@/lib/diagnostic/types"

// Tamanos disponibles para el indicador
type IndicatorSize = "xs" | "sm" | "md" | "lg" | "xl"

interface StatusIndicatorProps {
  status: StatusLevel
  showLabel?: boolean
  size?: IndicatorSize
  className?: string
}

// Mapeo de tamanos a clases de Tailwind
const sizeClasses: Record<IndicatorSize, string> = {
  xs: "h-3 w-3",
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
  xl: "h-8 w-8",
}

// Mapeo de tamanos para el texto del label
const labelSizeClasses: Record<IndicatorSize, string> = {
  xs: "text-xs",
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
  xl: "text-lg",
}

// Colores por status
const statusColors: Record<StatusLevel, { icon: string; label: string; bg: string }> = {
  ok: {
    icon: "text-green-500",
    label: "text-green-700",
    bg: "bg-green-100",
  },
  warning: {
    icon: "text-yellow-500",
    label: "text-yellow-700",
    bg: "bg-yellow-100",
  },
  alert: {
    icon: "text-red-500",
    label: "text-red-700",
    bg: "bg-red-100",
  },
}

// Labels en espanol
const statusLabels: Record<StatusLevel, string> = {
  ok: "OK",
  warning: "Revisar",
  alert: "Alerta",
}

/**
 * StatusIndicator - Componente de semaforo visual
 *
 * Muestra un icono de status (CheckCircle, AlertTriangle, AlertCircle)
 * con colores semanticos: verde (ok), amarillo (warning), rojo (alert)
 *
 * @example
 * // Solo icono
 * <StatusIndicator status="ok" />
 *
 * @example
 * // Con label
 * <StatusIndicator status="warning" showLabel />
 *
 * @example
 * // Con tamano personalizado
 * <StatusIndicator status="alert" size="lg" showLabel />
 */
export function StatusIndicator({
  status,
  showLabel = false,
  size = "md",
  className,
}: StatusIndicatorProps) {
  const iconClass = cn(sizeClasses[size], statusColors[status].icon)
  const labelClass = cn(labelSizeClasses[size], statusColors[status].label)

  const Icon = status === "ok"
    ? CheckCircle
    : status === "warning"
      ? AlertTriangle
      : AlertCircle

  if (showLabel) {
    return (
      <div className={cn("flex items-center gap-1.5", className)}>
        <Icon className={iconClass} />
        <span className={labelClass}>{statusLabels[status]}</span>
      </div>
    )
  }

  return <Icon className={cn(iconClass, className)} />
}

// Version con fondo circular (para usar en cards)
interface StatusBadgeProps {
  status: StatusLevel
  size?: IndicatorSize
  showLabel?: boolean
  className?: string
}

const badgeSizeClasses: Record<IndicatorSize, string> = {
  xs: "h-6 w-6",
  sm: "h-7 w-7",
  md: "h-8 w-8",
  lg: "h-10 w-10",
  xl: "h-12 w-12",
}

/**
 * StatusBadge - Indicador de status con fondo circular
 *
 * Version mas prominente del StatusIndicator, con fondo coloreado
 * circular. Util para destacar el status en cards o headers.
 *
 * @example
 * <StatusBadge status="ok" />
 */
export function StatusBadge({
  status,
  size = "md",
  className,
}: StatusBadgeProps) {
  const containerClass = cn(
    badgeSizeClasses[size],
    statusColors[status].bg,
    "rounded-full flex items-center justify-center",
    className
  )

  // El icono es un poco mas pequeno que el contenedor
  const iconSize: IndicatorSize = size === "xl"
    ? "lg"
    : size === "lg"
      ? "md"
      : size === "md"
        ? "sm"
        : "xs"

  return (
    <div className={containerClass}>
      <StatusIndicator status={status} size={iconSize} />
    </div>
  )
}

// Exportar tipos para uso externo
export type { StatusIndicatorProps, StatusBadgeProps, IndicatorSize }

export default StatusIndicator
