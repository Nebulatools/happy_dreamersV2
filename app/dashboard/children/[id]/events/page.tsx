"use client"

import React, { useState, useEffect } from "react"
import { createLogger } from "@/lib/logger"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, PlusCircle, ChevronLeft } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { useRouter, useParams } from "next/navigation"
import { useActiveChild } from "@/context/active-child-context"
import { useEventsCache, useEventsInvalidation } from "@/hooks/use-events-cache"
import { ManualEventModal } from "@/components/events/ManualEventModal"
import { DeleteConfirmationModal } from "@/components/ui/delete-confirmation-modal"
import { EventEditRouter } from "@/components/events/EventEditRouter"
import { EventDetailsModal } from "@/components/events/EventDetailsModal"
import { EventsCalendarTabs } from "@/components/events/EventsCalendarTabs"

const logger = createLogger("EventsPage")


interface Event {
  _id: string;
  childId: string;
  eventType: string;
  emotionalState?: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  notes?: string;
  description?: string;
  createdAt?: string;
  // Alimentación
  feedingType?: "breast" | "bottle" | "solids";
  feedingSubtype?: string;
  feedingDuration?: number;
  feedingAmount?: number;
  babyState?: "awake" | "asleep";
  feedingNotes?: string;
  // Flag para alimentación nocturna (reemplaza eventType: "night_feeding")
  isNightFeeding?: boolean;
  feedingContext?: "awake" | "during_sleep" | "during_nap";
  // Actividades extra
  activityDuration?: number;
  activityDescription?: string;
  activityImpact?: "positive" | "neutral" | "negative";
  activityNotes?: string;
  // Medicación
  medicationName?: string;
  medicationDose?: string;
  medicationTime?: string;
  medicationNotes?: string;
  // Sueño
  sleepDelay?: number;
  // Despertar nocturno
  awakeDelay?: number;
  // Notas de bitacora
  noteText?: string;
}

interface Child {
  _id: string;
  firstName: string;
  lastName: string;
  events?: Event[];
}

