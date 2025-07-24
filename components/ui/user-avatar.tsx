import React from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface UserAvatarProps {
  name?: string | null
  image?: string | null
  className?: string
}

export function UserAvatar({ name, image, className }: UserAvatarProps) {
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
      "bg-blue-500",
      "bg-green-500",
      "bg-yellow-500",
      "bg-purple-500",
      "bg-pink-500",
      "bg-indigo-500",
      "bg-red-500",
      "bg-orange-500",
      "bg-teal-500",
      "bg-cyan-500"
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
      <AvatarFallback className={`text-white font-medium ${bgColor}`}>
        {initials}
      </AvatarFallback>
    </Avatar>
  )
}