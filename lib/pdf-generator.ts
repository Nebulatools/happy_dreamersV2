// Servicio de generación de PDFs para reportes

import jsPDF from "jspdf"
import html2canvas from "html2canvas"

export interface PDFReportData {
  // Información básica
  title: string
  type: "sleep_report" | "professional_report" | "consultation" | "monthly_summary"
  generatedAt: Date
  
  // Información del niño
  child: {
    name: string
    birthDate: Date
    ageInMonths: number
    gender?: string
  }
  
  // Información del reporte
  report: {
    analysis: string
    recommendations: string
    professionalNotes?: string
    diagnosis?: string
    treatment?: string
    followUp?: {
      required: boolean
      nextAppointment?: Date
      frequency?: string
      notes?: string
    }
  }
  
  // Datos de sueño (opcional)
  sleepData?: {
    totalSleepHours: number
    nightWakings: number
    napCount: number
    averageBedtime?: string
    averageWakeTime?: string
    sleepEfficiency?: number
  }
  
  // Metadatos
  metadata?: {
    reportId: string
    professional?: {
      name: string
      license?: string
      signedAt?: Date
    }
    parent?: {
      name: string
      email?: string
    }
    version?: number
    status?: string
  }
}

export class PDFGenerator {
  private doc: jsPDF
  private pageHeight: number
  private pageWidth: number
  private margin: number
  private currentY: number
  private lineHeight: number
  
