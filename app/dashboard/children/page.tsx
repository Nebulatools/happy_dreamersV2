"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Plus, Edit2, Trash2 } from "lucide-react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

interface Child {
  _id: string
  firstName: string
  lastName?: string
  birthDate: string
  notes?: string
  createdAt: string
  updatedAt: string
}

// Colores para los avatares de los niños
const avatarColors = [
  { bg: "bg-pink-100", text: "text-pink-600", avatar: "bg-pink-200" },
  { bg: "bg-blue-100", text: "text-blue-600", avatar: "bg-blue-200" },
  { bg: "bg-green-100", text: "text-green-600", avatar: "bg-green-200" },
  { bg: "bg-orange-100", text: "text-orange-600", avatar: "bg-orange-200" },
  { bg: "bg-purple-100", text: "text-purple-600", avatar: "bg-purple-200" },
  { bg: "bg-yellow-100", text: "text-yellow-600", avatar: "bg-yellow-200" },
]

function calculateAge(birthDate: string): number {
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const monthDifference = today.getMonth() - birth.getMonth()
  
  if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  
  return age
}

export default function MisSonadoresPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [children, setChildren] = useState<Child[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchChildren()
  }, [])

  const fetchChildren = async () => {
    try {
      const response = await fetch('/api/children')
      if (response.ok) {
        const data = await response.json()
        setChildren(data)
      } else {
        toast.error('Error al cargar los soñadores')
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al cargar los soñadores')
    } finally {
      setLoading(false)
    }
  }

  const deleteChild = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este soñador?')) {
      return
    }

    try {
      const response = await fetch(`/api/children/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Soñador eliminado correctamente')
        fetchChildren()
      } else {
        toast.error('Error al eliminar el soñador')
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al eliminar el soñador')
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-blue-50/30 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-gray-900">Mis Soñadores</h1>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="text-blue-600 hover:bg-blue-50">
              Ayuda
            </Button>
            <Button variant="ghost" size="sm" className="text-blue-600 hover:bg-blue-50">
              Contacto
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-gray-600">
            Gestiona los perfiles de tus niños para un seguimiento personalizado
          </p>
          <Button 
            onClick={() => router.push('/dashboard/children/new')}
            className="bg-gradient-to-r from-blue-500 to-blue-400 hover:from-blue-600 hover:to-blue-500 text-white font-medium px-6 py-2.5 rounded-xl shadow-sm transition-all duration-200"
          >
            <Plus className="h-4 w-4 mr-2" />
            Añadir Soñador
          </Button>
        </div>
      </div>

      {/* Children Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {children.map((child, index) => {
          const colorScheme = avatarColors[index % avatarColors.length]
          const age = calculateAge(child.birthDate)
          const lastSurvey = new Date(child.updatedAt).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          })

          return (
            <Card 
              key={child._id} 
              className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-all duration-200 border-0 overflow-hidden cursor-pointer group"
              onClick={() => router.push(`/dashboard/children/${child._id}`)}
            >
              <div className="p-6">
                {/* Header with Avatar and Name */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-14 h-14 ${colorScheme.avatar} rounded-full flex items-center justify-center`}>
                      <span className={`text-xl font-semibold ${colorScheme.text}`}>
                        {child.firstName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {child.firstName} {child.lastName || ''}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {age} años
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/dashboard/children/${child._id}/edit`)
                      }}
                      className="h-8 w-8 p-0 rounded-full hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Edit2 className="h-4 w-4 text-gray-600" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteChild(child._id)
                      }}
                      className="h-8 w-8 p-0 rounded-full hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>

                {/* Survey Info */}
                <div className="border-t pt-4">
                  <p className="text-sm text-blue-600">
                    Última encuesta: {lastSurvey}
                  </p>
                </div>
              </div>
            </Card>
          )
        })}

        {/* Add New Child Card */}
        <Card 
          className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-all duration-200 border-2 border-dashed border-blue-300 hover:border-blue-400 cursor-pointer group"
          onClick={() => router.push('/dashboard/children/new')}
        >
          <div className="p-6 h-full flex flex-col items-center justify-center text-center min-h-[200px]">
            <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
              <Plus className="h-6 w-6 text-blue-600" />
            </div>
            <p className="text-base font-medium text-blue-600 mb-1">
              Añadir Nuevo Soñador
            </p>
            <p className="text-sm text-gray-500">
              Crear un perfil para un nuevo niño
            </p>
          </div>
        </Card>
      </div>

      {/* Empty State */}
      {children.length === 0 && (
        <div className="text-center py-12">
          <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Plus className="h-10 w-10 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No hay soñadores registrados
          </h3>
          <p className="text-gray-600 mb-6">
            Comienza agregando el primer perfil de tu pequeño soñador
          </p>
          <Button 
            onClick={() => router.push('/dashboard/children/new')}
            className="bg-gradient-to-r from-blue-500 to-blue-400 hover:from-blue-600 hover:to-blue-500 text-white font-medium px-6 py-2.5 rounded-xl shadow-sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Añadir Primer Soñador
          </Button>
        </div>
      )}
    </div>
  )
}
