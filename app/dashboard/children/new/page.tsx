"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Camera, Calendar, ArrowLeft, CheckCircle, FileQuestion } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useSession } from "next-auth/react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useActiveChild } from "@/context/active-child-context"

import { createLogger } from "@/lib/logger"

const logger = createLogger("page")


export default function AddChildPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const { setActiveChildId } = useActiveChild()
  const [loading, setLoading] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [showSurveyModal, setShowSurveyModal] = useState(false)
  const [newChildId, setNewChildId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    birthDate: "",
    gender: "Masculino",
    notes: "",
    profileImage: null as File | null,
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validar tamaño de imagen (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("La imagen no debe superar los 5MB")
        return
      }
      
      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        toast.error("Por favor selecciona una imagen válida")
        return
      }
      
      setFormData(prev => ({
        ...prev,
        profileImage: file,
      }))
      
      // Crear preview de la imagen
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.firstName.trim()) {
      toast.error("El nombre es obligatorio")
      return
    }
    
    if (!formData.birthDate) {
      toast.error("La fecha de nacimiento es obligatoria")
      return
    }

    setLoading(true)

    try {
      // Si hay imagen, convertirla a base64
      let profileImageBase64 = null
      if (formData.profileImage) {
        const reader = new FileReader()
        profileImageBase64 = await new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string)
          reader.readAsDataURL(formData.profileImage!)
        })
      }

      const childData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        birthDate: formData.birthDate,
        gender: formData.gender,
        notes: formData.notes.trim(),
        avatar: profileImageBase64, // Agregar la imagen en base64
      }

      const response = await fetch("/api/children", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(childData),
      })

      if (response.ok) {
        const result = await response.json()
        const childId = result.id || result._id
        
        // Establecer el nuevo niño como activo inmediatamente
        if (childId) {
          setActiveChildId(childId)
          localStorage.setItem('activeChildId', childId)
          setNewChildId(childId)
        }
        
        toast.success("Soñador registrado exitosamente")
        
        // Forzar actualización del selector disparando un evento
        window.dispatchEvent(new Event('childrenUpdated'))
        
        // Mostrar modal para preguntar sobre la encuesta
        setShowSurveyModal(true)
      } else {
        const errorData = await response.json()
        toast.error(errorData.message || "Error al registrar el soñador")
      }
    } catch (error) {
      logger.error("Error:", error)
      toast.error("Error al registrar el soñador")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-blue-50/30 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Back Button & Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.back()}
            className="p-2 hover:bg-white rounded-xl"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">Mis Soñadores</h1>
          </div>
        </div>

        {/* Main Form Card */}
        <Card className="bg-white rounded-2xl shadow-lg border-0 overflow-hidden">
          <div className="p-8">
            {/* Form Header */}
            <div className="flex items-start justify-between mb-8">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Camera className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Añadir un Pequeño Soñador
                </h2>
                <p className="text-gray-600 text-base leading-relaxed">
                  Completa la información para crear un nuevo perfil infantil en Happy Dreamers.
                </p>
              </div>

              {/* Profile Image Upload */}
              <div className="ml-8">
                <Label className="text-sm font-medium text-gray-700 mb-3 block">
                  Perfil del Soñador
                </Label>
                <div className="relative">
                  <input
                    type="file"
                    id="profile-image"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <label
                    htmlFor="profile-image"
                    className="flex flex-col items-center justify-center w-20 h-20 bg-blue-50 border-2 border-dashed border-blue-300 rounded-full cursor-pointer hover:bg-blue-100 transition-colors overflow-hidden"
                  >
                    {imagePreview ? (
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <>
                        <Camera className="h-4 w-4 text-blue-600 mb-1" />
                        <span className="text-xs text-blue-600 font-medium">Subir</span>
                      </>
                    )}
                  </label>
                  {imagePreview && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        setImagePreview(null)
                        setFormData(prev => ({ ...prev, profileImage: null }))
                      }}
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Name Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label htmlFor="firstName" className="text-sm font-medium text-gray-700">
                    Nombre(s)
                  </Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    placeholder="Ingresa el nombre"
                    className="h-12 bg-blue-50/50 border-gray-200 rounded-xl focus:bg-white focus:border-blue-400 transition-all"
                    required
                  />
                </div>
                
                <div className="space-y-3">
                  <Label htmlFor="lastName" className="text-sm font-medium text-gray-700">
                    Apellido(s)
                  </Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    placeholder="Ingresa el apellido"
                    className="h-12 bg-blue-50/50 border-gray-200 rounded-xl focus:bg-white focus:border-blue-400 transition-all"
                  />
                </div>
              </div>

              {/* Birth Date */}
              <div className="space-y-3">
                <Label htmlFor="birthDate" className="text-sm font-medium text-gray-700">
                  Fecha de Nacimiento
                </Label>
                <div className="relative">
                  <Input
                    id="birthDate"
                    name="birthDate"
                    type="date"
                    value={formData.birthDate}
                    onChange={handleInputChange}
                    min="2015-01-01"
                    max={new Date().toISOString().split('T')[0]}
                    className="h-12 bg-white border-gray-200 rounded-xl focus:border-blue-400 transition-all pr-12"
                    required
                  />
                  <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                </div>
              </div>

              {/* Gender */}
              <div className="space-y-3">
                <Label htmlFor="gender" className="text-sm font-medium text-gray-700">
                  Género
                </Label>
                <div className="relative">
                  <select
                    id="gender"
                    name="gender"
                    value={formData.gender}
                    onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
                    className="w-full h-12 px-3 pr-10 bg-white border border-gray-200 rounded-xl text-gray-900 focus:border-blue-400 focus:ring-2 focus:ring-blue-400 focus:ring-opacity-20 outline-none transition-all appearance-none"
                  >
                    <option value="Masculino">Masculino</option>
                    <option value="Femenino">Femenino</option>
                    <option value="Otro">Otro</option>
                  </select>
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-3">
                <Label htmlFor="notes" className="text-sm font-medium text-gray-700">
                  Notas Adicionales (Opcional)
                </Label>
                <Textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="Información adicional, preferencias, etc."
                  rows={4}
                  className="bg-white border-gray-200 rounded-xl resize-none focus:border-blue-400 transition-all"
                />
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-4 pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  className="px-8 py-2.5 rounded-xl border-gray-200 hover:bg-gray-50 transition-all"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-gradient-to-r from-blue-500 to-blue-400 hover:from-blue-600 hover:to-blue-500 text-white font-medium px-8 py-2.5 rounded-xl shadow-sm transition-all duration-200 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Guardando...
                    </div>
                  ) : (
                    "Guardar Soñador"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </Card>
      </div>

      {/* Modal para preguntar sobre la encuesta */}
      <Dialog open={showSurveyModal} onOpenChange={setShowSurveyModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <DialogTitle className="text-center text-xl">
              ¡{formData.firstName} ha sido registrado!
            </DialogTitle>
            <DialogDescription asChild>
              <div className="text-center space-y-3">
                <p className="text-gray-700">
                  Para personalizar las recomendaciones de sueño, necesitamos conocer mejor 
                  los hábitos y rutinas de {formData.firstName}.
                </p>
                <div className="bg-blue-50 rounded-lg p-3 mt-4">
                  <div className="flex items-start gap-2">
                    <FileQuestion className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div className="text-sm text-gray-700 text-left">
                      <p className="font-semibold mb-1">Cuestionario Inicial</p>
                      <p>
                        Toma aproximadamente 10-15 minutos y nos ayudará a crear un plan 
                        de sueño personalizado.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-center">
            <Button
              variant="outline"
              onClick={() => {
                setShowSurveyModal(false)
                router.push("/dashboard/children")
              }}
            >
              Completar después
            </Button>
            <Button
              onClick={() => {
                setShowSurveyModal(false)
                router.push(`/dashboard/survey?childId=${newChildId}`)
              }}
              className="bg-gradient-to-r from-blue-500 to-blue-400 hover:from-blue-600 hover:to-blue-500 text-white"
            >
              Iniciar Encuesta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
