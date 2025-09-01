"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Edit, Calendar, User, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import SleepMetricsGrid from "@/components/child-profile/SleepMetricsGrid"
import RecentEvents from "@/components/child-profile/RecentEvents"
// TEMPORALMENTE COMENTADO - Sistema de eventos en reset
// import { EventRegistrationModal } from "@/components/events"
import { useActiveChild } from "@/context/active-child-context"
import { useEventsInvalidation } from "@/hooks/use-events-cache"
import { ChildAgeBadge } from "@/components/ui/child-age-badge"
import { CaregiverManagement } from "@/components/child-access/CaregiverManagement"

import { createLogger } from "@/lib/logger"
import { extractChildrenFromResponse } from "@/lib/api-response-utils"
import { useSession } from "next-auth/react"

const logger = createLogger("page")


interface Child {
  _id: string
  firstName: string
  lastName?: string
  birthDate: string
  gender: string
  createdAt: string
  avatar?: string
  surveyData?: {
    completed?: boolean
    responses?: any
    lastUpdated?: string
  }
}

type TabType = "resumen" | "eventos" | "progreso" | "encuestas" | "acceso"

export default function ChildProfilePage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const [child, setChild] = useState<Child | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>("resumen")
  const [isLoading, setIsLoading] = useState(true)
  const [isOwner, setIsOwner] = useState(false)
  // TEMPORALMENTE COMENTADO - Sistema de eventos en reset
  // const [eventModalOpen, setEventModalOpen] = useState(false)
  const [children, setChildren] = useState<Child[]>([])  
  const { setActiveChildId } = useActiveChild()
  const invalidateEvents = useEventsInvalidation()

  // Calcular edad del niño
  const calculateAge = (birthDate: string) => {
    const birth = new Date(birthDate)
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  // Formatear fecha de registro
  const formatRegistrationDate = (createdAt: string) => {
    const date = new Date(createdAt)
    const monthNames = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
    ]
    return `Miembro desde ${monthNames[date.getMonth()]} ${date.getFullYear()}`
  }

  useEffect(() => {
    const fetchChild = async () => {
      try {
        console.log("Fetching child with ID:", params.id)
        const response = await fetch(`/api/children/${params.id}`)
        console.log("Response status:", response.status)
        
        if (response.ok) {
          const childData = await response.json()
          console.log("Child data received:", childData)
          setChild(childData)
          
          // El API ahora devuelve isOwner directamente
          setIsOwner(childData.isOwner || false)
        } else {
          let errorData = "";
          try {
            errorData = await response.text()
          } catch (e) {
            errorData = "Could not parse error response"
          }
          console.error("API Error Response:", {
            status: response.status,
            statusText: response.statusText,
            errorData: errorData
          })
          logger.error(`Error fetching child data - Status: ${response.status}`, errorData || response.statusText)
          router.push("/dashboard/children")
        }
      } catch (error) {
        console.error("Fetch error:", error)
        logger.error("Error:", error)
        router.push("/dashboard/children")
      } finally {
        setIsLoading(false)
      }
    }

    if (params.id) {
      fetchChild()
      // También establecer este niño como activo
      setActiveChildId(params.id as string)
    }
  }, [params.id, router, setActiveChildId, session])

  // TEMPORALMENTE COMENTADO - Sistema de eventos en reset
  // Cargar children cuando se abre el modal
  // useEffect(() => {
  //   if (eventModalOpen) {
  //     fetch("/api/children")
  //       .then(res => res.json())
  //       .then(data => {
  //         const childrenData = extractChildrenFromResponse(data)
  //         setChildren(childrenData)
  //         
  //         if (childrenData.length === 0 && data && !Array.isArray(data)) {
  //           logger.warn('No se pudieron extraer niños de la respuesta:', data)
  //         }
  //       })
  //       .catch((error) => {
  //         logger.error('Error al cargar niños', error)
  //       })
  //   }
  // }, [eventModalOpen])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando información del niño...</p>
        </div>
      </div>
    )
  }

  if (!child) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">No se pudo cargar la información del niño</p>
          <Button onClick={() => router.push("/dashboard/children")}>
            Volver a la lista
          </Button>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: "resumen" as TabType, label: "Resumen" },
    { id: "eventos" as TabType, label: "Eventos de Sueño" },
    { id: "progreso" as TabType, label: "Progreso y Estadísticas" },
    { id: "encuestas" as TabType, label: "Encuestas" },
    { id: "acceso" as TabType, label: "Acceso Compartido" },
  ]

  return (
    <div className="min-h-screen bg-[#DEF1F1] p-10">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Breadcrumb */}
        <button 
          onClick={() => router.push("/dashboard/children")}
          className="flex items-center text-[#4A90E2] hover:text-[#2553A1] transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a la lista
        </button>

        {/* Tarjeta de Perfil del Niño */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="flex items-center space-x-8">
            {/* Avatar */}
            <div className="relative">
              <div className="w-24 h-24 rounded-full border-4 border-[#4A90E2] overflow-hidden bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                {child.avatar ? (
                  <img 
                    src={child.avatar} 
                    alt={`${child.firstName} ${child.lastName || ""}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-semibold text-blue-600">
                    {child.firstName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
            </div>

            {/* Información del niño */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-3xl font-bold text-[#2F2F2F]">
                  {child.firstName} {child.lastName || ""}
                </h1>
                <Button 
                  variant="outline"
                  className="flex items-center space-x-2 border-[#628BE6] text-[#628BE6] hover:hd-gradient-button hover:text-white hover:border-transparent"
                  onClick={() => router.push(`/dashboard/children/${child._id}/edit`)}
                >
                  <Edit className="w-4 h-4" />
                  <span>Editar Perfil</span>
                </Button>
              </div>

              <div className="flex items-center space-x-6 text-gray-600">
                <div className="flex items-center">
                  <ChildAgeBadge 
                    birthDate={child.birthDate}
                    useContext={false}
                    size="lg"
                    variant="secondary"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4" />
                  <span>{formatRegistrationDate(child.createdAt)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navegación por Tabs */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Tab Headers */}
          <nav className="border-b border-gray-100">
            <div className="flex">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-4 text-center font-medium transition-colors relative ${
                    activeTab === tab.id
                      ? "text-[#4A90E2] bg-white border-b-2 border-[#4A90E2]"
                      : "text-gray-600 hover:text-gray-800 bg-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </nav>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === "resumen" && (
              <div className="space-y-6">
                {/* Consejo del Sleep Coach */}
                <div className="bg-[#F0F7FF] rounded-xl border border-blue-100 p-6">
                  <h3 className="text-xl font-semibold text-[#2F2F2F] mb-3">
                    Consejo del Sleep Coach
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    Mantener una rutina constante antes de dormir ayuda a mejorar la calidad del 
                    sueño. Considera incluir actividades relajantes como leer un cuento o hacer 
                    ejercicios de respiración suaves.
                  </p>
                </div>

                {/* Eventos Recientes */}
                <RecentEvents childId={params.id as string} />

                {/* TEMPORALMENTE COMENTADO - Sistema de eventos en reset */}
                {/* Botón Registrar Nuevo Evento */}
                {/* <div className="flex justify-end">
                  <Button 
                    className="bg-gradient-to-r from-[#628BE6] to-[#67C5FF] text-white hover:from-[#5478D2] hover:to-[#5AB1E6] shadow-sm px-6 py-3 text-base font-medium"
                    onClick={() => setEventModalOpen(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Registrar Nuevo Evento
                  </Button>
                </div> */}

                {/* Métricas de Sueño */}
                <SleepMetricsGrid childId={params.id as string} />
              </div>
            )}

            {activeTab === "eventos" && (
              <div className="text-center py-8 text-gray-500">
                <p>Contenido de Eventos de Sueño próximamente...</p>
              </div>
            )}

            {activeTab === "progreso" && (
              <div className="text-center py-8 text-gray-500">
                <p>Contenido de Progreso y Estadísticas próximamente...</p>
              </div>
            )}

            {activeTab === "acceso" && (
              <div className="space-y-6">
                {console.log("Pasando isOwner a CaregiverManagement:", isOwner)}
                <CaregiverManagement
                  childId={params.id as string}
                  childName={child.firstName}
                  isOwner={isOwner}
                />
              </div>
            )}

            {activeTab === "encuestas" && (
              <div className="space-y-6">
                <div className="bg-[#F0F7FF] rounded-xl border border-blue-100 p-8 text-center">
                  <h3 className="text-xl font-semibold text-[#2F2F2F] mb-3">
                    Encuesta de Sueño Infantil
                  </h3>
                  <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
                    {child.surveyData?.completed 
                      ? `La encuesta de ${child.firstName} ya ha sido completada. Puedes actualizarla para reflejar cambios en sus patrones de sueño.`
                      : `Completa nuestra encuesta detallada para recibir recomendaciones personalizadas sobre los patrones de sueño de ${child.firstName}. La encuesta toma aproximadamente 10-15 minutos y nos ayudará a crear un plan de sueño adaptado a sus necesidades.`
                    }
                  </p>
                  <Button 
                    className="bg-gradient-to-r from-[#628BE6] to-[#67C5FF] text-white hover:from-[#5478D2] hover:to-[#5AB1E6] shadow-sm px-8 py-3 text-base font-medium"
                    onClick={() => router.push(`/dashboard/survey?childId=${child._id}`)}
                  >
                    {child.surveyData?.completed ? "Actualizar Encuesta" : "Comenzar Encuesta"}
                    <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
                  </Button>
                </div>
                
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h4 className="text-lg font-semibold text-gray-800 mb-3">Estado de la Encuesta</h4>
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 ${child.surveyData?.completed ? 'bg-green-500' : 'bg-amber-500'} rounded-full`}></div>
                    <span className="text-gray-600">
                      {child.surveyData?.completed 
                        ? `Encuesta completada${child.surveyData.lastUpdated ? ` el ${new Date(child.surveyData.lastUpdated).toLocaleDateString('es-ES')}` : ''}`
                        : "Encuesta pendiente de completar"
                      }
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* TEMPORALMENTE COMENTADO - Sistema de eventos en reset */}
      {/* Event Registration Modal */}
      {/* <EventRegistrationModal
        isOpen={eventModalOpen}
        onClose={() => setEventModalOpen(false)}
        childId={params.id as string}
        children={children}
        onEventCreated={() => {
          invalidateEvents() // Invalidar cache global de eventos
          setEventModalOpen(false)
        }}
      /> */}
    </div>
  )
}
