"use client"

// Componente para probar el sistema de notificaciones

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Icons } from "@/components/icons"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"

interface NotificationTesterProps {
  childId: string
  childName: string
}

export function NotificationTester({ childId, childName }: NotificationTesterProps) {
  const [testing, setTesting] = useState(false)
  const [notificationType, setNotificationType] = useState("bedtime")
  const [delaySeconds, setDelaySeconds] = useState("5")

  const testNotification = async () => {
    setTesting(true)
    
    try {
      // Primero verificar permisos del navegador
      if ('Notification' in window) {
        if (Notification.permission === 'default') {
          const permission = await Notification.requestPermission()
          if (permission !== 'granted') {
            toast.warning("Necesitas permitir las notificaciones en tu navegador")
            setTesting(false)
            return
          }
        } else if (Notification.permission === 'denied') {
          toast.error("Las notificaciones están bloqueadas en tu navegador")
          setTesting(false)
          return
        }
      }

      // Enviar solicitud de prueba al servidor
      const response = await fetch("/api/notifications/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childId,
          type: notificationType,
          delaySeconds: parseInt(delaySeconds)
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Error enviando notificación")
      }

      const data = await response.json()
      
      // Mostrar toast de confirmación
      toast.success(`Notificación programada para ${childName}`, {
        description: `Se enviará en ${delaySeconds} segundos`
      })

      // Mostrar notificación del navegador después del delay
      setTimeout(() => {
        if ('Notification' in window && Notification.permission === 'granted') {
          const titles = {
            bedtime: "🌙 Hora de dormir",
            naptime: "☀️ Hora de siesta",
            routine_start: "🛁 Iniciar rutina",
            wake_window: "⏰ Ventana de vigilia"
          }
          
          const messages = {
            bedtime: `Es hora de preparar a ${childName} para dormir`,
            naptime: `Hora de siesta para ${childName}`,
            routine_start: `Inicia la rutina de sueño de ${childName}`,
            wake_window: `${childName} ha estado despierto por mucho tiempo`
          }

          new Notification(titles[notificationType] || "Notificación", {
            body: messages[notificationType] || "Notificación de prueba",
            icon: "/logo.png",
            badge: "/logo.png",
            tag: "test-notification",
            requireInteraction: false
          })

          // También mostrar como toast in-app
          toast.info(titles[notificationType], {
            description: messages[notificationType],
            duration: 5000
          })
        }
      }, parseInt(delaySeconds) * 1000)

    } catch (error: any) {
      console.error("Error:", error)
      toast.error(error.message || "Error al enviar notificación de prueba")
    } finally {
      setTesting(false)
    }
  }

  const checkSystemStatus = async () => {
    try {
      const response = await fetch("/api/notifications/test")
      if (!response.ok) throw new Error("Error verificando sistema")
      
      const data = await response.json()
      console.log("Estado del sistema:", data)
      
      // Mostrar información del sistema
      toast.success("Sistema de notificaciones activo", {
        description: `Configuraciones: ${data.settings.length}, ` +
                    `Browser: ${data.browserSupport.permission}`
      })
    } catch (error) {
      toast.error("Error verificando el sistema de notificaciones")
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Probar Notificaciones</CardTitle>
            <CardDescription>
              Envía una notificación de prueba para {childName}
            </CardDescription>
          </div>
          <Badge variant="secondary">Modo Prueba</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="type">Tipo de notificación</Label>
          <Select
            value={notificationType}
            onValueChange={setNotificationType}
          >
            <SelectTrigger id="type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bedtime">
                <div className="flex items-center space-x-2">
                  <Icons.moon className="h-4 w-4" />
                  <span>Hora de dormir</span>
                </div>
              </SelectItem>
              <SelectItem value="naptime">
                <div className="flex items-center space-x-2">
                  <Icons.sun className="h-4 w-4" />
                  <span>Hora de siesta</span>
                </div>
              </SelectItem>
              <SelectItem value="routine_start">
                <div className="flex items-center space-x-2">
                  <Icons.calendar className="h-4 w-4" />
                  <span>Iniciar rutina</span>
                </div>
              </SelectItem>
              <SelectItem value="wake_window">
                <div className="flex items-center space-x-2">
                  <Icons.clock className="h-4 w-4" />
                  <span>Ventana de vigilia</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="delay">Retraso antes de enviar</Label>
          <Select
            value={delaySeconds}
            onValueChange={setDelaySeconds}
          >
            <SelectTrigger id="delay">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Inmediatamente</SelectItem>
              <SelectItem value="5">5 segundos</SelectItem>
              <SelectItem value="10">10 segundos</SelectItem>
              <SelectItem value="30">30 segundos</SelectItem>
              <SelectItem value="60">1 minuto</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex space-x-2">
          <Button
            onClick={testNotification}
            disabled={testing}
            className="flex-1"
          >
            {testing ? (
              <>
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Icons.bell className="mr-2 h-4 w-4" />
                Enviar Notificación de Prueba
              </>
            )}
          </Button>
          
          <Button
            variant="outline"
            onClick={checkSystemStatus}
          >
            <Icons.info className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}