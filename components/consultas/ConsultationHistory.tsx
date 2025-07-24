// Componente para mostrar el historial de consultas anteriores
// Proporciona contexto histórico para mejores análisis

"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  History, 
  Calendar, 
  FileText, 
  Eye,
  Download,
  RefreshCw,
  Clock,
  User,
  Baby,
  Mic,
  Lightbulb
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { createLogger } from "@/lib/logger"

const logger = createLogger("ConsultationHistory")

interface ConsultationRecord {
  _id: string
  userId: string
  childId: string
  transcript: string
  analysis: string
  recommendations: string
  createdAt: string
  adminId: string
  userName?: string
  childName?: string
  adminName?: string
}

interface ConsultationHistoryProps {
  selectedUserId?: string
  selectedChildId?: string
  visible?: boolean
}

export function ConsultationHistory({ 
  selectedUserId, 
  selectedChildId,
  visible = true 
}: ConsultationHistoryProps) {
  const { toast } = useToast()
  
  const [consultations, setConsultations] = useState<ConsultationRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedConsultation, setSelectedConsultation] = useState<ConsultationRecord | null>(null)

  // Cargar historial cuando cambia la selección
  useEffect(() => {
    if (selectedChildId && visible) {
      loadConsultationHistory()
    } else {
      setConsultations([])
    }
  }, [selectedChildId, visible])

  const loadConsultationHistory = async () => {
    if (!selectedChildId) return

    setLoading(true)
    try {
      const response = await fetch(`/api/consultas/history?childId=${selectedChildId}`)
      
      if (!response.ok) {
        throw new Error('Error al cargar el historial')
      }
      
      const data = await response.json()
      setConsultations(data.consultations || [])
    } catch (error) {
      logger.error('Error:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar el historial de consultas.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Formatear fecha
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Truncar texto
  const truncateText = (text: string, maxLength: number = 150) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  // Descargar consulta específica
  const downloadConsultation = (consultation: ConsultationRecord) => {
    const report = `
CONSULTA PEDIÁTRICA
Fecha: ${formatDate(consultation.createdAt)}
${consultation.userName ? `Usuario: ${consultation.userName}` : ''}
${consultation.childName ? `Niño: ${consultation.childName}` : ''}

TRANSCRIPT:
${consultation.transcript}

ANÁLISIS:
${consultation.analysis}

RECOMENDACIONES:
${consultation.recommendations}

---
ID de Consulta: ${consultation._id}
Generado por Happy Dreamers AI Assistant
    `.trim()

    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `consulta-${consultation.childName || 'historica'}-${consultation.createdAt.slice(0, 10)}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: "Descarga iniciada",
      description: "La consulta se está descargando.",
    })
  }

  if (!visible) return null

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Historial de Consultas
            </CardTitle>
            <CardDescription>
              Consultas anteriores para contexto y seguimiento
            </CardDescription>
          </div>
          {selectedChildId && (
            <Button
              variant="outline"
              size="sm"
              onClick={loadConsultationHistory}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!selectedChildId ? (
          <div className="text-center py-8 text-muted-foreground">
            <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Selecciona un niño para ver su historial de consultas</p>
          </div>
        ) : loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-muted rounded animate-pulse"></div>
                <div className="h-3 bg-muted rounded animate-pulse w-3/4"></div>
                <div className="h-3 bg-muted rounded animate-pulse w-1/2"></div>
                {i < 3 && <Separator />}
              </div>
            ))}
          </div>
        ) : consultations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No hay consultas anteriores para este niño</p>
            <p className="text-sm">Las nuevas consultas aparecerán aquí</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[500px]">
            <div className="space-y-4">
              {consultations.map((consultation, index) => (
                <div key={consultation._id}>
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            Consulta #{consultations.length - index}
                          </Badge>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {formatDate(consultation.createdAt)}
                          </div>
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-2">
                          <strong>Análisis:</strong> {truncateText(consultation.analysis)}
                        </p>
                        
                        <p className="text-xs text-muted-foreground">
                          <strong>Recomendaciones:</strong> {truncateText(consultation.recommendations, 100)}
                        </p>
                      </div>
                      
                      <div className="flex gap-1 ml-4">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedConsultation(consultation)}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[80vh]">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                Consulta del {formatDate(consultation.createdAt)}
                              </DialogTitle>
                              <DialogDescription>
                                Consulta completa para {consultation.childName || 'el niño'}
                              </DialogDescription>
                            </DialogHeader>
                            
                            <ScrollArea className="max-h-[60vh]">
                              <div className="space-y-6">
                                {/* Transcript */}
                                <div>
                                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                                    <Mic className="h-4 w-4" />
                                    Transcript
                                  </h4>
                                  <div className="p-3 bg-muted rounded-lg text-sm">
                                    <pre className="whitespace-pre-wrap font-sans">
                                      {consultation.transcript}
                                    </pre>
                                  </div>
                                </div>
                                
                                <Separator />
                                
                                {/* Análisis */}
                                <div>
                                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                                    <FileText className="h-4 w-4" />
                                    Análisis
                                  </h4>
                                  <div className="p-3 bg-blue-50 rounded-lg text-sm">
                                    <pre className="whitespace-pre-wrap font-sans">
                                      {consultation.analysis}
                                    </pre>
                                  </div>
                                </div>
                                
                                <Separator />
                                
                                {/* Recomendaciones */}
                                <div>
                                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                                    <Lightbulb className="h-4 w-4" />
                                    Recomendaciones
                                  </h4>
                                  <div className="p-3 bg-green-50 rounded-lg text-sm">
                                    <pre className="whitespace-pre-wrap font-sans">
                                      {consultation.recommendations}
                                    </pre>
                                  </div>
                                </div>
                              </div>
                            </ScrollArea>
                            
                            <div className="flex justify-end gap-2 pt-4">
                              <Button
                                variant="outline"
                                onClick={() => downloadConsultation(consultation)}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Descargar
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadConsultation(consultation)}
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {index < consultations.length - 1 && <Separator className="mt-4" />}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}