"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, Camera, Save, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"

import { createLogger } from "@/lib/logger"

const logger = createLogger("page")


interface Child {
  _id: string
  firstName: string
  lastName: string
  birthDate: string
  gender: string
}

export default function EditChildProfilePage() {
  const router = useRouter()
  const params = useParams()
  const childId = params.id as string
  const { toast } = useToast()
  
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [childData, setChildData] = useState<Child | null>(null)
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    birthDate: "",
    gender: "",
  })

  // Cargar datos del niño
  useEffect(() => {
    const fetchChild = async () => {
      try {
        setIsFetching(true)
        const response = await fetch(`/api/children?id=${childId}`, { cache: "no-store" })
        if (!response.ok) {
          throw new Error("Error al cargar los datos del niño")
        }
        const raw = await response.json()
        // Soportar varias formas de respuesta (envoltura estándar u objeto directo)
        const data: any = raw?.data ?? raw?.child ?? (Array.isArray(raw?.children) ? raw.children[0] : raw)

        // Normalizar género entrante para que el combo quede preseleccionado
        const normalizeToSpanish = (g: string | undefined | null) => {
          if (!g) return ""
          const v = String(g).toLowerCase()
          if (["male", "m", "masculino"].includes(v)) return "Masculino"
          if (["female", "f", "femenino"].includes(v)) return "Femenino"
          if (["other", "otro", "x"].includes(v)) return "Otro"
          return g // dejar tal cual si ya viene en español u otro valor
        }

        setChildData(data)
        setFormData({
          firstName: data.firstName || "",
          lastName: data.lastName || "",
          birthDate: data.birthDate || "",
          // Buscar el género en varias rutas posibles por compatibilidad
          gender: normalizeToSpanish(
            data.gender ??
            data.child?.gender ??
            data.profile?.gender ??
            data.surveyData?.genero ??
            data.surveyData?.gender
          ),
        })
      } catch (error) {
        logger.error("Error:", error)
        toast({
          title: "Error",
          description: "No se pudieron cargar los datos del niño",
          variant: "destructive",
        })
        router.push("/dashboard/children")
      } finally {
        setIsFetching(false)
      }
    }

    if (childId) {
      fetchChild()
    }
  }, [childId, router, toast])

  // Manejar cambios en el formulario
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }))
  }

  // Guardar cambios
  const handleSave = async () => {
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      toast({
        title: "Datos incompletos",
        description: "Por favor completa el nombre y apellido",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      // Mapear género al formato canónico si el backend lo usa en inglés
      const mapGenderForApi = (g: string) => {
        const v = String(g).toLowerCase()
        if (v === "masculino" || v === "m") return "male"
        if (v === "femenino" || v === "f") return "female"
        if (v === "otro" || v === "x") return "other"
        return g
      }

      const payload = {
        ...formData,
        gender: mapGenderForApi(formData.gender),
      }
      const response = await fetch("/api/children", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: childId, ...payload }),
      })

      if (!response.ok) {
        throw new Error("Error al actualizar el perfil")
      }

      toast({
        title: "Perfil actualizado",
        description: `La información de ${formData.firstName} ha sido actualizada correctamente`,
      })

      router.push(`/dashboard/children/${childId}`)
    } catch (error) {
      logger.error("Error:", error)
      toast({
        title: "Error",
        description: "No se pudo actualizar el perfil",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Cancelar y volver
  const handleCancel = () => {
    router.push(`/dashboard/children/${childId}`)
  }

  if (isFetching) {
    return (
      <div className="min-h-screen bg-[#DEF1F1] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando información del niño...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#DEF1F1]">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-20 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-11 h-8 bg-gradient-to-r from-[#4A90E2] to-[#2553A1] rounded-xl flex items-center justify-center">
                <svg 
                  className="w-3.5 h-4 text-white" 
                  fill="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-[#2F2F2F]">Happy Dreamers</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 md:px-10 py-6 md:py-8">
        <div className="mb-6">
          {/* Breadcrumb */}
          <div className="flex items-center text-gray-500 mb-10">
            <ArrowLeft className="w-4 h-4 mr-2" />
            <span>/</span>
            <span className="mx-2">Perfiles</span>
            <span>/</span>
            <span className="mx-2 text-[#4A90E2]">Editar Perfil</span>
          </div>

          {/* Form Card */}
          <div className="w-full max-w-4xl mx-auto bg-white rounded-2xl shadow-lg border border-gray-100">
            <div className="p-8">
              {/* Header */}
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-[#2F2F2F] mb-2">
                  Editando Perfil de {formData.firstName || "Niño"}
                </h1>
                <p className="text-gray-600">
                  Actualiza la información del perfil
                </p>
              </div>

              {/* Form */}
              <form onSubmit={(e) => { e.preventDefault(); handleSave() }}>
                <div className="space-y-8">
                  {/* Avatar Section */}
                  <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6">
                    <div className="relative">
                      <div className="w-32 h-32 rounded-full border-4 border-[#4A90E2] overflow-hidden bg-gradient-to-br from-pink-100 to-pink-200 flex items-center justify-center">
                        <span className="text-4xl font-semibold text-pink-600">
                          {formData.firstName.charAt(0).toUpperCase() || "N"}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="flex items-center space-x-2 text-[#4A90E2] hover:text-[#2553A1] transition-colors"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Cambiar Avatar</span>
                    </button>
                  </div>

                  {/* Form Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* Nombre */}
                    <div>
                      <Label htmlFor="firstName" className="text-sm font-medium text-[#3A3A3A] mb-2 block">
                        Nombre
                      </Label>
                      <Input
                        id="firstName"
                        type="text"
                        value={formData.firstName}
                        onChange={(e) => handleInputChange("firstName", e.target.value)}
                        className="h-12 border-gray-300 rounded-xl focus:border-[#4A90E2] focus:ring-2 focus:ring-[#4A90E2] focus:ring-opacity-20"
                        placeholder="María"
                      />
                    </div>

                    {/* Apellido */}
                    <div>
                      <Label htmlFor="lastName" className="text-sm font-medium text-[#3A3A3A] mb-2 block">
                        Apellido
                      </Label>
                      <Input
                        id="lastName"
                        type="text"
                        value={formData.lastName}
                        onChange={(e) => handleInputChange("lastName", e.target.value)}
                        className="h-12 border-gray-300 rounded-xl focus:border-[#4A90E2] focus:ring-2 focus:ring-[#4A90E2] focus:ring-opacity-20"
                        placeholder="González"
                      />
                    </div>

                    {/* Fecha de Nacimiento */}
                    <div>
                      <Label htmlFor="birthDate" className="text-sm font-medium text-[#3A3A3A] mb-2 block">
                        Fecha de Nacimiento
                      </Label>
                      <Input
                        id="birthDate"
                        type="date"
                        value={formData.birthDate}
                        onChange={(e) => handleInputChange("birthDate", e.target.value)}
                        className="h-12 border-gray-300 rounded-xl focus:border-[#4A90E2] focus:ring-2 focus:ring-[#4A90E2] focus:ring-opacity-20"
                      />
                    </div>

                    {/* Género */}
                    <div>
                      <Label htmlFor="gender" className="text-sm font-medium text-[#3A3A3A] mb-2 block">
                        Género
                      </Label>
                      <div className="relative">
                        <select
                          id="gender"
                          value={formData.gender}
                          onChange={(e) => handleInputChange("gender", e.target.value)}
                          className="w-full h-12 px-3 pr-10 bg-white border border-gray-300 rounded-xl text-gray-900 focus:border-[#4A90E2] focus:ring-2 focus:ring-[#4A90E2] focus:ring-opacity-20 outline-none transition-colors appearance-none"
                        >
                          <option value="">Seleccionar género</option>
                          <option value="Masculino">Masculino</option>
                          <option value="Femenino">Femenino</option>
                          <option value="Otro">Otro</option>
                        </select>
                        <div className="absolute right-3 top-4 pointer-events-none">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 pt-4">
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full sm:w-auto bg-gradient-to-r from-[#628BE6] to-[#67C5FF] text-white hover:from-[#5478D2] hover:to-[#5AB1E6] shadow-sm px-6 sm:px-8 py-3 h-12 font-semibold rounded-xl"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {isLoading ? "Guardando..." : "Guardar Cambios"}
                    </Button>
                    
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancel}
                      disabled={isLoading}
                      className="w-full sm:w-auto border-gray-300 text-gray-600 hover:bg-gray-50 px-6 sm:px-8 py-3 h-12 font-semibold rounded-xl"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancelar
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
