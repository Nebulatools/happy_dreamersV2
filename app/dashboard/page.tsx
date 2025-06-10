"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useSession } from "next-auth/react"
import { Loader2, FileText, Users, ChevronDown, ChevronRight } from "lucide-react"
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  format,
  parseISO,
  differenceInMinutes,
  getHours,
  getMinutes
} from "date-fns"
import { es } from "date-fns/locale"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Badge } from "@/components/ui/badge"
import jsPDF from 'jspdf'

interface User {
  _id: string
  name: string
  email: string
  role: string
}

interface Child {
  _id: string
  firstName: string
  lastName: string
  birthDate?: string
  parentId: string
  createdAt: string
}

interface Event {
  _id: string
  childId: string
  eventType: string
  emotionalState: string
  startTime: string
  endTime?: string
  notes?: string
  createdAt: string
}

interface SleepScore {
  score: number
  totalSleepHours: string
  averageWakeTime: string
  averageFirstNapTime: string
  consistency: string
  quality: string
}

interface FamilyData {
  user: User
  children: Child[]
  sleepScores: Record<string, SleepScore>
  isExpanded: boolean
}

export default function DashboardPage() {
  const { toast } = useToast()
  const { data: session } = useSession()
  const [period, setPeriod] = useState("6months") // EMPEZAR CON 6 MESES PARA CAPTURAR TODOS LOS DATOS
  const [isLoading, setIsLoading] = useState(false)
  const [families, setFamilies] = useState<FamilyData[]>([])
  const [isGeneratingReport, setIsGeneratingReport] = useState<string | null>(null)

  // Verificar si es admin
  const isAdmin = session?.user?.role === "admin"

  // Obtener rango de fechas CORRECTO para cada período
  const getDateRange = () => {
    const now = new Date()
    
    switch (period) {
      case "week":
        const oneWeekAgo = new Date(now)
        oneWeekAgo.setDate(now.getDate() - 7)
        return {
          start: oneWeekAgo,
          end: now
        }
      case "month":
        const oneMonthAgo = new Date(now)
        oneMonthAgo.setMonth(now.getMonth() - 1)
        return {
          start: oneMonthAgo,
          end: now
        }
      case "3months":
        const threeMonthsAgo = new Date(now)
        threeMonthsAgo.setMonth(now.getMonth() - 3)
        return {
          start: threeMonthsAgo,
          end: now
        }
      case "6months":
        const sixMonthsAgo = new Date(now)
        sixMonthsAgo.setMonth(now.getMonth() - 6)
        return {
          start: sixMonthsAgo,
          end: now
        }
      default:
        const defaultSixMonthsAgo = new Date(now)
        defaultSixMonthsAgo.setMonth(now.getMonth() - 6)
        return {
          start: defaultSixMonthsAgo,
          end: now
        }
    }
  }

  // Calcular sleep score usando lógica SIMPLE y EFECTIVA
  const calculateSleepScore = useCallback(async (childId: string): Promise<SleepScore> => {
    try {
      const { start, end } = getDateRange()
      
      // Cargar eventos del niño
      const response = await fetch(`/api/children/events?childId=${childId}`)
      if (!response.ok) throw new Error('Error al cargar eventos')
      
      const data = await response.json()
      const events = data.events || []
      
      console.log(`[DEBUG] Niño ${childId}: ${events.length} eventos totales`)
      console.log(`[DEBUG] Período: ${format(start, 'yyyy-MM-dd')} a ${format(end, 'yyyy-MM-dd')}`)
      
      // APLICAR FILTRO DE FECHAS REALMENTE
      const filteredEvents = events.filter((event: Event) => {
        const eventDate = parseISO(event.startTime)
        return eventDate >= start && eventDate <= end
      })
      
      console.log(`[DEBUG] Eventos filtrados: ${filteredEvents.length} de ${events.length}`)
      
      if (filteredEvents.length === 0) {
        return {
          score: 0,
          totalSleepHours: "Sin datos",
          averageWakeTime: "Sin datos", 
          averageFirstNapTime: "Sin datos",
          consistency: "Sin datos",
          quality: "Sin datos"
        }
      }

      // Calcular métricas usando eventos FILTRADOS
      const sleepEvents = filteredEvents.filter((e: Event) => e.eventType === 'sleep' && e.endTime)
      const napEvents = filteredEvents.filter((e: Event) => e.eventType === 'nap')
      
      console.log(`[DEBUG] ${childId}: ${sleepEvents.length} eventos sleep, ${napEvents.length} eventos nap EN EL PERÍODO`)

      // 1. HORA DE DESPERTAR PROMEDIO
      let averageWakeTime = "N/A"
      if (sleepEvents.length > 0) {
        const avgWakeMinutes = sleepEvents.reduce((sum: number, event: Event) => {
          const endTime = parseISO(event.endTime!)
          return sum + (getHours(endTime) * 60 + getMinutes(endTime))
        }, 0) / sleepEvents.length
        
        const hours = Math.floor(avgWakeMinutes / 60)
        const minutes = Math.round(avgWakeMinutes % 60)
        averageWakeTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
      }

      // 2. PRIMERA SIESTA PROMEDIO
      let averageFirstNapTime = "N/A"
      if (napEvents.length > 0) {
        // Agrupar siestas por día
        const napsByDay = napEvents.reduce((acc: Record<string, Event[]>, nap: Event) => {
          const day = format(parseISO(nap.startTime), 'yyyy-MM-dd')
          if (!acc[day]) acc[day] = []
          acc[day].push(nap)
          return acc
        }, {} as Record<string, Event[]>)

        const firstNaps = Object.values(napsByDay).map((dayNaps: any) => 
          dayNaps.sort((a: any, b: any) => parseISO(a.startTime).getTime() - parseISO(b.startTime).getTime())[0]
        )

        if (firstNaps.length > 0) {
          const avgFirstNapMinutes = firstNaps.reduce((sum: number, nap: Event) => {
            const startTime = parseISO(nap.startTime)
            return sum + (getHours(startTime) * 60 + getMinutes(startTime))
          }, 0) / firstNaps.length
          
          const hours = Math.floor(avgFirstNapMinutes / 60)
          const minutes = Math.round(avgFirstNapMinutes % 60)
          averageFirstNapTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
        }
      }

      // 3. TOTAL DE HORAS DE SUEÑO
      let totalSleepHours = "0h 0min"
      const completedSleepEvents = filteredEvents.filter((e: Event) => (e.eventType === 'sleep' || e.eventType === 'nap') && e.endTime)
      if (completedSleepEvents.length > 0) {
        const totalMinutes = completedSleepEvents.reduce((sum: number, event: Event) => {
          return sum + differenceInMinutes(parseISO(event.endTime!), parseISO(event.startTime))
        }, 0)
        
        const avgMinutesPerDay = totalMinutes / Math.max(1, new Set(completedSleepEvents.map((e: Event) => format(parseISO(e.startTime), 'yyyy-MM-dd'))).size)
        const hours = Math.floor(avgMinutesPerDay / 60)
        const minutes = Math.round(avgMinutesPerDay % 60)
        totalSleepHours = `${hours}h ${minutes}min`
      }

      // 4. CALCULAR SCORE SIMPLE
      let score = 0
      
      // Puntos por tener eventos de sueño
      score += Math.min(40, sleepEvents.length * 10)
      
      // Puntos por tener siestas
      score += Math.min(30, napEvents.length * 5)
      
      // Puntos por completitud de datos
      score += Math.min(30, completedSleepEvents.length * 3)
      
      score = Math.round(Math.min(100, score))
      
      // Determinar calidad
      const quality = score >= 80 ? "Excelente" : score >= 60 ? "Buena" : score >= 30 ? "Regular" : "Necesita atención"
      const consistency = sleepEvents.length >= 5 ? "Alta" : sleepEvents.length >= 2 ? "Media" : "Baja"
      
      console.log(`[DEBUG] Score final ${childId}:`, { score, totalSleepHours, averageWakeTime, averageFirstNapTime })
      
      return {
        score,
        totalSleepHours,
        averageWakeTime,
        averageFirstNapTime,
        consistency,
        quality
      }
    } catch (error) {
      console.error('Error calculating sleep score:', error)
      return {
        score: 0,
        totalSleepHours: "Error",
        averageWakeTime: "Error",
        averageFirstNapTime: "Error",
        consistency: "Error",
        quality: "Error"
      }
    }
  }, [period])

  // Cargar datos de familias
  const loadFamiliesData = useCallback(async () => {
    try {
      setIsLoading(true)
      
      // Cargar usuarios (familias)
      const usersResponse = await fetch('/api/admin/users')
      if (!usersResponse.ok) throw new Error('Error al cargar usuarios')
      
      const users = await usersResponse.json()
      const parentUsers = users.filter((user: User) => user.role === 'parent')
      
      const familiesData: FamilyData[] = []
      
      // Para cada familia, cargar niños y calcular sleep scores
      for (const user of parentUsers) {
        try {
          // Cargar niños de la familia
          const childrenResponse = await fetch(`/api/children?userId=${user._id}`)
          if (!childrenResponse.ok) continue
          
          const children = await childrenResponse.json()
          const sleepScores: Record<string, SleepScore> = {}
          
          // Calcular sleep score para cada niño
          for (const child of children) {
            const sleepScore = await calculateSleepScore(child._id)
            sleepScores[child._id] = sleepScore
          }
          
          familiesData.push({
            user,
            children,
            sleepScores,
            isExpanded: false
          })
        } catch (error) {
          console.error(`Error loading data for user ${user._id}:`, error)
        }
      }
      
      setFamilies(familiesData)
    } catch (error) {
      console.error('Error:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos de las familias.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [calculateSleepScore, toast])

  // Generar reporte PDF simple
  const generateAIReport = async (child: Child) => {
    try {
      setIsGeneratingReport(child._id)
      
      // Llamar al endpoint de IA para generar análisis inteligente
      const response = await fetch('/api/admin/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          childId: child._id,
          period: period
        }),
      })

      if (!response.ok) {
        throw new Error('Error al generar análisis de IA')
      }

      const { report } = await response.json()
      
      // Crear PDF profesional con análisis de IA
      const pdf = new jsPDF()
      const pageWidth = pdf.internal.pageSize.width
      const margin = 20
      const lineHeight = 7
      let yPosition = margin + 20

      // Título principal
      pdf.setFontSize(18)
      pdf.setFont('helvetica', 'bold')
      pdf.text(report.title, margin, yPosition)
      yPosition += lineHeight * 2

      // Fecha y período
      pdf.setFontSize(11)
      pdf.setFont('helvetica', 'normal')
      pdf.text(`Período analizado: ${report.period}`, margin, yPosition)
      yPosition += lineHeight
      pdf.text(`Fecha del reporte: ${report.dataPoints.analysisDate}`, margin, yPosition)
      yPosition += lineHeight * 2

      // Resumen ejecutivo
      pdf.setFontSize(14)
      pdf.setFont('helvetica', 'bold')
      pdf.text('RESUMEN EJECUTIVO', margin, yPosition)
      yPosition += lineHeight

      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')
      const summaryLines = pdf.splitTextToSize(report.executiveSummary, pageWidth - 2 * margin)
      summaryLines.forEach((line: string) => {
        pdf.text(line, margin, yPosition)
        yPosition += lineHeight
      })
      yPosition += lineHeight

      // Métricas clave
      pdf.setFontSize(14)
      pdf.setFont('helvetica', 'bold')
      pdf.text('MÉTRICAS CLAVE', margin, yPosition)
      yPosition += lineHeight

      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')
      pdf.text(`• Sleep Score: ${Math.round(report.metrics.sleepScore)}/100`, margin, yPosition)
      yPosition += lineHeight
      pdf.text(`• Score de Consistencia: ${Math.round(report.metrics.consistencyScore)}/100`, margin, yPosition)
      yPosition += lineHeight
      pdf.text(`• Score Emocional: ${Math.round(report.metrics.emotionalScore)}/100`, margin, yPosition)
      yPosition += lineHeight
      pdf.text(`• Horas promedio de sueño: ${report.sleepAnalysis.avgHours}h`, margin, yPosition)
      yPosition += lineHeight * 2

      // Análisis de sueño
      pdf.setFontSize(14)
      pdf.setFont('helvetica', 'bold')
      pdf.text('ANÁLISIS DE PATRONES DE SUEÑO', margin, yPosition)
      yPosition += lineHeight

      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')
      pdf.text(`Calidad del sueño: ${report.sleepAnalysis.quality}`, margin, yPosition)
      yPosition += lineHeight

      const scheduleLines = pdf.splitTextToSize(report.sleepAnalysis.schedule, pageWidth - 2 * margin)
      scheduleLines.forEach((line: string) => {
        pdf.text(line, margin, yPosition)
        yPosition += lineHeight
      })
      yPosition += lineHeight

      pdf.text(`Consistencia: ${report.sleepAnalysis.consistency}`, margin, yPosition)
      yPosition += lineHeight * 2

      // Análisis emocional
      pdf.setFontSize(14)
      pdf.setFont('helvetica', 'bold')
      pdf.text('ANÁLISIS EMOCIONAL', margin, yPosition)
      yPosition += lineHeight

      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')
      const emotionalLines = pdf.splitTextToSize(report.emotionalAnalysis.overview, pageWidth - 2 * margin)
      emotionalLines.forEach((line: string) => {
        pdf.text(line, margin, yPosition)
        yPosition += lineHeight
      })
      yPosition += lineHeight

      const moodLines = pdf.splitTextToSize(`Distribución de estados: ${report.emotionalAnalysis.moodBreakdown}`, pageWidth - 2 * margin)
      moodLines.forEach((line: string) => {
        pdf.text(line, margin, yPosition)
        yPosition += lineHeight
      })
      yPosition += lineHeight * 2

      // Recomendaciones
      pdf.setFontSize(14)
      pdf.setFont('helvetica', 'bold')
      pdf.text('RECOMENDACIONES', margin, yPosition)
      yPosition += lineHeight

      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')
      report.recommendations.forEach((recommendation: string, index: number) => {
        const recLines = pdf.splitTextToSize(`${index + 1}. ${recommendation}`, pageWidth - 2 * margin)
        recLines.forEach((line: string) => {
          // Nueva página si es necesario
          if (yPosition > 280) {
            pdf.addPage()
            yPosition = margin + 20
          }
          pdf.text(line, margin, yPosition)
          yPosition += lineHeight
        })
        yPosition += lineHeight / 2
      })

      // Datos de respaldo
      yPosition += lineHeight
      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'bold')
      pdf.text('DATOS UTILIZADOS', margin, yPosition)
      yPosition += lineHeight

      pdf.setFontSize(9)
      pdf.setFont('helvetica', 'normal')
      pdf.text(`Total de eventos analizados: ${report.dataPoints.totalEvents}`, margin, yPosition)
      yPosition += lineHeight / 1.5
      pdf.text(`Eventos de sueño nocturno: ${report.dataPoints.sleepEvents}`, margin, yPosition)
      yPosition += lineHeight / 1.5
      pdf.text(`Eventos de siesta: ${report.dataPoints.napEvents}`, margin, yPosition)

      // Descargar
      pdf.save(`reporte-IA-${child.firstName}-${child.lastName}-${period}.pdf`)
      
      toast({
        title: "🤖 Reporte con IA Generado",
        description: `Análisis inteligente de ${child.firstName} descargado exitosamente.`,
      })
      
    } catch (error) {
      console.error('Error generating AI report:', error)
      toast({
        title: "Error",
        description: "No se pudo generar el reporte con IA.",
        variant: "destructive",
      })
    } finally {
      setIsGeneratingReport(null)
    }
  }

  // Expandir/contraer familia
  const toggleFamily = (familyIndex: number) => {
    setFamilies(prev => prev.map((family: FamilyData, index: number) => 
      index === familyIndex 
        ? { ...family, isExpanded: !family.isExpanded }
        : family
    ))
  }

  // Obtener color del score
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-50"
    if (score >= 60) return "text-yellow-600 bg-yellow-50"
    if (score >= 30) return "text-orange-600 bg-orange-50"
    return "text-red-600 bg-red-50"
  }

  // Obtener color del badge de calidad
  const getQualityBadgeVariant = (quality: string) => {
    switch (quality) {
      case "Excelente": return "default"
      case "Buena": return "secondary"
      case "Regular": return "outline"
      default: return "destructive"
    }
  }

  // Cargar datos al montar componente Y CUANDO CAMBIE EL PERÍODO
  useEffect(() => {
    if (isAdmin) {
      loadFamiliesData()
    }
  }, [isAdmin, loadFamiliesData, period])

  // Si no es admin, mostrar mensaje de acceso denegado
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Users className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-2xl font-bold">Acceso Restringido</h2>
        <p className="text-muted-foreground text-center">
          Este dashboard está disponible solo para administradores.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard de Administración</h1>
          <p className="text-muted-foreground">
            Gestión de familias y análisis de patrones de sueño
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Seleccionar período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Última semana</SelectItem>
              <SelectItem value="month">Último mes</SelectItem>
              <SelectItem value="3months">Últimos 3 meses</SelectItem>
              <SelectItem value="6months">Últimos 6 meses</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Cargando datos de familias...</span>
        </div>
      ) : (
        <div className="space-y-4">
          {families.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No se encontraron familias registradas.</p>
              </CardContent>
            </Card>
          ) : (
            families.map((family: FamilyData, familyIndex: number) => (
              <Card key={family.user._id}>
                <Collapsible open={family.isExpanded} onOpenChange={() => toggleFamily(familyIndex)}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {family.isExpanded ? (
                            <ChevronDown className="h-5 w-5" />
                          ) : (
                            <ChevronRight className="h-5 w-5" />
                          )}
                          <div>
                            <CardTitle className="text-xl">{family.user.name}</CardTitle>
                            <CardDescription>{family.user.email}</CardDescription>
                          </div>
                        </div>
                        <Badge variant="outline">
                          {family.children.length} {family.children.length === 1 ? 'niño' : 'niños'}
                        </Badge>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <CardContent>
                      {family.children.length === 0 ? (
                        <p className="text-muted-foreground text-center py-4">
                          Esta familia no tiene niños registrados.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {family.children.map((child: Child) => {
                            const sleepScore = family.sleepScores[child._id]
                            return (
                              <div key={child._id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                                <div className="flex items-center space-x-4 flex-1">
                                  <div className="flex items-center space-x-3">
                                    <div className={`text-xl font-bold px-3 py-1 rounded-full ${getScoreColor(sleepScore.score)}`}>
                                      {sleepScore.score}
                                    </div>
                                    <div>
                                      <h4 className="font-semibold">{child.firstName} {child.lastName}</h4>
                                      <Badge variant={getQualityBadgeVariant(sleepScore.quality)} className="text-xs">
                                        {sleepScore.quality}
                                      </Badge>
                                    </div>
                                  </div>
                                  
                                  <div className="hidden md:flex items-center space-x-6 text-sm">
                                    <div className="text-center">
                                      <p className="text-muted-foreground">Sueño total</p>
                                      <p className="font-medium">{sleepScore.totalSleepHours}</p>
                                    </div>
                                    <div className="text-center">
                                      <p className="text-muted-foreground">Despertar</p>
                                      <p className="font-medium">{sleepScore.averageWakeTime}</p>
                                    </div>
                                    <div className="text-center">
                                      <p className="text-muted-foreground">Primera siesta</p>
                                      <p className="font-medium">{sleepScore.averageFirstNapTime}</p>
                                    </div>
                                    <div className="text-center">
                                      <p className="text-muted-foreground">Consistencia</p>
                                      <p className="font-medium">{sleepScore.consistency}</p>
                                    </div>
                                  </div>
                                </div>
                                
                                <Button 
                                  onClick={() => generateAIReport(child)}
                                  disabled={isGeneratingReport === child._id}
                                  variant="outline"
                                  size="sm"
                                >
                                  {isGeneratingReport === child._id ? (
                                    <>
                                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                      Generando...
                                    </>
                                  ) : (
                                    <>
                                      <FileText className="h-4 w-4 mr-2" />
                                      Descargar PDF
                                    </>
                                  )}
                                </Button>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  )
}
