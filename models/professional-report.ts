// Modelo de datos para reportes editables por profesionales de salud

import mongoose from "mongoose"

export interface IProfessionalEdit {
  editedBy: mongoose.Types.ObjectId // ID del profesional que editó
  editedAt: Date
  field: string // Campo que fue editado
  originalValue: string
  newValue: string
  reason?: string // Razón del cambio (opcional)
}

export interface IProfessionalReport extends mongoose.Document {
  // Referencia al reporte original
  originalReportId: string // ID del reporte original (consulta)
  childId: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId // Padre/tutor
  professionalId: mongoose.Types.ObjectId // Profesional asignado
  
  // Datos originales del reporte
  originalData: {
    analysis: string
    recommendations: string
    childContext?: {
      name: string
      ageInMonths: number
      totalEvents: number
    }
    metadata?: {
      reportId: string
      createdAt: Date
      adminName: string
      processingTime?: string | number
      sourcesUsed?: number
    }
    generatedAt: Date
  }
  
  // Datos editados por el profesional
  editedData: {
    analysis: string // Análisis modificado
    recommendations: string // Recomendaciones modificadas
    professionalNotes?: string // Notas adicionales del profesional
    diagnosis?: string // Diagnóstico profesional
    treatment?: string // Plan de tratamiento
    followUp?: {
      required: boolean
      nextAppointment?: Date
      frequency?: string // "weekly", "biweekly", "monthly"
      notes?: string
    }
    customSections?: Array<{
      title: string
      content: string
      order: number
    }>
  }
  
  // Historial de ediciones
  editHistory: IProfessionalEdit[]
  
  // Metadatos del reporte profesional
  status: "draft" | "review" | "approved" | "shared"
  approvedAt?: Date
  approvedBy?: mongoose.Types.ObjectId
  
  // Control de versiones
  version: number
  previousVersions?: Array<{
    version: number
    data: any
    editedAt: Date
    editedBy: mongoose.Types.ObjectId
  }>
  
  // Compartir con otros profesionales
  sharedWith: Array<{
    professionalId: mongoose.Types.ObjectId
    sharedAt: Date
    permissions: "view" | "edit" | "comment"
  }>
  
  // Comentarios de revisión
  comments?: Array<{
    authorId: mongoose.Types.ObjectId
    authorName: string
    authorRole: string
    comment: string
    createdAt: Date
    resolved: boolean
  }>
  
  // Firma digital (para validación legal)
  signature?: {
    professionalId: mongoose.Types.ObjectId
    professionalName: string
    license: string // Número de licencia profesional
    signedAt: Date
    signatureData?: string // Base64 de firma digital
  }
  
  // Timestamps
  createdAt: Date
  updatedAt: Date
  lastEditedAt: Date
  
  // Configuración de privacidad
  privacy: {
    parentCanView: boolean // Si el padre puede ver las ediciones
    parentCanDownload: boolean // Si el padre puede descargar el reporte
    requiresApproval: boolean // Si requiere aprobación antes de compartir
  }
}

const ProfessionalEditSchema = new mongoose.Schema({
  editedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  editedAt: { type: Date, default: Date.now },
  field: { type: String, required: true },
  originalValue: { type: String, required: true },
  newValue: { type: String, required: true },
  reason: String
})

