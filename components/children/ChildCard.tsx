// Componente de tarjeta para mostrar información de un niño
// Usado en la página de lista de niños del dashboard

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MoreVertical, Calendar, User, TrendingUp, Trash2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { calculateAge } from "@/lib/date-utils"
import type { Child } from "@/types/models"

interface ChildCardProps {
  child: Child
  onDelete: (child: Child) => void
}

export function ChildCard({ child, onDelete }: ChildCardProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  
  const age = child.birthDate ? calculateAge(child.birthDate) : 0
  const hasSurveyData = !!(child as any).surveyData
  
  const handleViewProfile = () => {
    setIsLoading(true)
    router.push(`/dashboard/children/${child._id}`)
  }
  
  return (
    <Card className="group hover:shadow-lg transition-all duration-200 border-gray-100">
      <CardHeader className="pb-4">
        <div className="flex justify-between items-start">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold text-lg shadow-md">
              {child.firstName?.charAt(0).toUpperCase() || "?"}
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900">
                {child.firstName} {child.lastName}
              </CardTitle>
              <CardDescription className="text-sm text-gray-500 mt-1">
                {age > 0 ? `${age} años` : "Edad no especificada"}
              </CardDescription>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                onClick={handleViewProfile}
                disabled={isLoading}
              >
                Ver perfil completo
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(child)}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="h-4 w-4" />
            <span>Registrado el {new Date(child.createdAt).toLocaleDateString()}</span>
          </div>
          <Badge 
            variant={hasSurveyData ? "default" : "secondary"}
            className={hasSurveyData ? "bg-green-100 text-green-800" : ""}
          >
            {hasSurveyData ? "Evaluación completa" : "Pendiente"}
          </Badge>
        </div>
        
        {hasSurveyData && (
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-600">
                {(child as any).surveyData?.habitosSueno?.horaDormir || "Sin datos"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-600">
                {(child as any).surveyData?.habitosSueno?.horaDespertar || "Sin datos"}
              </span>
            </div>
          </div>
        )}
        
        <Button 
          onClick={handleViewProfile}
          className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-sm"
          disabled={isLoading}
        >
          {isLoading ? "Cargando..." : "Ver perfil completo"}
        </Button>
      </CardContent>
    </Card>
  )
}