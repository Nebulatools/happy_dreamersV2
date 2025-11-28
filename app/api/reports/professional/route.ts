// API para gestión de reportes profesionales

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import dbConnect from "@/lib/mongodb"
import ProfessionalReport from "@/models/professional-report"
import User from "@/models/User"
import Child from "@/models/Child"
import { Types } from "mongoose"

// GET: Obtener reportes profesionales
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    await dbConnect()

    // Obtener parámetros de búsqueda
    const searchParams = request.nextUrl.searchParams
    const reportId = searchParams.get("id")
    const childId = searchParams.get("childId")
    const status = searchParams.get("status")
    
    // Verificar si el usuario es profesional
    const user = await User.findById(session.user.id)
    const isProfessional = user?.role === "professional" || user?.role === "admin"

    if (reportId) {
      // Obtener un reporte específico
      const report = await ProfessionalReport.findById(reportId)
        .populate("childId", "name birthDate gender")
        .populate("userId", "name email")
        .populate("professionalId", "name email")

      if (!report) {
        return NextResponse.json({ error: "Reporte no encontrado" }, { status: 404 })
      }

      // Verificar permisos
      const canView = 
        report.userId.toString() === session.user.id || // Es el padre
        report.professionalId.toString() === session.user.id || // Es el profesional asignado
        report.sharedWith.some((share: any) => 
          share.professionalId.toString() === session.user.id
        ) // Está compartido con el usuario

      if (!canView) {
        return NextResponse.json({ error: "Sin permisos para ver este reporte" }, { status: 403 })
      }

      // Si es padre y el reporte no permite visualización, denegar acceso
      if (report.userId.toString() === session.user.id && !report.privacy.parentCanView) {
        return NextResponse.json({ 
          error: "Este reporte aún no está disponible para visualización", 
        }, { status: 403 })
      }

      return NextResponse.json({ report })
    }

    // Listar reportes
    const query: any = {}

    if (childId) {
      query.childId = new Types.ObjectId(childId)
    }

    if (status) {
      query.status = status
    }

    // Filtrar según el rol del usuario
    if (isProfessional) {
      // Profesionales ven reportes donde son profesionales asignados o compartidos
      query.$or = [
        { professionalId: new Types.ObjectId(session.user.id) },
        { "sharedWith.professionalId": new Types.ObjectId(session.user.id) },
      ]
    } else {
      // Padres solo ven reportes de sus hijos donde tienen permiso
      query.userId = new Types.ObjectId(session.user.id)
      query["privacy.parentCanView"] = true
    }

    const reports = await ProfessionalReport.find(query)
      .populate("childId", "name birthDate gender")
      .populate("professionalId", "name email")
      .sort({ updatedAt: -1 })
      .limit(50)

    return NextResponse.json({ 
      reports,
      isProfessional, 
    })

  } catch (error) {
    console.error("Error obteniendo reportes profesionales:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

// POST: Crear nuevo reporte profesional
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    await dbConnect()

    // Verificar que el usuario sea profesional
    const user = await User.findById(session.user.id)
    if (user?.role !== "professional" && user?.role !== "admin") {
      return NextResponse.json(
        { error: "Solo profesionales pueden crear reportes" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      originalReportId,
      childId,
      userId,
      originalData,
      editedData,
      privacy,
    } = body

    // Verificar que no exista ya un reporte profesional para este reporte original
    const existingReport = await ProfessionalReport.findOne({
      originalReportId,
      professionalId: session.user.id,
    })

    if (existingReport) {
      return NextResponse.json(
        { error: "Ya existe un reporte profesional para este análisis" },
        { status: 400 }
      )
    }

    // Verificar que el niño exista y el profesional tenga acceso
    const child = await Child.findById(childId)
    if (!child) {
      return NextResponse.json(
        { error: "Niño no encontrado" },
        { status: 404 }
      )
    }

    // Crear el reporte profesional
    const professionalReport = await ProfessionalReport.create({
      originalReportId,
      childId: new Types.ObjectId(childId),
      userId: new Types.ObjectId(userId),
      professionalId: new Types.ObjectId(session.user.id),
      originalData: {
        ...originalData,
        generatedAt: originalData.generatedAt || new Date(),
      },
      editedData: editedData || originalData,
      status: "draft",
      version: 1,
      editHistory: [],
      privacy: privacy || {
        parentCanView: true,
        parentCanDownload: false,
        requiresApproval: true,
      },
    })

    // Popular datos relacionados
    await professionalReport.populate("childId", "name birthDate gender")
    await professionalReport.populate("userId", "name email")
    await professionalReport.populate("professionalId", "name email")

    return NextResponse.json({
      success: true,
      report: professionalReport,
    })

  } catch (error) {
    console.error("Error creando reporte profesional:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

// PUT: Actualizar reporte profesional
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    await dbConnect()

    const body = await request.json()
    const { reportId, editedData, editReason, privacy } = body

    if (!reportId) {
      return NextResponse.json(
        { error: "ID del reporte requerido" },
        { status: 400 }
      )
    }

    // Buscar el reporte
    const report = await ProfessionalReport.findById(reportId)
    if (!report) {
      return NextResponse.json(
        { error: "Reporte no encontrado" },
        { status: 404 }
      )
    }

    // Verificar permisos de edición
    const canEdit = 
      report.professionalId.toString() === session.user.id ||
      report.sharedWith.some((share: any) => 
        share.professionalId.toString() === session.user.id && 
        share.permissions === "edit"
      )

    if (!canEdit) {
      return NextResponse.json(
        { error: "Sin permisos para editar este reporte" },
        { status: 403 }
      )
    }

    // Verificar que el reporte no esté aprobado (a menos que sea admin)
    const user = await User.findById(session.user.id)
    if (report.status === "approved" && user?.role !== "admin") {
      return NextResponse.json(
        { error: "No se pueden editar reportes aprobados" },
        { status: 400 }
      )
    }

    // Guardar versión anterior si hay cambios significativos
    const hasSignificantChanges = 
      report.editedData.analysis !== editedData.analysis ||
      report.editedData.recommendations !== editedData.recommendations

    if (hasSignificantChanges) {
      await report.createVersion(new Types.ObjectId(session.user.id))
    }

    // Registrar cambios en el historial
    const changedFields = []
    
    if (report.editedData.analysis !== editedData.analysis) {
      changedFields.push({
        field: "analysis",
        originalValue: report.editedData.analysis.substring(0, 100) + "...",
        newValue: editedData.analysis.substring(0, 100) + "...",
        editedBy: new Types.ObjectId(session.user.id),
        editedAt: new Date(),
        reason: editReason,
      })
    }

    if (report.editedData.recommendations !== editedData.recommendations) {
      changedFields.push({
        field: "recommendations",
        originalValue: report.editedData.recommendations.substring(0, 100) + "...",
        newValue: editedData.recommendations.substring(0, 100) + "...",
        editedBy: new Types.ObjectId(session.user.id),
        editedAt: new Date(),
        reason: editReason,
      })
    }

    if (report.editedData.professionalNotes !== editedData.professionalNotes) {
      changedFields.push({
        field: "professionalNotes",
        originalValue: report.editedData.professionalNotes || "",
        newValue: editedData.professionalNotes || "",
        editedBy: new Types.ObjectId(session.user.id),
        editedAt: new Date(),
        reason: editReason,
      })
    }

    if (report.editedData.diagnosis !== editedData.diagnosis) {
      changedFields.push({
        field: "diagnosis",
        originalValue: report.editedData.diagnosis || "",
        newValue: editedData.diagnosis || "",
        editedBy: new Types.ObjectId(session.user.id),
        editedAt: new Date(),
        reason: editReason,
      })
    }

    if (report.editedData.treatment !== editedData.treatment) {
      changedFields.push({
        field: "treatment",
        originalValue: report.editedData.treatment || "",
        newValue: editedData.treatment || "",
        editedBy: new Types.ObjectId(session.user.id),
        editedAt: new Date(),
        reason: editReason,
      })
    }

    // Actualizar el reporte
    report.editedData = editedData
    if (privacy) {
      report.privacy = privacy
    }
    report.editHistory.push(...changedFields)
    report.lastEditedAt = new Date()
    report.version += 1
    
    // Cambiar estado a revisión si estaba en borrador
    if (report.status === "draft" && changedFields.length > 0) {
      report.status = "review"
    }

    await report.save()

    // Popular datos relacionados
    await report.populate("childId", "name birthDate gender")
    await report.populate("userId", "name email")
    await report.populate("professionalId", "name email")

    return NextResponse.json({
      success: true,
      report,
      changesCount: changedFields.length,
    })

  } catch (error) {
    console.error("Error actualizando reporte profesional:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

// PATCH: Aprobar o firmar reporte
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    await dbConnect()

    const body = await request.json()
    const { reportId, action, signatureData, sharedWith } = body

    if (!reportId || !action) {
      return NextResponse.json(
        { error: "Parámetros requeridos faltantes" },
        { status: 400 }
      )
    }

    const report = await ProfessionalReport.findById(reportId)
    if (!report) {
      return NextResponse.json(
        { error: "Reporte no encontrado" },
        { status: 404 }
      )
    }

    // Verificar permisos
    const user = await User.findById(session.user.id)
    const isProfessionalOwner = report.professionalId.toString() === session.user.id
    const isAdmin = user?.role === "admin"

    if (!isProfessionalOwner && !isAdmin) {
      return NextResponse.json(
        { error: "Sin permisos para realizar esta acción" },
        { status: 403 }
      )
    }

    switch (action) {
    case "approve":
      await report.approve(new Types.ObjectId(session.user.id))
      break

    case "sign":
      if (!user?.name || !signatureData?.license) {
        return NextResponse.json(
          { error: "Datos de firma incompletos" },
          { status: 400 }
        )
      }
        
      await report.sign(
        new Types.ObjectId(session.user.id),
        user.name,
        signatureData.license,
        signatureData.signature
      )
      break

    case "share":
      if (!sharedWith?.professionalId) {
        return NextResponse.json(
          { error: "ID del profesional requerido" },
          { status: 400 }
        )
      }
        
      await report.shareWith(
        new Types.ObjectId(sharedWith.professionalId),
        sharedWith.permissions || "view"
      )
      break

    case "revert":
      if (report.status !== "approved") {
        return NextResponse.json(
          { error: "Solo se pueden revertir reportes aprobados" },
          { status: 400 }
        )
      }
      report.status = "review"
      report.approvedAt = undefined
      report.approvedBy = undefined
      await report.save()
      break

    default:
      return NextResponse.json(
        { error: "Acción no válida" },
        { status: 400 }
      )
    }

    // Popular datos relacionados
    await report.populate("childId", "name birthDate gender")
    await report.populate("userId", "name email")
    await report.populate("professionalId", "name email")

    return NextResponse.json({
      success: true,
      report,
      message: `Reporte ${action === "approve" ? "aprobado" : action === "sign" ? "firmado" : "actualizado"} exitosamente`,
    })

  } catch (error) {
    console.error("Error procesando acción del reporte:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}