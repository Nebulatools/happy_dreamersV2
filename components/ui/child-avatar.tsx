import React from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface ChildAvatarProps {
  name?: string
  image?: string | null
  className?: string
}

export function ChildAvatar({ name, image, className }: ChildAvatarProps) {
  // Generar iniciales del nombre
  const getInitials = (name: string | undefined) => {
    if (!name) return "N"
    const parts = name.trim().split(" ")
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase()
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  // Generar color basado en el nombre (determinístico) - colores más suaves para niños
  const getColorFromName = (name: string | undefined) => {
    if (!name) return "bg-purple-400"
    
    const colors = [
      "bg-blue-400",
      "bg-green-400",
      "bg-yellow-400",
      "bg-purple-400",
      "bg-pink-400",
      "bg-indigo-400",
      "bg-red-400",
      "bg-orange-400",
      "bg-teal-400",
      "bg-cyan-400"
    ]
    
    // Usar la suma de los códigos de caracteres para seleccionar un color
    const charSum = name.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0)
    return colors[charSum % colors.length]
  }

  const initials = getInitials(name)
  const bgColor = getColorFromName(name)

  return (
    <Avatar className={className}>
      {image && <AvatarImage src={image} alt={name || "Niño"} />}
      <AvatarFallback className={`text-white font-medium ${bgColor}`}>
        {initials}
      </AvatarFallback>
    </Avatar>
  )
}