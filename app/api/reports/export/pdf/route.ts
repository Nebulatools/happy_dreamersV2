// API endpoint para exportar reportes a PDF

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import dbConnect from "@/lib/mongodb"
import ProfessionalReport from "@/models/professional-report"
import Child from "@/models/Child"
import SleepSession from "@/models/SleepSession"
import { PDFGenerator, PDFReportData } from "@/lib/pdf-generator"
import { Types } from "mongoose"

// POST: Generar PDF de reporte
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    await dbConnect()

    const body = await request.json()
    const { 
      reportId, 
      reportType = "professional_report",
      childId,
      dateRange,
      includeCharts = false 
    } = body

    let pdfData: PDFReportData | null = null

    // Generar datos según el tipo de reporte
    switch (reportType) {
      case "professional_report":
        pdfData = await generateProfessionalReportData(reportId, session.user.id)
        break
        
      case "sleep_report":
        pdfData = await generateSleepReportData(childId, dateRange, session.user.id)
        break
        
      case "consultation":
        pdfData = await generateConsultationReportData(reportId, session.user.id)
        break
        
      case "monthly_summary":
        pdfData = await generateMonthlySummaryData(childId, dateRange, session.user.id)
        break
        
      default:
        return NextResponse.json(
          { error: "Tipo de reporte no válido" },
          { status: 400 }
        )
    }

    if (!pdfData) {
      return NextResponse.json(
        { error: "No se pudo generar el reporte" },
        { status: 500 }
      )
    }

    // Generar PDF
    const pdfGenerator = new PDFGenerator()
    const pdfBlob = await pdfGenerator.generateReport(pdfData)
    
    // Convertir Blob a Buffer para enviar como respuesta
    const arrayBuffer = await pdfBlob.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Configurar headers para descarga
    const filename = `${pdfData.child.name.replace(/\s+/g, "_")}_${reportType}_${new Date().toISOString().split("T")[0]}.pdf`
    
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": buffer.length.toString()
      }
    })

  } catch (error) {
    console.error("Error generando PDF:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

// Funciones auxiliares para generar datos según tipo de reporte

async function generateProfessionalReportData(
  reportId: string, 
  userId: string
): Promise<PDFReportData | null> {
  try {
    const report = await ProfessionalReport.findById(reportId)
      .populate("childId", "name birthDate gender")
      .populate("professionalId", "name")

    if (!report) return null

    // Verificar permisos
    const canView = 
      report.userId.toString() === userId ||
      report.professionalId._id.toString() === userId ||
      report.sharedWith.some((share: any) => 
        share.professionalId.toString() === userId
      )

    if (!canView) return null

    // Si es padre, verificar que puede descargar
    if (report.userId.toString() === userId && !report.privacy.parentCanDownload) {
      throw new Error("No tiene permisos para descargar este reporte")
    }

    const child = report.childId as any
    const professional = report.professionalId as any

    // Calcular edad en meses
    const birthDate = new Date(child.birthDate)
    const now = new Date()
    const ageInMonths = Math.floor(
      (now.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
    )

    return {
      title: "Reporte Profesional de Sueño",
      type: "professional_report",
      generatedAt: new Date(),
      child: {
        name: child.name,
        birthDate: child.birthDate,
        ageInMonths,
        gender: child.gender
      },
      report: {
        analysis: report.editedData.analysis,
        recommendations: report.editedData.recommendations,
        professionalNotes: report.editedData.professionalNotes,
        diagnosis: report.editedData.diagnosis,
        treatment: report.editedData.treatment,
        followUp: report.editedData.followUp
      },
      metadata: {
        reportId: report._id.toString(),
        professional: report.signature ? {
          name: professional.name,
          license: report.signature.license,
          signedAt: report.signature.signedAt
        } : {
          name: professional.name
        },
        version: report.version,
        status: report.status
      }
    }
  } catch (error) {
    console.error("Error generando datos de reporte profesional:", error)
    return null
  }
}

async function generateSleepReportData(
  childId: string,
  dateRange: { from: Date; to: Date },
  userId: string
): Promise<PDFReportData | null> {
  try {
    // Obtener datos del niño
    const child = await Child.findById(childId)
    if (!child) return null

    // Verificar permisos (debe ser el padre o tener acceso)
    if (child.userId.toString() !== userId) {
      // Verificar si tiene acceso compartido
      // TODO: Implementar verificación de acceso compartido
    }

    // Obtener sesiones de sueño en el rango
    const sessions = await SleepSession.find({
      childId: new Types.ObjectId(childId),
      startTime: {
        $gte: new Date(dateRange.from),
        $lte: new Date(dateRange.to)
      }
    }).sort({ startTime: 1 })

    // Calcular métricas
    const totalSleepMinutes = sessions.reduce((acc, session) => {
      if (session.endTime) {
        const duration = (new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / (1000 * 60)
        return acc + duration
      }
      return acc
    }, 0)

    const nightSessions = sessions.filter(s => s.type === "night")
    const napSessions = sessions.filter(s => s.type === "nap")
    
    // Contar despertares nocturnos
    const nightWakings = nightSessions.reduce((acc, session) => {
      return acc + (session.interruptions?.length || 0)
    }, 0)

    // Calcular horarios promedio
    const bedtimes = nightSessions
      .map(s => new Date(s.startTime).getHours() * 60 + new Date(s.startTime).getMinutes())
      .filter(t => t > 0)
    
    const averageBedtimeMinutes = bedtimes.length > 0 
      ? bedtimes.reduce((a, b) => a + b, 0) / bedtimes.length
      : 0

    const averageBedtime = averageBedtimeMinutes > 0
      ? `${Math.floor(averageBedtimeMinutes / 60).toString().padStart(2, "0")}:${(averageBedtimeMinutes % 60).toString().padStart(2, "0")}`
      : undefined

    // Calcular edad
    const birthDate = new Date(child.birthDate)
    const now = new Date()
    const ageInMonths = Math.floor(
      (now.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
    )

    // Generar análisis básico
    const analysis = generateSleepAnalysis(
      ageInMonths,
      totalSleepMinutes / 60,
      nightWakings / nightSessions.length,
      napSessions.length / ((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24))
    )

    return {
      title: "Reporte de Sueño",
      type: "sleep_report",
      generatedAt: new Date(),
      child: {
        name: child.name,
        birthDate: child.birthDate,
        ageInMonths,
        gender: child.gender
      },
      report: {
        analysis: analysis.analysis,
        recommendations: analysis.recommendations
      },
      sleepData: {
        totalSleepHours: Math.round((totalSleepMinutes / 60) * 10) / 10,
        nightWakings: Math.round(nightWakings / nightSessions.length),
        napCount: Math.round(napSessions.length / ((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24))),
        averageBedtime,
        sleepEfficiency: Math.round((totalSleepMinutes / (24 * 60 * ((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)))) * 100)
      },
      metadata: {
        reportId: `sleep_${childId}_${Date.now()}`
      }
    }
  } catch (error) {
    console.error("Error generando datos de reporte de sueño:", error)
    return null
  }
}

async function generateConsultationReportData(
  consultationId: string,
  userId: string
): Promise<PDFReportData | null> {
  try {
    // TODO: Implementar cuando tengamos el modelo de Consultation
    // Por ahora retornamos datos de ejemplo
    
    const child = await Child.findOne({ userId: new Types.ObjectId(userId) })
    if (!child) return null

    const ageInMonths = Math.floor(
      (new Date().getTime() - new Date(child.birthDate).getTime()) / (1000 * 60 * 60 * 24 * 30.44)
    )

    return {
      title: "Análisis de Consulta",
      type: "consultation",
      generatedAt: new Date(),
      child: {
        name: child.name,
        birthDate: child.birthDate,
        ageInMonths,
        gender: child.gender
      },
      report: {
        analysis: "Análisis de la consulta pediátrica...",
        recommendations: "Recomendaciones basadas en la consulta..."
      },
      metadata: {
        reportId: consultationId
      }
    }
  } catch (error) {
    console.error("Error generando datos de consulta:", error)
    return null
  }
}

async function generateMonthlySummaryData(
  childId: string,
  dateRange: { year: number; month: number },
  userId: string
): Promise<PDFReportData | null> {
  try {
    // Calcular rango del mes
    const startDate = new Date(dateRange.year, dateRange.month - 1, 1)
    const endDate = new Date(dateRange.year, dateRange.month, 0)

    // Usar la función de reporte de sueño con el rango mensual
    return await generateSleepReportData(
      childId,
      { from: startDate, to: endDate },
      userId
    )
  } catch (error) {
    console.error("Error generando resumen mensual:", error)
    return null
  }
}

// Función auxiliar para generar análisis automático básico
function generateSleepAnalysis(
  ageInMonths: number,
  totalSleepHours: number,
  avgNightWakings: number,
  avgNapsPerDay: number
) {
  // Recomendaciones por edad
  const sleepRecommendations: Record<string, { totalHours: number; naps: number }> = {
    "0-3": { totalHours: 14, naps: 4 },
    "4-6": { totalHours: 14, naps: 3 },
    "7-12": { totalHours: 13, naps: 2 },
    "13-18": { totalHours: 13, naps: 1.5 },
    "19-24": { totalHours: 12, naps: 1 },
    "25-36": { totalHours: 11, naps: 1 }
  }

  const ageRange = 
    ageInMonths <= 3 ? "0-3" :
    ageInMonths <= 6 ? "4-6" :
    ageInMonths <= 12 ? "7-12" :
    ageInMonths <= 18 ? "13-18" :
    ageInMonths <= 24 ? "19-24" : "25-36"

  const recommendation = sleepRecommendations[ageRange]

  let analysis = `Análisis del patrón de sueño para un niño de ${ageInMonths} meses:\n\n`
  
  // Análisis de horas totales
  if (totalSleepHours < recommendation.totalHours - 1) {
    analysis += `• El niño está durmiendo ${totalSleepHours.toFixed(1)} horas diarias, lo cual está por debajo de las ${recommendation.totalHours} horas recomendadas para su edad. Esto podría estar afectando su desarrollo y comportamiento.\n\n`
  } else if (totalSleepHours > recommendation.totalHours + 2) {
    analysis += `• El niño está durmiendo ${totalSleepHours.toFixed(1)} horas diarias, lo cual es más de lo esperado para su edad. Mientras algunos niños necesitan más sueño, es importante asegurar que este patrón no interfiera con su alimentación y actividades.\n\n`
  } else {
    analysis += `• Las horas totales de sueño (${totalSleepHours.toFixed(1)} horas) están dentro del rango esperado para su edad.\n\n`
  }

  // Análisis de despertares
  if (avgNightWakings > 2) {
    analysis += `• Los despertares nocturnos frecuentes (promedio de ${avgNightWakings.toFixed(0)} por noche) sugieren que el niño podría beneficiarse de ajustes en la rutina de sueño.\n\n`
  }

  // Análisis de siestas
  if (avgNapsPerDay < recommendation.naps - 0.5) {
    analysis += `• El número de siestas diarias (${avgNapsPerDay.toFixed(1)}) es menor al recomendado, lo que podría resultar en sobrecansancio.\n\n`
  }

  let recommendations = "Recomendaciones para mejorar el sueño:\n\n"
  
  if (totalSleepHours < recommendation.totalHours - 1) {
    recommendations += "1. Considerar adelantar la hora de dormir en 30 minutos.\n"
    recommendations += "2. Asegurar un ambiente oscuro y tranquilo durante las horas de sueño.\n"
  }
  
  if (avgNightWakings > 2) {
    recommendations += "3. Establecer una rutina consistente antes de dormir.\n"
    recommendations += "4. Verificar que el niño no tenga hambre o sed antes de acostarse.\n"
  }
  
  if (avgNapsPerDay < recommendation.naps - 0.5) {
    recommendations += "5. Observar señales de cansancio para ofrecer siestas oportunas.\n"
    recommendations += "6. Crear un ambiente propicio para las siestas durante el día.\n"
  }

  recommendations += "\nEs importante recordar que cada niño es único y estos son lineamientos generales. Consulte con su pediatra para recomendaciones personalizadas."

  return { analysis, recommendations }
}