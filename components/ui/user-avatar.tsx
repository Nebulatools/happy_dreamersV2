import React from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

interface UserAvatarProps {
  name?: string | null
  image?: string | null
  className?: string
  fallbackClassName?: string
}

export function UserAvatar({ name, image, className, fallbackClassName }: UserAvatarProps) {
  // Generar iniciales del nombre
  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U"
    const parts = name.trim().split(" ")
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase()
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  // Generar color basado en el nombre (determinístico)
  const getColorFromName = (name: string | null | undefined) => {
    if (!name) return "bg-gray-500"
    
    const colors = [
      "bg-[#2553A1]",
      "bg-[#628BE6]",
      "bg-[#3FA796]",
      "bg-[#4A90E2]",
      "bg-[#2F80ED]",
      "bg-[#1D4ED8]",
      "bg-[#0F6CBD]",
      "bg-[#2C6FCF]",
      "bg-[#1C4E80]",
      "bg-[#3F74DA]"
    ]
    
    // Usar la suma de los códigos de caracteres para seleccionar un color
    const charSum = name.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0)
    return colors[charSum % colors.length]
  }

  const initials = getInitials(name)
  const bgColor = getColorFromName(name)

  return (
    <Avatar className={className}>
      {image && <AvatarImage src={image} alt={name || "Usuario"} />}
      <AvatarFallback className={cn(`text-white font-medium ${bgColor}`, fallbackClassName)}>
        {initials}
      </AvatarFallback>
    </Avatar>
  )
}
