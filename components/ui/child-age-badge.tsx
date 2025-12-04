// Componente global para mostrar la edad del niño en todas las pantallas
// Requerimiento de la Dra. Mariana: edad siempre visible

"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Baby, Calendar } from "lucide-react"
import { calculateAgeFormatted } from "@/lib/date-utils"
import { useActiveChild } from "@/context/active-child-context"
import { createLogger } from "@/lib/logger"

const logger = createLogger("ChildAgeBadge")

interface ChildAgeBadgeProps {
  // Opcionalmente se puede pasar birthDate directamente
  birthDate?: string
  // O usar el contexto del niño activo
  useContext?: boolean
  // Variante de estilo
  variant?: "default" | "outline" | "secondary" | "destructive"
  // Tamaño
  size?: "sm" | "md" | "lg"
  // Mostrar icono
  showIcon?: boolean
  // Clase CSS adicional
  className?: string
}

export function ChildAgeBadge({
  birthDate,
  useContext = true,
  variant = "secondary",
  size = "md",
  showIcon = true,
  className = "",
}: ChildAgeBadgeProps) {
  const { activeChildId, activeUserId } = useActiveChild()
  const [childBirthDate, setChildBirthDate] = useState<string | null>(birthDate || null)
  const [loading, setLoading] = useState(false)

  // Si usamos contexto y no tenemos birthDate, buscar los datos del niño
  useEffect(() => {
    if (useContext && !birthDate && activeChildId && activeUserId) {
      fetchChildData()
    }
  }, [activeChildId, activeUserId, useContext, birthDate])

  const fetchChildData = async () => {
    if (!activeChildId || !activeUserId) return

    try {
      setLoading(true)
      // Primero intentar obtener del localStorage si existe
      const cachedData = localStorage.getItem(`child-${activeChildId}-data`)
      if (cachedData) {
        const child = JSON.parse(cachedData)
        if (child.birthDate) {
          setChildBirthDate(child.birthDate)
          return
        }
      }

      // Si no está en cache, buscar en la API
      // Usar el endpoint que ya funciona para obtener todos los niños del usuario
      const response = await fetch(`/api/children?userId=${activeUserId}`)
      if (response.ok) {
        const data = await response.json()
        const children = Array.isArray(data) ? data : (data?.children || data?.data?.children || [])
        const child = children.find((c: any) => c._id === activeChildId)
        
        if (child && child.birthDate) {
          setChildBirthDate(child.birthDate)
          // Guardar en cache para futuras referencias
          localStorage.setItem(`child-${activeChildId}-data`, JSON.stringify(child))
        }
      }
    } catch (error) {
      logger.error("Error fetching child data:", error)
    } finally {
      setLoading(false)
    }
  }

  // Si no hay fecha de nacimiento, no mostrar nada
  if (!childBirthDate && !birthDate) {
    return null
  }

  const dateToUse = birthDate || childBirthDate
  if (!dateToUse) return null

  // Calcular la edad formateada
  const age = calculateAgeFormatted(dateToUse)

  // Determinar el tamaño del texto y padding según el prop size
  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-1",
    lg: "text-base px-3 py-1.5",
  }

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-4 h-4", 
    lg: "w-5 h-5",
  }

  return (
    <Badge 
      variant={variant}
      className={`${sizeClasses[size]} flex items-center gap-1.5 font-medium ${className}`}
    >
      {showIcon && (
        <Baby className={iconSizes[size]} />
      )}
      <span>{loading ? "..." : age}</span>
    </Badge>
  )
}

// Componente simplificado para usar solo con contexto
export function ChildAgeFromContext({ className = "" }: { className?: string }) {
  return <ChildAgeBadge useContext={true} className={className} />
}