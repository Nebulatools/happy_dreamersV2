"use client"

import React, { useState } from "react"
import { Moon, Pill, Utensils, Star, X, ChevronRight, Sparkles } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import SimpleSleepToggleV2 from "./SimpleSleepToggleV2"
import { EventRegistrationModalRefactored } from "./EventRegistrationModalRefactored"
import { useToast } from "@/hooks/use-toast"

interface Child {
  _id: string
  firstName: string
  lastName: string
}

interface QuickEventSelectorProps {
  isOpen: boolean
  onClose: () => void
  childId: string
  children?: Child[]
  onEventCreated?: () => void
}

// Definir los tipos de eventos rápidos disponibles
const quickEventTypes = [
  {
    id: "sleep",
    label: "Registro de Sueño",
    description: "Dormir, despertar, siestas",
    icon: Moon,
    color: "from-blue-500 to-purple-500",
    bgColor: "bg-gradient-to-br from-blue-50 to-purple-50",
    borderColor: "border-blue-200",
    hoverColor: "hover:from-blue-600 hover:to-purple-600",
    recommended: true
  },
  {
    id: "medication",
    label: "Medicamentos",
    description: "Registrar medicación",
    icon: Pill,
    color: "from-pink-500 to-red-500",
    bgColor: "bg-gradient-to-br from-pink-50 to-red-50",
    borderColor: "border-pink-200",
    hoverColor: "hover:from-pink-600 hover:to-red-600"
  },
  {
    id: "feeding",
    label: "Alimentación",
    description: "Comidas y tomas",
    icon: Utensils,
    color: "from-green-500 to-emerald-500",
    bgColor: "bg-gradient-to-br from-green-50 to-emerald-50",
    borderColor: "border-green-200",
    hoverColor: "hover:from-green-600 hover:to-emerald-600"
  },
  {
    id: "extra_activities",
    label: "Actividades Extra",
    description: "Otros eventos del día",
    icon: Star,
    color: "from-indigo-500 to-purple-500",
    bgColor: "bg-gradient-to-br from-indigo-50 to-purple-50",
    borderColor: "border-indigo-200",
    hoverColor: "hover:from-indigo-600 hover:to-purple-600"
  }
]

export function QuickEventSelector({
  isOpen,
  onClose,
  childId,
  children = [],
  onEventCreated
}: QuickEventSelectorProps) {
  const { toast } = useToast()
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [showSleepToggle, setShowSleepToggle] = useState(false)
  const [showEventModal, setShowEventModal] = useState(false)
  const [preselectedEventType, setPreselectedEventType] = useState<string>("")

  const selectedChild = children.find(child => child._id === childId)
  const childName = selectedChild ? `${selectedChild.firstName} ${selectedChild.lastName}` : "Niño"

  const handleQuickSelection = (typeId: string) => {
    if (typeId === "sleep") {
      // Para sueño, mostrar el SimpleSleepToggle en una vista especial
      setShowSleepToggle(true)
    } else {
      // Para otros tipos, abrir el modal de registro con el tipo preseleccionado
      setPreselectedEventType(typeId)
      setShowEventModal(true)
      // Nota: El EventRegistrationModalRefactored debería recibir el tipo preseleccionado
      // pero por ahora mantenemos compatibilidad
    }
  }

  const handleEventCreated = () => {
    onEventCreated?.()
    toast({
      title: "✅ Evento registrado",
      description: "El evento se ha registrado correctamente"
    })
    onClose()
  }

  // Si estamos mostrando el SimpleSleepToggle
  if (showSleepToggle && childId) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-semibold">
                Registro Rápido de Sueño
              </DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSleepToggle(false)}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          <div className="mt-4">
            <SimpleSleepToggleV2
              childId={childId}
              childName={selectedChild?.firstName || ""}
              onEventRegistered={handleEventCreated}
              hideOtherEventsButton={true}
            />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // Si estamos mostrando el modal de eventos para otros tipos
  if (showEventModal) {
    return (
      <>
        <EventRegistrationModalRefactored
          isOpen={showEventModal}
          onClose={() => {
            setShowEventModal(false)
            setPreselectedEventType("")
            onClose()
          }}
          childId={childId}
          children={children}
          onEventCreated={handleEventCreated}
        />
      </>
    )
  }

  // Vista principal del selector rápido
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            ¿Qué deseas registrar?
          </DialogTitle>
          <p className="text-center text-muted-foreground mt-2">
            Selecciona el tipo de evento para {childName}
          </p>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          {quickEventTypes.map((type) => {
            const Icon = type.icon
            return (
              <button
                key={type.id}
                onClick={() => handleQuickSelection(type.id)}
                className={cn(
                  "relative group p-6 rounded-2xl border-2 transition-all duration-300",
                  "transform hover:scale-[1.02] hover:shadow-xl",
                  "flex flex-col items-center text-center space-y-3",
                  type.bgColor,
                  type.borderColor,
                  "hover:border-opacity-50"
                )}
              >
                {/* Badge de recomendado */}
                {type.recommended && (
                  <div className="absolute -top-2 -right-2">
                    <div className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-lg">
                      <Sparkles className="w-3 h-3" />
                      Recomendado
                    </div>
                  </div>
                )}

                {/* Ícono con gradiente */}
                <div className={cn(
                  "w-20 h-20 rounded-2xl flex items-center justify-center",
                  "bg-gradient-to-br text-white shadow-lg",
                  "group-hover:shadow-2xl transition-shadow duration-300",
                  type.color
                )}>
                  <Icon className="w-10 h-10" />
                </div>

                {/* Título y descripción */}
                <div className="space-y-1">
                  <h3 className="font-semibold text-lg text-gray-900">
                    {type.label}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {type.description}
                  </p>
                </div>

                {/* Indicador de acción */}
                <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </button>
            )
          })}
        </div>

        {/* Botón de registro avanzado */}
        <div className="mt-6 pt-6 border-t">
          <Button
            variant="outline"
            onClick={() => setShowEventModal(true)}
            className="w-full"
          >
            Registro Avanzado (Todos los tipos de eventos)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}