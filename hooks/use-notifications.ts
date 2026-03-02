// Hook compartido para notificaciones
// Centraliza el polling, conteo, listado y auto-mark-as-read
// Usado por el header (HeaderUtilityBar) en lugar de duplicar en header + sidebar

"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { createLogger } from "@/lib/logger"

const logger = createLogger("use-notifications")

interface Notification {
  _id: string
  title?: string
  message?: string
  type?: string
  status?: string
  childId?: string
  createdAt?: string
  readAt?: string
  metadata?: {
    childName?: string
    [key: string]: any
  }
}

export function useNotifications() {
  const { data: session } = useSession()
  const [notificationCount, setNotificationCount] = useState(0)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notificationsLoading, setNotificationsLoading] = useState(false)

  const isAdmin = session?.user?.role === "admin"

  // Polling del conteo
  useEffect(() => {
    if (!session?.user?.email) return
    let isMounted = true

    const fetchCount = async () => {
      if (!isMounted) return
      try {
        const response = await fetch("/api/notifications/count")
        if (response.ok) {
          const data = await response.json()
          setNotificationCount(data.count || 0)
        }
      } catch (error) {
        logger.error("Error fetching notification count:", error)
      }
    }

    fetchCount()

    // Admins: 30s, otros: 60s
    const refreshInterval = isAdmin ? 30000 : 60000
    const interval = setInterval(fetchCount, refreshInterval)

    const handleUpdated = () => fetchCount()
    window.addEventListener("notificationsUpdated", handleUpdated)

    return () => {
      isMounted = false
      clearInterval(interval)
      window.removeEventListener("notificationsUpdated", handleUpdated)
    }
  }, [session?.user?.email, isAdmin])

  // Cargar lista y auto-mark-as-read cuando se abre
  const fetchNotificationsList = useCallback(async () => {
    if (!session?.user?.id) return
    setNotificationsLoading(true)

    try {
      const response = await fetch("/api/notifications/history?limit=10")
      if (!response.ok) throw new Error("Error cargando notificaciones")

      const data = await response.json()
      const list: Notification[] = data.notifications || []
      setNotifications(list)

      // Marcar como leidas las notificaciones de invitacion
      const toMark = list
        .filter((item) =>
          item?.status === "delivered" &&
          ["invitation", "invitation_response"].includes(item?.type || "")
        )
        .map((item) => item?._id)
        .filter(Boolean)

      if (toMark.length > 0) {
        await Promise.all(toMark.map((id) =>
          fetch("/api/notifications/history", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ notificationId: id, action: "read" }),
          })
        ))

        window.dispatchEvent(new CustomEvent("notificationsUpdated"))
        setNotifications((current) => current.map((item) =>
          toMark.includes(item._id)
            ? { ...item, status: "read", readAt: new Date().toISOString() }
            : item
        ))
      }
    } catch (error) {
      logger.error("Error loading notifications list:", error)
    } finally {
      setNotificationsLoading(false)
    }
  }, [session?.user?.id])

  // Auto-refresh cuando esta abierto
  useEffect(() => {
    if (notificationsOpen) {
      fetchNotificationsList()

      // Admins: auto-refrescar cada 15s mientras esta abierto
      if (isAdmin) {
        const refreshInterval = setInterval(fetchNotificationsList, 15000)
        return () => clearInterval(refreshInterval)
      }
    }
  }, [notificationsOpen, isAdmin, fetchNotificationsList])

  return {
    notificationCount,
    notifications,
    notificationsOpen,
    setNotificationsOpen,
    notificationsLoading,
  }
}