const ProfessionalReportSchema = new mongoose.Schema({
  originalReportId: { type: String, required: true, index: true },
  childId: { type: mongoose.Schema.Types.ObjectId, ref: "Child", required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  professionalId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  
  originalData: {
    analysis: { type: String, required: true },
    recommendations: { type: String, required: true },
    childContext: {
      name: String,
      ageInMonths: Number,
      totalEvents: Number
    },
    metadata: {
      reportId: String,
      createdAt: Date,
      adminName: String,
      processingTime: mongoose.Schema.Types.Mixed,
      sourcesUsed: Number
    },
    generatedAt: { type: Date, required: true }
  },
  
  editedData: {
    analysis: { type: String, required: true },
    recommendations: { type: String, required: true },
    professionalNotes: String,
    diagnosis: String,
    treatment: String,
    followUp: {
      required: { type: Boolean, default: false },
      nextAppointment: Date,
      frequency: { 
        type: String, 
        enum: ["daily", "weekly", "biweekly", "monthly", "quarterly", "as_needed"] 
      },
      notes: String
    },
    customSections: [{
      title: String,
      content: String,
      order: Number
    }]
  },
  
  editHistory: [ProfessionalEditSchema],
  
  status: { 
    type: String, 
    enum: ["draft", "review", "approved", "shared"], 
    default: "draft" 
  },
  approvedAt: Date,
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  
  version: { type: Number, default: 1 },
  previousVersions: [{
    version: Number,
    data: mongoose.Schema.Types.Mixed,
    editedAt: Date,
    editedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  }],
  
  sharedWith: [{
    professionalId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    sharedAt: Date,
    permissions: { type: String, enum: ["view", "edit", "comment"], default: "view" }
  }],
  
  comments: [{
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    authorName: String,
    authorRole: String,
    comment: String,
    createdAt: { type: Date, default: Date.now },
    resolved: { type: Boolean, default: false }
  }],
  
  signature: {
    professionalId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    professionalName: String,
    license: String,
    signedAt: Date,
    signatureData: String
  },
  
  lastEditedAt: { type: Date, default: Date.now },
  
  privacy: {
    parentCanView: { type: Boolean, default: true },
    parentCanDownload: { type: Boolean, default: false },
    requiresApproval: { type: Boolean, default: true }
  }
}, {
  timestamps: true
})

// Índices para búsquedas eficientes
ProfessionalReportSchema.index({ childId: 1, professionalId: 1 })
ProfessionalReportSchema.index({ userId: 1, status: 1 })
ProfessionalReportSchema.index({ originalReportId: 1 })
ProfessionalReportSchema.index({ "sharedWith.professionalId": 1 })

// Métodos del modelo
ProfessionalReportSchema.methods.addEdit = function(
  field: string, 
  originalValue: string, 
  newValue: string, 
  editedBy: mongoose.Types.ObjectId,
  reason?: string
) {
  this.editHistory.push({
    editedBy,
    editedAt: new Date(),
    field,
    originalValue,
    newValue,
    reason
  })
  
  this.lastEditedAt = new Date()
  this.version += 1
  
  return this.save()
}

ProfessionalReportSchema.methods.createVersion = function(editedBy: mongoose.Types.ObjectId) {
  if (!this.previousVersions) {
    this.previousVersions = []
  }
  
  this.previousVersions.push({
    version: this.version,
    data: this.editedData,
    editedAt: new Date(),
    editedBy
  })
  
  // Limitar a últimas 10 versiones
  if (this.previousVersions.length > 10) {
    this.previousVersions = this.previousVersions.slice(-10)
  }
  
  return this.save()
}

ProfessionalReportSchema.methods.approve = function(approvedBy: mongoose.Types.ObjectId) {
  this.status = "approved"
  this.approvedAt = new Date()
  this.approvedBy = approvedBy
  return this.save()
}

ProfessionalReportSchema.methods.shareWith = function(
  professionalId: mongoose.Types.ObjectId, 
  permissions: "view" | "edit" | "comment" = "view"
) {
  const existing = this.sharedWith.find(
    (share: any) => share.professionalId.toString() === professionalId.toString()
  )
  
  if (existing) {
    existing.permissions = permissions
  } else {
    this.sharedWith.push({
      professionalId,
      sharedAt: new Date(),
      permissions
    })
  }
  
  return this.save()
}

ProfessionalReportSchema.methods.sign = function(
  professionalId: mongoose.Types.ObjectId,
  professionalName: string,
  license: string,
  signatureData?: string
) {
  this.signature = {
    professionalId,
    professionalName,
    license,
    signedAt: new Date(),
    signatureData
  }
  
  this.status = "approved"
  this.approvedAt = new Date()
  this.approvedBy = professionalId
  
  return this.save()
}

// Modelo exportado
const ProfessionalReport = mongoose.models.ProfessionalReport || 
  mongoose.model<IProfessionalReport>("ProfessionalReport", ProfessionalReportSchema)

export default ProfessionalReport