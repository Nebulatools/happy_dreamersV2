"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ChildAvatar } from "@/components/ui/child-avatar"
import {
  User,
  Calendar,
  FileText,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
} from "lucide-react"
import type { StatusLevel, Alert } from "@/lib/diagnostic/types"

// Props del componente
interface ProfileHeaderProps {
  child: {
    _id: string
    firstName: string
    lastName?: string
    birthDate?: string
  }
  plan?: {
    planId: string
    planVersion: string
    status: string
    startDate?: string
  }
  surveyDataAvailable: boolean
  criticalAlerts?: Alert[]
  overallStatus?: StatusLevel
}

// Helper para calcular edad en meses
function calculateAgeMonths(birthDate?: string): number {
  if (!birthDate) return 0
  try {
    const birth = new Date(birthDate)
    const now = new Date()
    const months = (now.getFullYear() - birth.getFullYear()) * 12 +
      (now.getMonth() - birth.getMonth())
    return Math.max(0, months)
  } catch {
    return 0
  }
}

// Helper para formatear edad
function formatAge(birthDate?: string): string {
  if (!birthDate) return "Edad no disponible"
  try {
    const birth = new Date(birthDate)
    const diffDays = Math.floor((Date.now() - birth.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays < 30) return `${diffDays} días`
    if (diffDays < 365) {
      const months = Math.floor(diffDays / 30)
      return `${months} ${months === 1 ? "mes" : "meses"}`
    }
    const years = Math.floor(diffDays / 365)
    const months = Math.floor((diffDays % 365) / 30)
    if (months > 0) {
      return `${years} ${years === 1 ? "año" : "años"} ${months} ${months === 1 ? "mes" : "meses"}`
    }
    return `${years} ${years === 1 ? "año" : "años"}`
  } catch {
    return "Edad no disponible"
  }
}

// Helper para formatear fecha del plan
function formatPlanDate(dateStr?: string): string {
  if (!dateStr) return ""
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString("es-MX", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  } catch {
    return ""
  }
}

// Componente de icono de status
function StatusIcon({ status, size = "md" }: { status: StatusLevel; size?: "sm" | "md" }) {
  const sizeClasses = size === "sm" ? "h-4 w-4" : "h-5 w-5"

  switch (status) {
    case "alert":
      return <AlertCircle className={`${sizeClasses} text-red-500`} />
    case "warning":
      return <AlertTriangle className={`${sizeClasses} text-yellow-500`} />
    case "ok":
    default:
      return <CheckCircle className={`${sizeClasses} text-green-500`} />
  }
}

// Componente de badge de status
function StatusBadge({ status }: { status: StatusLevel }) {
  const variants = {
    alert: "bg-red-100 text-red-700 hover:bg-red-100",
    warning: "bg-yellow-100 text-yellow-700 hover:bg-yellow-100",
    ok: "bg-green-100 text-green-700 hover:bg-green-100",
  }

  const labels = {
    alert: "Atención requerida",
    warning: "Revisar",
    ok: "Sin alertas",
  }

  return (
    <Badge className={variants[status]}>
      <StatusIcon status={status} size="sm" />
      <span className="ml-1">{labels[status]}</span>
    </Badge>
  )
}

export default function ProfileHeader({
  child,
  plan,
  surveyDataAvailable,
  criticalAlerts = [],
  overallStatus = "ok",
}: ProfileHeaderProps) {
  const fullName = `${child.firstName}${child.lastName ? ` ${child.lastName}` : ""}`
  const ageText = formatAge(child.birthDate)
  const ageMonths = calculateAgeMonths(child.birthDate)
  const hasCriticalAlerts = criticalAlerts.length > 0

  return (
    <Card className="bg-white shadow-sm border-0">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          {/* Seccion izquierda: Avatar y datos del nino */}
          <div className="flex items-start gap-4">
            <ChildAvatar
              name={fullName}
              className="h-14 w-14 sm:h-16 sm:w-16 flex-shrink-0"
            />
            <div className="space-y-1 min-w-0">
              <h2 className="text-xl sm:text-2xl font-semibold text-[#2F2F2F] truncate">
                {fullName}
              </h2>
              <div className="flex flex-wrap items-center gap-2 text-sm text-[#666666]">
                <span className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  {ageText}
                </span>
                {ageMonths > 0 && (
                  <span className="text-xs text-[#999999]">
                    ({ageMonths} meses)
                  </span>
                )}
              </div>
              {/* Indicador de survey */}
              <div className="flex items-center gap-1 text-xs">
                <FileText className="h-3.5 w-3.5" />
                <span className={surveyDataAvailable ? "text-green-600" : "text-yellow-600"}>
                  {surveyDataAvailable ? "Encuesta completada" : "Encuesta pendiente"}
                </span>
              </div>
            </div>
          </div>

          {/* Seccion derecha: Plan y status */}
          <div className="flex flex-col gap-2 sm:items-end">
            {/* Badge de status general */}
            <StatusBadge status={overallStatus} />

            {/* Info del plan */}
            {plan ? (
              <div className="flex items-center gap-2 text-sm text-[#666666]">
                <Calendar className="h-4 w-4" />
                <span>
                  Plan v{plan.planVersion}
                  {plan.startDate && (
                    <span className="text-xs ml-1">
                      (desde {formatPlanDate(plan.startDate)})
                    </span>
                  )}
                </span>
                <Badge
                  className={
                    plan.status === "active"
                      ? "bg-green-50 text-green-700"
                      : "bg-gray-100 text-gray-600"
                  }
                >
                  {plan.status === "active" ? "Activo" : plan.status}
                </Badge>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-yellow-600">
                <Calendar className="h-4 w-4" />
                <span>Sin plan activo</span>
              </div>
            )}
          </div>
        </div>

        {/* Alertas criticas (si existen) */}
        {hasCriticalAlerts && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium text-red-700">
                Alertas criticas ({criticalAlerts.length})
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {criticalAlerts.slice(0, 3).map((alert) => (
                <Badge
                  key={alert.id}
                  className="bg-red-50 text-red-700 text-xs font-normal"
                >
                  {alert.message}
                </Badge>
              ))}
              {criticalAlerts.length > 3 && (
                <Badge className="bg-red-50 text-red-600 text-xs font-normal">
                  +{criticalAlerts.length - 3} mas
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