export default function ChildEventsPage() {
  const params = useParams()
  const childIdFromUrl = params.id as string
  
  const router = useRouter()
  const { toast } = useToast()
  const { activeChildId, setActiveChildId } = useActiveChild()
  const { refreshTrigger, subscribe } = useEventsCache(activeChildId)
  const invalidateEvents = useEventsInvalidation()
  
  const [isLoading, setIsLoading] = useState(true)
  const [child, setChild] = useState<Child | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  
  // Estado para el diálogo de visualización
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isSaving, setIsSaving] = useState(false) // Para delete operation

  // Estado para edición con EventEditRouter
  const [eventToEdit, setEventToEdit] = useState<Event | null>(null)
  const [isEditRouterOpen, setIsEditRouterOpen] = useState(false)
  const [eventModalOpen, setEventModalOpen] = useState(false)

  // Suscribirse a invalidaciones de cache
  useEffect(() => {
    const unsubscribe = subscribe()
    return unsubscribe
  }, [subscribe])

  // Efecto 1: Sincronizar URL con Contexto al cargar o si cambia la URL
  useEffect(() => {
    if (childIdFromUrl && childIdFromUrl !== activeChildId) {
      setActiveChildId(childIdFromUrl)
    }
  }, [childIdFromUrl, setActiveChildId])

  // Efecto 2: Cargar datos cuando el niño activo del contexto cambia o el cache se invalida
  useEffect(() => {
    const fetchData = async () => {
      if (!activeChildId) {
        setEvents([])
        setChild(null)
        if (isLoading) setIsLoading(false)
        return
      }
      
      if (!isLoading) setIsLoading(true)
      
      try {
        const response = await fetch(`/api/children/events?childId=${activeChildId}`)
        if (!response.ok) {
          // Si falla (ej: niño no encontrado), limpiar estado y redirigir o mostrar error
          setEvents([])
          setChild(null)
          toast({
            title: "Error",
            description: "No se pudieron cargar los eventos del niño seleccionado.",
            variant: "destructive",
          })
          // Podríamos redirigir a /dashboard si el niño no existe
          // router.push('/dashboard');
          throw new Error("Error al cargar los eventos")
        }
        const data = await response.json()
        setChild({
          _id: data._id,
          firstName: data.firstName,
          lastName: data.lastName,
        })
        setEvents(data.events || [])
      } catch (error) {
        // No mostramos el toast aquí si ya lo hicimos en el if (!response.ok)
        if (error instanceof Error && error.message !== "Error al cargar los eventos") {
          toast({
            title: "Error",
            description: "Ocurrió un problema al cargar los datos.",
            variant: "destructive",
          })
        }
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [activeChildId, toast, refreshTrigger])

  // Efecto 3: Sincronizar Contexto con URL si cambia el contexto
  useEffect(() => {
    if (activeChildId && activeChildId !== childIdFromUrl) {
      const targetUrl = `/dashboard/children/${activeChildId}/events`
      router.push(targetUrl)
    }
  }, [activeChildId, childIdFromUrl, router])

  // Función para obtener nombre de tipo de evento
  const getEventTypeName = (type: string) => {
    const types: Record<string, string> = {
      sleep: "Dormir",
      nap: "Siesta",
      meal: "Comida",
      play: "Juego",
      activity: "Actividad física",
      extra_activities: "Actividades Extra",
      feeding: "Alimentación",
      night_feeding: "Alimentación nocturna",
      medication: "Medicamento",
      bath: "Baño",
      other: "Otro",
      wake: "Despertar",
      night_waking: "Despertar nocturno",
      note: "Nota",
    }
    return types[type] || type
  }

  // Función para manejar el clic en un evento (solo visualización)
  const handleEventClick = (event: Event) => {
    setSelectedEvent(event)
    setIsDialogOpen(true)
  }

  // Función para abrir el editor de eventos
  const handleEditEvent = (event: Event) => {
    setEventToEdit(event)
    setIsEditRouterOpen(true)
    setIsDialogOpen(false) // Cerrar dialog de visualización si está abierto
  }

  // La actualización de eventos ahora se maneja en EventEditRouter

  // Función para eliminar un evento
  const deleteEvent = async () => {
    if (!selectedEvent || isSaving) return // Prevenir doble click
    
    setIsSaving(true)
    try {
      // Usar la URL con el ID en la ruta
      const childQuery = selectedEvent.childId
        ? `?childId=${selectedEvent.childId}`
        : activeChildId
          ? `?childId=${activeChildId}`
          : ""
      const response = await fetch(`/api/children/events/${selectedEvent._id}${childQuery}`, {
        method: "DELETE",
      })
      
      const responseData = await response.json()
      
      if (!response.ok) {
        throw new Error(responseData.message || responseData.error || "Error al eliminar el evento")
      }
      
      // Eliminar del estado local inmediatamente
      setEvents(currentEvents =>
        currentEvents.filter(event => event._id !== selectedEvent._id)
      )

      // Invalidar cache global
      invalidateEvents()
      
      toast({
        title: "Evento eliminado",
        description: "El evento ha sido eliminado correctamente.",
      })
      
      setIsDialogOpen(false)
      setSelectedEvent(null)
      setShowDeleteModal(false)
    } catch (error: any) {
      logger.error("Error al eliminar evento:", error?.message || error)
      toast({
        title: "Error",
        description: error?.message || "No se pudo eliminar el evento. Inténtalo de nuevo.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-12rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Cargando eventos...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/children">
              <Button variant="ghost" size="icon">
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-3xl font-bold tracking-tight">
              Eventos de {child?.firstName} {child?.lastName}
            </h1>
          </div>
          <p className="text-muted-foreground">
            Lista de todos los eventos registrados para este niño
          </p>
        </div>
        <Button className="gap-2 hd-gradient-button text-white" onClick={() => setEventModalOpen(true)}>
          <PlusCircle className="h-4 w-4" />
          Registrar evento
        </Button>
      </div>

      {events.length === 0 ? (
        <Card>
          <CardContent className="py-10">
            <div className="text-center">
              <p>No hay eventos registrados para este niño.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Vista Calendario con tabs dia/semana/mes */
        <EventsCalendarTabs
          events={events}
          onEventClick={handleEventClick}
          onEventEdit={handleEditEvent}
          isLoading={isLoading}
          showEditButton={true}
        />
      )}

      {/* Modal para visualizar detalles del evento - Componente reutilizable */}
      <EventDetailsModal
        event={selectedEvent}
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) setSelectedEvent(null)
        }}
        onEdit={() => selectedEvent && handleEditEvent(selectedEvent)}
        onDelete={() => setShowDeleteModal(true)}
        showActions={true}
      />
      
      {/* Modal para registrar eventos */}
      <ManualEventModal
        open={eventModalOpen}
        onClose={() => setEventModalOpen(false)}
        childId={activeChildId || childIdFromUrl || ""}
        childName={child ? `${child.firstName} ${child.lastName || ""}`.trim() : "Niño"}
        onEventRegistered={() => {
          invalidateEvents() // Invalidar cache global
          setEventModalOpen(false)
        }}
      />

      {/* Modal de confirmación de eliminación */}
      {selectedEvent && (
        <DeleteConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => {
            // Cerrando modal
            setShowDeleteModal(false)
          }}
          onConfirm={() => {
            // Confirmación de eliminación
            deleteEvent()
          }}
          itemName={`evento de ${getEventTypeName(selectedEvent.eventType)}`}
          isDeleting={isSaving}
        />
      )}

      {/* EventEditRouter - Maneja la edición con modales especializados */}
      {eventToEdit && (
        <EventEditRouter
          event={eventToEdit}
          open={isEditRouterOpen}
          onClose={() => {
            setIsEditRouterOpen(false)
            setEventToEdit(null)
          }}
          onUpdate={() => {
            // Refrescar eventos después de editar
            invalidateEvents()
            setIsEditRouterOpen(false)
            setEventToEdit(null)
          }}
          childName={child ? `${child.firstName} ${child.lastName || ""}`.trim() : "Niño"}
        />
      )}
    </div>
  )
} 
