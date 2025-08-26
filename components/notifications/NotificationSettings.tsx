"use client"

// Componente para configuración de notificaciones de sueño

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Icons } from "@/components/icons"
import { toast } from "sonner"
import { Separator } from "@/components/ui/separator"

interface NotificationSettingsProps {
  childId: string
  childName: string
}

interface NotificationConfig {
  globalEnabled: boolean
  bedtime: {
    enabled: boolean
    timing: number
    customMessage?: string
  }
  naptime: {
    enabled: boolean
    timing: number
    customMessage?: string
  }
  wakeWindow: {
    enabled: boolean
    timing: number
    customMessage?: string
  }
  routineStart: {
    enabled: boolean
    timing: number
    customMessage?: string
  }
  pushEnabled: boolean
  emailEnabled: boolean
  inAppEnabled: boolean
  quietHours: {
    enabled: boolean
    start: string
    end: string
  }
}

export function NotificationSettings({ childId, childName }: NotificationSettingsProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [config, setConfig] = useState<NotificationConfig>({
    globalEnabled: true,
    bedtime: { enabled: true, timing: 15 },
    naptime: { enabled: true, timing: 15 },
    wakeWindow: { enabled: false, timing: 10 },
    routineStart: { enabled: true, timing: 30 },
    pushEnabled: true,
    emailEnabled: false,
    inAppEnabled: true,
    quietHours: { enabled: false, start: "22:00", end: "07:00" }
  })
  const [pushPermission, setPushPermission] = useState<NotificationPermission>("default")

  // Cargar configuración actual
  useEffect(() => {
    loadSettings()
    checkPushPermission()
  }, [childId])

  const loadSettings = async () => {
    try {
      const response = await fetch(`/api/notifications/settings?childId=${childId}`)
      if (!response.ok) throw new Error("Error cargando configuración")
      
      const data = await response.json()
      if (data.settings) {
        setConfig(data.settings)
      }
    } catch (error) {
      console.error("Error:", error)
      toast.error("Error al cargar configuración de notificaciones")
    } finally {
      setLoading(false)
    }
  }

  const checkPushPermission = () => {
    if ("Notification" in window) {
      setPushPermission(Notification.permission)
    }
  }

  const requestPushPermission = async () => {
    if (!("Notification" in window)) {
      toast.error("Tu navegador no soporta notificaciones push")
      return
    }

    try {
      const permission = await Notification.requestPermission()
      setPushPermission(permission)
      
      if (permission === "granted") {
        toast.success("Notificaciones push habilitadas")
        // Aquí registraríamos el service worker y obtenemos el token
        await registerPushToken()
      } else if (permission === "denied") {
        toast.error("Has denegado los permisos de notificación")
      }
    } catch (error) {
      console.error("Error solicitando permisos:", error)
      toast.error("Error al solicitar permisos de notificación")
    }
  }

  const registerPushToken = async () => {
    // Esta función se implementará con el service worker
    // Por ahora solo simulamos el registro
    try {
      const response = await fetch("/api/notifications/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childId,
          token: "demo-token-" + Date.now(), // Token temporal
          platform: "web"
        })
      })
      
      if (!response.ok) throw new Error("Error registrando token")
      toast.success("Dispositivo registrado para notificaciones")
    } catch (error) {
      console.error("Error:", error)
      toast.error("Error al registrar dispositivo")
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      const response = await fetch("/api/notifications/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childId,
          ...config
        })
      })
      
      if (!response.ok) throw new Error("Error guardando configuración")
      
      toast.success("Configuración guardada exitosamente")
    } catch (error) {
      console.error("Error:", error)
      toast.error("Error al guardar configuración")
    } finally {
      setSaving(false)
    }
  }

  const updateEventConfig = (
    event: "bedtime" | "naptime" | "wakeWindow" | "routineStart",
    field: "enabled" | "timing" | "customMessage",
    value: any
  ) => {
    setConfig(prev => ({
      ...prev,
      [event]: {
        ...prev[event],
        [field]: value
      }
    }))
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Icons.spinner className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Notificaciones de {childName}</CardTitle>
            <CardDescription>
              Configura recordatorios automáticos para los horarios de sueño
            </CardDescription>
          </div>
          <Switch
            checked={config.globalEnabled}
            onCheckedChange={(checked) => 
              setConfig(prev => ({ ...prev, globalEnabled: checked }))
            }
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Solicitar permisos de notificación si es necesario */}
        {pushPermission === "default" && config.globalEnabled && (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
            <div className="flex items-start space-x-3">
              <Icons.bell className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-900">
                  Habilitar notificaciones push
                </p>
                <p className="text-sm text-yellow-700 mt-1">
                  Necesitamos tu permiso para enviarte recordatorios
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={requestPushPermission}
                >
                  Habilitar notificaciones
                </Button>
              </div>
            </div>
          </div>
        )}

        {pushPermission === "denied" && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="flex items-start space-x-3">
              <Icons.alertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-900">
                  Notificaciones bloqueadas
                </p>
                <p className="text-sm text-red-700 mt-1">
                  Has bloqueado las notificaciones. Ve a la configuración de tu navegador para habilitarlas.
                </p>
              </div>
            </div>
          </div>
        )}

        <Tabs defaultValue="events" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="events">Eventos</TabsTrigger>
            <TabsTrigger value="channels">Canales</TabsTrigger>
            <TabsTrigger value="quiet">Horario Silencioso</TabsTrigger>
          </TabsList>

          {/* Configuración de eventos */}
          <TabsContent value="events" className="space-y-4 mt-4">
            {/* Hora de dormir */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Hora de dormir</Label>
                  <p className="text-sm text-muted-foreground">
                    Recordatorio antes de la hora de dormir nocturna
                  </p>
                </div>
                <Switch
                  checked={config.bedtime.enabled}
                  onCheckedChange={(checked) => 
                    updateEventConfig("bedtime", "enabled", checked)
                  }
                  disabled={!config.globalEnabled}
                />
              </div>
              {config.bedtime.enabled && (
                <div className="ml-6 space-y-3">
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="bedtime-timing">Avisar con</Label>
                    <Select
                      value={config.bedtime.timing.toString()}
                      onValueChange={(value) => 
                        updateEventConfig("bedtime", "timing", parseInt(value))
                      }
                      disabled={!config.globalEnabled}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 minutos</SelectItem>
                        <SelectItem value="10">10 minutos</SelectItem>
                        <SelectItem value="15">15 minutos</SelectItem>
                        <SelectItem value="30">30 minutos</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-sm text-muted-foreground">de anticipación</span>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Hora de siesta */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Hora de siesta</Label>
                  <p className="text-sm text-muted-foreground">
                    Recordatorio para las siestas programadas
                  </p>
                </div>
                <Switch
                  checked={config.naptime.enabled}
                  onCheckedChange={(checked) => 
                    updateEventConfig("naptime", "enabled", checked)
                  }
                  disabled={!config.globalEnabled}
                />
              </div>
              {config.naptime.enabled && (
                <div className="ml-6 space-y-3">
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="naptime-timing">Avisar con</Label>
                    <Select
                      value={config.naptime.timing.toString()}
                      onValueChange={(value) => 
                        updateEventConfig("naptime", "timing", parseInt(value))
                      }
                      disabled={!config.globalEnabled}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 minutos</SelectItem>
                        <SelectItem value="10">10 minutos</SelectItem>
                        <SelectItem value="15">15 minutos</SelectItem>
                        <SelectItem value="30">30 minutos</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-sm text-muted-foreground">de anticipación</span>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Inicio de rutina */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Inicio de rutina</Label>
                  <p className="text-sm text-muted-foreground">
                    Recordatorio para comenzar la rutina de sueño
                  </p>
                </div>
                <Switch
                  checked={config.routineStart.enabled}
                  onCheckedChange={(checked) => 
                    updateEventConfig("routineStart", "enabled", checked)
                  }
                  disabled={!config.globalEnabled}
                />
              </div>
              {config.routineStart.enabled && (
                <div className="ml-6 space-y-3">
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="routine-timing">Avisar con</Label>
                    <Select
                      value={config.routineStart.timing.toString()}
                      onValueChange={(value) => 
                        updateEventConfig("routineStart", "timing", parseInt(value))
                      }
                      disabled={!config.globalEnabled}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 minutos</SelectItem>
                        <SelectItem value="10">10 minutos</SelectItem>
                        <SelectItem value="15">15 minutos</SelectItem>
                        <SelectItem value="30">30 minutos</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-sm text-muted-foreground">de anticipación</span>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Configuración de canales */}
          <TabsContent value="channels" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Notificaciones Push</Label>
                  <p className="text-sm text-muted-foreground">
                    Recibe alertas en tu dispositivo
                  </p>
                </div>
                <Switch
                  checked={config.pushEnabled}
                  onCheckedChange={(checked) => 
                    setConfig(prev => ({ ...prev, pushEnabled: checked }))
                  }
                  disabled={!config.globalEnabled || pushPermission !== "granted"}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Notificaciones en App</Label>
                  <p className="text-sm text-muted-foreground">
                    Ver recordatorios dentro de la aplicación
                  </p>
                </div>
                <Switch
                  checked={config.inAppEnabled}
                  onCheckedChange={(checked) => 
                    setConfig(prev => ({ ...prev, inAppEnabled: checked }))
                  }
                  disabled={!config.globalEnabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Email</Label>
                  <p className="text-sm text-muted-foreground">
                    Recibe recordatorios por correo electrónico
                  </p>
                </div>
                <Switch
                  checked={config.emailEnabled}
                  onCheckedChange={(checked) => 
                    setConfig(prev => ({ ...prev, emailEnabled: checked }))
                  }
                  disabled={!config.globalEnabled}
                />
              </div>
            </div>
          </TabsContent>

          {/* Horario silencioso */}
          <TabsContent value="quiet" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Horario Silencioso</Label>
                  <p className="text-sm text-muted-foreground">
                    No recibir notificaciones durante estas horas
                  </p>
                </div>
                <Switch
                  checked={config.quietHours.enabled}
                  onCheckedChange={(checked) => 
                    setConfig(prev => ({
                      ...prev,
                      quietHours: { ...prev.quietHours, enabled: checked }
                    }))
                  }
                  disabled={!config.globalEnabled}
                />
              </div>

              {config.quietHours.enabled && (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="quiet-start">Desde</Label>
                    <Input
                      id="quiet-start"
                      type="time"
                      value={config.quietHours.start}
                      onChange={(e) => 
                        setConfig(prev => ({
                          ...prev,
                          quietHours: { ...prev.quietHours, start: e.target.value }
                        }))
                      }
                      className="w-32"
                      disabled={!config.globalEnabled}
                    />
                    <Label htmlFor="quiet-end">hasta</Label>
                    <Input
                      id="quiet-end"
                      type="time"
                      value={config.quietHours.end}
                      onChange={(e) => 
                        setConfig(prev => ({
                          ...prev,
                          quietHours: { ...prev.quietHours, end: e.target.value }
                        }))
                      }
                      className="w-32"
                      disabled={!config.globalEnabled}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    No recibirás notificaciones entre {config.quietHours.start} y {config.quietHours.end}
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Botón guardar */}
        <div className="flex justify-end pt-4">
          <Button
            onClick={saveSettings}
            disabled={saving || !config.globalEnabled}
          >
            {saving ? (
              <>
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Icons.check className="mr-2 h-4 w-4" />
                Guardar configuración
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}