  constructor() {
    this.doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    })
    
    this.pageHeight = 297
    this.pageWidth = 210
    this.margin = 20
    this.currentY = this.margin
    this.lineHeight = 7
  }
  
  // Generar PDF desde datos estructurados
  async generateReport(data: PDFReportData): Promise<Blob> {
    try {
      // Reiniciar documento
      this.doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      })
      this.currentY = this.margin
      
      // Agregar header
      this.addHeader(data)
      
      // Información del paciente
      this.addPatientInfo(data.child)
      
      // Datos de sueño si existen
      if (data.sleepData) {
        this.addSleepMetrics(data.sleepData)
      }
      
      // Análisis
      this.addSection("ANÁLISIS CLÍNICO", data.report.analysis)
      
      // Recomendaciones
      this.addSection("PLAN DE MEJORAMIENTO", data.report.recommendations)
      
      // Notas profesionales si existen
      if (data.report.professionalNotes) {
        this.addSection("NOTAS DEL PROFESIONAL", data.report.professionalNotes)
      }
      
      // Diagnóstico y tratamiento si existen
      if (data.report.diagnosis) {
        this.addSection("DIAGNÓSTICO", data.report.diagnosis)
      }
      
      if (data.report.treatment) {
        this.addSection("PLAN DE TRATAMIENTO", data.report.treatment)
      }
      
      // Seguimiento si existe
      if (data.report.followUp && data.report.followUp.required) {
        this.addFollowUpSection(data.report.followUp)
      }
      
      // Footer con firma si existe
      this.addFooter(data.metadata)
      
      // Retornar como Blob
      return this.doc.output("blob")
      
    } catch (error) {
      console.error("Error generando PDF:", error)
      throw new Error("Error al generar el PDF")
    }
  }
  
  // Generar PDF desde HTML (para reportes complejos con gráficas)
  async generateFromHTML(element: HTMLElement, filename: string = "reporte"): Promise<Blob> {
    try {
      // Capturar elemento HTML como canvas
      const canvas = await html2canvas(element, {
        scale: 2,
        logging: false,
        useCORS: true,
        backgroundColor: "#ffffff"
      })
      
      // Calcular dimensiones
      const imgWidth = 210 // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      
      // Crear PDF
      const pdf = new jsPDF({
        orientation: imgHeight > imgWidth ? "portrait" : "landscape",
        unit: "mm",
        format: "a4"
      })
      
      // Agregar imagen al PDF
      const imgData = canvas.toDataURL("image/png")
      
      // Si la imagen es muy alta, dividir en páginas
      if (imgHeight > 297) {
        let position = 0
        let remainingHeight = imgHeight
        
        while (remainingHeight > 0) {
          pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight)
          remainingHeight -= 297
          
          if (remainingHeight > 0) {
            position -= 297
            pdf.addPage()
          }
        }
      } else {
        pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight)
      }
      
      return pdf.output("blob")
      
    } catch (error) {
      console.error("Error generando PDF desde HTML:", error)
      throw new Error("Error al generar el PDF desde HTML")
    }
  }
  
  // Métodos privados para construcción del PDF
  
  private addHeader(data: PDFReportData) {
    // Logo/Título
    this.doc.setFontSize(20)
    this.doc.setFont("helvetica", "bold")
    this.doc.text("Happy Dreamers", this.pageWidth / 2, this.currentY, { align: "center" })
    
    this.currentY += 8
    this.doc.setFontSize(14)
    this.doc.setFont("helvetica", "normal")
    this.doc.text(this.getReportTitle(data.type), this.pageWidth / 2, this.currentY, { align: "center" })
    
    this.currentY += 8
    this.doc.setFontSize(10)
    this.doc.text(
      `Generado el ${new Date(data.generatedAt).toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "long",
        year: "numeric"
      })}`,
      this.pageWidth / 2,
      this.currentY,
      { align: "center" }
    )
    
    // Línea separadora
    this.currentY += 8
    this.doc.setDrawColor(200, 200, 200)
    this.doc.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY)
    this.currentY += 10
  }
  
  private addPatientInfo(child: PDFReportData["child"]) {
    this.doc.setFontSize(12)
    this.doc.setFont("helvetica", "bold")
    this.doc.text("INFORMACIÓN DEL PACIENTE", this.margin, this.currentY)
    this.currentY += 8
    
    this.doc.setFontSize(10)
    this.doc.setFont("helvetica", "normal")
    
    const info = [
      `Nombre: ${child.name}`,
      `Edad: ${child.ageInMonths} meses`,
      `Fecha de nacimiento: ${new Date(child.birthDate).toLocaleDateString("es-ES")}`,
      child.gender ? `Género: ${child.gender}` : null
    ].filter(Boolean)
    
    info.forEach(line => {
      if (line) {
        this.doc.text(line, this.margin + 5, this.currentY)
        this.currentY += 6
      }
    })
    
    this.currentY += 5
  }
  
  private addSleepMetrics(sleepData: PDFReportData["sleepData"]) {
    if (!sleepData) return
    
    this.doc.setFontSize(12)
    this.doc.setFont("helvetica", "bold")
    this.doc.text("MÉTRICAS DE SUEÑO", this.margin, this.currentY)
    this.currentY += 8
    
    this.doc.setFontSize(10)
    this.doc.setFont("helvetica", "normal")
    
    // Crear tabla de métricas
    const metrics = [
      ["Horas totales de sueño", `${sleepData.totalSleepHours} horas`],
      ["Despertares nocturnos", `${sleepData.nightWakings} veces`],
      ["Número de siestas", `${sleepData.napCount} siestas`],
      sleepData.averageBedtime ? ["Hora promedio de dormir", sleepData.averageBedtime] : null,
      sleepData.averageWakeTime ? ["Hora promedio de despertar", sleepData.averageWakeTime] : null,
      sleepData.sleepEfficiency ? ["Eficiencia del sueño", `${sleepData.sleepEfficiency}%`] : null
    ].filter(Boolean) as string[][]
    
    const colWidth = (this.pageWidth - 2 * this.margin) / 2
    
    metrics.forEach(([label, value]) => {
      this.doc.text(label, this.margin + 5, this.currentY)
      this.doc.text(value, this.margin + colWidth + 5, this.currentY)
      this.currentY += 6
    })
    
    this.currentY += 5
  }
  
  private addSection(title: string, content: string) {
    // Verificar si necesitamos nueva página
    if (this.currentY > this.pageHeight - 50) {
      this.doc.addPage()
      this.currentY = this.margin
    }
    
    // Título de sección
    this.doc.setFontSize(12)
    this.doc.setFont("helvetica", "bold")
    this.doc.text(title, this.margin, this.currentY)
    this.currentY += 8
    
    // Contenido
    this.doc.setFontSize(10)
    this.doc.setFont("helvetica", "normal")
    
    // Dividir contenido en líneas que quepan en el ancho de página
    const lines = this.doc.splitTextToSize(content, this.pageWidth - 2 * this.margin - 10)
    
    lines.forEach((line: string) => {
      // Verificar si necesitamos nueva página
      if (this.currentY > this.pageHeight - 20) {
        this.doc.addPage()
        this.currentY = this.margin
      }
      
      this.doc.text(line, this.margin + 5, this.currentY)
      this.currentY += 6
    })
    
    this.currentY += 8
  }
  
  private addFollowUpSection(followUp: NonNullable<PDFReportData["report"]["followUp"]>) {
    this.doc.setFontSize(12)
    this.doc.setFont("helvetica", "bold")
    this.doc.text("PLAN DE SEGUIMIENTO", this.margin, this.currentY)
    this.currentY += 8
    
    this.doc.setFontSize(10)
    this.doc.setFont("helvetica", "normal")
    
    const followUpInfo = [
      followUp.nextAppointment ? 
        `Próxima cita: ${new Date(followUp.nextAppointment).toLocaleDateString("es-ES")}` : null,
      followUp.frequency ? `Frecuencia: ${this.translateFrequency(followUp.frequency)}` : null,
      followUp.notes ? `Notas: ${followUp.notes}` : null
    ].filter(Boolean)
    
    followUpInfo.forEach(line => {
      if (line) {
        const lines = this.doc.splitTextToSize(line, this.pageWidth - 2 * this.margin - 10)
        lines.forEach((l: string) => {
          this.doc.text(l, this.margin + 5, this.currentY)
          this.currentY += 6
        })
      }
    })
    
    this.currentY += 8
  }
  
  private addFooter(metadata?: PDFReportData["metadata"]) {
    // Ir al final de la página
    const footerY = this.pageHeight - 30
    
    // Línea separadora
    this.doc.setDrawColor(200, 200, 200)
    this.doc.line(this.margin, footerY, this.pageWidth - this.margin, footerY)
    
    // Información del footer
    this.doc.setFontSize(9)
    this.doc.setFont("helvetica", "normal")
    
    let footerText = "Happy Dreamers - Plataforma de Seguimiento del Sueño Infantil"
    
    if (metadata?.professional) {
      this.doc.setFont("helvetica", "bold")
      this.doc.text(
        `${metadata.professional.name}${metadata.professional.license ? ` - Lic. ${metadata.professional.license}` : ""}`,
        this.margin,
        footerY + 8
      )
      
      if (metadata.professional.signedAt) {
        this.doc.setFont("helvetica", "normal")
        this.doc.text(
          `Firmado digitalmente el ${new Date(metadata.professional.signedAt).toLocaleDateString("es-ES")}`,
          this.margin,
          footerY + 14
        )
      }
    }
    
    // Número de página
    this.doc.setFontSize(8)
    this.doc.text(
      `Página ${this.doc.getCurrentPageInfo().pageNumber}`,
      this.pageWidth - this.margin,
      footerY + 14,
      { align: "right" }
    )
    
    // ID del reporte si existe
    if (metadata?.reportId) {
      this.doc.setFontSize(7)
      this.doc.text(
        `ID: ${metadata.reportId}`,
        this.pageWidth / 2,
        footerY + 20,
        { align: "center" }
      )
    }
  }
  
  private getReportTitle(type: PDFReportData["type"]): string {
    const titles = {
      sleep_report: "Reporte de Sueño",
      professional_report: "Reporte Profesional",
      consultation: "Análisis de Consulta",
      monthly_summary: "Resumen Mensual"
    }
    return titles[type] || "Reporte"
  }
  
  private translateFrequency(frequency: string): string {
    const translations: Record<string, string> = {
      daily: "Diario",
      weekly: "Semanal",
      biweekly: "Quincenal",
      monthly: "Mensual",
      quarterly: "Trimestral",
      as_needed: "Según necesidad"
    }
    return translations[frequency] || frequency
  }
  
  // Método para descargar directamente
  download(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${filename}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }
}

// Singleton para uso global
export const pdfGenerator = new PDFGenerator()