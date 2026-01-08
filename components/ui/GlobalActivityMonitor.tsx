// Monitor global de despertares nocturnos pendientes
// Solo monitorea night_waking porque los eventos de sleep/nap duran horas
// y no tiene sentido recordar al usuario que el nino sigue dormido

"use client"

import { useEffect, useState } from "react"
import { useActiveChild } from "@/context/active-child-context"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Moon, X } from "lucide-react"

// Tiempo en minutos para mostrar alerta de despertar nocturno pendiente
const ALERT_THRESHOLD_MINUTES = 20
// Intervalo de verificacion en milisegundos (cada minuto)
const CHECK_INTERVAL_MS = 60 * 1000

interface PendingNightWake {
  type: "night_waking"
  start: string
  emotionalState?: string
  notes?: string
}

export function GlobalActivityMonitor() {
  const { activeChild } = useActiveChild()
  const [pendingEvent, setPendingEvent] = useState<PendingNightWake | null>(null)
  const [elapsedMinutes, setElapsedMinutes] = useState(0)
  const [showAlert, setShowAlert] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  // Verificar localStorage SOLO por despertares nocturnos pendientes
  // No monitoreamos sleep/nap porque los ninos duermen horas y no tiene sentido alertar
  useEffect(() => {
    if (typeof window === "undefined" || !activeChild?._id) return

    const checkPendingNightWaking = () => {
      const nightWakeKey = `pending_night_wake_${activeChild._id}`

      try {
        // Solo verificar despertar nocturno pendiente
        const storedNightWake = window.localStorage.getItem(nightWakeKey)
        if (storedNightWake) {
          const parsed = JSON.parse(storedNightWake) as PendingNightWake
          if (parsed?.start) {
            const startTime = new Date(parsed.start).getTime()
            const now = Date.now()
            const elapsed = Math.floor((now - startTime) / 1000 / 60)
            setElapsedMinutes(elapsed)
            setPendingEvent({ ...parsed, type: "night_waking" })

            // Mostrar alerta si supera el umbral y no ha sido descartada
            if (elapsed >= ALERT_THRESHOLD_MINUTES && !dismissed) {
              setShowAlert(true)
            }
            return
          }
        }

        // No hay despertares nocturnos pendientes
        setPendingEvent(null)
        setShowAlert(false)
        setDismissed(false)
      } catch (error) {
        console.warn("[GlobalActivityMonitor] Error verificando night_waking pendiente:", error)
      }
    }

    // Verificar inmediatamente
    checkPendingNightWaking()

    // Verificar periodicamente
    const interval = setInterval(checkPendingNightWaking, CHECK_INTERVAL_MS)

    // Escuchar cambios en localStorage
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === `pending_night_wake_${activeChild._id}`) {
        checkPendingNightWaking()
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

  // Icono para despertar nocturno
  const getEventIcon = () => {
    return <Moon className="h-5 w-5 text-purple-500" />
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
              Tienes un <strong>despertar nocturno</strong> abierto
              desde hace <strong>{formatElapsedTime(elapsedMinutes)}</strong>.
              <br />
              <span className="text-sm opacity-80">
                Recuerda cerrar el evento cuando el nino se vuelva a dormir.
              </span>
            </AlertDescription>
          </div>
        </div>
      </Alert>
    </div>
  )
}
