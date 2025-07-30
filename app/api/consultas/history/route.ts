// API para obtener historial de consultas
// Proporciona contexto histórico para mejores análisis

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"

import { createLogger } from "@/lib/logger"

const logger = createLogger("API:consultas:history:route")


export async function GET(req: NextRequest) {
  try {
    // Verificar autenticación y permisos de admin
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const childId = searchParams.get("childId")
    const userId = searchParams.get("userId")
    const limit = parseInt(searchParams.get("limit") || "10")

    if (!childId) {
      return NextResponse.json({ 
        error: "Se requiere el ID del niño", 
      }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db()

    // Construir query
    const query: any = { childId: new ObjectId(childId) }
    if (userId) {
      query.userId = new ObjectId(userId)
    }

    // Obtener consultas con información adicional
    const consultations = await db.collection("consultation_reports")
      .aggregate([
        { $match: query },
        { $sort: { createdAt: -1 } },
        { $limit: limit },
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "userInfo",
          },
        },
        {
          $lookup: {
            from: "children",
            localField: "childId",
            foreignField: "_id",
            as: "childInfo",
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "adminId",
            foreignField: "_id",
            as: "adminInfo",
          },
        },
        {
          $project: {
            transcript: 1,
            analysis: 1,
            recommendations: 1,
            createdAt: 1,
            updatedAt: 1,
            userName: { $arrayElemAt: ["$userInfo.name", 0] },
            userEmail: { $arrayElemAt: ["$userInfo.email", 0] },
            childName: {
              $concat: [
                { $arrayElemAt: ["$childInfo.firstName", 0] },
                " ",
                { $arrayElemAt: ["$childInfo.lastName", 0] },
              ],
            },
            childAge: { $arrayElemAt: ["$childInfo.birthDate", 0] },
            adminName: { $arrayElemAt: ["$adminInfo.name", 0] },
          },
        },
      ])
      .toArray()

    // Obtener estadísticas del historial
    const stats = await getConsultationStats(childId)

    return NextResponse.json({
      success: true,
      consultations,
      stats,
      total: consultations.length,
    })

  } catch (error) {
    logger.error("Error obteniendo historial:", error)
    return NextResponse.json({ 
      error: "Error interno del servidor",
      details: error instanceof Error ? error.message : "Error desconocido",
    }, { status: 500 })
  }
}

// Función para obtener estadísticas del historial
async function getConsultationStats(childId: string) {
  try {
    const client = await clientPromise
    const db = client.db()

    const stats = await db.collection("consultation_reports")
      .aggregate([
        { $match: { childId: new ObjectId(childId) } },
        {
          $group: {
            _id: null,
            totalConsultations: { $sum: 1 },
            firstConsultation: { $min: "$createdAt" },
            lastConsultation: { $max: "$createdAt" },
            avgAnalysisLength: { 
              $avg: { 
                $strLenCP: { 
                  $cond: [
                    { $eq: [{ $type: "$analysis" }, "string"] },
                    "$analysis",
                    { $toString: "$analysis" }
                  ]
                }
              }
            },
            avgRecommendationsLength: { 
              $avg: { 
                $strLenCP: { 
                  $cond: [
                    { $eq: [{ $type: "$recommendations" }, "string"] },
                    "$recommendations", 
                    { $toString: "$recommendations" }
                  ]
                }
              }
            },
          },
        },
      ])
      .toArray()

    return stats[0] || {
      totalConsultations: 0,
      firstConsultation: null,
      lastConsultation: null,
      avgAnalysisLength: 0,
      avgRecommendationsLength: 0,
    }
  } catch (error) {
    logger.error("Error calculando estadísticas:", error)
    return {
      totalConsultations: 0,
      firstConsultation: null,
      lastConsultation: null,
      avgAnalysisLength: 0,
      avgRecommendationsLength: 0,
    }
  }
}

// Endpoint para buscar consultas por contenido
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { childId, searchTerm, startDate, endDate } = await req.json()

    if (!childId || !searchTerm) {
      return NextResponse.json({ 
        error: "Se requiere childId y searchTerm", 
      }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db()

    const query: any = {
      childId: new ObjectId(childId),
      $or: [
        { transcript: { $regex: searchTerm, $options: "i" } },
        { analysis: { $regex: searchTerm, $options: "i" } },
        { recommendations: { $regex: searchTerm, $options: "i" } },
      ],
    }

    // Filtrar por fechas si se proporcionan
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      }
    }

    const consultations = await db.collection("consultation_reports")
      .find(query)
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray()

    return NextResponse.json({
      success: true,
      consultations,
      searchTerm,
      total: consultations.length,
    })

  } catch (error) {
    logger.error("Error en búsqueda:", error)
    return NextResponse.json({ 
      error: "Error interno del servidor", 
    }, { status: 500 })
  }
}