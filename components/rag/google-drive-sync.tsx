"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { 
  Cloud, 
  RefreshCw, 
  Play, 
  Pause, 
  RotateCcw,
  CheckCircle, 
  XCircle, 
  Clock,
  Folder,
  FileText,
  Activity,
  Settings,
  AlertTriangle
} from "lucide-react"

interface SyncStats {
  filesScanned: number
  filesProcessed: number
  filesSkipped: number
  chunksAdded: number
  errorsCount: number
}

interface SyncResult {
  success: boolean
  message: string
  stats: SyncStats
  duration: string
  syncType: string
  errors?: string[]
}

interface SchedulerStatus {
  isRunning: boolean
  interval: string
  nextRun: string | null
  lastRun: string | null
  runsCount: number
  errorsCount: number
}

interface DriveStatus {
  googleDrive: {
    isEnabled: boolean
    isConfigured: boolean
    lastSyncAt: string | null
    lastSyncStatus: string | null
    lastSyncResult: SyncResult | null
    totalDocuments: number
  }
  scheduler: SchedulerStatus
  configuration: {
    folderId: string | null
    clientEmail: string | null
    projectId: string | null
  }
}

export function GoogleDriveSync() {
  const { toast } = useToast()
  const [status, setStatus] = useState<DriveStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)

  // Cargar estado inicial
  useEffect(() => {
    loadStatus()
  }, [])

  const loadStatus = async () => {
    try {
      const response = await fetch('/api/rag/sync-drive')
      const data = await response.json()
      
      if (response.ok) {
        setStatus(data)
      } else {
        toast({
          title: "Error",
          description: data.error || "Error cargando estado de Google Drive",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error conectando con el servidor",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const testConnection = async () => {
    setTestingConnection(true)
    
    try {
      const response = await fetch('/api/rag/sync-drive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testConnection: true })
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "Conexión exitosa",
          description: data.message,
          variant: "default"
        })
      } else {
        toast({
          title: "Error de conexión",
          description: data.message,
          variant: "destructive"
        })
      }
      
      // Recargar estado
      await loadStatus()
      
    } catch (error) {
      toast({
        title: "Error",
        description: "Error probando conexión",
        variant: "destructive"
      })
    } finally {
      setTestingConnection(false)
    }
  }

  const runSync = async (fullSync: boolean = false) => {
    setSyncing(true)
    
    try {
      const response = await fetch('/api/rag/sync-drive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullSync })
      })
      
      const data: SyncResult = await response.json()
      
      if (data.success) {
        toast({
          title: "Sincronización exitosa",
          description: `${data.stats.filesProcessed} archivos procesados, ${data.stats.chunksAdded} chunks agregados`,
          variant: "default"
        })
      } else {
        toast({
          title: "Error en sincronización",
          description: data.message,
          variant: "destructive"
        })
      }
      
      // Recargar estado
      await loadStatus()
      
    } catch (error) {
      toast({
        title: "Error",
        description: "Error ejecutando sincronización",
        variant: "destructive"
      })
    } finally {
      setSyncing(false)
    }
  }

  const controlScheduler = async (action: 'start' | 'stop' | 'restart') => {
    try {
      const response = await fetch('/api/rag/sync-drive', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "Scheduler actualizado",
          description: data.message,
          variant: "default"
        })
        
        // Recargar estado
        await loadStatus()
      } else {
        toast({
          title: "Error",
          description: data.error || "Error controlando scheduler",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error conectando con el servidor",
        variant: "destructive"
      })
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Nunca'
    
    try {
      const date = new Date(dateStr)
      return date.toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return 'Fecha inválida'
    }
  }

  const getStatusBadge = (isEnabled: boolean, isConfigured: boolean, lastSyncStatus: string | null) => {
    if (!isEnabled) {
      return <Badge variant="secondary"><XCircle className="w-3 h-3 mr-1" />Deshabilitado</Badge>
    }
    
    if (!isConfigured) {
      return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />No configurado</Badge>
    }
    
    switch (lastSyncStatus) {
      case 'success':
        return <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" />Funcionando</Badge>
      case 'error':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Error</Badge>
      case 'running':
        return <Badge variant="secondary"><RefreshCw className="w-3 h-3 mr-1 animate-spin" />Sincronizando</Badge>
      default:
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Sin sincronizar</Badge>
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Cargando estado de Google Drive...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!status) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            Error cargando información de Google Drive
          </div>
        </CardContent>
      </Card>
    )
  }

  const { googleDrive, scheduler, configuration } = status

  return (
    <div className="space-y-6">
      {/* Estado general */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Cloud className="w-5 h-5" />
                <span>Google Drive Sync</span>
              </CardTitle>
              <CardDescription>
                Sincronización automática de documentos desde Google Drive
              </CardDescription>
            </div>
            {getStatusBadge(googleDrive.isEnabled, googleDrive.isConfigured, googleDrive.lastSyncStatus)}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Información de configuración */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
              <Settings className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-sm font-medium">Proyecto</p>
                <p className="text-xs text-gray-600">{configuration.projectId || 'No configurado'}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Folder className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-sm font-medium">Carpeta ID</p>
                <p className="text-xs text-gray-600 truncate">{configuration.folderId || 'No configurado'}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-sm font-medium">Documentos</p>
                <p className="text-xs text-gray-600">{googleDrive.totalDocuments} en total</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Información de última sincronización */}
          {googleDrive.lastSyncAt && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center space-x-2">
                <Activity className="w-4 h-4" />
                <span>Última Sincronización</span>
              </h4>
              
              <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Fecha:</span>
                  <span className="font-medium">{formatDate(googleDrive.lastSyncAt)}</span>
                </div>
                
                {googleDrive.lastSyncResult && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span>Tipo:</span>
                      <span className="font-medium capitalize">{googleDrive.lastSyncResult.syncType}</span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span>Duración:</span>
                      <span className="font-medium">{googleDrive.lastSyncResult.duration}</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-gray-600">Archivos escaneados:</span>
                        <span className="ml-1 font-medium">{googleDrive.lastSyncResult.stats.filesScanned}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Procesados:</span>
                        <span className="ml-1 font-medium">{googleDrive.lastSyncResult.stats.filesProcessed}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Saltados:</span>
                        <span className="ml-1 font-medium">{googleDrive.lastSyncResult.stats.filesSkipped}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Chunks agregados:</span>
                        <span className="ml-1 font-medium">{googleDrive.lastSyncResult.stats.chunksAdded}</span>
                      </div>
                    </div>

                    {googleDrive.lastSyncResult.errors && googleDrive.lastSyncResult.errors.length > 0 && (
                      <div className="mt-2 p-2 bg-red-50 rounded border-l-4 border-red-200">
                        <p className="text-xs font-medium text-red-800 mb-1">Errores encontrados:</p>
                        <ul className="text-xs text-red-700 space-y-1">
                          {googleDrive.lastSyncResult.errors.map((error, idx) => (
                            <li key={idx}>• {error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Acciones */}
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={testConnection}
              disabled={testingConnection || !googleDrive.isEnabled}
              variant="outline"
              size="sm"
            >
              {testingConnection ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              Probar Conexión
            </Button>

            <Button
              onClick={() => runSync(false)}
              disabled={syncing || !googleDrive.isConfigured}
              variant="outline"
              size="sm"
            >
              {syncing ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Sincronizar
            </Button>

            <Button
              onClick={() => runSync(true)}
              disabled={syncing || !googleDrive.isConfigured}
              variant="outline"
              size="sm"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Sincronización Completa
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Scheduler */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="w-5 h-5" />
            <span>Sincronización Automática</span>
          </CardTitle>
          <CardDescription>
            Control del scheduler para sincronización periódica
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">Estado del Scheduler</p>
              <div className="flex items-center space-x-2">
                {scheduler.isRunning ? (
                  <Badge variant="default">
                    <Play className="w-3 h-3 mr-1" />
                    Activo
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    <Pause className="w-3 h-3 mr-1" />
                    Detenido
                  </Badge>
                )}
                <span className="text-xs text-gray-600">
                  Intervalo: {scheduler.interval}
                </span>
              </div>
            </div>
            
            <div className="flex space-x-2">
              {scheduler.isRunning ? (
                <Button
                  onClick={() => controlScheduler('stop')}
                  variant="outline"
                  size="sm"
                >
                  <Pause className="w-4 h-4 mr-2" />
                  Detener
                </Button>
              ) : (
                <Button
                  onClick={() => controlScheduler('start')}
                  disabled={!googleDrive.isConfigured}
                  variant="outline"
                  size="sm"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Iniciar
                </Button>
              )}
              
              <Button
                onClick={() => controlScheduler('restart')}
                disabled={!googleDrive.isConfigured}
                variant="outline"
                size="sm"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reiniciar
              </Button>
            </div>
          </div>

          {scheduler.isRunning && (
            <div className="bg-blue-50 p-3 rounded-lg space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Próxima ejecución:</span>
                  <p className="font-medium">{formatDate(scheduler.nextRun)}</p>
                </div>
                <div>
                  <span className="text-gray-600">Última ejecución:</span>
                  <p className="font-medium">{formatDate(scheduler.lastRun)}</p>
                </div>
                <div>
                  <span className="text-gray-600">Total ejecuciones:</span>
                  <p className="font-medium">{scheduler.runsCount}</p>
                </div>
                <div>
                  <span className="text-gray-600">Errores:</span>
                  <p className="font-medium">{scheduler.errorsCount}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Información de configuración */}
      {!googleDrive.isEnabled && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-yellow-800">
                  Google Drive sync no está habilitado
                </p>
                <p className="text-xs text-yellow-700">
                  Para habilitarlo, configura las variables de entorno necesarias y establece 
                  GOOGLE_DRIVE_SYNC_ENABLED=true en tu archivo .env
                </p>
                <div className="mt-2">
                  <Button variant="outline" size="sm" asChild>
                    <a href="/docs/GOOGLE_DRIVE_CONFIGURATION.md" target="_blank" rel="noopener noreferrer">
                      Ver guía de configuración
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}