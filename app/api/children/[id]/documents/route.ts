// API para gestionar documentos de un nino (admin only)
// CRUD: listar, subir y eliminar archivos adjuntos (PDF, imagenes)

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { put, del } from "@vercel/blob"
import { createLogger } from "@/lib/logger"

const logger = createLogger("API:children:[id]:documents")

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/jpg", "image/png"]

// GET /api/children/[id]/documents - listar documentos del nino
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
    }

    const { id: childId } = await params

    if (!ObjectId.isValid(childId)) {
      return NextResponse.json({ error: "ID de nino invalido" }, { status: 400 })
    }

    const { db } = await connectToDatabase()

    const documents = await db
      .collection("childDocuments")
      .find({ childId: new ObjectId(childId) })
      .sort({ uploadedAt: -1 })
      .toArray()

    return NextResponse.json({ documents })
  } catch (error) {
    logger.error("Error listing documents:", error)
    return NextResponse.json(
      { error: "Error al obtener documentos" },
      { status: 500 }
    )
  }
}

// POST /api/children/[id]/documents - subir documento
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
    }

    const { id: childId } = await params

    if (!ObjectId.isValid(childId)) {
      return NextResponse.json({ error: "ID de nino invalido" }, { status: 400 })
    }

    // Verificar que BLOB_READ_WRITE_TOKEN este configurado
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      logger.error("BLOB_READ_WRITE_TOKEN is not configured")
      return NextResponse.json(
        { error: "El almacenamiento de archivos no esta configurado. Contacta al administrador." },
        { status: 503 }
      )
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No se envio ningun archivo" }, { status: 400 })
    }

    // Validar tipo de archivo
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Tipo de archivo no permitido. Solo se aceptan PDF, JPG y PNG." },
        { status: 400 }
      )
    }

    // Validar tamano
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "El archivo excede el tamano maximo de 10MB." },
        { status: 400 }
      )
    }

    const { db } = await connectToDatabase()

    // Verificar que el nino exista
    const child = await db.collection("children").findOne({ _id: new ObjectId(childId) })
    if (!child) {
      return NextResponse.json({ error: "Nino no encontrado" }, { status: 404 })
    }

    // Subir a Vercel Blob
    const blob = await put(`documents/${childId}/${Date.now()}-${file.name}`, file, {
      access: "public",
    })

    // Guardar metadata en MongoDB
    const doc = {
      childId: new ObjectId(childId),
      fileName: file.name,
      fileUrl: blob.url,
      fileType: file.type,
      fileSize: file.size,
      uploadedBy: new ObjectId(session.user.id),
      uploadedAt: new Date(),
    }

    const result = await db.collection("childDocuments").insertOne(doc)

    logger.info(`Document uploaded for child ${childId}: ${file.name}`)

    return NextResponse.json({
      document: { ...doc, _id: result.insertedId },
    })
  } catch (error) {
    logger.error("Error uploading document:", error)
    return NextResponse.json(
      { error: "Error al subir el documento" },
      { status: 500 }
    )
  }
}

// DELETE /api/children/[id]/documents - eliminar documento
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
    }

    const { id: childId } = await params
    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get("documentId")

    if (!documentId || !ObjectId.isValid(documentId)) {
      return NextResponse.json({ error: "ID de documento invalido" }, { status: 400 })
    }

    const { db } = await connectToDatabase()

    // Buscar el documento
    const doc = await db.collection("childDocuments").findOne({
      _id: new ObjectId(documentId),
      childId: new ObjectId(childId),
    })

    if (!doc) {
      return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 })
    }

    // Eliminar de Vercel Blob
    try {
      await del(doc.fileUrl)
    } catch (blobError) {
      logger.error("Error deleting blob (continuing with DB cleanup):", blobError)
    }

    // Eliminar de MongoDB
    await db.collection("childDocuments").deleteOne({ _id: new ObjectId(documentId) })

    logger.info(`Document deleted for child ${childId}: ${doc.fileName}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error("Error deleting document:", error)
    return NextResponse.json(
      { error: "Error al eliminar el documento" },
      { status: 500 }
    )
  }
}
