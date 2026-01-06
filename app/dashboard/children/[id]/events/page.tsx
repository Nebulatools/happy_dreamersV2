"use client"

import React, { useState, useEffect } from "react"
import { createLogger } from "@/lib/logger"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, PlusCircle, Edit, Trash, Save, ChevronLeft, Clock, ChevronRight, ChevronLeft as ChevronLeftIcon } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { useRouter, useParams } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useActiveChild } from "@/context/active-child-context"
import { useEventsCache, useEventsInvalidation } from "@/hooks/use-events-cache"
import { ManualEventModal } from "@/components/events/ManualEventModal"
import { DeleteConfirmationModal } from "@/components/ui/delete-confirmation-modal"
import { EventEditRouter } from "@/components/events/EventEditRouter"

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
  const [children, setChildren] = useState<Child[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(1)
  const pageSize = 20

  useEffect(() => {
    setPage(1)
    setSelectedIds(new Set())
  }, [activeChildId, events.length])

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
      medication: "Medicamento",
      bath: "Baño",
      other: "Otro",
      wake: "Despertar",
      night_waking: "Despertar nocturno",
    }
    return types[type] || type
  }

  // Función para obtener nombre de estado emocional
  const getEmotionalStateName = (state: string) => {
    const states: Record<string, string> = {
      happy: "Feliz",
      calm: "Tranquilo",
      excited: "Emocionado",
      tired: "Cansado",
      irritable: "Irritable",
      sad: "Triste",
      anxious: "Ansioso",
    }
    return states[state] || state
  }

  const getBabyStateLabel = (state?: "awake" | "asleep") => {
    if (state === "awake") return "Despierto"
    if (state === "asleep") return "Dormido"
    return ""
  }

  const formatMinutesReadable = (minutes?: number | null) => {
    if (minutes === null || minutes === undefined) return "-"
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  // Función para obtener un color según el tipo de evento
  const getEventColor = (type: string) => {
    const colors: Record<string, string> = {
      sleep: "bg-blue-200 text-blue-800",
      nap: "bg-blue-100 text-blue-600",
      meal: "bg-green-200 text-green-800",
      play: "bg-yellow-200 text-yellow-800",
      activity: "bg-orange-200 text-orange-800",
      extra_activities: "bg-indigo-200 text-indigo-800",
      feeding: "bg-sky-200 text-sky-800",
      medication: "bg-purple-200 text-purple-800",
      bath: "bg-cyan-200 text-cyan-800",
      other: "bg-gray-200 text-gray-800",
      wake: "bg-amber-200 text-amber-800",
      night_waking: "bg-red-200 text-red-800",
    }
    return colors[type] || "bg-gray-200 text-gray-800"
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
      setSelectedIds((prev) => {
        const next = new Set(prev)
        next.delete(selectedEvent._id)
        return next
      })
      
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

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const isAllPageSelected = (currentPageEvents: Event[]) =>
    currentPageEvents.length > 0 && currentPageEvents.every(ev => selectedIds.has(ev._id))

  const toggleSelectAll = (currentPageEvents: Event[]) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      const allSelected = isAllPageSelected(currentPageEvents)
      currentPageEvents.forEach(ev => {
        if (allSelected) {
          next.delete(ev._id)
        } else {
          next.add(ev._id)
        }
      })
      return next
    })
  }

  const bulkDelete = async () => {
    if (selectedIds.size === 0) return
    setIsSaving(true)
    try {
      await Promise.all(
        Array.from(selectedIds).map(async (id) => {
          const response = await fetch(`/api/children/events/${id}${activeChildId ? `?childId=${activeChildId}` : ""}`, { method: "DELETE" })
          if (!response.ok) {
            const data = await response.json().catch(() => ({}))
            throw new Error(data.message || data.error || "Error al eliminar")
          }
        })
      )
      setEvents((prev) => prev.filter(ev => !selectedIds.has(ev._id)))
      setSelectedIds(new Set())
      invalidateEvents()
      toast({ title: "Eventos eliminados", description: "Los eventos seleccionados se eliminaron correctamente." })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "No se pudieron eliminar los eventos seleccionados.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil(events.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const sortedEvents = [...events].sort((a, b) => {
    const getSafeDate = (event: any) => {
      const startDate = event.startTime ? new Date(event.startTime) : null
      const createdDate = event.createdAt ? new Date(event.createdAt) : null
      if (startDate && !isNaN(startDate.getTime())) return startDate
      if (createdDate && !isNaN(createdDate.getTime())) return createdDate
      return new Date()
    }
    const dateA = getSafeDate(a)
    const dateB = getSafeDate(b)
    return dateB.getTime() - dateA.getTime()
  })
  const paginatedEvents = sortedEvents.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-12rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Cargando eventos...</span>
      </div>
    )
  }

  // Opciones para el formulario de edición
  const eventTypes = [
    { id: "sleep", label: "Dormir" },
    { id: "nap", label: "Siesta" },
    { id: "meal", label: "Comida" },
    { id: "play", label: "Juego" },
    { id: "activity", label: "Actividad física" },
    { id: "bath", label: "Baño" },
    { id: "other", label: "Otro" },
  ]

  const emotionalStates = [
    { id: "happy", label: "Feliz" },
    { id: "calm", label: "Tranquilo" },
    { id: "excited", label: "Emocionado" },
    { id: "tired", label: "Cansado" },
    { id: "irritable", label: "Irritable" },
    { id: "sad", label: "Triste" },
    { id: "anxious", label: "Ansioso" },
  ]

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
        <Card>
          <CardHeader>
            <CardTitle>Eventos registrados</CardTitle>
            <CardDescription>
              Un registro de todos los eventos, ordenados por fecha
            </CardDescription>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex items-center gap-3">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={selectedIds.size === 0 || isSaving}
                  onClick={bulkDelete}
                  className="flex items-center gap-2"
                >
                  <Trash className="h-4 w-4" />
                  Eliminar seleccionados ({selectedIds.size})
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="outline"
                  disabled={currentPage === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  Página {currentPage} de {totalPages}
                </span>
                <Button
                  size="icon"
                  variant="outline"
                  disabled={currentPage === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="py-3 px-4">
                      <input
                        type="checkbox"
                        checked={isAllPageSelected(paginatedEvents)}
                        onChange={() => toggleSelectAll(paginatedEvents)}
                        aria-label="Seleccionar todos"
                      />
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-sm text-gray-700">Fecha</th>
                    <th className="text-left py-3 px-4 font-medium text-sm text-gray-700">Hora</th>
                    <th className="text-left py-3 px-4 font-medium text-sm text-gray-700 hidden sm:table-cell">Duración</th>
                    <th className="text-left py-3 px-4 font-medium text-sm text-gray-700">Tipo</th>
                    <th className="text-left py-3 px-4 font-medium text-sm text-gray-700 hidden md:table-cell">Estado</th>
                    <th className="text-left py-3 px-4 font-medium text-sm text-gray-700 hidden lg:table-cell">Notas</th>
                    <th className="text-center py-3 px-4 font-medium text-sm text-gray-700">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedEvents.map((event) => {
                    // Validar y crear fechas seguras
                    const createSafeDate = (dateString?: string) => {
                      if (!dateString) return null
                      const date = new Date(dateString)
                      return isNaN(date.getTime()) ? null : date
                    }
                      
                    const startDate = createSafeDate(event.startTime) || createSafeDate(event.createdAt) || new Date()
                    const endDate = createSafeDate(event.endTime)
                    const duration = startDate && endDate 
                      ? Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60)) 
                      : null
                    const derivedDuration = (() => {
                      if (typeof duration === "number") return duration
                      if (typeof event.duration === "number") return event.duration
                      if (event.eventType === "extra_activities" && typeof event.activityDuration === "number") return event.activityDuration
                      if (event.eventType === "feeding" && typeof event.feedingDuration === "number") return event.feedingDuration
                      return null
                    })()
                      
                    return (
                      <tr
                        key={event._id || `${event.childId}-${event.startTime}-${event.eventType}`}
                        className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => handleEventClick(event)}
                      >
                        <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(event._id)}
                            onChange={() => toggleSelect(event._id)}
                            aria-label={`Seleccionar evento ${event._id}`}
                          />
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {format(startDate, "dd/MM/yyyy", { locale: es })}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {event.startTime ? (
                            <>
                              {format(startDate, "HH:mm")}
                              {endDate && ` - ${format(endDate, "HH:mm")}`}
                            </>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm hidden sm:table-cell">
                          {formatMinutesReadable(derivedDuration)}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getEventColor(event.eventType)}`}>
                            {getEventTypeName(event.eventType)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm hidden md:table-cell">
                          {event.eventType === "feeding"
                            ? (getBabyStateLabel(event.babyState) || "-")
                            : event.eventType === "extra_activities"
                              ? "-"
                              : getEmotionalStateName(event.emotionalState)}
                        </td>
                        <td className="py-3 px-4 text-sm hidden lg:table-cell">
                          <span className="truncate block max-w-xs" title={event.notes || event.description || ""}>
                            {event.notes || event.description 
                              ? (event.notes || event.description || "").substring(0, 50) + ((event.notes || event.description || "").length > 50 ? "..." : "")
                              : "-"
                            }
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex justify-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEditEvent(event)
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation()
                                // Acción de eliminación - logging removido por seguridad
                                setSelectedEvent(event)
                                setShowDeleteModal(true)
                              }}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Diálogo para visualizar detalles del evento */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open)
        if (!open) setSelectedEvent(null) // Limpiar cuando se cierra
      }}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          {selectedEvent && (
            <>
              <DialogHeader>
                <DialogTitle>{getEventTypeName(selectedEvent.eventType)}</DialogTitle>
                <DialogDescription>Detalles del evento</DialogDescription>
              </DialogHeader>

              {/* Modo visualización */}
              <div className="space-y-4 py-4">
                <div className="grid gap-2">
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span className="text-sm">
                      {(() => {
                        const startDate = selectedEvent.startTime ? new Date(selectedEvent.startTime) : null
                        const endDate = selectedEvent.endTime ? new Date(selectedEvent.endTime) : null

                        if (!startDate || isNaN(startDate.getTime())) {
                          return "Fecha no disponible"
                        }

                        return (
                          <>
                            {format(startDate, "PPpp", { locale: es })}
                            {endDate && !isNaN(endDate.getTime()) && (
                              <> hasta {format(endDate, "p", { locale: es })}</>
                            )}
                          </>
                        )
                      })()}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="font-medium mr-2">Estado:</span>
                    <span>
                      {selectedEvent.eventType === "feeding"
                        ? (getBabyStateLabel(selectedEvent.babyState) || "Sin estado")
                        : selectedEvent.eventType === "extra_activities"
                          ? "No aplica"
                          : getEmotionalStateName(selectedEvent.emotionalState)}
                    </span>
                  </div>
                  {selectedEvent.eventType === "extra_activities" && selectedEvent.activityDuration && (
                    <div className="flex items-center">
                      <span className="font-medium mr-2">Duración:</span>
                      <span>{formatMinutesReadable(selectedEvent.activityDuration)}</span>
                    </div>
                  )}
                  {selectedEvent.eventType === "feeding" && selectedEvent.feedingDuration && (
                    <div className="flex items-center">
                      <span className="font-medium mr-2">Duración:</span>
                      <span>{formatMinutesReadable(selectedEvent.feedingDuration)}</span>
                    </div>
                  )}
                  {selectedEvent.notes && (
                    <div className="mt-2">
                      <span className="font-medium">Notas:</span>
                      <p className="text-sm mt-1">{selectedEvent.notes}</p>
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter className="flex justify-between w-full">
                <Button
                  variant="destructive"
                  onClick={() => {
                    setShowDeleteModal(true)
                  }}
                >
                  <Trash className="h-4 w-4 mr-2" />
                  Eliminar
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cerrar
                  </Button>
                  <Button onClick={() => selectedEvent && handleEditEvent(selectedEvent)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Editar evento
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      
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
