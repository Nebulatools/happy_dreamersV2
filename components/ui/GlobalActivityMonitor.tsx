// Monitor global de eventos pendientes
// Muestra alerta cuando hay eventos de sueno activos por mas de 20 minutos

"use client"

import { useEffect, useState } from "react"
import { useActiveChild } from "@/context/active-child-context"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Moon, Sun, Clock, X } from "lucide-react"

// Tiempo en minutos para mostrar alerta
const ALERT_THRESHOLD_MINUTES = 20
// Intervalo de verificacion en milisegundos (cada minuto)
const CHECK_INTERVAL_MS = 60 * 1000

interface PendingEvent {
  type: "sleep" | "nap" | "night_waking"
  start: string
  sleepDelay?: number
  emotionalState?: string
  notes?: string
}

export function GlobalActivityMonitor() {
  const { activeChild } = useActiveChild()
  const { toast } = useToast()
  const [pendingEvent, setPendingEvent] = useState<PendingEvent | null>(null)
  const [elapsedMinutes, setElapsedMinutes] = useState(0)
  const [showAlert, setShowAlert] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  // Verificar localStorage por eventos pendientes
  useEffect(() => {
    if (typeof window === "undefined" || !activeChild?._id) return

    const checkPendingEvents = () => {
      const sleepKey = `pending_sleep_event_${activeChild._id}`
      const nightWakeKey = `pending_night_wake_${activeChild._id}`

      try {
        // Verificar evento de sueno pendiente
        const storedSleep = window.localStorage.getItem(sleepKey)
        if (storedSleep) {
          const parsed = JSON.parse(storedSleep) as PendingEvent
          if (parsed?.start) {
            const startTime = new Date(parsed.start).getTime()
            const now = Date.now()
            const elapsed = Math.floor((now - startTime) / 1000 / 60)
            setElapsedMinutes(elapsed)
            setPendingEvent(parsed)

            // Mostrar alerta si supera el umbral y no ha sido descartada
            if (elapsed >= ALERT_THRESHOLD_MINUTES && !dismissed) {
              setShowAlert(true)
            }
            return
          }
        }

        // Verificar despertar nocturno pendiente
        const storedNightWake = window.localStorage.getItem(nightWakeKey)
        if (storedNightWake) {
          const parsed = JSON.parse(storedNightWake) as PendingEvent
          if (parsed?.start) {
            const startTime = new Date(parsed.start).getTime()
            const now = Date.now()
            const elapsed = Math.floor((now - startTime) / 1000 / 60)
            setElapsedMinutes(elapsed)
            setPendingEvent({ ...parsed, type: "night_waking" })

            if (elapsed >= ALERT_THRESHOLD_MINUTES && !dismissed) {
              setShowAlert(true)
            }
            return
          }
        }

        // No hay eventos pendientes
        setPendingEvent(null)
        setShowAlert(false)
        setDismissed(false)
      } catch (error) {
        console.warn("[GlobalActivityMonitor] Error verificando eventos pendientes:", error)
      }
    }

    // Verificar inmediatamente
    checkPendingEvents()

    // Verificar periodicamente
    const interval = setInterval(checkPendingEvents, CHECK_INTERVAL_MS)

    // Escuchar cambios en localStorage
    const handleStorageChange = (e: StorageEvent) => {
      if (
        e.key === `pending_sleep_event_${activeChild._id}` ||
        e.key === `pending_night_wake_${activeChild._id}`
      ) {
        checkPendingEvents()
      }
    }

    window.addEventListener("storage", handleStorageChange)

    return () => {
      clearInterval(interval)
      window.removeEventListener("storage", handleStorageChange)
    }
  }, [activeChild?._id, dismissed])

  // Resetear dismissed cuando cambia el nino activo
  useEffect(() => {
    setDismissed(false)
  }, [activeChild?._id])

  const handleDismiss = () => {
    setDismissed(true)
    setShowAlert(false)
  }

  const getEventIcon = () => {
    if (!pendingEvent) return null
    switch (pendingEvent.type) {
    case "sleep":
      return <Moon className="h-5 w-5 text-indigo-500" />
    case "nap":
      return <Sun className="h-5 w-5 text-amber-500" />
    case "night_waking":
      return <Moon className="h-5 w-5 text-purple-500" />
    default:
      return <Clock className="h-5 w-5 text-gray-500" />
    }
  }

  const getEventTypeName = () => {
    if (!pendingEvent) return ""
    switch (pendingEvent.type) {
    case "sleep":
      return "Sueno nocturno"
    case "nap":
      return "Siesta"
    case "night_waking":
      return "Despertar nocturno"
    default:
      return "Evento"
    }
  }

  const formatElapsedTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} minutos`
    }
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (mins === 0) {
      return `${hours} hora${hours > 1 ? "s" : ""}`
    }
    return `${hours}h ${mins}min`
  }

  // No renderizar nada si no hay alerta que mostrar
  if (!showAlert || !pendingEvent) {
    return null
  }

  return (
    <div className="fixed bottom-24 right-4 md:bottom-6 md:right-6 z-50 max-w-sm animate-in slide-in-from-bottom-5">
      <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="mt-0.5">{getEventIcon()}</div>
          <div className="flex-1">
            <AlertTitle className="text-amber-800 dark:text-amber-200 flex items-center gap-2">
              Evento pendiente
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 ml-auto"
                onClick={handleDismiss}
              >
                <X className="h-4 w-4" />
              </Button>
            </AlertTitle>
            <AlertDescription className="text-amber-700 dark:text-amber-300">
              Tienes un evento de <strong>{getEventTypeName()}</strong> abierto
              desde hace <strong>{formatElapsedTime(elapsedMinutes)}</strong>.
              <br />
              <span className="text-sm opacity-80">
                Recuerda finalizar el evento cuando el nino despierte.
              </span>
            </AlertDescription>
          </div>
        </div>
      </Alert>
    </div>
  )
}
